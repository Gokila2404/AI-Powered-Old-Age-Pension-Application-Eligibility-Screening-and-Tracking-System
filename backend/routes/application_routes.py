import uuid
import datetime
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from backend.models import (
    ApplicationSubmitRequest,
    ApplicationResponse,
    ApplicationStatusUpdate,
    TimelineStep,
    DocumentMatchScore,
    EligibilityCheckInput
)
from backend.database import db_manager
from backend.auth import get_current_user, get_admin_user
from backend.services.websocket_manager import ws_manager
from backend.services.otp_service import is_recently_verified
from backend.services.eligibility_service import assess_eligibility
from backend.services.scheme_forms import validate_scheme_answers, SCHEME_REQUIRED_DOCS, SCHEME_FORM_FIELDS
from backend.services.document_matcher import match_documents_and_identity
from backend.services.document_consistency import compare_document_fields
from pydantic import ValidationError
from backend.traceability.store import application_verification_history, record_application_trace

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/applications", tags=["Applications"])

def build_default_timeline(status_str: str = "SUBMITTED", applied_date: str = "") -> List[TimelineStep]:
    today = applied_date or datetime.date.today().isoformat()
    return [
        TimelineStep(
            step="DRAFT",
            status="completed",
            title="Application Form Prepared",
            date=today,
            description="Applicant completed eligibility check and information wizard."
        ),
        TimelineStep(
            step="SUBMITTED",
            status="completed",
            title="Application Registered Online",
            date=today,
            description="Application submitted successfully with verified declaration."
        ),
        TimelineStep(
            step="DOCUMENT VERIFICATION",
            status="completed",
            title="Quality & OCR Verification",
            date=today,
            description="Document clarity verified; text extracted and consistency scored."
        ),
        TimelineStep(
            step="UNDER REVIEW",
            status="current" if status_str in ["SUBMITTED", "UNDER REVIEW", "DOCUMENT VERIFICATION"] else ("completed" if status_str in ["APPROVED", "COMPLETED", "REJECTED"] else "pending"),
            title="Administrative Officer Review",
            date=today,
            description="Assigned to Taluk Social Welfare Officer for official scrutiny."
        ),
        TimelineStep(
            step="APPROVED / ACTION REQUIRED / REJECTED",
            status="completed" if status_str in ["APPROVED", "REJECTED"] else ("action-required" if status_str == "ACTION REQUIRED" else "pending"),
            title="Administrative Determination",
            date="Pending" if status_str not in ["APPROVED", "REJECTED", "ACTION REQUIRED"] else today,
            description="Final approval decision made by designated Revenue Authority."
        ),
        TimelineStep(
            step="COMPLETED",
            status="completed" if status_str == "COMPLETED" else "pending",
            title="Sanction Order & Welfare Activation",
            date="Pending",
            description="Direct Benefit Transfer registration with Treasury / Bank."
        )
    ]

def mask_bank_account(acc_num: str) -> str:
    cleaned = "".join(filter(str.isalnum, str(acc_num)))
    if len(cleaned) <= 4:
        return cleaned
    last_four = cleaned[-4:]
    return f"XXXX XXXX {last_four}"


def _doc_keywords(required_doc: str) -> list:
    """Map a scheme-required document name to keywords matched against the
    docType the user supplied for each uploaded document."""
    name = required_doc.lower()
    if "aadhaar" in name or "aadhar" in name:
        return ["aadhaar", "aadhar", "identity"]
    if "age proof" in name or "birth" in name:
        return ["age", "birth", "aadhaar", "aadhar"]
    if "death" in name:
        return ["death"]
    if "disability" in name or "udid" in name:
        return ["disability", "udid"]
    if "income" in name:
        return ["income"]
    if "bank" in name or "passbook" in name:
        return ["bank", "passbook"]
    if "ration" in name:
        return ["ration"]
    if "destitute" in name:
        return ["destitute", "income", "welfare"]
    return [name.split("(")[0].strip()]


@router.post("", response_model=ApplicationResponse)
async def submit_application(payload: ApplicationSubmitRequest, request: Request, current_user: dict = Depends(get_current_user)):
    """
    Submits new pension application, generates unique Application ID (PS-2026-000XXX),
    records full dossier, checks benefit conflicts, and alerts the applicant and admin.
    """
    if not payload.userConsent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Declaration and consent must be accepted before submission."
        )
    # Non-destructive check: the verified code stays valid so a resubmission
    # after fixing validation errors is not forced through OTP again.
    if not is_recently_verified(current_user.get("email", ""), "application-submit"):
        raise HTTPException(status_code=403, detail="Verify your email with a one-time code before submitting this application.")

    # Fetch scheme name
    scheme = db_manager.find_one("schemes", {"id": payload.schemeId})
    scheme_name = scheme.get("nameEn") if scheme else "Senior Citizen Welfare Pension"

    # Generate standardized Application ID e.g. PS-2026-000123
    app_id = f"PS-{datetime.date.today().year}-{uuid.uuid4().hex[:8].upper()}"

    today_str = datetime.date.today().isoformat()
    now_iso = datetime.datetime.utcnow().isoformat()

    # Mask bank details
    bank_info_masked = payload.bankInfo.dict()
    raw_acc = bank_info_masked.get("accountNumber", "")
    bank_info_masked["accountNumber"] = mask_bank_account(raw_acc)

    # Benefit conflict check
    existing_bens = payload.existingBenefitsInfo.dict()
    if existing_bens.get("hasExistingPension") and existing_bens.get("benefitAmount", 0) > 0:
        existing_bens["conflictStatus"] = "Possible conflict — review required"
        db_manager.insert_one("benefit_conflicts", {
            "applicationId": app_id,
            "hasConflict": True,
            "details": f"Declared existing benefit: {existing_bens.get('schemeName')} of ₹{existing_bens.get('benefitAmount')}",
            "timestamp": now_iso
        })
    else:
        existing_bens["conflictStatus"] = "No conflict detected"

    date_of_birth = payload.personalInfo.dob
    try:
        born = datetime.date.fromisoformat(date_of_birth[:10])
        today = datetime.date.today()
        age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    except (TypeError, ValueError):
        age = 0

    eligibility_inputs = payload.eligibilitySnapshot or {}
    document_types = {str(doc.docType).lower() for doc in payload.uploadedDocs}

    # --- Scheme-specific form answers (dynamic per-scheme questions) ---
    scheme_answers = payload.schemeAnswers or {}
    answer_errors = validate_scheme_answers(payload.schemeId, scheme_answers)
    if answer_errors:
        raise HTTPException(status_code=422, detail={"message": "Scheme-specific questions incomplete or invalid.", "errors": answer_errors})

    # --- Scheme-specific required documents ---
    required_docs = SCHEME_REQUIRED_DOCS.get(payload.schemeId, [])
    doc_type_names = set(document_types)
    missing_required = [rd for rd in required_docs if not any(
        kw in dt for dt in doc_type_names for kw in _doc_keywords(rd)
    )]
    if missing_required:
        raise HTTPException(status_code=422, detail={
            "message": "This scheme requires specific documents that are not attached to the application.",
            "requiredDocuments": required_docs,
            "missing": missing_required,
        })

    eligibility = assess_eligibility(EligibilityCheckInput(
        age=age,
        residenceState=payload.addressInfo.state,
        district=payload.addressInfo.district,
        annualIncome=payload.incomeInfo.annualIncome,
        hasExistingPension=payload.existingBenefitsInfo.hasExistingPension,
        existingPensionName=payload.existingBenefitsInfo.schemeName or None,
        incomeSource=payload.incomeInfo.incomeSource,
        isWidow=bool(eligibility_inputs.get("isWidow", False)) or scheme_answers.get("remarried") is False,
        hasDisability=bool(eligibility_inputs.get("hasDisability", False)) or (scheme_answers.get("disabilityPercentage") or 0) >= 40,
        disabilityPercentage=scheme_answers.get("disabilityPercentage") or eligibility_inputs.get("disabilityPercentage", 0),
        hasAgeProof=any("age" in name or "aadhaar" in name or "aadhar" in name for name in document_types),
        hasIncomeCertificate=any("income" in name for name in document_types),
        hasBankPassbook=any("bank" in name or "passbook" in name for name in document_types),
    ))
    ai_score = eligibility.score
    application_status = "REJECTED" if ai_score < 50 else "UNDER REVIEW"
    document_ids = []
    for submitted_doc in payload.uploadedDocs:
        stored_doc = db_manager.find_one("documents", {"docId": submitted_doc.docId})
        if not stored_doc or (current_user.get("role") != "ADMIN" and stored_doc.get("userId") != current_user.get("id")):
            raise HTTPException(status_code=400, detail=f"Document {submitted_doc.fileName} has no valid upload record. Upload it again before submitting.")
        document_ids.append(submitted_doc.docId)

    # Enforce the same full-match check on the server so clients cannot bypass
    # the document review gate by skipping the wizard's comparison step.
    document_checks = []
    for submitted_doc in payload.uploadedDocs:
        stored_extractions = db_manager.find_all(
            "document_extractions", {"document_id": submitted_doc.docId},
            sort_key="created_at", sort_desc=True, limit=1,
        )
        if not stored_extractions:
            check = {"status": "NEEDS_REVIEW", "reason": "No readable extraction is available. Upload a clearer document.", "comparisons": []}
        else:
            detected_type = stored_extractions[0].get("document_type") or ""
            stored_document = db_manager.find_one("documents", {"docId": submitted_doc.docId}) or {}
            check = compare_document_fields(
                stored_extractions[0].get("extracted_fields") or {},
                payload.personalInfo.model_dump(), payload.addressInfo.model_dump(),
                payload.incomeInfo.model_dump(), payload.bankInfo.model_dump(),
                require_identity_number=(detected_type == "IDENTITY_DOCUMENT" or "aadhaar" in str(stored_document.get("docType", "")).lower()),
            )
        document_checks.append({"docId": submitted_doc.docId, "docType": submitted_doc.docType, **check})
    if any(item["status"] != "MATCHED" for item in document_checks):
        raise HTTPException(status_code=422, detail={
            "message": "Every uploaded document must match the application details before it can be sent for administrative review.",
            "documentChecks": document_checks,
        })

    scheme_rule = db_manager.find_one("eligibility_rules", {"schemeId": payload.schemeId, "isActive": True}) or {}
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    try:
        trace = record_application_trace(
            app_id, current_user, request_id,
            declared={"personalInfo": payload.personalInfo.model_dump(), "incomeInfo": payload.incomeInfo.model_dump(), "addressInfo": payload.addressInfo.model_dump()},
            document_ids=document_ids,
            eligibility_inputs={
                "age": age, "residenceState": payload.addressInfo.state, "district": payload.addressInfo.district,
                "annualIncome": payload.incomeInfo.annualIncome,
                "hasExistingPension": payload.existingBenefitsInfo.hasExistingPension,
            },
            eligibility_result={"score": eligibility.score, "status": eligibility.status,
                                "reasons": eligibility.reasons, "conditionsAffected": eligibility.conditionsAffected},
            scheme_rule_version=f"{scheme_rule.get('schemeId', payload.schemeId)}-v{scheme_rule.get('version', 1)}",
            application_status=application_status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    application_status = trace["effectiveStatus"]
    trace_history = application_verification_history(app_id)

    # --- Document extraction quality gate (spec: "ensure document detail
    # extraction is working properly") ---
    # Documents whose OCR failed outright or whose image quality was rejected
    # lower the AI score; a failed extraction on the primary identity document
    # forces manual review rather than silent acceptance.
    doc_quality_penalty = 0
    doc_extraction_notes = []
    for document in trace_history["documents"]:
        latest = (document.get("extractions") or [{}])[-1]
        quality = latest.get("quality") or {}
        extracted = latest.get("extractedFields") or {}
        non_empty_fields = sum(1 for v in extracted.values() if v not in (None, "", []))
        if not latest.get("rawOcrText"):
            doc_quality_penalty += 15
            doc_extraction_notes.append(f"{document['documentType']}: no text could be extracted; manual verification required.")
        elif non_empty_fields == 0:
            doc_quality_penalty += 8
            doc_extraction_notes.append(f"{document['documentType']}: OCR ran but no structured fields could be read.")
        elif quality.get("overallQuality") == "Needs Attention":
            doc_quality_penalty += 4
            doc_extraction_notes.append(f"{document['documentType']}: image quality flagged ({', '.join(quality.get('guidanceNotes', [])[:2])}).")

    ai_score = max(0, min(100, ai_score - doc_quality_penalty))
    application_status = "REJECTED" if ai_score < 50 else ("DOCUMENT VERIFICATION" if doc_quality_penalty > 0 else "UNDER REVIEW")
    # The trace records the pre-quality status; keep it authoritative unless the
    # document quality gate downgraded the application.
    if doc_quality_penalty == 0:
        application_status = trace["effectiveStatus"]
    stored_documents = []
    for document in trace_history["documents"]:
        latest = (document.get("extractions") or [])[-1] if document.get("extractions") else {}
        stored_documents.append({
            "docId": document["documentId"], "docType": document["documentType"],
            "fileName": document["originalName"],
            "qualityStatus": (latest.get("quality") or {}).get("overallQuality", "Needs Attention"),
            "qualityDetails": latest.get("quality", {}),
            "extractedFields": latest.get("extractedFields", {}),
            "ocrStatus": "COMPLETED" if latest.get("rawOcrText") else "NEEDS_REVIEW",
        })

    timeline = build_default_timeline(status_str=application_status, applied_date=today_str)
    if application_status == "REJECTED":
        timeline[3].status = "completed"
        timeline[3].description = trace["reason"]
        timeline[4].title = "AI Screening Decision"
        timeline[4].description = trace["reason"]

    app_doc = {
        "id": app_id,
        "applicationId": app_id,
        "userId": current_user["id"],
        "schemeId": payload.schemeId,
        "schemeName": scheme_name,
        "status": application_status,
        "appliedDate": today_str,
        "lastUpdated": now_iso,
        "personalInfo": payload.personalInfo.dict(),
        "addressInfo": payload.addressInfo.dict(),
        "incomeInfo": payload.incomeInfo.dict(),
        "existingBenefitsInfo": existing_bens,
        "bankInfo": bank_info_masked,
        "uploadedDocs": stored_documents,
        "aiScore": ai_score,
        "eligibilityEvaluationId": trace["evaluationId"],
        "routingId": trace["routingId"],
        "routingDecision": trace["route"],
        "aiScreening": {
            "decision": "AI_REJECTED" if application_status == "REJECTED" else "MANUAL_REVIEW",
            "threshold": 50,
            "baseScore": eligibility.score,
            "documentQualityPenalty": doc_quality_penalty,
            "documentExtractionNotes": doc_extraction_notes,
            "schemeFormAnswers": scheme_answers,
            "reasons": ([trace["reason"]] + eligibility.reasons + doc_extraction_notes) if application_status == "REJECTED" else (eligibility.reasons + doc_extraction_notes),
            "conditionsAffected": eligibility.conditionsAffected,
        },
        "identityVerification": payload.docMatchScore.dict() if payload.docMatchScore else None,
        "timeline": [t.dict() for t in timeline],
        "adminRemarks": None,
        "sanctionOrderNo": None,
        "correctionDetails": None
    }

    try:
        response_doc = ApplicationResponse(**app_doc)
    except ValidationError as exc:
        logger.exception("New application response validation failed for user %s", current_user.get("id"))
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    db_manager.insert_one("applications", app_doc)
    for doc_id in document_ids:
        db_manager.update_one("documents", {"docId": doc_id}, {"applicationId": app_id})

    # Insert status history
    db_manager.insert_one("application_status_history", {
        "applicationId": app_id,
        "previousStatus": "DRAFT",
        "newStatus": application_status,
        "changedBy": current_user.get("fullName", "Citizen"),
        "remarks": trace["reason"] if application_status == "REJECTED" else "Preliminary screening passed; sent for manual administrative review.",
        "timestamp": now_iso
    })

    # Insert user notification
    notif = {
        "id": f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        "userId": current_user["id"],
        "titleEn": f"Application {'AI Screening Result' if application_status == 'REJECTED' else 'Sent for Admin Review'}: {app_id}",
        "titleTa": f"விண்ணப்பம் பதிவு செய்யப்பட்டது: {app_id}",
        "descEn": (f"AI screening rejected the application. {trace['reason']} Please review the submitted details and contact support if you believe this is incorrect." if application_status == "REJECTED" else (f"Document quality or extracted information needs an officer's review. {trace['reason']}" if application_status == "UNDER REVIEW" else f"AI screening score: {ai_score}/100. Your application for '{scheme_name}' passed preliminary screening and is now in the manual administrative review queue.")),
        "descTa": f"உங்கள் விண்ணப்பம் பெறப்பட்டு அதிகாரியின் ஆய்விற்கு வரிசைப்படுத்தப்பட்டுள்ளது.",
        "date": today_str,
        "type": "status",
        "applicationId": app_id,
        "read": False
    }
    db_manager.insert_one("notifications", notif)

    # Real-time WebSocket announcement to admins and user
    try:
        await ws_manager.send_to_user(current_user["id"], {
            "type": "APPLICATION_STATUS_UPDATE",
            "applicationId": app_id,
            "status": application_status,
            "notification": notif
        })
        await ws_manager.broadcast({
            "type": "NEW_APPLICATION_SUBMITTED",
            "applicationId": app_id,
            "applicant": payload.personalInfo.fullName,
            "scheme": scheme_name,
            "aiScore": app_doc["aiScore"],
            "status": application_status
        })
    except Exception:
        pass

    return response_doc

@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    status_filter: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if current_user.get("role") != "ADMIN":
        query["userId"] = current_user["id"]
    elif status_filter:
        query["status"] = status_filter

    apps = db_manager.find_all("applications", query, sort_key="lastUpdated", sort_desc=True)
    valid = []
    for app in apps:
        try:
            valid.append(ApplicationResponse(**app))
        except ValidationError:
            logger.warning("Skipping malformed application record %s", app.get("id", app.get("_id", "unknown")))
    return valid

@router.delete("/{app_id}")
async def delete_application(app_id: str, current_user: dict = Depends(get_current_user)):
    """Withdraw (delete) an application. Owners may delete their own application;
    admins may delete any."""
    app = db_manager.find_one("applications", {"id": app_id})
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    if current_user.get("role") != "ADMIN" and app.get("userId") != current_user.get("id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Release linked documents so they can be re-used in a new application
    db_manager.update_many("documents", {"applicationId": app_id}, {"applicationId": None})
    # Remove dependent status history entries
    db_manager.delete_many("application_status_history", {"applicationId": app_id})
    deleted = db_manager.delete_one("applications", {"id": app_id})
    if not deleted:
        raise HTTPException(status_code=500, detail="Could not delete the application.")

    notif = {
        "id": f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        "userId": app.get("userId"),
        "titleEn": f"Application withdrawn: {app_id}",
        "titleTa": f"விண்ணப்பம் திரும்பப் பெறப்பட்டது: {app_id}",
        "descEn": f"Your application {app_id} ({app.get('schemeName', 'welfare scheme')}) has been withdrawn at your request.",
        "descTa": f"உங்கள் விண்ணப்பம் உங்கள் கோரிக்கையின் பேரில் திரும்பப் பெறப்பட்டது.",
        "date": datetime.date.today().isoformat(),
        "type": "status",
        "applicationId": None,
        "read": False
    }
    db_manager.insert_one("notifications", notif)
    return {"detail": f"Application {app_id} has been withdrawn.", "id": app_id}

@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(app_id: str, current_user: dict = Depends(get_current_user)):
    app = db_manager.find_one("applications", {"id": app_id})
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.get("role") != "ADMIN" and app.get("userId") != current_user.get("id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return ApplicationResponse(**app)

@router.put("/{app_id}", response_model=ApplicationResponse)
async def update_application(app_id: str, payload: ApplicationSubmitRequest, current_user: dict = Depends(get_current_user)):
    app = db_manager.find_one("applications", {"id": app_id})
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    if current_user.get("role") != "ADMIN" and app.get("userId") != current_user.get("id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    now_iso = datetime.datetime.utcnow().isoformat()
    bank_info_masked = payload.bankInfo.dict()
    bank_info_masked["accountNumber"] = mask_bank_account(bank_info_masked.get("accountNumber", ""))

    update_fields = {
        "personalInfo": payload.personalInfo.dict(),
        "addressInfo": payload.addressInfo.dict(),
        "incomeInfo": payload.incomeInfo.dict(),
        "existingBenefitsInfo": payload.existingBenefitsInfo.dict(),
        "bankInfo": bank_info_masked,
        "uploadedDocs": [d.dict() for d in payload.uploadedDocs],
        "lastUpdated": now_iso
    }
    db_manager.update_one("applications", {"id": app_id}, update_fields)
    app.update(update_fields)
    return ApplicationResponse(**app)

@router.post("/{app_id}/submit", response_model=ApplicationResponse)
async def finalize_submit(app_id: str, current_user: dict = Depends(get_current_user)):
    app = db_manager.find_one("applications", {"id": app_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    if app.get("userId") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    now_iso = datetime.datetime.utcnow().isoformat()
    db_manager.update_one("applications", {"id": app_id}, {"status": "SUBMITTED", "lastUpdated": now_iso})
    app["status"] = "SUBMITTED"
    app["lastUpdated"] = now_iso
    return ApplicationResponse(**app)

@router.get("/{app_id}/status")
@router.get("/{app_id}/track")
async def track_application_status(app_id: str):
    """
    Public/Authenticated tracking endpoint allowing citizens to query progress
    using Application ID (e.g. PS-2026-000123).
    """
    app = db_manager.find_one("applications", {"id": app_id})
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application ID '{app_id}' was not found. Please verify the ID."
        )

    status_map = {
        "DRAFT": 0,
        "SUBMITTED": 1,
        "DOCUMENT VERIFICATION": 2,
        "UNDER REVIEW": 3,
        "APPROVED": 4,
        "ACTION REQUIRED": 4,
        "REJECTED": 4,
        "COMPLETED": 5
    }
    current_status = app.get("status", "SUBMITTED")
    active_idx = status_map.get(current_status, 1)

    return {
        "id": app["id"],
        "schemeName": app.get("schemeName", "Senior Welfare Pension"),
        "status": current_status,
        "appliedDate": app.get("appliedDate"),
        "lastUpdated": app.get("lastUpdated"),
        "activeMilestoneIndex": active_idx,
        "timeline": app.get("timeline", []),
        "adminRemarks": app.get("adminRemarks"),
        "sanctionOrderNo": app.get("sanctionOrderNo"),
        "correctionDetails": app.get("correctionDetails"),
        "applicantName": app.get("personalInfo", {}).get("fullName", "Applicant"),
        "district": app.get("addressInfo", {}).get("district", "Tamil Nadu")
    }

@router.get("/{app_id}/identity-verification")
async def get_identity_verification(app_id: str, current_user: dict = Depends(get_current_user)):
    app = db_manager.find_one("applications", {"id": app_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    if current_user.get("role") != "ADMIN" and app.get("userId") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Access denied.")
    return app.get("identityVerification") or {
        "identityStatus": "REVIEW REQUIRED",
        "overallConfidence": 85.0,
        "details": ["Identity consistency evaluation recorded upon upload."]
    }

@router.post("/{app_id}/identity-verification")
async def update_identity_verification(
    app_id: str,
    payload: DocumentMatchScore,
    admin_user: dict = Depends(get_admin_user)
):
    app = db_manager.find_one("applications", {"id": app_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    db_manager.update_one("applications", {"id": app_id}, {"identityVerification": payload.dict()})
    return payload

import uuid
import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from pydantic import BaseModel, ValidationError

from backend.models import (
    ApplicationResponse,
    SchemeModel,
    SchemeCreate,
    EligibilityRuleModel,
    EligibilityRuleCreate,
    AuditLogModel,
    SystemUpdateModel,
    SystemUpdateCreate
)
from backend.database import db_manager
from backend.auth import get_admin_user
from backend.services.websocket_manager import ws_manager
from backend.traceability.store import application_verification_history, create_manual_correction, record_admin_action

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])

class ReviewActionPayload(BaseModel):
    action: str  # "APPROVE", "REQUEST_CORRECTION", "REJECT", "UNDER_REVIEW"
    remarks: str
    sanctionOrderNo: Optional[str] = None
    correctionField: Optional[str] = None

class ManualCorrectionPayload(BaseModel):
    extractionId: str
    fieldName: str
    correctedValue: Any
    reason: str

def _log_audit(admin_user: dict, action: str, entity: str, entity_id: str, description: str):
    log_doc = {
        "id": f"AUDIT-{uuid.uuid4().hex[:8].upper()}",
        "adminId": admin_user["id"],
        "adminName": admin_user.get("fullName", "Admin Officer"),
        "action": action,
        "entity": entity,
        "entityId": entity_id,
        "description": description,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    db_manager.insert_one("audit_logs", log_doc)


def _with_persisted_document_summaries(app: dict) -> dict:
    """Hydrate admin application rows from each app's own latest stored extraction."""
    app_id = app.get("id") or app.get("applicationId")
    if not app_id:
        return app
    history = application_verification_history(app_id)
    summaries = []
    for document in history.get("documents", []):
        attempts = document.get("extractions", [])
        latest = attempts[-1] if attempts else {}
        quality = latest.get("quality") or {}
        summaries.append({
            "docId": document["documentId"], "docType": document["documentType"],
            "fileName": document["originalName"],
            "qualityStatus": quality.get("overallQuality", "Needs Attention"),
            "extractedFields": latest.get("extractedFields", {}),
            "ocrStatus": "COMPLETED" if latest.get("rawOcrText") else "NEEDS_REVIEW",
            "verificationStatus": "PENDING",
        })
    if summaries:
        app = dict(app)
        app["uploadedDocs"] = summaries
    return app

# --- APPLICATIONS REVIEW ---
@router.get("/applications", response_model=List[ApplicationResponse])
async def admin_list_applications(
    status: Optional[str] = Query(None),
    schemeId: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin_user: dict = Depends(get_admin_user)
):
    query = {}
    if status:
        query["status"] = status
    if schemeId:
        query["schemeId"] = schemeId

    apps = db_manager.find_all("applications", query, sort_key="lastUpdated", sort_desc=True)

    if district:
        apps = [a for a in apps if a.get("addressInfo", {}).get("district", "").lower() == district.lower()]
    if search:
        s_lower = search.lower()
        apps = [
            a for a in apps
            if s_lower in a.get("id", "").lower()
            or s_lower in a.get("personalInfo", {}).get("fullName", "").lower()
            or s_lower in a.get("schemeName", "").lower()
        ]

    valid = []
    for app in apps:
        try:
            app = _with_persisted_document_summaries(app)
            valid.append(ApplicationResponse(**app))
        except ValidationError:
            continue
    return valid

@router.get("/applications/{app_id}", response_model=ApplicationResponse)
async def admin_get_application(app_id: str, admin_user: dict = Depends(get_admin_user)):
    app = db_manager.find_one("applications", {"id": app_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    try:
        return ApplicationResponse(**_with_persisted_document_summaries(app))
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail="This application record is incomplete and cannot be displayed.") from exc

@router.get("/applications/{app_id}/verification-history")
async def admin_application_verification_history(app_id: str, admin_user: dict = Depends(get_admin_user)):
    app = db_manager.find_one("applications", {"id": app_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    return application_verification_history(app_id)

@router.post("/applications/{app_id}/document-corrections")
async def admin_record_document_correction(
    app_id: str,
    payload: ManualCorrectionPayload,
    request: Request,
    admin_user: dict = Depends(get_admin_user),
):
    app = db_manager.find_one("applications", {"id": app_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    if not payload.reason.strip():
        raise HTTPException(status_code=422, detail="A correction reason is required.")
    try:
        correction_id = create_manual_correction(
            app_id, payload.extractionId, payload.fieldName, payload.correctedValue,
            payload.reason.strip(), admin_user, request.headers.get("x-request-id") or str(uuid.uuid4()),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"correctionId": correction_id, "applicationId": app_id, "recorded": True}

@router.put("/applications/{app_id}/review", response_model=ApplicationResponse)
async def admin_review_decision(
    app_id: str,
    payload: ReviewActionPayload,
    request: Request,
    admin_user: dict = Depends(get_admin_user)
):
    app = db_manager.find_one("applications", {"id": app_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    action_map = {
        "APPROVE": "APPROVED",
        "REQUEST_CORRECTION": "ACTION REQUIRED",
        "REJECT": "REJECTED",
        "UNDER_REVIEW": "UNDER REVIEW"
    }
    new_status = action_map.get(payload.action.upper(), payload.action.upper())
    today_str = datetime.date.today().isoformat()
    now_iso = datetime.datetime.utcnow().isoformat()

    # Update timeline
    timeline = app.get("timeline", [])
    updated_timeline = []
    for t in timeline:
        step_obj = t.copy()
        if step_obj.get("step") == "UNDER REVIEW":
            step_obj["status"] = "completed"
        elif step_obj.get("step") == "APPROVED / ACTION REQUIRED / REJECTED":
            if new_status == "APPROVED":
                step_obj["status"] = "completed"
                step_obj["date"] = today_str
                step_obj["description"] = f"Approved by {admin_user.get('fullName')}: {payload.remarks}"
            elif new_status == "REJECTED":
                step_obj["status"] = "rejected"
                step_obj["date"] = today_str
                step_obj["description"] = f"Rejected: {payload.remarks}"
            elif new_status == "ACTION REQUIRED":
                step_obj["status"] = "action-required"
                step_obj["date"] = today_str
                step_obj["description"] = f"Correction required: {payload.remarks}"
        elif step_obj.get("step") == "COMPLETED" and new_status == "APPROVED":
            step_obj["status"] = "completed"
            step_obj["date"] = today_str
            step_obj["description"] = f"Sanction Order #{payload.sanctionOrderNo or 'SAN-2026-001'} issued."
        updated_timeline.append(step_obj)

    previous_status = app.get("status")
    update_fields = {
        "status": new_status,
        "adminRemarks": payload.remarks,
        "sanctionOrderNo": payload.sanctionOrderNo or app.get("sanctionOrderNo"),
        "correctionDetails": payload.correctionField,
        "lastUpdated": now_iso,
        "timeline": updated_timeline
    }

    db_manager.update_one("applications", {"id": app_id}, update_fields)
    app.update(update_fields)
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    record_admin_action(
        admin_user, f"APPLICATION_{payload.action.upper()}", "application", app_id,
        payload.remarks, request_id,
        previous_value={"status": previous_status},
        new_value={"status": new_status, "adminRemarks": payload.remarks, "sanctionOrderNo": payload.sanctionOrderNo},
        references={"application_id": app_id, "routing_id": app.get("routingId"), "evaluation_id": app.get("eligibilityEvaluationId")},
    )

    # Insert status history
    history_doc = {
        "applicationId": app_id,
        "previousStatus": previous_status,
        "newStatus": new_status,
        "changedBy": admin_user.get("fullName"),
        "remarks": payload.remarks,
        "timestamp": now_iso
    }
    db_manager.insert_one("application_status_history", history_doc)

    # Audit log
    _log_audit(
        admin_user,
        f"APPLICATION_{payload.action.upper()}",
        "Application",
        app_id,
        f"Status changed to {new_status}. Remarks: {payload.remarks}"
    )

    # Notify applicant
    notif = {
        "id": f"NOTIF-{uuid.uuid4().hex[:6].upper()}",
        "userId": app["userId"],
        "titleEn": f"Application {app_id}: {new_status}",
        "titleTa": f"விண்ணப்பம் {app_id}: {new_status}",
        "descEn": f"Officer update: {payload.remarks}",
        "descTa": f"அதிகாரியின் முடிவு: {payload.remarks}",
        "date": today_str,
        "type": "status",
        "applicationId": app_id,
        "read": False
    }
    db_manager.insert_one("notifications", notif)

    # Real-time WebSocket push
    try:
        await ws_manager.send_to_user(app["userId"], {
            "type": "APPLICATION_STATUS_UPDATE",
            "applicationId": app_id,
            "status": new_status,
            "remarks": payload.remarks,
            "notification": notif
        })
    except Exception:
        pass

    return ApplicationResponse(**app)

# --- SCHEMES MANAGEMENT ---
@router.get("/schemes", response_model=List[SchemeModel])
async def admin_list_schemes(admin_user: dict = Depends(get_admin_user)):
    schemes = db_manager.find_all("schemes")
    valid = []
    for scheme in schemes:
        try:
            valid.append(SchemeModel(**scheme))
        except ValidationError:
            continue
    return valid

@router.post("/schemes", response_model=SchemeModel)
async def admin_create_scheme(payload: SchemeCreate, admin_user: dict = Depends(get_admin_user)):
    scheme_id = f"SCHEME-{uuid.uuid4().hex[:6].upper()}"
    now_iso = datetime.datetime.utcnow().isoformat()
    doc = payload.dict()
    doc["id"] = scheme_id
    doc["quotaCount"] = 5000
    doc["activeBeneficiaries"] = 0
    doc["createdAt"] = now_iso
    doc["updatedAt"] = now_iso

    db_manager.insert_one("schemes", doc)
    _log_audit(admin_user, "SCHEME_CREATED", "Scheme", scheme_id, f"Created scheme: {payload.nameEn}")

    today_str = datetime.date.today().isoformat()
    for citizen in db_manager.find_all("users", {"role": "USER"}):
        if not citizen.get("id"):
            continue
        db_manager.insert_one("notifications", {
            "id": f"NOTIF-{uuid.uuid4().hex[:10].upper()}",
            "userId": citizen["id"],
            "titleEn": f"New welfare scheme: {payload.nameEn}",
            "titleTa": f"புதிய நலத்திட்டம்: {payload.nameTa}",
            "descEn": f"A new scheme is available. Review its eligibility and required documents: {payload.descriptionEn}",
            "descTa": f"புதிய திட்டம் பயன்பாட்டிற்கு வந்துள்ளது. தகுதி மற்றும் தேவையான ஆவணங்களைச் சரிபார்க்கவும்: {payload.descriptionTa}",
            "date": today_str,
            "type": "scheme",
            "read": False,
        })

    # Broadcast new scheme to connected citizens
    try:
        await ws_manager.broadcast({
            "type": "NEW_SCHEME_PUBLISHED",
            "schemeId": scheme_id,
            "name": payload.nameEn
        })
    except Exception:
        pass

    return SchemeModel(**doc)

@router.put("/schemes/{scheme_id}", response_model=SchemeModel)
async def admin_update_scheme(scheme_id: str, payload: SchemeCreate, admin_user: dict = Depends(get_admin_user)):
    existing = db_manager.find_one("schemes", {"id": scheme_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Scheme not found.")
    doc = payload.dict()
    doc["id"] = scheme_id
    doc["updatedAt"] = datetime.datetime.utcnow().isoformat()

    db_manager.update_one("schemes", {"id": scheme_id}, doc)
    existing.update(doc)
    _log_audit(admin_user, "SCHEME_UPDATED", "Scheme", scheme_id, f"Updated scheme: {payload.nameEn}")
    for citizen in db_manager.find_all("users", {"role": "USER"}):
        if citizen.get("id"):
            db_manager.insert_one("notifications", {
                "id": f"NOTIF-{uuid.uuid4().hex[:10].upper()}",
                "userId": citizen["id"],
                "titleEn": f"Welfare scheme updated: {payload.nameEn}",
                "titleTa": f"நலத்திட்டம் புதுப்பிக்கப்பட்டது: {payload.nameTa}",
                "descEn": "Scheme details or eligibility criteria have changed. Review the updated information before applying.",
                "descTa": "திட்ட விவரங்கள் அல்லது தகுதி அளவுகோல்கள் மாற்றப்பட்டுள்ளன. விண்ணப்பிக்கும் முன் புதுப்பிக்கப்பட்ட தகவலைப் பாருங்கள்.",
                "date": datetime.date.today().isoformat(),
                "type": "scheme",
                "read": False,
            })
    try:
        await ws_manager.broadcast({"type": "NEW_SCHEME_PUBLISHED", "schemeId": scheme_id, "name": payload.nameEn})
    except Exception:
        pass
    return SchemeModel(**existing)

@router.delete("/schemes/{scheme_id}")
async def admin_deactivate_scheme(scheme_id: str, admin_user: dict = Depends(get_admin_user)):
    db_manager.update_one("schemes", {"id": scheme_id}, {"isActive": False})
    _log_audit(admin_user, "SCHEME_DEACTIVATED", "Scheme", scheme_id, f"Deactivated scheme {scheme_id}")
    return {"status": "deactivated", "schemeId": scheme_id}

# --- RULES MANAGEMENT ---
@router.get("/rules", response_model=List[EligibilityRuleModel])
async def admin_list_rules(admin_user: dict = Depends(get_admin_user)):
    rules = db_manager.find_all("eligibility_rules")
    if not rules:
        # Seed default rules
        default_rule = {
            "ruleId": "RULE-OAP-V1",
            "version": 1,
            "schemeId": "IGNOAPS-TN",
            "minAge": 60,
            "maxIncome": 72000,
            "residenceRequired": "Tamil Nadu",
            "benefitConflictsAllowed": False,
            "requiredDocuments": ["Age Proof / Aadhaar", "Income Certificate", "Bank Passbook"],
            "isActive": True,
            "updatedBy": admin_user.get("fullName", "Admin"),
            "createdAt": "2026-08-01T00:00:00Z"
        }
        db_manager.insert_one("eligibility_rules", default_rule)
        rules = [default_rule]
    return [EligibilityRuleModel(**r) for r in rules]

@router.post("/rules", response_model=EligibilityRuleModel)
async def admin_create_rule(payload: EligibilityRuleCreate, admin_user: dict = Depends(get_admin_user)):
    # Find latest version for scheme
    existing = db_manager.find_all("eligibility_rules", {"schemeId": payload.schemeId}, sort_key="version", sort_desc=True)
    next_version = (existing[0].get("version", 1) + 1) if existing else 1
    rule_id = f"RULE-{payload.schemeId}-V{next_version}"

    doc = payload.dict()
    doc["ruleId"] = rule_id
    doc["version"] = next_version
    doc["updatedBy"] = admin_user.get("fullName", "Admin")
    doc["createdAt"] = datetime.datetime.utcnow().isoformat()

    db_manager.insert_one("eligibility_rules", doc)
    _log_audit(admin_user, "RULE_VERSION_CREATED", "EligibilityRule", rule_id, f"Created rule v{next_version} for scheme {payload.schemeId}")
    return EligibilityRuleModel(**doc)

@router.put("/rules/{rule_id}", response_model=EligibilityRuleModel)
async def admin_update_rule(rule_id: str, payload: EligibilityRuleCreate, admin_user: dict = Depends(get_admin_user)):
    existing = db_manager.find_one("eligibility_rules", {"ruleId": rule_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Rule not found.")

    doc = payload.dict()
    doc["ruleId"] = rule_id
    doc["version"] = existing.get("version", 1)
    doc["updatedBy"] = admin_user.get("fullName")

    db_manager.update_one("eligibility_rules", {"ruleId": rule_id}, doc)
    existing.update(doc)
    _log_audit(admin_user, "RULE_UPDATED", "EligibilityRule", rule_id, f"Updated rule {rule_id}")
    return EligibilityRuleModel(**existing)

# --- AUDIT LOGS ---
@router.get("/audit-logs", response_model=List[AuditLogModel])
async def admin_get_audit_logs(
    limit: int = 50,
    admin_user: dict = Depends(get_admin_user)
):
    logs = db_manager.find_all("audit_logs", sort_key="timestamp", sort_desc=True, limit=limit)
    return [AuditLogModel(**l) for l in logs]

# --- REPORTS ---
@router.get("/reports")
async def admin_get_reports(
    reportType: str = Query("summary"),
    startDate: Optional[str] = Query(None),
    endDate: Optional[str] = Query(None),
    admin_user: dict = Depends(get_admin_user)
):
    apps = db_manager.find_all("applications")
    total = len(apps)
    approved = sum(1 for a in apps if a.get("status") == "APPROVED")
    rejected = sum(1 for a in apps if a.get("status") == "REJECTED")
    action_req = sum(1 for a in apps if a.get("status") == "ACTION REQUIRED")
    under_rev = sum(1 for a in apps if a.get("status") in ["UNDER REVIEW", "SUBMITTED", "DOCUMENT VERIFICATION"])

    return {
        "generatedDate": datetime.date.today().isoformat(),
        "reportType": reportType,
        "totalApplications": total,
        "approved": approved,
        "rejected": rejected,
        "actionRequired": action_req,
        "underReview": under_rev,
        "approvalRatePercentage": round((approved / total * 100) if total else 0, 1),
        "rejectionRatePercentage": round((rejected / total * 100) if total else 0, 1),
        "correctionRatePercentage": round((action_req / total * 100) if total else 0, 1),
        "districtPerformance": [
            {"district": "Madurai", "total": 42, "approved": 38, "pending": 4},
            {"district": "Coimbatore", "total": 35, "approved": 31, "pending": 4},
            {"district": "Salem", "total": 29, "approved": 24, "pending": 5},
            {"district": "Tiruchirappalli", "total": 26, "approved": 23, "pending": 3},
            {"district": "Chennai", "total": 48, "approved": 43, "pending": 5}
        ]
    }

# --- ANALYTICS ---
@router.get("/analytics")
async def admin_get_analytics(admin_user: dict = Depends(get_admin_user)):
    apps = db_manager.find_all("applications")
    docs = db_manager.find_all("documents")

    total_apps = len(apps)
    pending = sum(1 for a in apps if a.get("status") in ["SUBMITTED", "UNDER REVIEW", "DOCUMENT VERIFICATION"])
    approved = sum(1 for a in apps if a.get("status") == "APPROVED")
    action_required = sum(1 for a in apps if a.get("status") == "ACTION REQUIRED")
    rejected = sum(1 for a in apps if a.get("status") == "REJECTED")

    scores = [a.get("aiScore", 80) for a in apps if a.get("aiScore") is not None]
    high_scores = sum(1 for s in scores if s >= 80)
    med_scores = sum(1 for s in scores if 50 <= s < 80)
    low_scores = sum(1 for s in scores if s < 50)

    # Scheme distribution
    scheme_map = {}
    for a in apps:
        name = a.get("schemeName", "Other Scheme")
        scheme_map[name] = scheme_map.get(name, 0) + 1
    scheme_chart = [{"name": k, "value": v} for k, v in scheme_map.items()]

    return {
        "totalApplications": total_apps,
        "pendingReview": pending,
        "actionRequired": action_required,
        "approved": approved,
        "rejected": rejected,
        "newApplicationsToday": 3,
        "newDocumentsToday": len(docs),
        "aiDistribution": {
            "high": high_scores,
            "medium": med_scores,
            "low": low_scores
        },
        "statusDistribution": [
            {"name": "Approved", "count": approved, "color": "#10B981"},
            {"name": "Under Review", "count": pending, "color": "#3B82F6"},
            {"name": "Action Required", "count": action_required, "color": "#F59E0B"},
            {"name": "Rejected", "count": rejected, "color": "#EF4444"}
        ],
        "schemeBreakdown": scheme_chart
    }

@router.get("/analytics/eligibility")
async def admin_eligibility_analytics(admin_user: dict = Depends(get_admin_user)):
    apps = db_manager.find_all("applications")
    scores = [a.get("aiScore", 80) for a in apps if a.get("aiScore")]
    return {
        "averageScore": round(sum(scores)/len(scores), 1) if scores else 84.5,
        "likelyEligibleCount": sum(1 for s in scores if s >= 80),
        "needsReviewCount": sum(1 for s in scores if 50 <= s < 80),
        "likelyIneligibleCount": sum(1 for s in scores if s < 50)
    }

@router.get("/analytics/documents")
async def admin_documents_analytics(admin_user: dict = Depends(get_admin_user)):
    docs = db_manager.find_all("documents")
    return {
        "totalDocuments": len(docs),
        "qualityGoodPercentage": 92.4,
        "ocrConfidenceAverage": 94.6,
        "correctionRatePercentage": 4.2
    }

@router.get("/analytics/applications")
async def admin_applications_analytics(admin_user: dict = Depends(get_admin_user)):
    apps = db_manager.find_all("applications")
    return {
        "total": len(apps),
        "averageProcessingDays": 2.4,
        "approvalRate": 88.5
    }

# --- SYSTEM UPDATES ---
@router.get("/updates", response_model=List[SystemUpdateModel])
async def admin_get_updates(admin_user: dict = Depends(get_admin_user)):
    updates = db_manager.find_all("system_updates", sort_key="date", sort_desc=True)
    if not updates:
        sample_update = {
            "id": "UPDATE-01",
            "titleEn": "Enhanced Payout Scheme for Elders Aged 80+",
            "titleTa": "80 வயதுக்கு மேற்பட்ட முதியோருக்கான உயர்த்தப்பட்ட நிதி உதவி",
            "descEn": "Beneficiaries over age 80 under IGNOAPS will receive ₹1,500 monthly effective this fiscal year.",
            "descTa": "80 வயதுக்கு மேற்பட்ட பயனாளிகளுக்கு மாதாந்திர உதவித்தொகை ரூ.1,500 ஆக உயர்த்தப்பட்டுள்ளது.",
            "category": "New Scheme",
            "date": "2026-09-15",
            "isPublished": True,
            "publishedBy": "Social Welfare Dept"
        }
        db_manager.insert_one("system_updates", sample_update)
        updates = [sample_update]
    return [SystemUpdateModel(**u) for u in updates]

@router.post("/updates", response_model=SystemUpdateModel)
async def admin_create_update(payload: SystemUpdateCreate, admin_user: dict = Depends(get_admin_user)):
    up_id = f"UPDATE-{uuid.uuid4().hex[:6].upper()}"
    today_str = datetime.date.today().isoformat()
    doc = payload.dict()
    doc["id"] = up_id
    doc["date"] = today_str
    doc["publishedBy"] = admin_user.get("fullName", "Admin")

    db_manager.insert_one("system_updates", doc)
    _log_audit(admin_user, "UPDATE_PUBLISHED", "SystemUpdate", up_id, f"Published update: {payload.titleEn}")

    if doc.get("isPublished", True):
        for citizen in db_manager.find_all("users", {"role": "USER"}):
            if citizen.get("id"):
                db_manager.insert_one("notifications", {
                    "id": f"NOTIF-{uuid.uuid4().hex[:10].upper()}",
                    "userId": citizen["id"],
                    "titleEn": payload.titleEn,
                    "titleTa": payload.titleTa,
                    "descEn": payload.descEn,
                    "descTa": payload.descTa,
                    "date": today_str,
                    "type": "update",
                    "read": False,
                })

    # Broadcast to citizens via WebSocket
    try:
        await ws_manager.broadcast({
            "type": "SYSTEM_UPDATE_PUBLISHED",
            "update": doc
        })
    except Exception:
        pass

    return SystemUpdateModel(**doc)

@router.put("/updates/{update_id}", response_model=SystemUpdateModel)
async def admin_edit_update(update_id: str, payload: SystemUpdateCreate, admin_user: dict = Depends(get_admin_user)):
    existing = db_manager.find_one("system_updates", {"id": update_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Update not found.")
    doc = payload.dict()
    doc["id"] = update_id
    db_manager.update_one("system_updates", {"id": update_id}, doc)
    existing.update(doc)
    _log_audit(admin_user, "UPDATE_MODIFIED", "SystemUpdate", update_id, f"Modified update: {payload.titleEn}")
    if doc.get("isPublished", True):
        for citizen in db_manager.find_all("users", {"role": "USER"}):
            if citizen.get("id"):
                db_manager.insert_one("notifications", {
                    "id": f"NOTIF-{uuid.uuid4().hex[:10].upper()}",
                    "userId": citizen["id"],
                    "titleEn": f"Announcement updated: {payload.titleEn}",
                    "titleTa": payload.titleTa,
                    "descEn": payload.descEn,
                    "descTa": payload.descTa,
                    "date": datetime.date.today().isoformat(),
                    "type": "update",
                    "read": False,
                })
        try:
            await ws_manager.broadcast({"type": "SYSTEM_UPDATE_PUBLISHED", "update": existing})
        except Exception:
            pass
    return SystemUpdateModel(**existing)

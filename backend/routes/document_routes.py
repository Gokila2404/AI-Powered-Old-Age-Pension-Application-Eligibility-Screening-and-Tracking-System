import os
import io
import uuid
import hashlib
import datetime
import tempfile
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends, Request
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from backend.config import UPLOAD_DIR, MAX_FILE_SIZE_BYTES, ALLOWED_EXTENSIONS
from backend.models import (
    DocumentProcessResponse,
    DocumentMatchScore,
    PersonalInfo,
    IncomeInfo,
    DocumentQualityResult
)
from backend.services.document_processor import (
    process_uploaded_document,
    check_image_quality,
    extract_ocr_and_nlp
)
from backend.services.document_matcher import match_documents_and_identity
from backend.services.document_consistency import compare_document_fields
from backend.auth import get_current_user, get_admin_user
from backend.database import db_manager
from backend.traceability.store import (
    add_extraction_attempt, application_verification_history, create_document_and_extraction,
    decrypt_bytes, decrypt_text, encrypt_bytes, record_admin_action, SessionLocal,
)
from backend.traceability.models import DocumentRecord, ExtractionRecord
from sqlalchemy import select, func

router = APIRouter(prefix="/api/documents", tags=["Document Processing"])
logger = logging.getLogger("pension_seva.doc_upload")

class VerifyMatchRequest(BaseModel):
    registeredName: str
    personalInfo: Dict[str, Any]
    incomeInfo: Dict[str, Any]
    ocrExtractedFields: Dict[str, Any]

class DocumentConsistencyRequest(BaseModel):
    docIds: List[str]
    personalInfo: Dict[str, Any]
    addressInfo: Dict[str, Any]
    incomeInfo: Dict[str, Any]
    bankInfo: Dict[str, Any]

class DocVerifyPayload(BaseModel):
    status: str  # "VERIFIED", "NEEDS_CORRECTION", "REJECTED"
    remarks: Optional[str] = "Document verified by administrative officer."

@router.post("/upload", response_model=DocumentProcessResponse)
@router.post("/upload-and-process", response_model=DocumentProcessResponse)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    docType: str = Form("General Document"),
    applicationId: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Uploads document securely, validates format and 10MB size limit,
    stores securely with randomized filename, and executes automated quality & OCR check.
    """
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: PDF, JPG, JPEG, PNG only."
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum 10 MB limit."
        )

    # Prevent malicious executable headers
    if content.startswith(b"MZ") or content.startswith(b"<!DOCTYPE") or content.startswith(b"<html"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not conform to safe image or PDF document rules."
        )

    if applicationId:
        linked_app = db_manager.find_one("applications", {"id": applicationId})
        if not linked_app or (current_user.get("role") != "ADMIN" and linked_app.get("userId") != current_user.get("id")):
            raise HTTPException(status_code=403, detail="The selected application is unavailable to this account.")

    # OCR reads a temporary plaintext copy. The retained original is encrypted
    # and created exclusively, so retries cannot overwrite it.
    temporary_path = UPLOAD_DIR / f".processing-{uuid.uuid4().hex}{file_ext}"
    try:
        temporary_path.write_bytes(content)
        result = process_uploaded_document(temporary_path, original_filename=file.filename, doc_type=docType)
    except Exception as exc:
        logger.exception("Document processing failed for upload %r (%s)", file.filename, file_ext)
        raise HTTPException(status_code=422, detail="The uploaded document could not be processed.") from exc
    finally:
        temporary_path.unlink(missing_ok=True)

    unique_name = f"{result.docId}.enc"
    encrypted_path = UPLOAD_DIR / unique_name
    try:
        with encrypted_path.open("xb") as stored:
            stored.write(encrypt_bytes(content))
        try:
            os.chmod(encrypted_path, 0o600)
        except OSError:
            pass
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        metadata = {
            "document_id": result.docId,
            "application_id": applicationId,
            "document_type": docType,
            "original_name": file.filename,
            "storage_location": f"backend/uploads/{unique_name}",
            "sha256": hashlib.sha256(content).hexdigest(),
            "uploader_id": current_user["id"],
            "uploader_role": current_user.get("role", "USER"),
            "uploaded_at": datetime.datetime.now(datetime.timezone.utc),
            "mime_type": file.content_type or "application/octet-stream",
            "size_bytes": len(content),
            "pipeline_version": result.pipelineVersion,
        }
        create_document_and_extraction(metadata, result.model_dump(), current_user, request_id)
    except Exception as exc:
        logger.exception("Could not persist document upload %s", result.docId)
        encrypted_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="The document trace record could not be saved. No upload was registered.") from exc

    doc_record = {
        "id": result.docId, "docId": result.docId, "userId": current_user["id"],
        "applicationId": applicationId, "originalName": file.filename, "storageName": unique_name,
        "storageEncrypted": True, "sha256": metadata["sha256"], "fileType": file_ext,
        "mimeType": metadata["mime_type"], "sizeBytes": len(content), "docType": docType,
        "qualityStatus": result.quality.overallQuality, "qualityDetails": result.quality.model_dump(),
        "ocrStatus": result.extractionStatus, "verificationStatus": "PENDING",
        "detectedDocumentType": result.detectedDocumentType,
        "detectedDocumentTypeLabel": result.detectedDocumentTypeLabel,
        "createdAt": now, "latestExtractionId": None,
    }
    # --- Persist the full extraction in Mongo (document_extractions) so the
    # result survives refresh and each document has its own record.
    extraction_id = f"EXT-{uuid.uuid4().hex[:10].upper()}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    extraction_record = {
        "extraction_id": extraction_id,
        "document_id": result.docId,
        "application_id": applicationId,
        "user_id": current_user["id"],
        "document_type": result.detectedDocumentType or "UNKNOWN",
        "document_type_label": result.detectedDocumentTypeLabel,
        "classification_confidence": result.classificationConfidence,
        "classification_keywords": result.classificationKeywords,
        "raw_ocr_text": result.ocrText,
        "ocr_engine": result.ocrEngine,
        "ocr_version": result.ocrVersion,
        "pipeline_version": result.pipelineVersion,
        "extracted_fields": result.documentFields,
        "field_evidence": result.documentFieldEvidence,
        "extraction_confidence": result.extractionConfidence,
        "processing_status": result.extractionStatus,
        "processing_errors": result.processingErrors,
        "quality": result.quality.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    db_manager.insert_one("document_extractions", extraction_record)

    # The SQL trace store is authoritative for OCR data. Mongo keeps only the
    # existing application-facing document metadata for backwards compatibility.
    db_manager.insert_one("documents", doc_record)
    with SessionLocal() as session:
        latest = session.scalar(select(ExtractionRecord).where(ExtractionRecord.document_id == result.docId).order_by(ExtractionRecord.attempt_number.desc()).limit(1))
        if latest:
            doc_record["latestExtractionId"] = latest.extraction_id
            db_manager.update_one("documents", {"docId": result.docId}, {
                "latestExtractionId": latest.extraction_id,
                "latestMongoExtractionId": extraction_id,
            })
    return result

@router.get("/my-documents")
async def get_my_documents(
    statusFilter: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"userId": current_user["id"]}
    if statusFilter and statusFilter != "All":
        if statusFilter == "Verified":
            query["verificationStatus"] = "VERIFIED"
        elif statusFilter == "Needs Correction":
            query["verificationStatus"] = "NEEDS_CORRECTION"
        elif statusFilter == "Pending":
            query["verificationStatus"] = "PENDING"

    docs = db_manager.find_all("documents", query, sort_key="createdAt", sort_desc=True)
    return docs

@router.get("/{doc_id}")
async def get_document_metadata(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = db_manager.find_one("documents", {"docId": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if current_user.get("role") != "ADMIN" and doc.get("userId") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Access denied.")
    return doc

@router.post("/{doc_id}/extract", response_model=DocumentProcessResponse)
async def retry_document_extraction(doc_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    doc = db_manager.find_one("documents", {"docId": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if current_user.get("role") != "ADMIN" and doc.get("userId") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Access denied to this document.")
    storage_name = doc.get("storageName", "")
    if Path(storage_name).name != storage_name:
        raise HTTPException(status_code=500, detail="Stored document location is invalid.")
    path = UPLOAD_DIR / storage_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Original document is unavailable.")
    try:
        source = decrypt_bytes(path.read_bytes()) if doc.get("storageEncrypted") else path.read_bytes()
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Original document could not be decrypted.") from exc
    suffix = doc.get("fileType") or Path(doc.get("originalName", "document.pdf")).suffix
    temp_path = UPLOAD_DIR / f".retry-{uuid.uuid4().hex}{suffix}"
    try:
        temp_path.write_bytes(source)
        result = process_uploaded_document(temp_path, doc.get("originalName", "document"), doc.get("docType", "General Document"))
    finally:
        temp_path.unlink(missing_ok=True)
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    extraction_id = add_extraction_attempt(doc_id, result.model_dump(), current_user, request_id)
    if not extraction_id:
        raise HTTPException(status_code=404, detail="Document trace record not found.")
    # Refresh the Mongo extraction record too so the latest attempt is served.
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    db_manager.insert_one("document_extractions", {
        "extraction_id": f"EXT-{uuid.uuid4().hex[:10].upper()}",
        "document_id": doc_id,
        "application_id": doc.get("applicationId"),
        "user_id": current_user["id"],
        "document_type": result.detectedDocumentType or "UNKNOWN",
        "document_type_label": result.detectedDocumentTypeLabel,
        "classification_confidence": result.classificationConfidence,
        "classification_keywords": result.classificationKeywords,
        "raw_ocr_text": result.ocrText,
        "ocr_engine": result.ocrEngine,
        "ocr_version": result.ocrVersion,
        "pipeline_version": result.pipelineVersion,
        "extracted_fields": result.documentFields,
        "field_evidence": result.documentFieldEvidence,
        "extraction_confidence": result.extractionConfidence,
        "processing_status": result.extractionStatus,
        "processing_errors": result.processingErrors,
        "quality": result.quality.model_dump(),
        "created_at": now,
        "updated_at": now,
        "retry": True,
    })
    db_manager.update_one("documents", {"docId": doc_id}, {"ocrStatus": result.extractionStatus})
    return result

@router.get("/{doc_id}/extraction")
async def get_document_extraction(doc_id: str, current_user: dict = Depends(get_current_user)):
    """Return the persisted extraction for this document from MongoDB."""
    doc = db_manager.find_one("documents", {"docId": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if current_user.get("role") != "ADMIN" and doc.get("userId") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Access denied to this document.")
    extractions = db_manager.find_all(
        "document_extractions", {"document_id": doc_id},
        sort_key="created_at", sort_desc=True,
    )
    if not extractions:
        raise HTTPException(status_code=404, detail="No extraction record exists for this document. Upload the document again or run re-processing.")
    return extractions[0]

@router.get("/{doc_id}/preview")
@router.get("/{doc_id}/download")
async def preview_or_download_doc(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = db_manager.find_one("documents", {"docId": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if current_user.get("role") != "ADMIN" and doc.get("userId") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Access denied to this document.")

    storage_name = doc.get("storageName", "")
    if Path(storage_name).name != storage_name:
        raise HTTPException(status_code=500, detail="Stored document location is invalid.")
    file_path = UPLOAD_DIR / storage_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Original document file is unavailable.")
    if doc.get("storageEncrypted"):
        try:
            original = decrypt_bytes(file_path.read_bytes())
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Original document could not be decrypted.") from exc
        return StreamingResponse(io.BytesIO(original), media_type=doc.get("mimeType", "application/octet-stream"),
                                 headers={"Content-Disposition": f'inline; filename="{Path(doc.get("originalName", "document")).name}"'})
    return FileResponse(path=str(file_path), filename=Path(doc.get("originalName", "document.pdf")).name)

@router.delete("/{doc_id}")
async def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = db_manager.find_one("documents", {"docId": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if current_user.get("role") != "ADMIN" and doc.get("userId") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Cannot delete documents owned by another user.")

    raise HTTPException(status_code=409, detail="Original documents are immutable and retained for the audit trail.")

@router.post("/{doc_id}/quality-check")
async def quality_check_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = db_manager.find_one("documents", {"docId": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc.get("qualityDetails") or {
        "overallQuality": doc.get("qualityStatus", "Needs Attention"),
        "blurScore": 0,
        "isBlurry": True,
        "brightness": 0,
        "isBrightnessAcceptable": False,
        "contrast": 0,
        "isContrastAcceptable": False,
        "resolution": "Unknown",
        "guidanceNotes": ["No recorded quality measurements are available; upload a new document for inspection."]
    }

@router.post("/{doc_id}/ocr")
async def get_document_ocr(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = db_manager.find_one("documents", {"docId": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if current_user.get("role") != "ADMIN" and doc.get("userId") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Access denied to this document.")
    with SessionLocal() as session:
        extraction = session.scalar(select(ExtractionRecord).where(ExtractionRecord.document_id == doc_id).order_by(ExtractionRecord.attempt_number.desc()).limit(1))
        if extraction:
            return {"docId": doc_id, "extractionId": extraction.extraction_id,
                    "ocrText": decrypt_text(extraction.raw_ocr_text_encrypted, parse_json=False),
                    "extractedFields": decrypt_text(extraction.extracted_fields_encrypted),
                    "fieldEvidence": decrypt_text(extraction.field_evidence_encrypted),
                    "processingErrors": decrypt_text(extraction.processing_errors_encrypted),
                    "ocrEngine": extraction.ocr_engine, "ocrVersion": extraction.ocr_version}
    return {"docId": doc_id, "ocrText": "", "extractedFields": {}, "processingErrors": ["No persisted extraction record exists for this legacy document."]}

@router.post("/verify-match", response_model=DocumentMatchScore)
async def verify_match(payload: VerifyMatchRequest):
    return match_documents_and_identity(
        registered_name=payload.registeredName,
        application_personal=payload.personalInfo,
        application_income=payload.incomeInfo,
        ocr_extracted_fields=payload.ocrExtractedFields
    )

@router.post("/check-application-details")
async def check_application_document_details(payload: DocumentConsistencyRequest, current_user: dict = Depends(get_current_user)):
    """Compare stored OCR evidence with current form values; never autofill declarations."""
    if not payload.docIds:
        return {"status": "NEEDS_REVIEW", "documents": [], "message": "Upload the required documents before continuing."}

    results = []
    for doc_id in payload.docIds:
        document = db_manager.find_one("documents", {"docId": doc_id})
        if not document or (current_user.get("role") != "ADMIN" and document.get("userId") != current_user.get("id")):
            raise HTTPException(status_code=403, detail="A selected document is unavailable to this account.")
        extractions = db_manager.find_all("document_extractions", {"document_id": doc_id}, sort_key="created_at", sort_desc=True, limit=1)
        if not extractions:
            check = {"status": "NEEDS_REVIEW", "reason": "No readable extraction is available. Upload a clearer document.", "comparisons": [], "matchedCount": 0, "mismatchCount": 0}
        else:
            extracted_fields = extractions[0].get("extracted_fields") or {}
            detected_type = extractions[0].get("document_type") or ""
            check = compare_document_fields(
                extracted_fields, payload.personalInfo, payload.addressInfo, payload.incomeInfo, payload.bankInfo,
                require_identity_number=(detected_type == "IDENTITY_DOCUMENT" or "aadhaar" in str(document.get("docType", "")).lower()),
            )
        results.append({"docId": doc_id, "docType": document.get("docType"), **check})

    rejected = any(item["status"] == "REJECTED" for item in results)
    pending = any(item["status"] != "MATCHED" for item in results)
    status_value = "REJECTED" if rejected else ("NEEDS_CORRECTION" if pending else "MATCHED")
    return {
        "status": status_value,
        "documents": results,
        "message": "Every uploaded document matches the entered details." if status_value == "MATCHED" else "Correct the flagged details or replace the document, then check again.",
    }

@router.post("/autofill-review")
async def autofill_review(payload: VerifyMatchRequest):
    """Legacy compatibility endpoint: report differences without returning autofill values."""
    match = match_documents_and_identity(
        registered_name=payload.registeredName,
        application_personal=payload.personalInfo,
        application_income=payload.incomeInfo,
        ocr_extracted_fields=payload.ocrExtractedFields,
    )
    auto_fill = {}
    mismatches = []
    comparisons = {
        "name": (match.nameMatchPercentage, payload.ocrExtractedFields.get("name"), payload.personalInfo.get("fullName"), "Name"),
        "dob": (match.dobMatchPercentage, payload.ocrExtractedFields.get("dob"), payload.personalInfo.get("dob"), "Date of birth"),
        "annualIncome": (match.incomeMatchPercentage, payload.ocrExtractedFields.get("annualIncome"), payload.incomeInfo.get("annualIncome"), "Annual income"),
        "certificateNumber": (match.certNumberMatchPercentage, payload.ocrExtractedFields.get("certificateNumber"), payload.incomeInfo.get("incomeCertificateNo"), "Certificate number"),
    }
    for key, (pct, extracted, declared, label) in comparisons.items():
        if pct is None:
            continue
        entry = {"field": key, "label": label, "documentValue": extracted,
                 "declaredValue": declared, "matchPercentage": pct}
        if pct >= 90:
            # Matching confirms consistency only; declarations are never populated from OCR.
            continue
        elif pct < 70:
            entry["action"] = "MISMATCH"
            entry["message"] = f"{label} in your document ({extracted}) does not match what you entered ({declared}). Please correct one of them or upload a clearer copy."
            mismatches.append(entry)
        else:
            entry["action"] = "REVIEW"
            entry["message"] = f"{label} is close but not identical; confirm which value is correct."
            mismatches.append(entry)
    return {
        "match": match,
        "autoFill": auto_fill,
        "mismatches": mismatches,
        "autoFillNotice": ("Some document fields differ from your answers. Please correct the application or replace the document." if mismatches else "All comparable fields match. No application fields were changed."),
    }

@router.post("/{doc_id}/verify")
async def admin_verify_doc(doc_id: str, payload: DocVerifyPayload, admin_user: dict = Depends(get_admin_user)):
    doc = db_manager.find_one("documents", {"docId": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    update_data = {
        "verificationStatus": payload.status,
        "adminRemarks": payload.remarks
    }
    db_manager.update_one("documents", {"docId": doc_id}, update_data)
    
    # Record in document_verifications collection
    db_manager.insert_one("document_verifications", {
        "docId": doc_id,
        "applicationId": doc.get("applicationId"),
        "status": payload.status,
        "remarks": payload.remarks,
        "verifiedBy": admin_user.get("fullName")
    })

    record_admin_action(admin_user, "DOCUMENT_REVIEWED", "document", doc_id, payload.remarks or "",
                        str(uuid.uuid4()), previous_value={"verificationStatus": doc.get("verificationStatus")},
                        new_value={"verificationStatus": payload.status},
                        references={"document_id": doc_id, "application_id": doc.get("applicationId")})
    
    return {"status": "success", "docId": doc_id, "verificationStatus": payload.status}

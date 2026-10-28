import base64
import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from cryptography.fernet import Fernet
from sqlalchemy import create_engine, text, select, func, event
from sqlalchemy.orm import sessionmaker

from backend.config import DOCUMENT_ENCRYPTION_KEY, JWT_SECRET_KEY, TRACEABILITY_DATABASE_URL
from backend.traceability.models import (
    AuditEvent, DocumentRecord, EligibilityEvaluationRecord, ExtractionRecord,
    ManualCorrectionRecord, RoutingDecisionRecord, RoutingValidationReference,
    ValidationRecord,
)
from backend.traceability.migrations.v001_document_traceability import upgrade as upgrade_v001
from backend.traceability.migrations.v002_extraction_quality import upgrade as upgrade_v002

PIPELINE_VERSION = "pension-seva-doc-pipeline/2.0"
VALIDATION_RULE_VERSION = "field-compare/1.1"


def _fernet():
    key_material = DOCUMENT_ENCRYPTION_KEY.encode("utf-8") if DOCUMENT_ENCRYPTION_KEY else JWT_SECRET_KEY.encode("utf-8")
    key = base64.urlsafe_b64encode(hashlib.sha256(key_material).digest())
    return Fernet(key)


def encrypt_text(value: Any) -> str:
    raw = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)
    return _fernet().encrypt(raw.encode("utf-8")).decode("ascii")


def decrypt_text(value: str | None, parse_json: bool = True):
    if value is None:
        return None
    raw = _fernet().decrypt(value.encode("ascii")).decode("utf-8")
    if parse_json:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw
    return raw


def encrypt_bytes(value: bytes) -> bytes:
    return _fernet().encrypt(value)


def decrypt_bytes(value: bytes) -> bytes:
    return _fernet().decrypt(value)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _engine_for(url: str):
    kwargs = {"future": True, "pool_pre_ping": True}
    if url.startswith("sqlite:"):
        kwargs["connect_args"] = {"check_same_thread": False}
    return create_engine(url, **kwargs)


engine = _engine_for(TRACEABILITY_DATABASE_URL)
if TRACEABILITY_DATABASE_URL.startswith("sqlite:"):
    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(connection, record):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, future=True)


def initialize_schema():
    if TRACEABILITY_DATABASE_URL.startswith("sqlite:") and ":memory:" not in TRACEABILITY_DATABASE_URL:
        sqlite_path = TRACEABILITY_DATABASE_URL.replace("sqlite:///", "", 1)
        Path(sqlite_path).parent.mkdir(parents=True, exist_ok=True)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(80) PRIMARY KEY, applied_at VARCHAR(40) NOT NULL)"))
        migrations = (
            ("001_document_traceability", upgrade_v001),
            ("002_extraction_quality", upgrade_v002),
        )
        for version, upgrade in migrations:
            applied = connection.execute(text("SELECT version FROM schema_migrations WHERE version=:version"), {"version": version}).first()
            if not applied:
                upgrade(connection)
                connection.execute(text("INSERT INTO schema_migrations(version, applied_at) VALUES (:version, :applied_at)"), {
                    "version": version, "applied_at": datetime.now(timezone.utc).isoformat(),
                })


def _audit(session, actor_id, actor_role, action, entity_type, entity_id, request_id,
           reason="", previous_value=None, new_value=None, references=None):
    previous = session.scalar(select(AuditEvent).order_by(AuditEvent.sequence.desc()).limit(1))
    previous_hash = previous.event_hash if previous else "0" * 64
    occurred_at = datetime.now(timezone.utc).replace(tzinfo=None)
    event_id = f"AUD-{uuid.uuid4().hex.upper()}"
    event_body = {
        "event_id": event_id, "actor_id": actor_id, "actor_role": actor_role,
        "action": action, "entity_type": entity_type, "entity_id": entity_id,
        "previous_value": encrypt_text(previous_value) if previous_value is not None else None,
        "new_value": encrypt_text(new_value) if new_value is not None else None,
        "reason": reason, "request_id": request_id, "references": references or {},
        "occurred_at": occurred_at.isoformat(), "previous_hash": previous_hash,
    }
    digest = hashlib.sha256((previous_hash + json.dumps(event_body, sort_keys=True, ensure_ascii=False)).encode("utf-8")).hexdigest()
    event = AuditEvent(
        event_id=event_id, actor_id=actor_id, actor_role=actor_role, action=action,
        entity_type=entity_type, entity_id=entity_id,
        previous_value_encrypted=event_body["previous_value"], new_value_encrypted=event_body["new_value"],
        reason=reason, request_id=request_id, references_json=references or {}, occurred_at=occurred_at,
        previous_hash=previous_hash, event_hash=digest,
    )
    session.add(event)
    return event


def _normalize(value):
    if value is None:
        return None
    if isinstance(value, str):
        return " ".join(value.casefold().split())
    return str(value).strip().casefold()


FIELD_SOURCE_MAP = {
    "name": ("personalInfo.fullName", "name"),
    "dob": ("personalInfo.dob", "dob"),
    "annualIncome": ("incomeInfo.annualIncome", "annualIncome"),
    "certificateNumber": ("incomeInfo.incomeCertificateNo", "certificateNumber"),
    "district": ("addressInfo.district", "district"),
}


def _path_value(source, path):
    value = source
    for key in path.split("."):
        value = value.get(key) if isinstance(value, dict) else None
    return value


def create_document_and_extraction(metadata: dict, extraction: dict, actor: dict, request_id: str):
    extraction_id = f"EXT-{uuid.uuid4().hex.upper()}"
    with SessionLocal.begin() as session:
        doc = DocumentRecord(**metadata)
        record = ExtractionRecord(
            extraction_id=extraction_id, document_id=metadata["document_id"], attempt_number=1,
            ocr_engine=extraction.get("ocrEngine", "unavailable"), ocr_version=extraction.get("ocrVersion"),
            pipeline_version=extraction.get("pipelineVersion", PIPELINE_VERSION),
            raw_ocr_text_encrypted=encrypt_text(extraction.get("ocrText", "")),
            extracted_fields_encrypted=encrypt_text(extraction.get("extractedFields", {})),
            field_evidence_encrypted=encrypt_text(extraction.get("fieldEvidence", {})),
            processing_errors_encrypted=encrypt_text(extraction.get("processingErrors", [])),
            quality_details_encrypted=encrypt_text(extraction.get("quality", {})),
        )
        session.add_all([doc, record])
        _audit(session, actor["id"], actor.get("role", "USER"), "DOCUMENT_UPLOADED", "document", metadata["document_id"], request_id,
               reason="Encrypted original stored; extraction attempt 1 recorded.", references={"document_id": metadata["document_id"], "extraction_id": extraction_id})
    return extraction_id


def add_extraction_attempt(document_id: str, extraction: dict, actor: dict, request_id: str):
    extraction_id = f"EXT-{uuid.uuid4().hex.upper()}"
    with SessionLocal.begin() as session:
        document = session.get(DocumentRecord, document_id)
        if document is None:
            return None
        attempt = session.scalar(select(func.max(ExtractionRecord.attempt_number)).where(ExtractionRecord.document_id == document_id)) or 0
        attempt += 1
        record = ExtractionRecord(
            extraction_id=extraction_id, document_id=document_id, attempt_number=attempt,
            ocr_engine=extraction.get("ocrEngine", "unavailable"), ocr_version=extraction.get("ocrVersion"),
            pipeline_version=extraction.get("pipelineVersion", PIPELINE_VERSION),
            raw_ocr_text_encrypted=encrypt_text(extraction.get("ocrText", "")),
            extracted_fields_encrypted=encrypt_text(extraction.get("extractedFields", {})),
            field_evidence_encrypted=encrypt_text(extraction.get("fieldEvidence", {})),
            processing_errors_encrypted=encrypt_text(extraction.get("processingErrors", [])),
            quality_details_encrypted=encrypt_text(extraction.get("quality", {})),
        )
        session.add(record)
        _audit(session, actor["id"], actor.get("role", "USER"), "DOCUMENT_REEXTRACTED", "document", document_id, request_id,
               reason=f"Extraction retry {attempt} recorded; prior attempts retained.", references={"document_id": document_id, "extraction_id": extraction_id})
    return extraction_id


def _record_validation(session, extraction, declared, actor, application_id, request_id):
    fields = decrypt_text(extraction.extracted_fields_encrypted) or {}
    evidence = decrypt_text(extraction.field_evidence_encrypted) or {}
    errors = decrypt_text(extraction.processing_errors_encrypted) or []
    quality = decrypt_text(extraction.quality_details_encrypted) or {}
    quality_usable = quality.get("overallQuality") == "Good"
    validations = []
    for field_name, (declared_path, extracted_key) in FIELD_SOURCE_MAP.items():
        normalized_type = (session.get(DocumentRecord, extraction.document_id).document_type or "").casefold()
        if "income" in normalized_type:
            applicable_fields = {"name", "annualIncome", "certificateNumber", "district"}
        elif "age" in normalized_type or "aadhaar" in normalized_type or "aadhar" in normalized_type:
            applicable_fields = {"name", "dob", "district"}
        elif "bank" in normalized_type or "passbook" in normalized_type:
            applicable_fields = set()
        else:
            applicable_fields = set(FIELD_SOURCE_MAP)
        if field_name not in applicable_fields:
            continue
        extracted = fields.get(extracted_key)
        declared_value = _path_value(declared, declared_path)
        if declared_value is None or declared_value == "":
            continue
        confidence = evidence.get(extracted_key, {}).get("confidence") if isinstance(evidence.get(extracted_key), dict) else None
        if not quality_usable:
            result = "NEEDS_REVIEW"
            explanation = "Image quality is insufficient for a reliable comparison; officer review is required."
        elif extracted is None or extracted == "":
            result = "UNREADABLE" if errors else "NOT_FOUND"
            explanation = "The source document could not be read." if errors else "The extraction contained no value for this field."
        elif confidence is not None and confidence < 50:
            result = "NEEDS_REVIEW"
            explanation = "The extraction has no comparable engine confidence or is below the review threshold."
        elif _normalize(extracted) == _normalize(declared_value):
            result = "MATCH"
            explanation = "Extracted value matches the applicant declaration after case and whitespace normalization."
        else:
            result = "MISMATCH"
            explanation = "Extracted value differs from the applicant declaration; reviewer confirmation is required."
        row = ValidationRecord(
            validation_id=f"VAL-{uuid.uuid4().hex.upper()}", extraction_id=extraction.extraction_id,
            field_name=field_name, extracted_value_encrypted=encrypt_text(extracted),
            declared_value_encrypted=encrypt_text(declared_value),
            normalized_values_encrypted=encrypt_text({"extracted": _normalize(extracted), "declared": _normalize(declared_value)}),
            rule_name="normalized_field_equality", rule_version=VALIDATION_RULE_VERSION, result=result,
            explanation=explanation, actor_id=actor["id"], actor_role=actor.get("role", "USER"),
        )
        session.add(row)
        validations.append(row)
    return validations


def record_application_trace(application_id: str, actor: dict, request_id: str, declared: dict,
                             document_ids: list[str], eligibility_inputs: dict, eligibility_result: dict,
                             scheme_rule_version: str, application_status: str):
    evaluation_id = f"EVAL-{uuid.uuid4().hex.upper()}"
    routing_id = f"ROUTE-{uuid.uuid4().hex.upper()}"
    with SessionLocal.begin() as session:
        validations = []
        latest_by_document = {}
        for document_id in document_ids:
            document = session.get(DocumentRecord, document_id)
            if document is None:
                continue
            if document.application_id and document.application_id != application_id:
                raise ValueError("A document is already associated with another application.")
            document.application_id = application_id
            extraction = session.scalar(select(ExtractionRecord).where(ExtractionRecord.document_id == document_id).order_by(ExtractionRecord.attempt_number.desc()).limit(1))
            if extraction is None:
                continue
            latest_by_document[document_id] = extraction.extraction_id
            validations.extend(_record_validation(session, extraction, declared, actor, application_id, request_id))

        mismatches = [row for row in validations if row.result == "MISMATCH"]
        uncertain = [row for row in validations if row.result in {"UNREADABLE", "NOT_FOUND", "NEEDS_REVIEW"}]
        critical_missing = not any(row.field_name in {"name", "dob", "annualIncome"} and row.result == "MATCH" for row in validations)
        needs_manual = bool(uncertain) or critical_missing
        route = "AI_REJECTED" if mismatches else ("MANUAL_VERIFICATION" if needs_manual else ("AI_REJECTED" if application_status == "REJECTED" else "MANUAL_REVIEW"))
        effective_status = "REJECTED" if mismatches or (not needs_manual and application_status == "REJECTED") else ("UNDER REVIEW" if needs_manual else application_status)
        reason = (
            (f"Extracted values mismatch applicant declarations for: {', '.join(row.field_name for row in mismatches)}. AI screening rejected the application." if mismatches else
            "Document extraction or field validation is uncertain; route to an officer for verification.") if needs_manual or mismatches
            else ("Eligibility screening score fell below the configured threshold." if route == "AI_REJECTED" else "Document fields were validated; administrative decision is required.")
        )
        evaluation = EligibilityEvaluationRecord(
            evaluation_id=evaluation_id, application_id=application_id, actor_id=actor["id"], actor_role=actor.get("role", "USER"),
            inputs_encrypted=encrypt_text(eligibility_inputs), input_sources_encrypted=encrypt_text({
                "age": "applicant_declared.dob", "annualIncome": "applicant_declared.incomeInfo.annualIncome",
                "residenceState": "applicant_declared.addressInfo.state", "district": "applicant_declared.addressInfo.district",
                "hasAgeProof": "uploaded_documents.docType", "hasIncomeCertificate": "uploaded_documents.docType",
            }), scheme_rule_version=scheme_rule_version, result_encrypted=encrypt_text(eligibility_result),
            explanation="Eligibility score is decision support. Source values and rule version are recorded; final determination remains administrative.",
        )
        routing = RoutingDecisionRecord(
            routing_id=routing_id, application_id=application_id, evaluation_id=evaluation_id,
            route=route, reason=reason, actor_id="SYSTEM:application-router", actor_role="SYSTEM",
        )
        session.add_all([evaluation, routing])
        session.flush()
        for validation in validations:
            session.add(RoutingValidationReference(routing_id=routing_id, validation_id=validation.validation_id))
        _audit(session, actor["id"], actor.get("role", "USER"), "APPLICATION_ROUTED", "application", application_id, request_id,
               reason=reason, new_value={"route": route, "status": effective_status},
               references={"evaluation_id": evaluation_id, "routing_id": routing_id, "validation_ids": [v.validation_id for v in validations], "extractions": latest_by_document})
    return {"evaluationId": evaluation_id, "routingId": routing_id, "route": route, "effectiveStatus": effective_status, "reason": reason,
            "validationResults": [{"validationId": v.validation_id, "field": v.field_name, "result": v.result, "extractionId": v.extraction_id} for v in validations]}


def record_standalone_eligibility(actor: dict, request_id: str, inputs: dict, result: dict, rule_version: str):
    evaluation_id = f"EVAL-{uuid.uuid4().hex.upper()}"
    with SessionLocal.begin() as session:
        session.add(EligibilityEvaluationRecord(
            evaluation_id=evaluation_id, application_id=None, actor_id=actor.get("id", "SYSTEM:eligibility"),
            actor_role=actor.get("role", "SYSTEM"), inputs_encrypted=encrypt_text(inputs),
            input_sources_encrypted=encrypt_text({key: "applicant_declared_input" for key in inputs}),
            scheme_rule_version=rule_version, result_encrypted=encrypt_text(result),
            explanation="Preliminary eligibility result; decision support only, not an administrative determination.",
        ))
        _audit(session, actor.get("id", "SYSTEM:eligibility"), actor.get("role", "SYSTEM"), "ELIGIBILITY_EVALUATED",
               "eligibility", evaluation_id, request_id, reason="Preliminary eligibility assessment recorded.",
               references={"evaluation_id": evaluation_id})
    return evaluation_id


def record_admin_action(actor: dict, action: str, entity_type: str, entity_id: str, reason: str,
                        request_id: str, previous_value=None, new_value=None, references=None):
    with SessionLocal.begin() as session:
        event = _audit(session, actor["id"], actor.get("role", "ADMIN"), action, entity_type, entity_id,
                       request_id, reason, previous_value, new_value, references)
        return event.event_id


def create_manual_correction(application_id: str, extraction_id: str, field_name: str, corrected_value: Any,
                              reason: str, actor: dict, request_id: str):
    with SessionLocal.begin() as session:
        extraction = session.get(ExtractionRecord, extraction_id)
        if extraction is None:
            raise ValueError("Extraction record not found.")
        document = session.get(DocumentRecord, extraction.document_id)
        if document is None or document.application_id != application_id:
            raise ValueError("Extraction does not belong to this application.")
        original = (decrypt_text(extraction.extracted_fields_encrypted) or {}).get(field_name)
        correction = ManualCorrectionRecord(
            correction_id=f"COR-{uuid.uuid4().hex.upper()}", application_id=application_id,
            extraction_id=extraction_id, field_name=field_name,
            original_value_encrypted=encrypt_text(original), corrected_value_encrypted=encrypt_text(corrected_value),
            reason=reason, actor_id=actor["id"], actor_role=actor.get("role", "ADMIN"),
        )
        session.add(correction)
        _audit(session, actor["id"], actor.get("role", "ADMIN"), "DOCUMENT_FIELD_CORRECTED", "application", application_id,
               request_id, reason=reason, previous_value=original, new_value=corrected_value,
               references={"document_id": document.document_id, "extraction_id": extraction_id, "correction_id": correction.correction_id, "field": field_name})
        return correction.correction_id


def application_verification_history(application_id: str):
    with SessionLocal() as session:
        docs = session.scalars(select(DocumentRecord).where(DocumentRecord.application_id == application_id).order_by(DocumentRecord.uploaded_at)).all()
        result = {"applicationId": application_id, "documents": [], "eligibilityEvaluations": [], "routingDecisions": [], "auditEvents": [], "manualCorrections": []}
        for doc in docs:
            item = {"documentId": doc.document_id, "applicationId": doc.application_id, "documentType": doc.document_type,
                    "originalName": doc.original_name, "storageLocation": doc.storage_location, "sha256": doc.sha256,
                    "uploadedAt": doc.uploaded_at.isoformat(), "uploaderId": doc.uploader_id, "mimeType": doc.mime_type,
                    "sizeBytes": doc.size_bytes, "extractions": []}
            extractions = session.scalars(select(ExtractionRecord).where(ExtractionRecord.document_id == doc.document_id).order_by(ExtractionRecord.attempt_number)).all()
            for ext in extractions:
                vals = session.scalars(select(ValidationRecord).where(ValidationRecord.extraction_id == ext.extraction_id).order_by(ValidationRecord.validated_at)).all()
                item["extractions"].append({
                    "extractionId": ext.extraction_id, "attempt": ext.attempt_number,
                    "ocrEngine": ext.ocr_engine, "ocrVersion": ext.ocr_version,
                    "pipelineVersion": ext.pipeline_version, "processedAt": ext.processed_at.isoformat(),
                    "rawOcrText": decrypt_text(ext.raw_ocr_text_encrypted, parse_json=False),
                    "extractedFields": decrypt_text(ext.extracted_fields_encrypted),
                    "fieldEvidence": decrypt_text(ext.field_evidence_encrypted),
                    "processingErrors": decrypt_text(ext.processing_errors_encrypted),
                    "quality": decrypt_text(ext.quality_details_encrypted) or {},
                    "validations": [{
                        "validationId": v.validation_id, "field": v.field_name,
                        "extractedValue": decrypt_text(v.extracted_value_encrypted),
                        "declaredValue": decrypt_text(v.declared_value_encrypted),
                        "normalizedValues": decrypt_text(v.normalized_values_encrypted),
                        "rule": v.rule_name, "ruleVersion": v.rule_version, "result": v.result,
                        "explanation": v.explanation, "actorId": v.actor_id, "actorRole": v.actor_role,
                        "validatedAt": v.validated_at.isoformat(),
                    } for v in vals],
                })
            result["documents"].append(item)
        evaluations = session.scalars(select(EligibilityEvaluationRecord).where(EligibilityEvaluationRecord.application_id == application_id).order_by(EligibilityEvaluationRecord.evaluated_at)).all()
        for ev in evaluations:
            result["eligibilityEvaluations"].append({"evaluationId": ev.evaluation_id, "inputs": decrypt_text(ev.inputs_encrypted),
                "inputSources": decrypt_text(ev.input_sources_encrypted), "schemeRuleVersion": ev.scheme_rule_version,
                "result": decrypt_text(ev.result_encrypted), "explanation": ev.explanation, "evaluatedAt": ev.evaluated_at.replace(tzinfo=timezone.utc).isoformat(), "actorId": ev.actor_id})
        routings = session.scalars(select(RoutingDecisionRecord).where(RoutingDecisionRecord.application_id == application_id).order_by(RoutingDecisionRecord.decided_at)).all()
        for route in routings:
            refs = session.scalars(select(RoutingValidationReference).where(RoutingValidationReference.routing_id == route.routing_id)).all()
            result["routingDecisions"].append({"routingId": route.routing_id, "evaluationId": route.evaluation_id, "route": route.route,
                "reason": route.reason, "actorId": route.actor_id, "actorRole": route.actor_role,
                "validationIds": [ref.validation_id for ref in refs], "decidedAt": route.decided_at.isoformat()})
        audit_entity_ids = [application_id, *(doc.document_id for doc in docs)]
        events = session.scalars(select(AuditEvent).where(AuditEvent.entity_id.in_(audit_entity_ids)).order_by(AuditEvent.sequence)).all()
        for event in events:
            result["auditEvents"].append({"eventId": event.event_id, "actorId": event.actor_id, "actorRole": event.actor_role,
                "action": event.action, "entityType": event.entity_type, "entityId": event.entity_id,
                "previousValue": decrypt_text(event.previous_value_encrypted), "newValue": decrypt_text(event.new_value_encrypted),
                "reason": event.reason, "requestId": event.request_id, "references": event.references_json,
                "occurredAt": event.occurred_at.replace(tzinfo=timezone.utc).isoformat(), "previousHash": event.previous_hash, "eventHash": event.event_hash})
        corrections = session.scalars(select(ManualCorrectionRecord).where(ManualCorrectionRecord.application_id == application_id).order_by(ManualCorrectionRecord.created_at)).all()
        for correction in corrections:
            result["manualCorrections"].append({"correctionId": correction.correction_id, "extractionId": correction.extraction_id,
                "field": correction.field_name, "originalValue": decrypt_text(correction.original_value_encrypted),
                "correctedValue": decrypt_text(correction.corrected_value_encrypted), "reason": correction.reason,
                "actorId": correction.actor_id, "actorRole": correction.actor_role, "createdAt": correction.created_at.isoformat()})
        return result


def verify_audit_chain():
    with SessionLocal() as session:
        events = session.scalars(select(AuditEvent).order_by(AuditEvent.sequence)).all()
        prior = "0" * 64
        for event in events:
            body = {
                "event_id": event.event_id, "actor_id": event.actor_id, "actor_role": event.actor_role,
                "action": event.action, "entity_type": event.entity_type, "entity_id": event.entity_id,
                "previous_value": event.previous_value_encrypted, "new_value": event.new_value_encrypted,
                "reason": event.reason, "request_id": event.request_id, "references": event.references_json,
                "occurred_at": event.occurred_at.replace(tzinfo=timezone.utc).replace(tzinfo=None).isoformat(), "previous_hash": event.previous_hash,
            }
            digest = hashlib.sha256((prior + json.dumps(body, sort_keys=True, ensure_ascii=False)).encode("utf-8")).hexdigest()
            if event.previous_hash != prior or event.event_hash != digest:
                return False
            prior = event.event_hash
        return True

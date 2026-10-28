from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text,
    UniqueConstraint, JSON,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now():
    return datetime.now(timezone.utc)


class TraceBase(DeclarativeBase):
    pass


class DocumentRecord(TraceBase):
    __tablename__ = "trace_documents"
    document_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    application_id: Mapped[str | None] = mapped_column(String(100), index=True)
    document_type: Mapped[str] = mapped_column(String(120), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_location: Mapped[str] = mapped_column(String(500), nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    uploader_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    uploader_role: Mapped[str] = mapped_column(String(30), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    pipeline_version: Mapped[str] = mapped_column(String(50), nullable=False)


class ExtractionRecord(TraceBase):
    __tablename__ = "document_extractions"
    extraction_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("trace_documents.document_id", ondelete="RESTRICT"), nullable=False, index=True)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    ocr_engine: Mapped[str] = mapped_column(String(120), nullable=False)
    ocr_version: Mapped[str | None] = mapped_column(String(120))
    pipeline_version: Mapped[str] = mapped_column(String(50), nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    raw_ocr_text_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    extracted_fields_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    field_evidence_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    processing_errors_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    quality_details_encrypted: Mapped[str | None] = mapped_column(Text)
    __table_args__ = (UniqueConstraint("document_id", "attempt_number", name="uq_extraction_attempt"),)


class ValidationRecord(TraceBase):
    __tablename__ = "document_validations"
    validation_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    extraction_id: Mapped[str] = mapped_column(ForeignKey("document_extractions.extraction_id", ondelete="RESTRICT"), nullable=False, index=True)
    field_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    extracted_value_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    declared_value_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_values_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    rule_name: Mapped[str] = mapped_column(String(120), nullable=False)
    rule_version: Mapped[str] = mapped_column(String(50), nullable=False)
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    actor_id: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(30), nullable=False)
    validated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    __table_args__ = (
        CheckConstraint("result IN ('MATCH','MISMATCH','UNREADABLE','NOT_FOUND','NEEDS_REVIEW')", name="ck_document_validation_result"),
        Index("ix_validation_extraction_field", "extraction_id", "field_name"),
    )


class EligibilityEvaluationRecord(TraceBase):
    __tablename__ = "eligibility_evaluations"
    evaluation_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    application_id: Mapped[str | None] = mapped_column(String(100), index=True)
    actor_id: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(30), nullable=False)
    inputs_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    input_sources_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    scheme_rule_version: Mapped[str] = mapped_column(String(80), nullable=False)
    result_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class RoutingDecisionRecord(TraceBase):
    __tablename__ = "application_routing_decisions"
    routing_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    application_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    evaluation_id: Mapped[str] = mapped_column(ForeignKey("eligibility_evaluations.evaluation_id", ondelete="RESTRICT"), nullable=False)
    route: Mapped[str] = mapped_column(String(80), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    actor_id: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(30), nullable=False)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class RoutingValidationReference(TraceBase):
    __tablename__ = "routing_validation_references"
    routing_id: Mapped[str] = mapped_column(ForeignKey("application_routing_decisions.routing_id", ondelete="RESTRICT"), primary_key=True)
    validation_id: Mapped[str] = mapped_column(ForeignKey("document_validations.validation_id", ondelete="RESTRICT"), primary_key=True)


class ManualCorrectionRecord(TraceBase):
    __tablename__ = "manual_document_corrections"
    correction_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    application_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    extraction_id: Mapped[str] = mapped_column(ForeignKey("document_extractions.extraction_id", ondelete="RESTRICT"), nullable=False, index=True)
    field_name: Mapped[str] = mapped_column(String(120), nullable=False)
    original_value_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    corrected_value_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    actor_id: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class AuditEvent(TraceBase):
    __tablename__ = "trace_audit_events"
    sequence: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    actor_id: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(30), nullable=False)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    previous_value_encrypted: Mapped[str | None] = mapped_column(Text)
    new_value_encrypted: Mapped[str | None] = mapped_column(Text)
    reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    request_id: Mapped[str] = mapped_column(String(120), nullable=False)
    references_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    previous_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    event_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)

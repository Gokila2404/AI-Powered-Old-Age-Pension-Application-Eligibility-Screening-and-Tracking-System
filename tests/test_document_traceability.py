"""Synthetic end-to-end traceability example.

Expected PDF text-layer output: Asha Kumar; DOB 1960-05-12; annual income
64000; certificate INC-2042-1837; district Madurai. A real extracted mismatch
must be rejected; poor image quality must remain a manual review.
"""
import tempfile
import unittest
import hashlib
from pathlib import Path

import pymupdf as fitz
from sqlalchemy import create_engine, event, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from backend.services.document_processor import process_uploaded_document
from backend.services.document_matcher import match_documents_and_identity
from backend.traceability import store
from backend.traceability.migrations.v001_document_traceability import upgrade
from backend.traceability.models import AuditEvent, DocumentRecord, ExtractionRecord, TraceBase


class DocumentTraceabilityWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.db_path = self.root / "trace.db"
        self.engine = create_engine(f"sqlite:///{self.db_path}", future=True, connect_args={"check_same_thread": False})

        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, record):
            connection.execute("PRAGMA foreign_keys=ON")

        with self.engine.begin() as connection:
            connection.execute(__import__("sqlalchemy").text("CREATE TABLE schema_migrations (version VARCHAR(80) PRIMARY KEY, applied_at VARCHAR(40) NOT NULL)"))
            upgrade(connection)
        self.sessions = sessionmaker(bind=self.engine, expire_on_commit=False, future=True)
        self.original_sessions = store.SessionLocal
        store.SessionLocal = self.sessions

        self.source_pdf = self.root / "synthetic-income-certificate.pdf"
        pdf = fitz.open()
        page = pdf.new_page(width=595, height=842)
        for index, line in enumerate([
            "Name: Asha Kumar",
            "DOB: 12/05/1960",
            "Annual Income: Rs. 64,000",
            "Certificate Number: INC-2042-1837",
            "District: Madurai",
        ]):
            page.insert_text((72, 90 + index * 28), line, fontsize=12)
        pdf.save(self.source_pdf)
        pdf.close()
        self.actor = {"id": "USER-SYNTHETIC", "role": "USER"}

    def tearDown(self):
        store.SessionLocal = self.original_sessions
        self.engine.dispose()
        self.temp.cleanup()

    def test_matcher_does_not_invent_scores_for_missing_fields(self):
        result = match_documents_and_identity(
            "", {"fullName": "", "dob": ""},
            {"annualIncome": "", "incomeCertificateNo": ""}, {},
        )
        self.assertIsNone(result.nameMatchPercentage)
        self.assertIsNone(result.dobMatchPercentage)
        self.assertIsNone(result.incomeMatchPercentage)
        self.assertIsNone(result.certNumberMatchPercentage)
        self.assertIsNone(result.overallConfidence)
        self.assertEqual(result.identityStatus, "REVIEW REQUIRED")

    def test_document_to_routing_and_admin_investigation(self):
        output = process_uploaded_document(self.source_pdf, self.source_pdf.name, "Income Certificate")
        fields = output.extractedFields.model_dump()
        self.assertEqual(fields["name"], "Asha Kumar")
        self.assertEqual(fields["dob"], "1960-05-12")
        self.assertEqual(fields["annualIncome"], 64000)
        self.assertEqual(fields["certificateNumber"], "INC-2042-1837")
        self.assertEqual(fields["district"], "Madurai")
        self.assertIn(output.ocrEngine, {"PyMuPDF text-layer extraction", "PyMuPDF + Tesseract OCR", "PyMuPDF + RapidOCR"})
        self.assertIsNone(output.extractedFields.confidenceScore)
        self.assertEqual(output.fieldEvidence["annualIncome"]["page"], 1)
        self.assertEqual(output.fieldEvidence["annualIncome"]["boundingBoxUnit"], "PDF points")

        document_id = output.docId
        store.create_document_and_extraction({
            "document_id": document_id, "application_id": None, "document_type": "Income Certificate",
            "original_name": self.source_pdf.name, "storage_location": "backend/uploads/synthetic.enc",
            "sha256": hashlib.sha256(self.source_pdf.read_bytes()).hexdigest(), "uploader_id": self.actor["id"], "uploader_role": "USER",
            "mime_type": "application/pdf", "size_bytes": self.source_pdf.stat().st_size,
            "pipeline_version": output.pipelineVersion,
        }, output.model_dump(), self.actor, "request-upload-1")

        declared = {
            "personalInfo": {"fullName": "Asha Kumar Misdeclared", "dob": "1960-05-12"},
            "incomeInfo": {"annualIncome": 64000, "incomeCertificateNo": "INC-2042-1837"},
            "addressInfo": {"district": "Madurai"},
        }
        trace = store.record_application_trace(
            "APP-SYNTHETIC-1", self.actor, "request-submit-1", declared, [document_id],
            {"age": 66, "annualIncome": 64000},
            {"score": 28, "status": "LIKELY NOT ELIGIBLE", "reasons": ["Synthetic expected case"]},
            "IGNOAPS-TN-v3", "REJECTED",
        )
        self.assertEqual(trace["route"], "AI_REJECTED")
        self.assertEqual(trace["effectiveStatus"], "REJECTED")
        self.assertTrue(any(item["field"] == "name" and item["result"] == "MISMATCH" for item in trace["validationResults"]))

        history = store.application_verification_history("APP-SYNTHETIC-1")
        self.assertEqual(history["documents"][0]["sha256"], hashlib.sha256(self.source_pdf.read_bytes()).hexdigest())
        self.assertEqual(history["documents"][0]["extractions"][0]["rawOcrText"].splitlines()[0], "Name: Asha Kumar")
        self.assertEqual(history["routingDecisions"][0]["evaluationId"], trace["evaluationId"])
        self.assertEqual(history["routingDecisions"][0]["route"], "AI_REJECTED")

        extraction_id = history["documents"][0]["extractions"][0]["extractionId"]
        correction_id = store.create_manual_correction(
            "APP-SYNTHETIC-1", extraction_id, "annualIncome", 64000,
            "Confirmed from the original certificate by manual reviewer.",
            {"id": "ADMIN-SYNTHETIC", "role": "ADMIN"}, "request-correction-1",
        )
        self.assertTrue(correction_id.startswith("COR-"))

        second_attempt_id = store.add_extraction_attempt(document_id, output.model_dump(), self.actor, "request-retry-1")
        after_retry = store.application_verification_history("APP-SYNTHETIC-1")
        attempts = after_retry["documents"][0]["extractions"]
        self.assertEqual(len(attempts), 2)
        self.assertEqual([attempt["attempt"] for attempt in attempts], [1, 2])
        self.assertEqual(attempts[1]["extractionId"], second_attempt_id)
        self.assertEqual(len(after_retry["manualCorrections"]), 1)
        self.assertTrue(store.verify_audit_chain())

        with self.sessions.begin() as session:
            event_id = session.scalar(select(AuditEvent.event_id).order_by(AuditEvent.sequence.desc()).limit(1))
        with self.assertRaises(IntegrityError):
            with self.sessions.begin() as session:
                session.execute(update(AuditEvent).where(AuditEvent.event_id == event_id).values(reason="tampered"))
        self.assertTrue(store.verify_audit_chain())

        with self.sessions() as session:
            stored_doc = session.get(DocumentRecord, document_id)
            attempts_count = session.scalar(select(ExtractionRecord.attempt_number).where(ExtractionRecord.document_id == document_id).order_by(ExtractionRecord.attempt_number.desc()).limit(1))
            self.assertEqual(stored_doc.application_id, "APP-SYNTHETIC-1")
            self.assertEqual(attempts_count, 2)

    def test_low_quality_source_routes_to_manual_review(self):
        output = process_uploaded_document(self.source_pdf, self.source_pdf.name, "Income Certificate")
        output.quality.overallQuality = "Needs Attention"
        document_id = "DOC-LOW-QUALITY"
        store.create_document_and_extraction({
            "document_id": document_id, "application_id": None, "document_type": "Income Certificate",
            "original_name": self.source_pdf.name, "storage_location": "backend/uploads/low-quality.enc",
            "sha256": hashlib.sha256(self.source_pdf.read_bytes()).hexdigest(), "uploader_id": self.actor["id"],
            "uploader_role": "USER", "mime_type": "application/pdf", "size_bytes": self.source_pdf.stat().st_size,
            "pipeline_version": output.pipelineVersion,
        }, output.model_dump(), self.actor, "request-low-quality-upload")
        trace = store.record_application_trace(
            "APP-LOW-QUALITY", self.actor, "request-low-quality-submit",
            {"personalInfo": {"fullName": "Not Asha", "dob": "1960-05-12"},
             "incomeInfo": {"annualIncome": 64000, "incomeCertificateNo": "INC-2042-1837"},
             "addressInfo": {"district": "Madurai"}},
            [document_id], {"age": 66}, {"score": 90, "status": "ELIGIBLE"}, "IGNOAPS-TN-v3", "UNDER REVIEW",
        )
        self.assertEqual(trace["route"], "MANUAL_VERIFICATION")
        self.assertEqual(trace["effectiveStatus"], "UNDER REVIEW")


if __name__ == "__main__":
    unittest.main()

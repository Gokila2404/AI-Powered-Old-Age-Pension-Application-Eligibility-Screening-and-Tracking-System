from sqlalchemy import text

from backend.traceability.models import TraceBase

VERSION = "001_document_traceability"


def upgrade(connection):
    TraceBase.metadata.create_all(connection)
    # SQLite-level guards make the audit history append-only through normal DB
    # sessions as well as through application routes.
    if connection.dialect.name == "sqlite":
        connection.execute(text("""
            CREATE TRIGGER IF NOT EXISTS trace_audit_events_no_update
            BEFORE UPDATE ON trace_audit_events
            BEGIN SELECT RAISE(ABORT, 'audit events are append-only'); END
        """))
        connection.execute(text("""
            CREATE TRIGGER IF NOT EXISTS trace_audit_events_no_delete
            BEFORE DELETE ON trace_audit_events
            BEGIN SELECT RAISE(ABORT, 'audit events are append-only'); END
        """))

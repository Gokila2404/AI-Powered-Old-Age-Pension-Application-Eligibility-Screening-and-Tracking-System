from sqlalchemy import inspect, text


VERSION = "002_extraction_quality"


def upgrade(connection):
    columns = {column["name"] for column in inspect(connection).get_columns("document_extractions")}
    if "quality_details_encrypted" not in columns:
        connection.execute(text("ALTER TABLE document_extractions ADD COLUMN quality_details_encrypted TEXT"))

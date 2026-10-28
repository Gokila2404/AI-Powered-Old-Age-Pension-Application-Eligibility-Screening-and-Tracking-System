import logging
import datetime
from typing import Dict, Any, List, Optional
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from backend.config import MONGODB_URI, DB_NAME

logger = logging.getLogger("pension_seva.database")

REQUIRED_COLLECTIONS = [
    "users",
    "applicant_profiles",
    "schemes",
    "eligibility_rules",
    "applications",
    "application_status_history",
    "documents",
    "ocr_results",
    "document_verifications",
    "identity_verifications",
    "benefit_conflicts",
    "notifications",
    "otp_verifications",
    "audit_logs",
    "chat_sessions",
    "chat_messages",
    "pension_history",
    "user_updates",
    "system_updates",
    "nlp_intents",
    "translations",
    "ai_assessments"
]

class DatabaseManager:
    """
    Manages MongoDB database connectivity with automatic fallback
    to in-memory resilient storage if MongoDB server is temporarily unreachable.
    Supports all 22 core Pension Seva collections.
    """
    def __init__(self):
        self.client: Optional[MongoClient] = None
        self.db = None
        self.is_connected = False
        self._memory_store: Dict[str, Dict[str, Any]] = {c: {} for c in REQUIRED_COLLECTIONS}
        self.connect()

    def connect(self):
        try:
            # 8s selection timeout: Atlas free-tier cold starts and replica-set
            # elections routinely exceed 2s; 2s caused spurious fallback to
            # the in-memory store on healthy clusters.
            self.client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=8000)
            # Trigger quick server check
            self.client.admin.command('ping')
            self.db = self.client[DB_NAME]
            self.is_connected = True
            logger.info("Successfully connected to MongoDB database: %s", DB_NAME)
            self._ensure_indexes()
        except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as err:
            logger.warning("MongoDB live server connection failed (%s). Utilizing resilient in-memory datastore fallback.", err)
            self.is_connected = False
            self.db = None

    def _ensure_indexes(self):
        if not self.is_connected or self.db is None:
            return
        indexes = [
            ("users", [("email", ASCENDING)], {"unique": True, "sparse": True}),
            ("otp_verifications", [("verification_id", ASCENDING)], {"unique": True, "sparse": True}),
            # Keep expired sessions briefly so the owner can request a resend;
            # verification itself still rejects the code at expires_at.
            ("otp_verifications", [("expires_at", ASCENDING)], {"expireAfterSeconds": 3600}),
            ("otp_verifications", [("target", ASCENDING), ("purpose", ASCENDING), ("created_at", DESCENDING)], {}),
            # Legacy rows can omit application IDs; only index real string IDs.
            ("users", [("id", ASCENDING)], {"unique": True, "name": "id_unique_nonnull", "partialFilterExpression": {"id": {"$type": "string"}}}),
            ("applications", [("id", ASCENDING)], {"unique": True, "name": "application_id_unique_nonnull", "partialFilterExpression": {"id": {"$type": "string"}}}),
            ("applications", [("userId", ASCENDING)], {}),
            ("applications", [("status", ASCENDING)], {}),
            ("schemes", [("id", ASCENDING)], {"unique": True, "name": "scheme_id_unique_nonnull", "partialFilterExpression": {"id": {"$type": "string"}}}),
            ("eligibility_rules", [("ruleId", ASCENDING)], {}),
            ("documents", [("docId", ASCENDING)], {"unique": True, "sparse": True}),
            ("documents", [("userId", ASCENDING)], {}),
            ("notifications", [("userId", ASCENDING)], {}),
            ("audit_logs", [("timestamp", DESCENDING)], {}),
            ("system_updates", [("date", DESCENDING)], {}),
        ]
        for collection, keys, options in indexes:
            try:
                if collection == "otp_verifications" and keys == [("expires_at", ASCENDING)]:
                    existing = self.db[collection].index_information().get("expires_at_1")
                    if existing and existing.get("expireAfterSeconds") != options.get("expireAfterSeconds"):
                        self.db[collection].drop_index("expires_at_1")
                self.db[collection].create_index(keys, **options)
            except Exception as err:
                logger.warning("Could not create %s index %s: %s", collection, keys, err)

    def _sanitize_doc(self, doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not doc:
            return None
        res = doc.copy()
        if "_id" in res:
            res["_id"] = str(res["_id"])
        return res

    def find_one(self, collection_name: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                doc = self.db[collection_name].find_one(query)
                if doc:
                    return self._sanitize_doc(doc)
            except Exception as e:
                logger.error("MongoDB find_one error: %s, falling back to memory", e)

        # In-memory search
        col = self._memory_store.get(collection_name, {})
        for item in col.values():
            if all(item.get(k) == v for k, v in query.items()):
                return item.copy()
        return None

    def find_all(
        self,
        collection_name: str,
        query: Optional[Dict[str, Any]] = None,
        sort_key: str = None,
        sort_desc: bool = True,
        skip: int = 0,
        limit: int = 0
    ) -> List[Dict[str, Any]]:
        query = query or {}
        database_results = []
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db[collection_name].find(query)
                if sort_key:
                    cursor = cursor.sort(sort_key, DESCENDING if sort_desc else ASCENDING)
                if skip > 0:
                    cursor = cursor.skip(skip)
                if limit > 0:
                    cursor = cursor.limit(limit)
                database_results = [self._sanitize_doc(d) for d in cursor]
            except Exception as e:
                logger.error("MongoDB find_all error: %s, falling back to memory", e)

        # In-memory search
        col = self._memory_store.get(collection_name, {})
        merged = {}
        for item in database_results:
            identity = item.get("id") or item.get("docId") or item.get("email") or item.get("_id")
            merged[str(identity or f"database:{len(merged)}")] = item
        for storage_key, item in col.items():
            if all(item.get(k) == v for k, v in query.items()):
                identity = item.get("id") or item.get("docId") or item.get("email") or item.get("_id") or f"memory:{storage_key}"
                merged.setdefault(str(identity), item.copy())
        results = list(merged.values())
        if sort_key:
            results.sort(key=lambda x: str(x.get(sort_key, "")), reverse=sort_desc)
        if skip > 0:
            results = results[skip:]
        if limit > 0:
            results = results[:limit]
        return results

    def insert_one(self, collection_name: str, document: Dict[str, Any]) -> bool:
        doc_copy = document.copy()
        if "_id" in doc_copy and not isinstance(doc_copy["_id"], str):
            doc_copy.pop("_id", None)

        if self.is_connected and self.db is not None:
            try:
                self.db[collection_name].insert_one(doc_copy)
                return True
            except Exception as e:
                logger.error("MongoDB insert_one error: %s, writing to memory", e)

        # In-memory write
        col = self._memory_store.setdefault(collection_name, {})
        key = str(doc_copy.get("id") or doc_copy.get("docId") or doc_copy.get("email") or len(col))
        col[key] = doc_copy
        return True

    def update_one(self, collection_name: str, query: Dict[str, Any], update_data: Dict[str, Any]) -> bool:
        set_data = update_data.get("$set", update_data)
        if self.is_connected and self.db is not None:
            try:
                result = self.db[collection_name].update_one(query, {"$set": set_data})
                if result.matched_count:
                    return True
            except Exception as e:
                logger.error("MongoDB update_one error: %s, updating memory", e)

        # In-memory update
        col = self._memory_store.get(collection_name, {})
        for key, item in col.items():
            if all(item.get(k) == v for k, v in query.items()):
                item.update(set_data)
                return True
        return False

    def delete_one(self, collection_name: str, query: Dict[str, Any]) -> bool:
        deleted = False
        if self.is_connected and self.db is not None:
            try:
                result = self.db[collection_name].delete_one(query)
                if result.deleted_count:
                    deleted = True
            except Exception as e:
                logger.error("MongoDB delete_one error: %s", e)

        col = self._memory_store.get(collection_name, {})
        for key, item in list(col.items()):
            if all(item.get(k) == v for k, v in query.items()):
                del col[key]
                deleted = True
        return deleted

    def update_many(self, collection_name: str, query: Dict[str, Any], update_data: Dict[str, Any]) -> int:
        set_data = update_data.get("$set", update_data)
        count = 0
        if self.is_connected and self.db is not None:
            try:
                result = self.db[collection_name].update_many(query, {"$set": set_data})
                count = result.modified_count
            except Exception as e:
                logger.error("MongoDB update_many error: %s, updating memory", e)
        col = self._memory_store.get(collection_name, {})
        for key, item in col.items():
            if all(item.get(k) == v for k, v in query.items()):
                item.update(set_data)
                count += 1
        return count

    def delete_many(self, collection_name: str, query: Dict[str, Any]) -> int:
        count = 0
        if self.is_connected and self.db is not None:
            try:
                result = self.db[collection_name].delete_many(query)
                count = result.deleted_count
            except Exception as e:
                logger.error("MongoDB delete_many error: %s", e)
        col = self._memory_store.get(collection_name, {})
        for key, item in list(col.items()):
            if all(item.get(k) == v for k, v in query.items()):
                del col[key]
                count += 1
        return count

    def count_documents(self, collection_name: str, query: Optional[Dict[str, Any]] = None) -> int:
        return len(self.find_all(collection_name, query or {}))

# Global database manager instance
db_manager = DatabaseManager()

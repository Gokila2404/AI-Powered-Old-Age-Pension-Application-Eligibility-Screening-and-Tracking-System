import logging
import datetime
import uuid
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from backend.config import APP_NAME, APP_VERSION, ACADEMIC_PROTOTYPE_DISCLAIMER, CORS_ORIGINS, ADMIN_EMAIL, ADMIN_PASSWORD
from backend.database import db_manager
from backend.auth import get_password_hash

# Routers
from backend.routes.auth_routes import router as auth_router
from backend.routes.user_routes import router as user_router
from backend.routes.eligibility_routes import router as eligibility_router
from backend.routes.document_routes import router as document_router
from backend.routes.application_routes import router as application_router
from backend.routes.scheme_routes import router as scheme_router
from backend.routes.notification_routes import router as notification_router
from backend.routes.stats_routes import router as stats_router
from backend.routes.admin_routes import router as admin_router
from backend.routes.nlp_routes import router as nlp_router
from backend.routes.ws_routes import router as ws_router

from backend.services.scheme_recommender import DEFAULT_SCHEMES_DATA
from backend.traceability.store import initialize_schema

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("pension_seva")

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="Pension Seva - Independent Multilingual, Voice-Assisted Welfare Application Digital Platform",
)

# Enable CORS for configured frontend URLs
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Centralized Error Handling â€” Friendly errors without stack traces
# ============================================================
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handles structured HTTP exceptions without stack traces."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.detail if isinstance(exc.detail, str) else "Request error occurred.",
            "detail": exc.detail
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handles validation errors with user-friendly formatting."""
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "message": "Invalid information provided. Please check the required fields.",
            "errors": exc.errors()
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catches unhandled internal exceptions and hides internal stack traces from clients."""
    logger.error("Unhandled exception at %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Something went wrong. Please try again."
        }
    )

# Register API routers
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(eligibility_router)
app.include_router(document_router)
app.include_router(application_router)
app.include_router(scheme_router)
app.include_router(notification_router)
app.include_router(stats_router)
app.include_router(admin_router)
app.include_router(nlp_router)
app.include_router(ws_router)

@app.on_event("startup")
def startup_seed_data():
    initialize_schema()
    logger.info("Applied persistent document traceability migrations.")
    logger.info("Initializing Pension Seva database seeds...")

    # 1. Seed / reconcile Schemes — keep MongoDB in step with the NSAP
    # catalogue: seed if empty, upsert catalogue schemes that are missing,
    # and leave schemes an administrator added untouched.
    existing_schemes = db_manager.find_all("schemes")
    if not existing_schemes:
        for s in DEFAULT_SCHEMES_DATA:
            db_manager.insert_one("schemes", s)
        logger.info("Seeded %d standard welfare schemes.", len(DEFAULT_SCHEMES_DATA))
    else:
        known_ids = {s.get("id") for s in existing_schemes}
        reconciled = 0
        for s in DEFAULT_SCHEMES_DATA:
            if s["id"] not in known_ids:
                db_manager.insert_one("schemes", s)
                reconciled += 1
            else:
                db_manager.update_one("schemes", {"id": s["id"]}, {
                    "applyNotes": s.get("applyNotes", ""),
                    "eligibilitySummary": s.get("eligibilitySummary", ""),
                    "requiredDocuments": s.get("requiredDocuments", []),
                    "source_name": s.get("source_name"),
                    "official_source_url": s.get("official_source_url"),
                    "source_last_verified": s.get("source_last_verified"),
                })
        if reconciled:
            logger.info("Reconciled %d NSAP catalogue schemes into the existing scheme list.", reconciled)
        # Retire pre-catalogue scheme entries whose ids are no longer part of
        # the NSAP catalogue (e.g. renamed widow/disability schemes).
        catalogue_ids = {s["id"] for s in DEFAULT_SCHEMES_DATA}
        for s in existing_schemes:
            sid = s.get("id") or ""
            if sid.startswith("SCHEME-"):
                continue  # admin-created scheme, leave untouched
            if sid not in catalogue_ids:
                db_manager.update_one("schemes", {"id": sid}, {"isActive": False})
                logger.info("Deactivated retired scheme entry %s (replaced by NSAP catalogue).", sid)

    # 2. Seed Default Accounts
    # Configured administrator (no public admin registration). The ADMIN_EMAIL
    # from configuration is authoritative â€” reconcile it on startup so the
    # configured administrator can always sign in with the current secret.
    demo_admin = db_manager.find_one("users", {"email": ADMIN_EMAIL})
    if not demo_admin:
        db_manager.insert_one("users", {
            "id": f"ADMIN-{uuid.uuid4().hex[:8].upper()}",
            "fullName": "Pension Seva Administrator",
            "email": ADMIN_EMAIL,
            "mobile": "",
            "passwordHash": get_password_hash(ADMIN_PASSWORD),
            "role": "ADMIN",
            "preferredLanguage": "en",
            "settings": {
                "large_text": False,
                "high_contrast": False,
                "read_aloud": True,
                "voice_input": True,
                "simple_mode": False,
                "speech_speed": "normal"
            },
            "createdAt": datetime.datetime.utcnow().isoformat()
        })
        logger.info("Created configured administrator account: %s", ADMIN_EMAIL)
    else:
        db_manager.update_one("users", {"email": ADMIN_EMAIL}, {
            "id": demo_admin.get("id") or f"ADMIN-{uuid.uuid4().hex[:8].upper()}",
            "fullName": demo_admin.get("fullName") or "Pension Seva Administrator",
            "mobile": demo_admin.get("mobile") or "",
            "role": "ADMIN",
            "passwordHash": get_password_hash(ADMIN_PASSWORD),
            "preferredLanguage": demo_admin.get("preferredLanguage") or "en",
            "settings": demo_admin.get("settings") or {},
            "createdAt": demo_admin.get("createdAt") or datetime.datetime.utcnow().isoformat(),
        })
        logger.info("Synchronized configured administrator role and credentials.")

    # 3. Seed Default Eligibility Rules
    rules = db_manager.find_all("eligibility_rules")
    if not rules:
        default_rule = {
            "ruleId": "RULE-IGNOAPS-V1",
            "version": 1,
            "schemeId": "IGNOAPS-TN",
            "minAge": 60,
            "maxIncome": 72000,
            "residenceRequired": "Tamil Nadu",
            "benefitConflictsAllowed": False,
            "requiredDocuments": ["Aadhaar Card / Age Proof", "Income Certificate", "Bank Passbook"],
            "isActive": True,
            "updatedBy": "Pension Seva Administrator",
            "createdAt": "2026-08-01T00:00:00Z"
        }
        db_manager.insert_one("eligibility_rules", default_rule)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "Pension Seva API",
        "app": APP_NAME,
        "version": APP_VERSION,
        "mongodb_connected": db_manager.is_connected,
        "database": "connected" if db_manager.is_connected else "fallback_in_memory",
        "disclaimer": "Academic Prototype â€” Not an Official Government Portal. Decision support only. Admin makes final determination."
    }

@app.get("/api/info")
def info():
    return {
        "portal": "Pension Seva",
        "tagline": "Check. Apply. Track. Get Support.",
        "disclaimer": "Pension Seva is an independent welfare assistance platform. Not an official government portal.",
        "rolesSupported": ["USER", "ADMIN"]
    }

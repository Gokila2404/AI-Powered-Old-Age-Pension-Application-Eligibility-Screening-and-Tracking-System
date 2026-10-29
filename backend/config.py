import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

# Load environment variables from project root .env or backend .env
env_file = PROJECT_ROOT / ".env"
if not env_file.exists():
    env_file = BASE_DIR / ".env"
if env_file.exists():
    load_dotenv(dotenv_path=env_file)
else:
    load_dotenv()

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
TRACEABILITY_DATABASE_URL = os.getenv(
    "TRACEABILITY_DATABASE_URL",
    f"sqlite:///{(PROJECT_ROOT / 'backend' / 'traceability.sqlite3').as_posix()}",
)
DOCUMENT_ENCRYPTION_KEY = os.getenv("DOCUMENT_ENCRYPTION_KEY", "")

# Application Configuration
APP_ENV = os.getenv("APP_ENV", "development")
APP_HOST = os.getenv("APP_HOST", "127.0.0.1")
APP_PORT = int(os.getenv("APP_PORT", "8000"))
APP_NAME = os.getenv("APP_NAME", "Pension Seva Backend API")
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")

ACADEMIC_PROTOTYPE_DISCLAIMER = (
    "Academic Prototype — Not an Official Government Portal. "
    "Decision support only. Admin makes final determination."
)

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DATABASE", os.getenv("DB_NAME", "pension_seva_db"))

# OTP delivery and policy
OTP_PROVIDER = os.getenv("OTP_PROVIDER", "email").strip().lower()
OTP_EXPIRY_SECONDS = int(os.getenv("OTP_EXPIRY_SECONDS", str(int(os.getenv("OTP_EXPIRY_MINUTES", "2")) * 60)))
OTP_EXPIRY_MINUTES = max(1, OTP_EXPIRY_SECONDS // 60)
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30"))
OTP_MAX_REQUESTS_PER_HOUR = int(os.getenv("OTP_MAX_REQUESTS_PER_HOUR", "5"))
# Resend Email API
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
RESEND_FROM_EMAIL = os.getenv(
    "RESEND_FROM_EMAIL",
    "onboarding@resend.dev"
).strip()
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "true").strip().lower() in {"1", "true", "yes", "on"}
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "false").strip().lower() in {"1", "true", "yes", "on"}
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@pensionseva.in").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@123")

# Security & Authentication
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "pension-seva-secure-academic-secret-key-2026-auth-token")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7)))  # 7 days
# Whether OTP verification is required on every login (set LOGIN_OTP_REQUIRED=false to skip)
LOGIN_OTP_REQUIRED = os.getenv("LOGIN_OTP_REQUIRED", "true").strip().lower() in {"1", "true", "yes", "on"}

# CORS Configuration
raw_cors = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ORIGINS = [orig.strip() for orig in raw_cors.split(",") if orig.strip()]

# File Upload Rules
MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_BYTES", str(10 * 1024 * 1024)))  # 10 MB default
ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}

# Optional External AI / Gemini Integration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Voice Services
VOICE_SERVICE_PROVIDER = os.getenv("VOICE_SERVICE_PROVIDER", "webspeech_native")

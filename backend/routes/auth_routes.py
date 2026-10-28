import uuid
import datetime
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request, status, Depends
from backend.models import UserRegister, UserLogin, TokenResponse, UserProfile, PasswordResetRequest, UserSettings
from backend.database import db_manager
from backend.auth import get_password_hash, verify_password, create_access_token, get_current_user, decode_access_token
from backend.services.otp_service import (
    consume_verified_otp,
    ensure_email_delivery_available,
    issue_otp,
    is_recently_verified,
    mask_destination,
    consume_reset_token,
    resend_otp as resend_otp_code,
    verify_otp as verify_otp_code,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class SendOtpRequest(BaseModel):
    mobileOrEmail: str
    purpose: str = "registration"

class VerifyOtpRequest(BaseModel):
    verification_id: str
    otp: str
    purpose: str

class ResendOtpRequest(BaseModel):
    verification_id: str
    purpose: str

@router.post("/register", response_model=TokenResponse)
async def register(payload: UserRegister):
    if not is_recently_verified(payload.email, "registration"):
        raise HTTPException(status_code=403, detail="Verify your email with a one-time code before creating an account.")
    # Check if existing email or mobile
    existing_email = db_manager.find_one("users", {"email": payload.email.lower()})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    existing_mobile = db_manager.find_one("users", {"mobile": payload.mobile.strip()})
    if existing_mobile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this mobile number already exists."
        )

    if not consume_verified_otp(payload.email, "registration"):
        raise HTTPException(status_code=403, detail="Verify your email with a new one-time code before creating an account.")

    user_id = f"USER-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.datetime.utcnow().isoformat()

    default_settings = UserSettings(
        large_text=False,
        high_contrast=False,
        read_aloud=True,
        voice_input=True,
        simple_mode=False,
        speech_speed="normal"
    )

    user_doc = {
        "id": user_id,
        "fullName": payload.fullName.strip(),
        "email": payload.email.lower(),
        "mobile": payload.mobile.strip(),
        "passwordHash": get_password_hash(payload.password),
        "role": "USER",
        "preferredLanguage": payload.preferredLanguage,
        "settings": default_settings.dict(),
        "createdAt": now_iso
    }

    db_manager.insert_one("users", user_doc)

    # Initialize applicant profile in applicant_profiles
    db_manager.insert_one("applicant_profiles", {
        "userId": user_id,
        "fullName": user_doc["fullName"],
        "email": user_doc["email"],
        "mobile": user_doc["mobile"],
        "createdAt": now_iso
    })

    token = create_access_token({"sub": user_id, "role": "USER", "name": payload.fullName})

    profile = UserProfile(
        id=user_id,
        fullName=user_doc["fullName"],
        email=user_doc["email"],
        mobile=user_doc["mobile"],
        role="USER",
        preferredLanguage=user_doc["preferredLanguage"],
        settings=default_settings,
        createdAt=now_iso
    )

    return TokenResponse(access_token=token, user=profile)

@router.post("/login")
async def login(payload: UserLogin):
    ident = payload.identifier.strip().lower()
    lookup_query = {"email": ident}
    user = db_manager.find_one("users", lookup_query)
    if not user:
        lookup_query = {"mobile": payload.identifier.strip()}
        user = db_manager.find_one("users", lookup_query)

    if not user or not verify_password(payload.password, user.get("passwordHash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/mobile or password. Please try again."
        )

    # Normalize accounts created by older versions before building the profile.
    user_id = user.get("id") or f"USER-{uuid.uuid4().hex[:8].upper()}"
    PLACEHOLDER_NAMES = {
        "pension seva citizen",
        "pension seva user",
        "citizen",
        "guest",
        "user",
    }

    def derive_name_from_email(addr: str) -> str:
        """Build a human-friendly name from an address like 'gokila.r12@gmail.com'."""
        local = addr.split("@", 1)[0]
        local = local.split("+")[0]
        cleaned = "".join(ch if ch.isalnum() else " " for ch in local)
        words = [w for w in cleaned.split() if w and not w.isdigit()]
        if not words:
            return ""
        return " ".join(w[:1].upper() + w[1:] for w in words[:3])

    stored_name = (user.get("fullName") or user.get("name") or "").strip()
    if not stored_name or stored_name.lower() in PLACEHOLDER_NAMES:
        # Recover the real name from the email (e.g. gokila.r12@gmail.com -> Gokila R12)
        derived = derive_name_from_email(email if (email := (user.get("email") or ident).strip().lower()) else "")
        if derived:
            stored_name = derived
    full_name = stored_name or "Citizen"
    email = (user.get("email") or ident).strip().lower()
    mobile = user.get("mobile") or ""
    role = user.get("role") or "USER"
    created_at = user.get("createdAt") or datetime.datetime.utcnow().isoformat()
    if any((not user.get("id"), not user.get("fullName"), not user.get("email"), not user.get("mobile"), not user.get("createdAt"))) or user.get("fullName", "").strip().lower() in PLACEHOLDER_NAMES:
        db_manager.update_one("users", lookup_query, {
            "id": user_id,
            "fullName": full_name,
            "email": email,
            "mobile": mobile,
            "role": role,
            "preferredLanguage": user.get("preferredLanguage") or "en",
            "settings": user.get("settings") or {},
            "createdAt": created_at,
        })

    otp_result = issue_otp(email, "login", user_id)
    return {"otp_required": True, **otp_result}

    token = create_access_token({"sub": user_id, "role": role, "name": full_name})

    settings_dict = user.get("settings", {})
    settings_obj = UserSettings(**settings_dict) if settings_dict else UserSettings()

    profile = UserProfile(
        id=user_id,
        fullName=full_name,
        email=email,
        mobile=mobile,
        role=role,
        preferredLanguage=user.get("preferredLanguage", "en"),
        settings=settings_obj,
        createdAt=created_at
    )

    return TokenResponse(access_token=token, user=profile)

@router.post("/admin-login")
async def admin_login(payload: UserLogin):
    ident = payload.identifier.strip().lower()
    user = db_manager.find_one("users", {"email": ident})
    if not user:
        user = db_manager.find_one("users", {"mobile": payload.identifier.strip()})

    if not user or user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to authorized administrative officers only."
        )

    if not verify_password(payload.password, user.get("passwordHash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials."
        )

    # Normalize older configured-admin records that may predate required
    # profile fields. Startup normally performs this reconciliation too.
    user_id = user.get("id") or f"ADMIN-{uuid.uuid4().hex[:8].upper()}"
    full_name = user.get("fullName") or "Pension Seva Administrator"
    mobile = user.get("mobile") or ""
    if not user.get("id") or not user.get("fullName") or not user.get("mobile"):
        db_manager.update_one("users", {"email": user["email"]}, {
            "id": user_id,
            "fullName": full_name,
            "mobile": mobile,
            "role": "ADMIN",
            "preferredLanguage": user.get("preferredLanguage") or "en",
            "settings": user.get("settings") or {},
            "createdAt": user.get("createdAt") or datetime.datetime.utcnow().isoformat(),
        })

    otp_result = issue_otp(user["email"], "login", user_id)
    return {"otp_required": True, **otp_result}

    token = create_access_token({"sub": user_id, "role": "ADMIN", "name": full_name})

    profile = UserProfile(
        id=user_id,
        fullName=full_name,
        email=user["email"],
        mobile=mobile,
        role="ADMIN",
        preferredLanguage=user.get("preferredLanguage", "en"),
        settings=UserSettings(**user.get("settings", {})),
        createdAt=user.get("createdAt", datetime.datetime.utcnow().isoformat())
    )

    return TokenResponse(access_token=token, user=profile)

@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    user = db_manager.find_one("users", {"id": current_user["id"]}) or current_user
    settings_dict = user.get("settings", {})
    return UserProfile(
        id=user["id"],
        fullName=user["fullName"],
        email=user["email"],
        mobile=user["mobile"],
        role=user.get("role", "USER"),
        preferredLanguage=user.get("preferredLanguage", "en"),
        settings=UserSettings(**settings_dict) if settings_dict else UserSettings(),
        createdAt=user.get("createdAt", "")
    )

def _authenticated_user_from_request(request: Request):
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    payload = decode_access_token(token) if scheme.lower() == "bearer" and token else None
    user_id = payload.get("sub") if payload else None
    user = db_manager.find_one("users", {"id": user_id}) if user_id else None
    if not user:
        raise HTTPException(status_code=401, detail="Sign in again to continue this verification.")
    return user


@router.post("/send-otp")
async def send_otp(payload: SendOtpRequest, request: Request):
    purpose = payload.purpose
    if purpose in {"login", "forgot-password"}:
        raise HTTPException(status_code=400, detail="Use the sign-in or password recovery flow to request this code.")
    user_id = None
    target = payload.mobileOrEmail.strip()
    if purpose in {"application-submit", "change-email", "change-mobile", "sensitive-action"}:
        user = _authenticated_user_from_request(request)
        user_id = user["id"]
        if purpose in {"application-submit", "sensitive-action"}:
            target = user["email"]
        if purpose == "change-email":
            target = target.strip().lower()
            if "@" not in target:
                raise HTTPException(status_code=400, detail="Enter a valid email address for verification.")
            existing = db_manager.find_one("users", {"email": target})
            if existing and existing.get("id") != user_id:
                raise HTTPException(status_code=400, detail="That email address is already in use.")
    if purpose == "registration":
        if db_manager.find_one("users", {"email": target.lower()}):
            raise HTTPException(status_code=400, detail="An account with this email address already exists.")
    return issue_otp(target, purpose, user_id)

@router.post("/verify-otp")
async def verify_otp(payload: VerifyOtpRequest, request: Request):
    record = db_manager.find_one("otp_verifications", {"verification_id": payload.verification_id})
    if not record or record.get("purpose") != payload.purpose:
        raise HTTPException(status_code=400, detail="This verification session is invalid.")
    current_user = None
    if payload.purpose in {"application-submit", "change-email", "change-mobile", "sensitive-action"}:
        user = _authenticated_user_from_request(request)
        if record.get("user_id") != user.get("id"):
            raise HTTPException(status_code=403, detail="This verification session does not belong to the signed-in account.")
        current_user = user
    if payload.purpose == "change-email":
        existing = db_manager.find_one("users", {"email": record.get("target")})
        if existing and existing.get("id") != current_user.get("id"):
            raise HTTPException(status_code=400, detail="That email address is already in use.")
    result = verify_otp_code(payload.verification_id, payload.purpose, payload.otp)
    if payload.purpose == "change-email":
        db_manager.update_one("users", {"id": current_user["id"]}, {"email": record["target"]})
        db_manager.update_one("applicant_profiles", {"userId": current_user["id"]}, {"email": record["target"]})
        current_user["email"] = record["target"]
        profile = UserProfile(
            id=current_user["id"], fullName=current_user.get("fullName", ""), email=record["target"],
            mobile=current_user.get("mobile", ""), role=current_user.get("role", "USER"),
            preferredLanguage=current_user.get("preferredLanguage", "en"),
            settings=UserSettings(**(current_user.get("settings") or {})),
            createdAt=current_user.get("createdAt", datetime.datetime.utcnow().isoformat()),
        )
        result["user"] = profile.dict()
    if payload.purpose == "login":
        user = db_manager.find_one("users", {"id": record.get("user_id")})
        if not user:
            raise HTTPException(status_code=401, detail="The account could not be verified. Please sign in again.")
        user_id = user.get("id")
        stored_name = (user.get("fullName") or "").strip()
        if not stored_name or stored_name.lower() in {"pension seva user", "pension seva citizen", "citizen", "user", "guest"}:
            stored_name = derive_name_from_email(user.get("email", "")) or "Citizen"
        full_name = stored_name
        role = user.get("role") or "USER"
        token = create_access_token({"sub": user_id, "role": role, "name": full_name})
        settings = UserSettings(**(user.get("settings") or {}))
        profile = UserProfile(
            id=user_id, fullName=full_name, email=user["email"], mobile=user.get("mobile", ""),
            role=role, preferredLanguage=user.get("preferredLanguage", "en"), settings=settings,
            createdAt=user.get("createdAt", datetime.datetime.utcnow().isoformat()),
        )
        result.update({"access_token": token, "user": profile.dict()})
    return result


@router.post("/resend-otp")
async def resend_otp(payload: ResendOtpRequest, request: Request):
    record = db_manager.find_one("otp_verifications", {"verification_id": payload.verification_id})
    if record and payload.purpose in {"application-submit", "change-email", "change-mobile", "sensitive-action"}:
        user = _authenticated_user_from_request(request)
        if record.get("user_id") != user.get("id"):
            raise HTTPException(status_code=403, detail="This verification session does not belong to the signed-in account.")
    return resend_otp_code(payload.verification_id, payload.purpose)

@router.post("/forgot-password")
async def forgot_password(payload: SendOtpRequest):
    ensure_email_delivery_available()
    target = payload.mobileOrEmail.strip().lower()
    if "@" not in target:
        raise HTTPException(status_code=400, detail="Enter your registered email. SMS verification is not supported.")
    user = db_manager.find_one("users", {"email": target})
    # Send the same generic response for known and unknown addresses. Unknown
    # addresses receive a non-authorizing code so response behavior is uniform.
    result = issue_otp(target, "forgot-password", user.get("id") if user else None)
    result["message"] = "If an account matches those details, a code will be sent to its registered email."
    return result

@router.post("/reset-password")
async def reset_password(payload: PasswordResetRequest):
    verification_token = getattr(payload, "verification_token", None)
    if not verification_token:
        raise HTTPException(status_code=400, detail="Complete email verification before resetting your password.")
    record = consume_reset_token(verification_token)
    if not record:
        raise HTTPException(status_code=400, detail="This password reset session is invalid or expired. Request a new code.")
    user = db_manager.find_one("users", {"id": record.get("user_id")}) or db_manager.find_one("users", {"email": record["target"]})
    if not user or not record.get("user_id"):
        raise HTTPException(status_code=400, detail="This password reset session is invalid or expired. Request a new code.")
    if payload.confirmPassword and payload.newPassword != payload.confirmPassword:
        raise HTTPException(status_code=400, detail="Password confirmation does not match.")
    new_hash = get_password_hash(payload.newPassword)
    db_manager.update_one("users", {"email": user["email"]}, {"passwordHash": new_hash})
    return {"status": "success", "message": "Password has been successfully updated. You may now log in."}

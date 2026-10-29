import datetime
import hashlib
import hmac
import logging
import secrets
import smtplib
import uuid
import requests
from email.message import EmailMessage

from fastapi import HTTPException

from backend.config import (
    ALLOW_CONSOLE_OTP_FALLBACK,
    BREVO_API_KEY,
    JWT_SECRET_KEY,
    OTP_EXPIRY_SECONDS,
    OTP_MAX_ATTEMPTS,
    OTP_MAX_REQUESTS_PER_HOUR,
    OTP_PROVIDER,
    OTP_RESEND_COOLDOWN_SECONDS,
    RESEND_API_KEY,
    RESEND_FROM_EMAIL,
    SMTP_FROM_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USE_SSL,
    SMTP_USE_TLS,
    SMTP_USER,
)
from backend.database import db_manager

logger = logging.getLogger("pension_seva.otp")

UTC = datetime.timezone.utc
SUPPORTED_PURPOSES = {
    "registration", "login", "forgot-password", "application-submit",
    "change-email", "change-mobile", "sensitive-action",
}


def _now():
    return datetime.datetime.now(UTC)


def _require_mongo():
    if not db_manager.is_connected or db_manager.db is None:
        raise HTTPException(status_code=503, detail="Secure verification storage is unavailable. Please try again later.")


def _insert_record(record: dict):
    _require_mongo()
    try:
        db_manager.db["otp_verifications"].insert_one(record)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not save this verification session. Please try again.") from exc


def _find_one(query: dict):
    _require_mongo()
    try:
        record = db_manager.db["otp_verifications"].find_one(query)
        if record and "_id" in record:
            record["_id"] = str(record["_id"])
        return record
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Secure verification storage is unavailable. Please try again later.") from exc


def _find_all(query: dict):
    _require_mongo()
    try:
        records = list(db_manager.db["otp_verifications"].find(query))
        for record in records:
            if "_id" in record:
                record["_id"] = str(record["_id"])
        return records
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Secure verification storage is unavailable. Please try again later.") from exc


def _update_record(verification_id: str, fields: dict):
    _require_mongo()
    try:
        result = db_manager.db["otp_verifications"].update_one(
            {"verification_id": verification_id}, {"$set": fields}
        )
        if result.matched_count != 1:
            raise HTTPException(status_code=400, detail="This verification session is invalid or expired.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not update this verification session. Please try again.") from exc


def _increment_attempts(verification_id: str, max_attempts: int):
    _require_mongo()
    try:
        result = db_manager.db["otp_verifications"].update_one(
            {
                "verification_id": verification_id,
                "verified": False,
                "attempt_count": {"$lt": max_attempts},
                "expires_at": {"$gt": _now()},
            },
            {"$inc": {"attempt_count": 1}},
        )
        if result.matched_count != 1:
            current = _find_one({"verification_id": verification_id})
            if not current or current.get("verified"):
                raise HTTPException(status_code=400, detail="This verification code has already been used or is invalid.")
            if current.get("attempt_count", 0) >= max_attempts:
                raise HTTPException(status_code=429, detail="Too many attempts. Request a new code after the waiting period.")
            raise HTTPException(status_code=400, detail="This verification code has expired. Request a new code.")
        current = _find_one({"verification_id": verification_id})
        return current.get("attempt_count", max_attempts)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not update this verification session. Please try again.") from exc


def _mark_verified(verification_id: str, expected_hash: str, fields: dict, max_attempts: int):
    _require_mongo()
    try:
        result = db_manager.db["otp_verifications"].update_one(
            {
                "verification_id": verification_id,
                "verified": False,
                "otp_hash": expected_hash,
                "attempt_count": {"$lt": max_attempts},
                "expires_at": {"$gt": _now()},
            },
            {"$set": fields},
        )
        if result.matched_count != 1:
            raise HTTPException(status_code=400, detail="This verification code is invalid, expired, or already used.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not update this verification session. Please try again.") from exc


def _delete_record(verification_id: str):
    _require_mongo()
    try:
        result = db_manager.db["otp_verifications"].delete_one({"verification_id": verification_id})
        if result.deleted_count != 1:
            raise HTTPException(status_code=503, detail="Could not complete this verification safely. Please try again.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not complete this verification safely. Please try again.") from exc


def _as_utc(value):
    if isinstance(value, datetime.datetime):
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
    if isinstance(value, str):
        parsed = datetime.datetime.fromisoformat(value)
        return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)
    raise ValueError("Invalid OTP timestamp")


def _otp_hash(verification_id: str, code: str) -> str:
    payload = f"{verification_id}:{code}".encode()
    return hmac.new(JWT_SECRET_KEY.encode(), payload, hashlib.sha256).hexdigest()


def _token_hash(token: str) -> str:
    return hmac.new(JWT_SECRET_KEY.encode(), token.encode(), hashlib.sha256).hexdigest()


def mask_destination(target: str) -> str:
    local, _, domain = target.partition("@")
    if not domain:
        return "your registered email"
    visible = local[:1]
    return f"{visible}{'*' * max(3, min(len(local) - 1, 8))}@{domain}"


def _send_email(target: str, code: str) -> bool:
    """Send an OTP to *target*.

    Returns:
        True  – the code was delivered via a real email channel (Resend / SMTP).
        False – delivery fell back to the console log only; the caller should
                include the code in the API response so the user can still
                complete verification.
    """
    # 1. Direct Console / Mock OTP Provider
    if OTP_PROVIDER in {"console", "mock", "demo"}:
        logger.warning("🔑 [CONSOLE OTP] Verification code for %s is: %s", target, code)
        return False  # not a real email delivery

    # 2. Resend API (HTTP port 443 — works on Render Free Tier)
    if RESEND_API_KEY:
        try:
            sender = RESEND_FROM_EMAIL or "onboarding@resend.dev"
            resp = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": sender,
                    "to": [target],
                    "subject": "Your Pension Seva verification code",
                    "html": (
                        f"<p>Your <strong>Pension Seva</strong> verification code is:</p>"
                        f"<h2 style='letter-spacing:4px'>{code}</h2>"
                        f"<p>It expires in {OTP_EXPIRY_SECONDS // 60} minutes. Do not share it with anyone.</p>"
                    ),
                    "text": (
                        f"Your Pension Seva verification code is {code}. "
                        f"It expires in {OTP_EXPIRY_SECONDS // 60} minutes."
                    ),
                },
                timeout=10,
            )
            if resp.status_code in {200, 201}:
                logger.info("OTP sent successfully to %s via Resend API", mask_destination(target))
                return True  # real delivery
            logger.error("Resend API failed: %s %s", resp.status_code, resp.text)
            # 403 = test-mode restriction (unverified domain); fall through to SMTP
        except Exception as exc:
            logger.error("Resend API exception: %s", exc)

    # 3. Standard SMTP (Gmail, etc.)
    if all((SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL)):
        subject = "Your Pension Seva verification code"
        body_text = (
            f"Your Pension Seva verification code is: {code}\n"
            f"It expires in {OTP_EXPIRY_SECONDS // 60} minutes.\n"
            f"Do not share this code with anyone."
        )
        body_html = f"""
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;
            border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc">
  <h2 style="color:#1d4ed8;margin-bottom:4px">Pension Seva</h2>
  <p style="color:#64748b;font-size:13px;margin-top:0">Verification Code</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
  <p style="color:#1e293b;font-size:15px">Your one-time verification code is:</p>
  <div style="font-size:36px;font-weight:900;letter-spacing:10px;color:#1d4ed8;
              text-align:center;padding:16px;background:#eff6ff;border-radius:8px;
              margin:16px 0">{code}</div>
  <p style="color:#475569;font-size:13px">
    This code expires in <strong>{OTP_EXPIRY_SECONDS // 60} minutes</strong>.
    Do not share it with anyone.
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
  <p style="color:#94a3b8;font-size:11px">
    Pension Seva — Welfare Application Platform. If you did not request this code, ignore this email.
  </p>
</div>"""

        # Build the message with both plain-text and HTML parts
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM_EMAIL
        msg["To"] = target
        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        password = SMTP_PASSWORD.strip()
        last_error: Exception | None = None

        # Try port 587 STARTTLS first (works on Render Free + most cloud hosts),
        # then fall back to port 465 SSL.
        attempts = [
            (SMTP_HOST, 587, False),   # STARTTLS — preferred on cloud
            (SMTP_HOST, 465, True),    # SSL fallback
        ]

        for host, port, use_ssl in attempts:
            try:
                if use_ssl:
                    with smtplib.SMTP_SSL(host, port, timeout=12) as smtp:
                        smtp.ehlo()
                        smtp.login(SMTP_USER, password)
                        smtp.sendmail(SMTP_FROM_EMAIL, [target], msg.as_string())
                else:
                    with smtplib.SMTP(host, port, timeout=12) as smtp:
                        smtp.ehlo()
                        smtp.starttls()
                        smtp.ehlo()
                        smtp.login(SMTP_USER, password)
                        smtp.sendmail(SMTP_FROM_EMAIL, [target], msg.as_string())
                logger.info("OTP sent successfully to %s via SMTP %s:%s", mask_destination(target), host, port)
                return True  # real delivery ✓
            except (OSError, smtplib.SMTPException) as exc:
                logger.error(
                    "SMTP send failed via %s:%s (ssl=%s): %s: %s",
                    host, port, use_ssl, type(exc).__name__, exc,
                )
                last_error = exc

        # Both SMTP attempts failed
        if ALLOW_CONSOLE_OTP_FALLBACK:
            logger.warning(
                "⚠️ All SMTP ports (587/465) failed. Console fallback active. "
                "🔑 [FALLBACK OTP] Code for %s: %s",
                target, code,
            )
            return False  # console fallback — not a real email delivery

        logger.error("SMTP delivery to %s failed after all attempts.", mask_destination(target))
        raise HTTPException(
            status_code=502,
            detail=(
                "Could not send the verification email. "
                "Please check that your Gmail App Password is correct and that "
                "2-Step Verification is enabled on your Google account."
            ),
        ) from last_error

    # No provider configured at all
    if ALLOW_CONSOLE_OTP_FALLBACK or OTP_PROVIDER in {"console", "mock", "demo"}:
        logger.warning("🔑 [CONSOLE OTP] Verification code for %s is: %s", target, code)
        return False  # console fallback

    raise HTTPException(status_code=503, detail="Email OTP delivery is not configured on the server.")


def _check_provider_and_target(target: str):
    normalized_target = target.strip().lower()
    if "@" not in normalized_target:
        raise HTTPException(status_code=503, detail="SMS OTP delivery is not supported. Use an email address for verification.")
    if OTP_PROVIDER in {"console", "mock", "demo"} or ALLOW_CONSOLE_OTP_FALLBACK or RESEND_API_KEY:
        return normalized_target
    if OTP_PROVIDER not in {"email", "smtp"} or not all((SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL)):
        raise HTTPException(status_code=503, detail="Email OTP delivery is not configured on the server.")
    return normalized_target


def ensure_email_delivery_available():
    if OTP_PROVIDER in {"console", "mock", "demo"} or ALLOW_CONSOLE_OTP_FALLBACK or RESEND_API_KEY:
        return
    if OTP_PROVIDER not in {"email", "smtp"} or not all((SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL)):
        raise HTTPException(status_code=503, detail="Email OTP delivery is not configured on the server.")


def _recent_records(target: str, purpose: str, now: datetime.datetime):
    cutoff = now - datetime.timedelta(hours=1)
    rows = _find_all({"target": target, "purpose": purpose})
    recent = []
    for row in rows:
        try:
            if _as_utc(row.get("created_at", row.get("createdAt"))) >= cutoff:
                recent.append(row)
        except (TypeError, ValueError):
            continue
    return recent


def _deliver(record: dict, code: str):
    try:
        email_delivered = _send_email(record["target"], code)
    except HTTPException:
        _delete_record(record["verification_id"])
        raise
    response = {
        "success": True,
        "verification_id": record["verification_id"],
        "purpose": record["purpose"],
        "destination_masked": record["destination_masked"],
        "expires_in": OTP_EXPIRY_SECONDS,
        "resend_after": OTP_RESEND_COOLDOWN_SECONDS,
        "message": "A verification code was sent to your registered email.",
    }
    # Expose the code in the API response when:
    #  • OTP_PROVIDER is console/mock/demo (explicit dev mode), OR
    #  • real email delivery failed and console fallback was used
    #    (ALLOW_CONSOLE_OTP_FALLBACK=true + Resend test-mode 403 + SMTP ports blocked)
    # This lets users complete verification even when email isn't reachable.
    if not email_delivered:
        response["demo_code"] = code
        if OTP_PROVIDER in {"console", "mock", "demo"}:
            response["message"] = f"Demo Mode: Verification code is {code}"
        else:
            response["message"] = (
                f"Email delivery unavailable (email provider not configured for this address). "
                f"Your verification code is: {code}"
            )
    return response


def issue_otp(target: str, purpose: str, user_id: str = None) -> dict:
    """Issue an email OTP and persist only its keyed hash."""
    _require_mongo()
    normalized_target = _check_provider_and_target(target)
    if purpose not in SUPPORTED_PURPOSES:
        raise HTTPException(status_code=400, detail="This verification purpose is not supported.")
    now = _now()
    recent = _recent_records(normalized_target, purpose, now)
    if sum(1 + row.get("resend_count", 0) for row in recent) >= OTP_MAX_REQUESTS_PER_HOUR:
        raise HTTPException(status_code=429, detail="Too many code requests. Please try again later.")

    verification_id = uuid.uuid4().hex
    code = f"{secrets.randbelow(1_000_000):06d}"
    record = {
        "verification_id": verification_id,
        "otp_id": verification_id,
        "target": normalized_target,
        "destination_type": "email",
        "destination_masked": mask_destination(normalized_target),
        "purpose": purpose,
        "user_id": user_id,
        "otp_hash": _otp_hash(verification_id, code),
        "expires_at": now + datetime.timedelta(seconds=OTP_EXPIRY_SECONDS),
        "created_at": now,
        "last_sent_at": now,
        "attempt_count": 0,
        "max_attempts": OTP_MAX_ATTEMPTS,
        "resend_count": 0,
        "verified": False,
    }
    _insert_record(record)
    return _deliver(record, code)


def resend_otp(verification_id: str, purpose: str) -> dict:
    now = _now()
    _require_mongo()
    record = _find_one({"verification_id": verification_id})
    if not record or record.get("purpose") != purpose or record.get("verified"):
        raise HTTPException(status_code=400, detail="This verification session is invalid or has already been completed.")
    try:
        last_sent_at = _as_utc(record["last_sent_at"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=400, detail="This verification session is invalid or expired.")
    if (now - last_sent_at).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
        raise HTTPException(status_code=429, detail="Please wait before requesting another code.")
    recent = _recent_records(record["target"], purpose, now)
    if sum(1 + row.get("resend_count", 0) for row in recent) >= OTP_MAX_REQUESTS_PER_HOUR:
        raise HTTPException(status_code=429, detail="Too many code requests. Please try again later.")

    code = f"{secrets.randbelow(1_000_000):06d}"
    update = {
        "otp_hash": _otp_hash(verification_id, code),
        "expires_at": now + datetime.timedelta(seconds=OTP_EXPIRY_SECONDS),
        "last_sent_at": now,
        "created_at": now,
        "attempt_count": 0,
        "resend_count": record.get("resend_count", 0) + 1,
        "verified": False,
        "verification_token_hash": None,
    }
    _update_record(verification_id, update)
    record.update(update)
    return _deliver(record, code)


def verify_otp(verification_id: str, purpose: str, code: str, target: str = None) -> dict:
    _require_mongo()
    record = _find_one({"verification_id": verification_id})
    if not record or record.get("purpose") != purpose or (target and record.get("target") != target.strip().lower()):
        raise HTTPException(status_code=400, detail="This verification session is invalid.")
    if record.get("verified"):
        raise HTTPException(status_code=400, detail="This verification code has already been used.")
    try:
        if _as_utc(record["expires_at"]) <= _now():
            raise HTTPException(status_code=400, detail="This verification code has expired. Request a new code.")
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=400, detail="This verification code has expired. Request a new code.")
    attempts = record.get("attempt_count", 0)
    max_attempts = record.get("max_attempts", OTP_MAX_ATTEMPTS)
    if attempts >= max_attempts:
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new code after the waiting period.")
    submitted_hash = _otp_hash(verification_id, code.strip())
    if not hmac.compare_digest(submitted_hash, record.get("otp_hash", "")):
        attempts = _increment_attempts(verification_id, max_attempts)
        remaining = max(0, max_attempts - attempts)
        if remaining == 0:
            raise HTTPException(status_code=429, detail="Too many attempts. Request a new code after the waiting period.")
        raise HTTPException(status_code=400, detail=f"Incorrect code. Please check it and try again. {remaining} attempts remaining.")

    update = {
        "verified": True,
        "verified_at": _now(),
        # Verified sessions stay valid for 30 minutes so the applicant can
        # complete submission without a fresh code each retry.
        "expires_at": _now() + datetime.timedelta(minutes=30),
    }
    response = {"success": True, "message": "Verification successful.", "purpose": purpose}
    if purpose == "forgot-password":
        verification_token = secrets.token_urlsafe(32)
        update["verification_token_hash"] = _token_hash(verification_token)
        response["verification_token"] = verification_token
    _mark_verified(verification_id, submitted_hash, update, max_attempts)
    return response


def consume_verified_otp(target: str, purpose: str) -> bool:
    _require_mongo()
    normalized_target = target.strip().lower()
    now = _now()
    records = _find_all({"target": normalized_target, "purpose": purpose, "verified": True})
    for record in records:
        try:
            if _as_utc(record.get("verified_at")) <= now and _as_utc(record.get("expires_at")) > now:
                _delete_record(record["verification_id"])
                return True
        except (KeyError, TypeError, ValueError):
            continue
    return False


def consume_reset_token(token: str):
    _require_mongo()
    token_hash = _token_hash(token)
    try:
        record = db_manager.db["otp_verifications"].find_one_and_update(
            {
                "purpose": "forgot-password",
                "verified": True,
                "verification_token_hash": token_hash,
                "reset_token_used": {"$ne": True},
                "expires_at": {"$gt": _now()},
            },
            {"$set": {"reset_token_used": True}},
            return_document=True,
        )
        if record and "_id" in record:
            record["_id"] = str(record["_id"])
        return record
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Secure verification storage is unavailable. Please try again later.") from exc


def is_recently_verified(target: str, purpose: str = None) -> bool:
    _require_mongo()
    normalized_target = target.strip().lower()
    query = {"target": normalized_target, "verified": True}
    if purpose:
        query["purpose"] = purpose
    now = _now()
    for record in _find_all(query):
        try:
            if _as_utc(record.get("verified_at")) <= now and _as_utc(record.get("expires_at")) > now:
                return True
        except (TypeError, ValueError):
            continue
    return False

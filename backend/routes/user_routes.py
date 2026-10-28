import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from backend.models import UserProfile, UserSettings, UserUpdateRequest, PensionHistoryRecord
from backend.database import db_manager
from backend.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["User Profile & Preferences"])

PROFILE_FIELDS = ("profilePhoto", "dob", "gender", "addressInfo", "maritalStatus", "familyMembers")

def _build_profile(user: dict) -> UserProfile:
    kwargs = {field: user.get(field) for field in PROFILE_FIELDS}
    if kwargs["familyMembers"] is None:
        kwargs["familyMembers"] = []
    return UserProfile(
        id=user["id"],
        fullName=user["fullName"],
        email=user["email"],
        mobile=user["mobile"],
        role=user.get("role", "USER"),
        preferredLanguage=user.get("preferredLanguage", "en"),
        settings=UserSettings(**(user.get("settings", {}) or {})),
        createdAt=user.get("createdAt", ""),
        **kwargs,
    )

@router.get("/me", response_model=UserProfile)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    user = db_manager.find_one("users", {"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _build_profile(user)

@router.put("/me", response_model=UserProfile)
async def update_my_profile(payload: UserUpdateRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    update_data: Dict[str, Any] = {"updatedAt": datetime.datetime.utcnow().isoformat()}

    if payload.fullName is not None:
        update_data["fullName"] = payload.fullName.strip()
    if payload.mobile is not None:
        update_data["mobile"] = payload.mobile.strip()
    if payload.preferredLanguage is not None:
        update_data["preferredLanguage"] = payload.preferredLanguage
    if payload.settings is not None:
        update_data["settings"] = payload.settings.dict()
    if payload.profilePhoto is not None:
        update_data["profilePhoto"] = payload.profilePhoto
    if payload.dob is not None:
        update_data["dob"] = payload.dob
    if payload.gender is not None:
        update_data["gender"] = payload.gender
    if payload.addressInfo is not None:
        update_data["addressInfo"] = payload.addressInfo
    if payload.maritalStatus is not None:
        update_data["maritalStatus"] = payload.maritalStatus
    if payload.familyMembers is not None:
        update_data["familyMembers"] = [m.dict() for m in payload.familyMembers]

    db_manager.update_one("users", {"id": user_id}, update_data)
    updated_user = db_manager.find_one("users", {"id": user_id})
    return _build_profile(updated_user)

@router.get("/me/settings", response_model=UserSettings)
async def get_my_settings(current_user: dict = Depends(get_current_user)):
    user = db_manager.find_one("users", {"id": current_user["id"]})
    settings_dict = user.get("settings", {}) if user else {}
    return UserSettings(**settings_dict)

@router.put("/me/settings", response_model=UserSettings)
async def update_my_settings(settings: UserSettings, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    db_manager.update_one("users", {"id": user_id}, {"settings": settings.dict()})
    return settings

@router.get("/me/pension-history", response_model=List[PensionHistoryRecord])
async def get_my_pension_history(current_user: dict = Depends(get_current_user)):
    records = db_manager.find_all("pension_history", {"userId": current_user["id"]}, sort_key="date", sort_desc=True)
    return [PensionHistoryRecord(**r) for r in records]

@router.get("/me/verification")
async def get_my_verification_status(current_user: dict = Depends(get_current_user)):
    # Check verification across latest application and documents
    latest_app = db_manager.find_one("applications", {"userId": current_user["id"]})
    if latest_app and latest_app.get("identityVerification"):
        return latest_app["identityVerification"]
    return {
        "identityStatus": "PENDING_VERIFICATION",
        "overallConfidence": 0.0,
        "details": ["No application documents processed yet for identity verification."]
    }

@router.get("/me/analysis")
async def get_my_analysis(current_user: dict = Depends(get_current_user)):
    apps = db_manager.find_all("applications", {"userId": current_user["id"]})
    docs = db_manager.find_all("documents", {"userId": current_user["id"]})
    return {
        "applicationsCount": len(apps),
        "documentsCount": len(docs),
        "latestScore": apps[0].get("aiScore") if apps else None,
        "activeStatus": apps[0].get("status") if apps else "NO_APPLICATION"
    }

@router.get("/me/updates")
async def get_my_relevant_updates(current_user: dict = Depends(get_current_user)):
    updates = db_manager.find_all("system_updates", {"isPublished": True}, sort_key="date", sort_desc=True, limit=10)
    return updates

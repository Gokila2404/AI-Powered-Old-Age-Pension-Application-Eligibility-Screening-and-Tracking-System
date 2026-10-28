from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from backend.database import db_manager
from backend.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    user_notifs = db_manager.find_all("notifications", {"userId": current_user["id"]}, sort_key="date", sort_desc=True)
    if not user_notifs:
        default_item = {
            "id": "NOTIF-WELCOME",
            "userId": current_user["id"],
            "titleEn": "Welcome to Pension Seva",
            "titleTa": "பென்ஷன் சேவா தளத்திற்கு நல்வரவு",
            "descEn": "Check your pension eligibility and track welfare applications in simple guided steps.",
            "descTa": "உங்கள் தகுதியை சரிபார்த்து எளிய முறையில் ஓய்வூதியத்திற்கு விண்ணப்பியுங்கள்.",
            "date": "2026-10-08",
            "type": "WELCOME",
            "read": False
        }
        db_manager.insert_one("notifications", default_item)
        user_notifs = [default_item]
    return user_notifs

@router.put("/{notif_id}/read")
@router.patch("/{notif_id}/read")
async def mark_as_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    db_manager.update_one("notifications", {"id": notif_id, "userId": current_user["id"]}, {"read": True})
    return {"status": "success", "id": notif_id}

@router.put("/read-all")
async def mark_all_as_read(current_user: dict = Depends(get_current_user)):
    user_notifs = db_manager.find_all("notifications", {"userId": current_user["id"]})
    for n in user_notifs:
        db_manager.update_one("notifications", {"id": n["id"]}, {"read": True})
    return {"status": "success", "count": len(user_notifs)}

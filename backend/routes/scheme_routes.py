import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field, ValidationError
from backend.models import SchemeModel, SchemeCreate
from backend.services.scheme_recommender import get_active_schemes
from backend.services.scheme_forms import get_scheme_form_fields
from backend.database import db_manager
from backend.auth import get_admin_user

router = APIRouter(prefix="/api/schemes", tags=["Schemes"])


class SchemeEligibilityInput(BaseModel):
    age: int = Field(ge=0, le=120)
    annualIncome: int = Field(ge=0)
    residenceState: str = Field(min_length=1, max_length=100)
    hasExistingPension: bool


@router.post("/{scheme_id}/check-eligibility")
async def check_scheme_eligibility(scheme_id: str, payload: SchemeEligibilityInput):
    scheme = db_manager.find_one("schemes", {"id": scheme_id, "isActive": True})
    if not scheme:
        raise HTTPException(status_code=404, detail="Active scheme not found.")
    rule = db_manager.find_one("eligibility_rules", {"schemeId": scheme_id, "isActive": True}) or scheme
    age_limit = int(rule.get("minAge", scheme.get("minAge", 0)))
    income_limit = int(rule.get("maxIncome", scheme.get("maxIncome", 2**31 - 1)))
    state_required = str(rule.get("residenceRequired", scheme.get("residenceRequired", "Tamil Nadu")))
    conflicts_allowed = bool(rule.get("benefitConflictsAllowed", scheme.get("benefitConflictsAllowed", False)))
    normalized_state = " ".join(payload.residenceState.casefold().replace("tn", "tamil nadu").split())
    normalized_required = " ".join(state_required.casefold().replace("tn", "tamil nadu").split())
    checks = [
        {"criterion": "Minimum age", "passed": payload.age >= age_limit,
         "actual": f"{payload.age} years", "required": f"{age_limit}+ years"},
        {"criterion": "Annual income", "passed": payload.annualIncome <= income_limit,
         "actual": payload.annualIncome, "required": f"at most {income_limit}"},
        {"criterion": "Residence", "passed": normalized_state == normalized_required,
         "actual": payload.residenceState, "required": state_required},
        {"criterion": "Other pension conflict", "passed": conflicts_allowed or not payload.hasExistingPension,
         "actual": "Already receives a pension" if payload.hasExistingPension else "No other pension reported",
         "required": "No conflicting pension" if not conflicts_allowed else "Conflict allowed by scheme rule"},
    ]
    eligible = all(check["passed"] for check in checks)
    return {"schemeId": scheme_id, "schemeName": scheme.get("nameEn", scheme_id),
            "eligible": eligible, "status": "LIKELY ELIGIBLE" if eligible else "NOT CURRENTLY ELIGIBLE",
            "checks": checks,
            "notice": "Preliminary check of the active scheme's age, income, and residence rules. Document and administrative review still apply."}

@router.get("", response_model=List[SchemeModel])
async def list_schemes(
    minAge: Optional[int] = Query(None),
    maxIncome: Optional[int] = Query(None),
    benefitType: Optional[str] = Query(None),
    category: Optional[str] = Query(None)
):
    schemes = get_active_schemes()
    filtered = schemes
    if minAge is not None:
        filtered = [s for s in filtered if s.get("minAge", 0) <= minAge]
    if maxIncome is not None:
        filtered = [s for s in filtered if s.get("maxIncome", 999999) >= maxIncome]
    if benefitType:
        filtered = [s for s in filtered if benefitType.lower() in s.get("benefitType", "").lower()]

    valid = []
    for scheme in filtered:
        try:
            valid.append(SchemeModel(**scheme))
        except ValidationError:
            continue
    return valid

@router.get("/{scheme_id}/application-form")
async def get_scheme_application_form(scheme_id: str):
    """Scheme-specific application questions and required documents.
    The frontend renders these fields dynamically so each NSAP scheme asks the
    exact questions its rules require (widow pension asks death-certificate
    details, disability pension asks UDID details, etc.)."""
    scheme = db_manager.find_one("schemes", {"id": scheme_id, "isActive": True})
    if not scheme:
        raise HTTPException(status_code=404, detail="Active scheme not found.")
    return get_scheme_form_fields(scheme_id)

@router.get("/{scheme_id}", response_model=SchemeModel)
async def get_scheme_by_id(scheme_id: str):
    scheme = db_manager.find_one("schemes", {"id": scheme_id})
    if not scheme:
        raise HTTPException(status_code=404, detail="Welfare scheme not found.")
    try:
        return SchemeModel(**scheme)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail="This scheme record is incomplete and cannot be displayed.") from exc

@router.post("", response_model=SchemeModel)
async def create_scheme(payload: SchemeCreate, admin_user: dict = Depends(get_admin_user)):
    scheme_id = f"SCHEME-{uuid.uuid4().hex[:6].upper()}"
    now_iso = datetime.datetime.utcnow().isoformat()
    doc = payload.dict()
    doc["id"] = scheme_id
    doc["quotaCount"] = 5000
    doc["activeBeneficiaries"] = 0
    doc["createdAt"] = now_iso
    doc["updatedAt"] = now_iso
    db_manager.insert_one("schemes", doc)
    return SchemeModel(**doc)

@router.put("/{scheme_id}", response_model=SchemeModel)
async def update_scheme(scheme_id: str, payload: SchemeCreate, admin_user: dict = Depends(get_admin_user)):
    existing = db_manager.find_one("schemes", {"id": scheme_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Scheme not found.")
    doc = payload.dict()
    doc["id"] = scheme_id
    doc["updatedAt"] = datetime.datetime.utcnow().isoformat()
    db_manager.update_one("schemes", {"id": scheme_id}, doc)
    existing.update(doc)
    return SchemeModel(**existing)

@router.delete("/{scheme_id}")
async def deactivate_scheme(scheme_id: str, admin_user: dict = Depends(get_admin_user)):
    db_manager.update_one("schemes", {"id": scheme_id}, {"isActive": False})
    return {"status": "deactivated", "schemeId": scheme_id}

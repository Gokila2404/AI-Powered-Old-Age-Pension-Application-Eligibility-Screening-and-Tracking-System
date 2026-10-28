import uuid
import datetime
from fastapi import APIRouter, HTTPException, status, Request
from backend.models import EligibilityCheckInput, EligibilityAssessmentResponse
from backend.services.eligibility_service import assess_eligibility
from backend.database import db_manager
from backend.traceability.store import record_standalone_eligibility

router = APIRouter(prefix="/api/eligibility", tags=["Eligibility Assessment"])

@router.post("/check", response_model=EligibilityAssessmentResponse)
async def check_eligibility(payload: EligibilityCheckInput, request: Request):
    """
    Evaluates applicant profile, computes 0-100 score, checks active schemes
    dynamically from MongoDB, and returns explainable decision support breakdown.
    """
    result = assess_eligibility(payload)
    
    # Store assessment in ai_assessments collection
    assessment_id = f"EVAL-{uuid.uuid4().hex[:8].upper()}"
    assessment_doc = {
        "id": assessment_id,
        "score": result.score,
        "status": result.status,
        "breakdown": result.breakdown.dict(),
        "reasons": result.reasons,
        "missingInformation": result.missingInformation,
        "conditionsAffected": result.conditionsAffected,
        "input": payload.dict(),
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    db_manager.insert_one("ai_assessments", assessment_doc)
    evaluation_id = record_standalone_eligibility(
        {"id": "SYSTEM:eligibility-api", "role": "SYSTEM"},
        request.headers.get("x-request-id") or assessment_id,
        payload.model_dump(),
        {"score": result.score, "status": result.status, "reasons": result.reasons,
         "missingInformation": result.missingInformation, "conditionsAffected": result.conditionsAffected},
        "eligibility-service-v1",
    )
    result.evaluationId = evaluation_id
    
    return result

@router.post("/assess", response_model=EligibilityAssessmentResponse)
async def assess_eligibility_alias(payload: EligibilityCheckInput, request: Request):
    """Alias for /check to maintain backward compatibility."""
    return await check_eligibility(payload, request)

@router.get("/{eval_id}", response_model=EligibilityAssessmentResponse)
async def get_saved_eligibility_evaluation(eval_id: str):
    doc = db_manager.find_one("ai_assessments", {"id": eval_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Eligibility assessment record not found.")
    return EligibilityAssessmentResponse(
        score=doc["score"],
        status=doc["status"],
        breakdown=doc["breakdown"],
        reasons=doc.get("reasons", []),
        missingInformation=doc.get("missingInformation", []),
        conditionsAffected=doc.get("conditionsAffected", []),
        recommendedSchemes=[]
    )

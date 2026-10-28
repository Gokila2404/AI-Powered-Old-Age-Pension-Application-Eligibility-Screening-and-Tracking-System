from typing import Dict, Any, List
from backend.models import (
    EligibilityCheckInput,
    ScoreBreakdown,
    EligibilityAssessmentResponse,
    SchemeMatchSummary
)
from backend.services.scheme_recommender import recommend_schemes

def assess_eligibility(data: EligibilityCheckInput) -> EligibilityAssessmentResponse:
    """
    Computes an explainable 0–100 AI preliminary eligibility score
    with granular rule-based decision support factors.
    """
    reasons: List[str] = []
    missing_info: List[str] = []
    conditions_affected: List[str] = []

    # 1. Age condition (Max 25 pts)
    age_score = 0
    if data.age >= 65:
        age_score = 25
        reasons.append("Senior age criterion fully met (65+ years old: +25 pts).")
    elif data.age >= 60:
        age_score = 25
        reasons.append("Standard old-age threshold satisfied (60-64 years old: +25 pts).")
    elif data.isWidow and data.age >= 40:
        age_score = 23
        reasons.append("Destitute widow eligibility age requirement met (40+ years old: +23 pts).")
    elif data.hasDisability and data.age >= 18:
        age_score = 22
        reasons.append("Differently abled adult age qualification satisfied (18+ years: +22 pts).")
    elif data.age >= 55:
        age_score = 12
        conditions_affected.append("Age is between 55-59: Near qualifying threshold for standard Old Age Pension.")
    else:
        age_score = 5
        conditions_affected.append(f"Current age ({data.age}) is below the standard 60-year pension threshold.")

    # 2. Income condition (Max 25 pts)
    income_score = 0
    # Standard threshold: <= 72,000 INR/year (TN destitute threshold)
    if data.annualIncome <= 48000:
        income_score = 25
        reasons.append("Annual income is well below the poverty limit (≤ ₹48,000/yr: +25 pts).")
    elif data.annualIncome <= 72000:
        income_score = 22
        reasons.append("Annual income is within eligible welfare limit (≤ ₹72,000/yr: +22 pts).")
    elif data.annualIncome <= 100000:
        income_score = 10
        conditions_affected.append("Annual income between ₹72,000 and ₹1,00,000 may require discretionary officer review.")
    else:
        income_score = 2
        conditions_affected.append(f"Reported income of ₹{data.annualIncome:,}/yr exceeds standard criteria (₹72,000/yr).")

    # 3. Residence condition (Max 20 pts)
    residence_score = 0
    if data.residenceState.strip().lower() in ["tamil nadu", "tamilnadu", "tn"]:
        residence_score = 20
        reasons.append(f"Permanent residency confirmed in {data.district}, Tamil Nadu (+20 pts).")
    else:
        residence_score = 5
        conditions_affected.append(f"Residency stated outside Tamil Nadu ({data.residenceState}). State specific benefits may vary.")

    # 4. Existing benefit check (Max 10 pts)
    benefit_score = 0
    if not data.hasExistingPension:
        benefit_score = 10
        reasons.append("No active conflicting pension detected (+10 pts).")
    else:
        # If already receiving pension
        benefit_score = 2
        conditions_affected.append(
            f"Already receiving existing pension ({data.existingPensionName or 'Active Payout'}). "
            "Dual-draw restrictions apply under social security norms."
        )

    # 5. Document readiness & confidence (Max 6 pts)
    doc_score = 0
    docs_present = 0
    if data.hasAgeProof:
        docs_present += 1
    else:
        missing_info.append("Age proof / Aadhaar copy")

    if data.hasIncomeCertificate:
        docs_present += 1
    else:
        missing_info.append("Tahsildar / Village Officer Income Certificate")

    if data.hasBankPassbook:
        docs_present += 1
    else:
        missing_info.append("Bank passbook / DBT active account details")

    if docs_present == 3:
        doc_score = 6
        reasons.append("All primary verification documents declared available (+6 pts).")
    elif docs_present == 2:
        doc_score = 4
        reasons.append("Key identity and income documentation declared (+4 pts).")
    else:
        doc_score = 2
        conditions_affected.append("Essential supporting documentation appears incomplete.")

    # 6. Identity consistency estimation (Max 10 pts)
    identity_score = 10
    reasons.append("Self-declared identity and profile indicators are consistent (+10 pts).")

    total_score = age_score + income_score + residence_score + benefit_score + doc_score + identity_score
    total_score = max(0, min(100, total_score))

    # Category determination
    if total_score >= 80:
        status_category = "LIKELY ELIGIBLE"
    elif total_score >= 50:
        status_category = "POSSIBLE MATCH / NEEDS REVIEW"
    else:
        status_category = "LIKELY NOT ELIGIBLE"

    breakdown = ScoreBreakdown(
        ageScore=age_score,
        incomeScore=income_score,
        residenceScore=residence_score,
        benefitScore=benefit_score,
        documentConfidenceScore=doc_score,
        identityConsistencyScore=identity_score,
        totalScore=total_score
    )

    recommended_schemes = recommend_schemes(data)

    return EligibilityAssessmentResponse(
        score=total_score,
        status=status_category,
        breakdown=breakdown,
        reasons=reasons,
        missingInformation=missing_info,
        conditionsAffected=conditions_affected,
        recommendedSchemes=recommended_schemes
    )

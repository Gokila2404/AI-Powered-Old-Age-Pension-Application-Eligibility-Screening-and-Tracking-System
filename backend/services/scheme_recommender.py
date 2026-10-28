from typing import List, Dict, Any
from backend.models import SchemeMatchSummary, EligibilityCheckInput
from backend.database import db_manager
from backend.services.nsap_schemes import DEFAULT_SCHEMES_DATA


def get_active_schemes() -> List[Dict[str, Any]]:
    schemes = db_manager.find_all("schemes", {"isActive": True})
    if not schemes and db_manager.count_documents("schemes") == 0:
        # Seed defaults only when the catalogue is genuinely empty. If an
        # administrator pauses every scheme, do not silently reactivate them.
        for s in DEFAULT_SCHEMES_DATA:
            db_manager.insert_one("schemes", s)
        schemes = db_manager.find_all("schemes", {"isActive": True}) or DEFAULT_SCHEMES_DATA
    return schemes

def recommend_schemes(data: EligibilityCheckInput) -> List[SchemeMatchSummary]:
    """
    Evaluates applicant profile and returns list of relevant welfare schemes
    flagged as 'Possible Match' with matching percentages and rationale.
    """
    schemes = get_active_schemes()
    matches: List[SchemeMatchSummary] = []

    for scheme in schemes:
        match_score = 0
        conditions_met = []
        reasons = []

        # Age evaluation
        min_age = scheme.get("minAge", 60)
        if data.age >= min_age:
            match_score += 40
            conditions_met.append(f"Age {data.age} satisfies minimum requirement ({min_age}+ years)")
        else:
            diff = min_age - data.age
            if diff <= 5:
                match_score += 15
                reasons.append(f"Age is {diff} years below qualifying threshold")
            else:
                match_score += 0

        # Income evaluation
        max_income = scheme.get("maxIncome", 72000)
        if data.annualIncome <= max_income:
            match_score += 35
            conditions_met.append(f"Annual income â‚¹{data.annualIncome:,} is within ceiling (â‚¹{max_income:,}/yr)")
        elif data.annualIncome <= max_income * 1.25:
            match_score += 15
            reasons.append(f"Income slightly above standard threshold (â‚¹{data.annualIncome:,}/yr)")
        else:
            match_score += 5

        # Special criteria evaluation (real NSAP scheme IDs)
        if scheme["id"] == "IGNWPS-TN":
            if data.isWidow:
                match_score += 25
                conditions_met.append("Widow status declared")
            else:
                match_score = max(0, match_score - 30)

        elif scheme["id"] == "IGNDPS-TN":
            if data.hasDisability and (data.disabilityPercentage or 0) >= 40:
                match_score += 25
                conditions_met.append("Benchmark disability criterion declared")
            else:
                match_score = max(0, match_score - 30)

        elif scheme["id"] == "ANNAPURNA-FOOD":
            if data.age >= 65 and not data.hasExistingPension:
                match_score += 25
                conditions_met.append("Optimal alternative for elder food grain assistance")
            else:
                match_score += 10

        else:
            # General schemes
            if not data.hasExistingPension:
                match_score += 25
                conditions_met.append("No active duplicate pension claimed")
            else:
                match_score += 5
                reasons.append("Subject to non-duplication verification")

        match_score = min(98, max(20, match_score))

        matches.append(SchemeMatchSummary(
            schemeId=scheme["id"],
            schemeName=scheme["nameEn"],
            matchStatus="Possible Match",
            matchPercentage=match_score,
            keyConditionsMet=conditions_met,
            reasons=reasons,
            requiredDocuments=scheme.get("requiredDocuments", [])
        ))

    # Sort descending by match percentage
    matches.sort(key=lambda x: x.matchPercentage, reverse=True)
    return matches

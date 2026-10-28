from typing import Any, Dict, List, Optional

from rapidfuzz import fuzz

from backend.models import DocumentMatchScore


def normalize_text(value: Optional[str]) -> str:
    if value is None:
        return ""
    return " ".join(str(value).strip().casefold().split())


def match_documents_and_identity(
    registered_name: str,
    application_personal: Dict[str, Any],
    application_income: Dict[str, Any],
    ocr_extracted_fields: Dict[str, Any],
) -> DocumentMatchScore:
    """Compare only values actually extracted from this uploaded document."""
    comparisons: Dict[str, Optional[float]] = {
        "name": None, "dob": None, "income": None, "certificate": None,
    }
    details: List[str] = []

    extracted_name = normalize_text(ocr_extracted_fields.get("name"))
    applicant_name = normalize_text(application_personal.get("fullName"))
    if extracted_name and applicant_name:
        comparisons["name"] = float(fuzz.token_sort_ratio(applicant_name, extracted_name))
        if registered_name and normalize_text(registered_name) != applicant_name:
            details.append("The application name differs from the registered account name.")
        details.append(f"Name match: {comparisons['name']:.1f}% (applicant compared with extracted source value).")

    extracted_dob = normalize_text(ocr_extracted_fields.get("dob"))
    applicant_dob = normalize_text(application_personal.get("dob"))
    if extracted_dob and applicant_dob:
        comparisons["dob"] = float(fuzz.ratio(applicant_dob, extracted_dob))
        details.append(f"Date of birth match: {comparisons['dob']:.1f}%.")

    extracted_income = ocr_extracted_fields.get("annualIncome")
    declared_income = application_income.get("annualIncome")
    if extracted_income is not None and declared_income not in (None, ""):
        try:
            comparisons["income"] = 100.0 if int(extracted_income) == int(declared_income) else 0.0
            details.append(f"Annual income {'matches' if comparisons['income'] == 100 else 'does not match'} the extracted source value.")
        except (TypeError, ValueError):
            details.append("Extracted income could not be compared as a number.")

    extracted_certificate = normalize_text(ocr_extracted_fields.get("certificateNumber"))
    applicant_certificate = normalize_text(application_income.get("incomeCertificateNo"))
    if extracted_certificate and applicant_certificate:
        comparisons["certificate"] = float(fuzz.ratio(applicant_certificate, extracted_certificate))
        details.append(f"Certificate number match: {comparisons['certificate']:.1f}%.")

    available_scores = [score for score in comparisons.values() if score is not None]
    overall = round(sum(available_scores) / len(available_scores), 1) if available_scores else None
    if not available_scores:
        identity_status = "REVIEW REQUIRED"
        details.append("No comparable fields were extracted from this document; review the source or upload a clearer copy.")
    elif any(score < 70 for score in available_scores):
        identity_status = "NOT VERIFIED"
        details.append("A document field differs materially from the applicant declaration.")
    elif all(score >= 90 for score in available_scores):
        identity_status = "VERIFIED"
    else:
        identity_status = "PARTIALLY VERIFIED"

    return DocumentMatchScore(
        nameMatchPercentage=comparisons["name"], dobMatchPercentage=comparisons["dob"],
        incomeMatchPercentage=comparisons["income"], certNumberMatchPercentage=comparisons["certificate"],
        overallConfidence=overall, identityStatus=identity_status, details=details,
    )

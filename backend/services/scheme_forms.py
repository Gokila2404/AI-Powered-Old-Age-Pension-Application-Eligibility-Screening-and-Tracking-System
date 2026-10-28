"""Scheme-specific application form questions and required documents.

Each NSAP scheme asks slightly different questions and requires slightly
different documents. The backend serves these definitions so the frontend can
render a dynamic form per scheme and validate answers on submit.
"""
from typing import Any, Dict, List

# question: {"key", "labelEn", "type" ("text"|"number"|"select"|"boolean"|"date"),
#            "required", "options" (for select), "dependsOn" ({"key","equals"}) }
SCHEME_FORM_FIELDS: Dict[str, List[Dict[str, Any]]] = {
    "IGNOAPS-TN": [
        {"key": "maritalStatus", "labelEn": "Marital status", "type": "select",
         "required": True, "options": ["Single", "Married", "Widowed", "Divorced"]},
        {"key": "livingArrangement", "labelEn": "Living arrangement",
         "type": "select", "required": True,
         "options": ["Alone", "With spouse", "With family", "Old-age home"]},
        {"key": "belowPovertyLine", "labelEn": "Do you hold a BPL (Below Poverty Line) / ration card?",
         "type": "boolean", "required": True},
        {"key": "rationCardType", "labelEn": "Ration card type", "type": "select",
         "required": True,
         "options": ["BPL (Pink)", "Annapurna (Yellow)", "OPH (Green)", "Don't hold a ration card"],
         "dependsOn": {"key": "belowPovertyLine", "equals": True}},
    ],
    "IGNWPS-TN": [
        {"key": "husbandDeathDate", "labelEn": "Date of husband's death",
         "type": "date", "required": True},
        {"key": "husbandDeathCertificateNo", "labelEn": "Death certificate number",
         "type": "text", "required": True},
        {"key": "remarried", "labelEn": "Have you remarried since?", "type": "boolean", "required": True},
        {"key": "dependentChildren", "labelEn": "Number of dependent children",
         "type": "number", "required": True},
        {"key": "incomeSourceDetail", "labelEn": "Current source of income",
         "type": "select", "required": True,
         "options": ["None / no regular income", "Daily wage", "Domestic work",
                     "Small vending", "Family support"]},
    ],
    "IGNDPS-TN": [
        {"key": "disabilityType", "labelEn": "Type of disability", "type": "select",
         "required": True,
         "options": ["Locomotor", "Visual", "Hearing", "Intellectual",
                     "Mental illness", "Multiple"]},
        {"key": "disabilityPercentage", "labelEn": "Certified disability percentage",
         "type": "number", "required": True},
        {"key": "udidNumber", "labelEn": "UDID (Unique Disability ID) number",
         "type": "text", "required": False},
        {"key": "disabilityCertificateNo", "labelEn": "Disability certificate number",
         "type": "text", "required": True},
        {"key": "certificateIssuedBy", "labelEn": "Certificate issued by", "type": "select",
         "required": True,
         "options": ["District Medical Board", "State Medical Board", "Not yet assessed"]},
    ],
    "ANNAPURNA-FOOD": [
        {"key": "receivesCashPension", "labelEn": "Are you currently receiving a cash pension under IGNOAPS/IGNWPS/IGNDPS?",
         "type": "boolean", "required": True},
        {"key": "rationCardType", "labelEn": "Ration card type", "type": "select",
         "required": True,
         "options": ["BPL (Pink)", "Annapurna (Yellow)", "OPH (Green)", "Don't hold a ration card"]},
        {"key": "cookingArrangement", "labelEn": "Who cooks your meals?",
         "type": "select", "required": True,
         "options": ["Myself", "Spouse/family", "Neighbour/community kitchen",
                     "Old-age home"]},
    ],
}

SCHEME_REQUIRED_DOCS: Dict[str, List[str]] = {
    "IGNOAPS-TN": ["Aadhaar Card", "Age Proof (Birth Certificate / School Certificate)",
                   "Income Certificate", "Bank Passbook", "Ration Card"],
    "IGNWPS-TN": ["Aadhaar Card", "Husband's Death Certificate",
                  "Income Certificate", "Bank Passbook"],
    "IGNDPS-TN": ["Aadhaar Card", "Disability Certificate (40%+)",
                  "UDID Card (if available)", "Income Certificate", "Bank Passbook"],
    "ANNAPURNA-FOOD": ["Age Proof (65+)", "Ration Card", "Income Certificate"],
}

SCHEME_APPLY_NOTES: Dict[str, str] = {
    "IGNOAPS-TN": "Applicants aged 60+ from BPL households with no other NSAP pension.",
    "IGNWPS-TN": "Widows aged 40+, BPL household, not remarried, no other NSAP pension.",
    "IGNDPS-TN": "Persons with certified disability 40%+, BPL household, no other NSAP pension.",
    "ANNAPURNA-FOOD": "Seniors 65+ not receiving any other NSAP cash pension.",
}


def get_scheme_form_fields(scheme_id: str) -> Dict[str, Any]:
    fields = SCHEME_FORM_FIELDS.get(scheme_id, [])
    return {
        "schemeId": scheme_id,
        "fields": fields,
        "requiredDocuments": SCHEME_REQUIRED_DOCS.get(scheme_id, []),
        "applyNotes": SCHEME_APPLY_NOTES.get(scheme_id, ""),
    }


def validate_scheme_answers(scheme_id: str, answers: Dict[str, Any]) -> List[str]:
    """Return a list of human-readable validation errors (empty = valid)."""
    errors: List[str] = []
    fields = SCHEME_FORM_FIELDS.get(scheme_id, [])
    for field in fields:
        key = field["key"]
        required = field.get("required", False)
        depends = field.get("dependsOn")
        if depends:
            parent_value = answers.get(depends["key"])
            if str(parent_value).lower() != str(depends["equals"]).lower():
                continue  # dependent question hidden — not required
        value = answers.get(key)
        if required and (value is None or str(value).strip() == ""):
            errors.append(f"Answer required for '{field['labelEn']}' ({key}).")
            continue
        if field.get("type") == "number" and value not in (None, ""):
            try:
                num = int(value)
            except (TypeError, ValueError):
                errors.append(f"'{field['labelEn']}' must be a number.")
            else:
                if key == "disabilityPercentage" and not (0 <= num <= 100):
                    errors.append("Disability percentage must be between 0 and 100.")
                if key == "dependentChildren" and num < 0:
                    errors.append("Dependent children count cannot be negative.")
    return errors

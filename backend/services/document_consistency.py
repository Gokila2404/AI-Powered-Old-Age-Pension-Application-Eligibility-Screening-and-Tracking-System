"""Compare OCR evidence with an applicant's declared application values."""

import re
from datetime import datetime
from typing import Any, Dict

from rapidfuzz import fuzz


FIELD_LABELS = {
    "name": "Name",
    "account_holder_name": "Account holder",
    "date_of_birth": "Date of birth",
    "document_number": "Aadhaar / identity number (last four digits)",
    "address": "Address",
    "house_number": "House number",
    "street": "Street",
    "village": "Village",
    "town": "Town",
    "district": "District",
    "state": "State",
    "pincode": "PIN code",
    "annual_income": "Annual income",
    "income_source": "Income source",
    "certificate_number": "Income certificate number",
    "bank_name": "Bank name",
    "branch_name": "Branch",
    "ifsc": "IFSC code",
    "account_number_masked": "Bank account (last four digits)",
}


def _value(fields: Dict[str, Any], name: str):
    entry = fields.get(name)
    return entry.get("value") if isinstance(entry, dict) else entry


def _text(value: Any) -> str:
    return " ".join(str(value or "").casefold().strip().split())


def _digits(value: Any) -> str:
    return re.sub(r"\D", "", str(value or ""))


def _date(value: Any) -> str:
    raw = str(value or "").strip()
    for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(raw, pattern).date().isoformat()
        except ValueError:
            continue
    return _text(raw)


def _address(declared: Dict[str, Any]) -> str:
    return " ".join(str(declared.get(key) or "") for key in (
        "doorNo", "street", "villageTown", "district", "state", "pinCode"
    )).strip()


def compare_document_fields(
    extracted_fields: Dict[str, Any],
    personal_info: Dict[str, Any],
    address_info: Dict[str, Any],
    income_info: Dict[str, Any],
    bank_info: Dict[str, Any],
    require_identity_number: bool = False,
) -> Dict[str, Any]:
    """Return a conservative, field-level consistency result. No OCR value is applied to the form."""
    comparisons = []

    def compare(field, extracted, declared, kind="text"):
        if extracted in (None, "", []) and declared in (None, "", []):
            return
        if declared in (None, "", []):
            matched = False
            score = 0
            reason = "Enter this value in the application so it can be checked against the document."
        elif extracted in (None, "", []):
            matched = False
            score = 0
            reason = "This value was not readable in the document. Upload a clearer copy."
        elif kind in {"digits", "money"}:
            left, right = _digits(extracted), _digits(declared)
            matched = bool(left and right and left[-4:] == right[-4:]) if kind == "digits" else bool(left and right and left == right)
            score = 100 if matched else 0
            reason = "" if matched else "The document value does not match the value entered. Correct the application or upload the right document."
        elif kind == "identity":
            left, right = _digits(extracted), _digits(declared)
            left, right = left[-4:], right[-4:]
            matched = bool(len(left) == 4 and len(right) == 4 and left == right)
            score = 100 if matched else 0
            reason = "" if matched else "The last four digits do not match. Check the number and the document."
        elif kind == "date":
            matched = bool(_date(extracted) and _date(extracted) == _date(declared))
            score = 100 if matched else 0
            reason = "" if matched else "The date does not match. Correct the date or upload the right document."
        else:
            scorer = fuzz.token_set_ratio if kind == "address" else fuzz.token_sort_ratio
            score = float(scorer(_text(extracted), _text(declared)))
            matched = score >= 90
            reason = "" if matched else "The document value differs from the value entered. Correct the application or upload the right document."

        # Never send full identity or account numbers back to the browser.
        safe_value = extracted
        if field == "document_number":
            safe_value = f"•••• •••• {_digits(extracted)[-4:]}" if _digits(extracted) else "Unreadable"
        elif field == "account_number_masked":
            safe_value = f"•••• {_digits(extracted)[-4:]}" if _digits(extracted) else "Unreadable"
        comparisons.append({
            "field": field,
            "label": FIELD_LABELS.get(field, field.replace("_", " ").title()),
            "documentValue": safe_value,
            "matchPercentage": round(score, 1),
            "matched": matched,
            "reason": reason,
        })

    name = _value(extracted_fields, "name")
    holder = _value(extracted_fields, "account_holder_name")
    if name is not None:
        compare("name", name, personal_info.get("fullName"))
    if holder is not None:
        compare("account_holder_name", holder, bank_info.get("accountHolderName"))
    if _value(extracted_fields, "date_of_birth") is not None:
        compare("date_of_birth", _value(extracted_fields, "date_of_birth"), personal_info.get("dob"), "date")
    if _value(extracted_fields, "document_number") is not None:
        compare("document_number", _value(extracted_fields, "document_number"), personal_info.get("aadhaarLast4"), "identity")
    elif require_identity_number:
        comparisons.append({
            "field": "document_number",
            "label": FIELD_LABELS["document_number"],
            "documentValue": "Not detected",
            "matchPercentage": 0,
            "matched": False,
            "reason": "The identity number could not be read. Upload a clearer identity document.",
        })

    for field, declared_key in (("address", None), ("house_number", "doorNo"), ("street", "street"),
                                ("village", "villageTown"), ("town", "villageTown"),
                                ("district", "district"), ("state", "state"), ("pincode", "pinCode")):
        extracted = _value(extracted_fields, field)
        if extracted is not None:
            declared = _address(address_info) if field == "address" else address_info.get(declared_key)
            compare(field, extracted, declared, "address" if field == "address" else "text")

    if _value(extracted_fields, "annual_income") is not None:
        compare("annual_income", _value(extracted_fields, "annual_income"), income_info.get("annualIncome"), "money")
    if _value(extracted_fields, "income_source") is not None:
        compare("income_source", _value(extracted_fields, "income_source"), income_info.get("incomeSource"))
    if _value(extracted_fields, "certificate_number") is not None:
        compare("certificate_number", _value(extracted_fields, "certificate_number"), income_info.get("incomeCertificateNo"))
    for field, declared_key in (("bank_name", "bankName"), ("branch_name", "branch"), ("ifsc", "ifscCode")):
        extracted = _value(extracted_fields, field)
        if extracted is not None:
            compare(field, extracted, bank_info.get(declared_key))
    if _value(extracted_fields, "account_number_masked") is not None:
        compare("account_number_masked", _value(extracted_fields, "account_number_masked"), bank_info.get("accountNumber"), "digits")

    mismatches = [item for item in comparisons if not item["matched"]]
    if not comparisons:
        status = "NEEDS_REVIEW"
        reason = "No comparable information could be read. Upload a clearer document for verification."
    elif not mismatches:
        status = "MATCHED"
        reason = "All readable document details match the information entered."
    elif len(mismatches) > len(comparisons) / 2 and len(comparisons) >= 2:
        status = "REJECTED"
        reason = f"Most checked fields in this document do not match the application ({len(mismatches)} of {len(comparisons)}). Check the entered details or upload the correct document."
    else:
        status = "NEEDS_CORRECTION"
        reason = f"{len(mismatches)} document detail(s) need correction. Update the application or replace the document, then run the check again."

    return {"status": status, "reason": reason, "comparisons": comparisons,
            "matchedCount": len(comparisons) - len(mismatches), "mismatchCount": len(mismatches)}

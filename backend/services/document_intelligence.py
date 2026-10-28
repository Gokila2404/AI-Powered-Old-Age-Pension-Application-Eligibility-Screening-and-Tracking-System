"""Document intelligence: classification + document-specific field extraction.

Everything here derives from the ACTUAL OCR text of the uploaded document.
Nothing is hard-coded: a field is only set when its label/value genuinely
appears in the OCR text of the current file.  Missing information is returned
as None and rendered by the UI as "Not detected in this document".
"""
import logging
import re
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("pension_seva.doc_intel")

# ---------------------------------------------------------------- classification

DOC_TYPE_LABELS: Dict[str, str] = {
    "INCOME_CERTIFICATE": "Income Certificate",
    "IDENTITY_DOCUMENT": "Identity Proof",
    "RESIDENCE_CERTIFICATE": "Residence / Address Proof",
    "RATION_CARD": "Ration Card",
    "DISABILITY_CERTIFICATE": "Disability Certificate",
    "DEATH_CERTIFICATE": "Death / Widow Certificate",
    "BANK_DOCUMENT": "Bank Document",
    "UNKNOWN": "General Document",
}

_CLASSIFICATION_RULES: List[Tuple[str, List[str], int]] = [
    # (doc_type, keyword triggers, minimum matches)
    ("INCOME_CERTIFICATE", [
        "income certificate", "annual income", "yearly income", "annual family income",
        "income per year", "revenue department", "tahsildar", "revenue divisional officer",
        "vao", "village administrative officer", "income source",
    ], 2),
    ("BANK_DOCUMENT", [
        "ifsc", "account number", "account holder", "bank passbook", "branch",
        "statement of account", "savings account", "micr",
    ], 2),
    ("RATION_CARD", [
        "ration card", "rationcard", "fair price shop", "public distribution",
        "head of family", "card type", "family card", "civil supplies",
    ], 2),
    ("DISABILITY_CERTIFICATE", [
        "disability certificate", "percentage of disability", "disability percentage",
        "type of disability", "medical board", "locomotor", "visual impairment",
        "hearing impairment", "intellectual disability", "udid",
    ], 2),
    ("DEATH_CERTIFICATE", [
        "death certificate", "date of death", "cause of death", "municipal corporation",
        "registrar of births and deaths", "widow", "deceased",
    ], 2),
    ("RESIDENCE_CERTIFICATE", [
        "residence certificate", "address proof", "residential address",
        "house no", "door no", "street", "taluk", "pincode", "resident of",
    ], 3),
    ("IDENTITY_DOCUMENT", [
        "aadhaar", "aadhar", "uidai", "voter id", "epic", "passport",
        "driving licence", "driving license", "dl no", "pan card",
        "government of india", "unique identification", "date of birth",
    ], 2),
]

# Each doc type maps to its OWN field list. The UI renders exactly these fields.
DOC_TYPE_FIELDS: Dict[str, List[str]] = {
    "INCOME_CERTIFICATE": ["name", "annual_income", "monthly_income", "income_source",
                           "certificate_number", "issue_date", "issuing_authority",
                           "district", "taluk", "village"],
    "IDENTITY_DOCUMENT": ["name", "date_of_birth", "age", "gender", "document_number",
                          "father_name", "address", "district", "state", "pincode"],
    "RESIDENCE_CERTIFICATE": ["name", "address", "house_number", "street", "village",
                              "town", "taluk", "district", "state", "pincode",
                              "certificate_number", "issue_date", "issuing_authority"],
    "RATION_CARD": ["ration_card_number", "head_of_family", "member_names", "card_type",
                    "address", "district", "state", "pincode"],
    "DISABILITY_CERTIFICATE": ["name", "date_of_birth", "disability_type",
                               "disability_percentage", "certificate_number",
                               "issue_date", "issuing_authority"],
    "DEATH_CERTIFICATE": ["beneficiary_name", "deceased_person_name", "relationship",
                          "date_of_death", "certificate_number", "issue_date",
                          "issuing_authority"],
    "BANK_DOCUMENT": ["account_holder_name", "bank_name", "branch_name", "ifsc",
                      "account_number_masked"],
    "UNKNOWN": ["name", "date_of_birth", "annual_income", "certificate_number"],
}

FIELD_LABELS: Dict[str, str] = {
    "name": "Name",
    "date_of_birth": "Date of Birth",
    "age": "Age",
    "gender": "Gender",
    "document_number": "Document Number",
    "father_name": "Father's Name",
    "spouse_name": "Spouse's Name",
    "address": "Address",
    "district": "District",
    "state": "State",
    "pincode": "PIN Code",
    "annual_income": "Annual Income",
    "monthly_income": "Monthly Income",
    "income_source": "Income Source",
    "certificate_number": "Certificate Number",
    "issue_date": "Issue Date",
    "valid_until": "Valid Until",
    "income_year": "Income Year",
    "issuing_authority": "Issuing Authority",
    "taluk": "Taluk",
    "village": "Village / Town",
    "house_number": "House / Door No.",
    "street": "Street",
    "town": "Town",
    "ration_card_number": "Ration Card Number",
    "head_of_family": "Head of Family",
    "member_names": "Family Members",
    "card_type": "Card Type",
    "disability_type": "Type of Disability",
    "disability_percentage": "Disability Percentage",
    "date_of_death": "Date of Death",
    "deceased_person_name": "Deceased Person",
    "relationship": "Relationship",
    "beneficiary_name": "Beneficiary Name",
    "account_holder_name": "Account Holder",
    "bank_name": "Bank",
    "branch_name": "Branch",
    "ifsc": "IFSC Code",
    "account_number_masked": "Account Number",
}


def classify_document(raw_text: str, filename: str = "", doc_type_hint: str = "") -> Tuple[str, float, List[str]]:
    """Classify a document from its actual OCR text + filename."""
    haystack = f"{filename} {raw_text}".lower()
    scores: Dict[str, Tuple[int, List[str]]] = {}
    for doc_type, keywords, minimum in _CLASSIFICATION_RULES:
        hits = [kw for kw in keywords if kw in haystack]
        if len(hits) >= min(2, minimum):
            scores[doc_type] = (len(hits), hits)
    if not scores:
        hint = doc_type_hint.casefold()
        hint_types = (
            ("INCOME_CERTIFICATE", ("income",)),
            ("IDENTITY_DOCUMENT", ("aadhaar", "aadhar", "age proof", "identity", "voter", "passport")),
            ("BANK_DOCUMENT", ("bank", "passbook")),
            ("RESIDENCE_CERTIFICATE", ("address", "residence")),
            ("RATION_CARD", ("ration", "family card")),
            ("DISABILITY_CERTIFICATE", ("disability", "udid")),
            ("DEATH_CERTIFICATE", ("death", "widow")),
        )
        for hinted_type, tokens in hint_types:
            if any(token in hint for token in tokens):
                return hinted_type, 0.35, []
        return "UNKNOWN", 0.0, []
    best_type = max(scores, key=lambda t: scores[t][0])
    hits = scores[best_type][1]
    confidence = min(0.98, 0.5 + 0.12 * len(hits))
    return best_type, round(confidence, 2), hits


# ---------------------------------------------------------------- normalisation

_MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "aug": 8,
    "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}

def _normalize_date(value: str) -> Optional[str]:
    value = value.strip()
    parts = re.split(r"[-/. ]", value)
    if len(parts) == 3:
        a, b, c = parts
        if len(a) == 4:
            year, month, day = a, b, c
        else:
            day, month, year = a, b, c
            if len(year) == 2:
                year = ("19" if int(year) > 40 else "20") + year
        try:
            return date(int(year), int(month), int(day)).isoformat()
        except (ValueError, TypeError):
            return None
    m = re.match(r"(\d{1,2})\s+([A-Za-z]{3,9}),?\s+(\d{4})", value)
    if m:
        month = _MONTHS.get(m.group(2).lower())
        if month:
            try:
                return date(int(m.group(3)), month, int(m.group(1))).isoformat()
            except ValueError:
                return None
    return None


def _normalize_money(value: str) -> Optional[int]:
    digits = re.sub(r"[^0-9]", "", value)
    if not digits:
        return None
    amount = int(digits)
    # Heuristic: OCR income often loses the "per annum" context; keep as-is.
    return amount


def _clean_name(value: str) -> Optional[str]:
    value = re.sub(r"\s{2,}", " ", value).strip(" :.|-")
    value = re.split(r"\s+\b(?:dob|date of birth|gender|address|s/o|d/o|w/o)\b", value, flags=re.I)[0]
    value = re.sub(r"[^A-Za-z .'\-]", "", value).strip()
    return value.title() if len(value) >= 2 else None


# ---------------------------------------------------------------- extraction

# label -> canonical field. Order matters: more specific first.
_LABEL_ALIASES: List[Tuple[str, str]] = [
    # identity
    (r"applicant\s*name|name\s*of\s*(?:the\s*)?applicant|beneficiary\s*name|full\s*name|account\s*holder(?:\s*name)?|head\s*of\s*family|name\b", "name"),
    (r"date\s*of\s*birth|d\.?o\.?b|birth\s*date", "date_of_birth"),
    (r"\bage\b", "age"),
    (r"gender|sex", "gender"),
    (r"father(?:'s)?\s*name|s/o", "father_name"),
    (r"spouse(?:'s)?\s*name|w/o", "spouse_name"),
    # income
    (r"annual\s*(?:family\s*)?(?:household\s*)?income|yearly\s*income|income\s*per\s*annum|income\s*per\s*year", "annual_income"),
    (r"monthly\s*income|income\s*per\s*month", "monthly_income"),
    (r"income\s*source|source\s*of\s*income|occupation", "income_source"),
    # certificates & numbers
    (r"certificate\s*(?:no\.?|number)|cert\s*(?:no\.?|number)|certidicate\s*no", "certificate_number"),
    (r"ration\s*card\s*(?:no\.?|number)|card\s*(?:no\.?|number)", "ration_card_number"),
    (r"(?:aadhaar|aadhar|uid|epic|passport|licence|license)(?:\s*no\.?|\s*number)?\s*[:#]?\s*([0-9xX]{4,})", "document_number_inline"),
    (r"document\s*(?:no\.?|number)", "document_number"),
    (r"ifsc\s*(?:code)?", "ifsc"),
    (r"account\s*(?:no\.?|number)", "account_number"),
    (r"branch", "branch_name"),
    (r"bank\s*name|\bbank\b", "bank_name"),
    # dates
    (r"issue\s*(?:date|on)", "issue_date"),
    (r"valid\s*(?:until|upto|up\s*to|till)", "valid_until"),
    (r"date\s*of\s*death", "date_of_death"),
    # authority / geography
    (r"issuing\s*authority|issued\s*by|authority", "issuing_authority"),
    (r"district", "district"),
    (r"taluk|taluka", "taluk"),
    (r"\btown\b", "town"),
    (r"\bvillage\b", "village"),
    (r"pin\s*code|pincode|\bpin\b", "pincode"),
    (r"state", "state"),
    (r"address", "address"),
    # disability
    (r"disability\s*(?:type|kind)", "disability_type"),
    (r"(?:percentage\s*of\s*)?disability|disability\s*percentage", "disability_percentage"),
    # misc
    (r"card\s*type", "card_type"),
    (r"member\s*names|family\s*members", "member_names"),
    (r"deceased", "deceased_person_name"),
    (r"relationship", "relationship"),
]


def _extract_inline_masked_account(text: str) -> Optional[str]:
    """Find an account number and mask all but the last 4 digits."""
    m = re.search(r"account\s*(?:no\.?|number)?\s*[:#=-]?\s*([0-9]{6,18})", text, re.I)
    if not m:
        m = re.search(r"\b([0-9]{11,18})\b", text)
        if not m:
            return None
    digits = m.group(1)
    return "XXXX XXXX " + digits[-4:]


def _extract_ifsc(text: str) -> Optional[str]:
    m = re.search(r"\b([A-Z]{4}0[A-Z0-9]{6})\b", text)
    return m.group(1) if m else None


def _extract_disability_pct(text: str) -> Optional[str]:
    m = re.search(r"(?:disability[^\d]{0,40})?(\d{1,3})\s*%", text, re.I)
    if not m:
        return None
    pct = int(m.group(1))
    if 10 <= pct <= 100:
        return f"{pct}%"
    return None


def _extract_gender(text: str) -> Optional[str]:
    if re.search(r"\b(female|f)\b", text, re.I) and not re.search(r"\bmale\b", text, re.I):
        return "Female"
    if re.search(r"\bmale\b", text, re.I):
        return "Male"
    if re.search(r"transgender", text, re.I):
        return "Transgender"
    return None


def _extract_doc_number(text: str) -> Optional[str]:
    aadhaar = re.search(r"\b(\d{4}\s?\d{4}\s?\d{4})\b", text)
    if aadhaar:
        return aadhaar.group(1)
    epic = re.search(r"\b([A-Z]{3}[0-9]{7})\b", text)
    if epic:
        return epic.group(1)
    dl = re.search(r"\b((?:TN|KA|KL|AP|MH)[0-9]{2}\s?(?:19|20)[0-9]{9,11})\b", text)
    if dl:
        return dl.group(1)
    return None


_DISTRICTS = [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode",
    "Vellore", "Thoothukudi", "Dindigul", "Thanjavur", "Ranipet", "Virudhunagar", "Karur",
    "Nilgiris", "Kanchipuram", "Tiruvallur", "Cuddalore", "Villupuram", "Nagapattinam",
    "Tiruppur", "Sivagangai", "Pudukottai", "Ariyalur", "Perambalur", "Namakkal",
    "Dharmapuri", "Krishnagiri", "Tirupattur", "Tenkasi", "Kanniyakumari", "Tiruvarur",
    "Mayiladuthurai", "Chengalpattu", "Kallakurichi",
]


def _scan_geography(text: str) -> Dict[str, str]:
    found = {}
    for district in _DISTRICTS:
        if re.search(rf"\b{re.escape(district)}\b", text, re.I):
            found["district"] = district
            break
    pin = re.search(r"\b(6[0-9]{5})\b", text)
    if pin:
        found["pincode"] = pin.group(1)
    if re.search(r"\btamil\s*nadu\b", text, re.I):
        found["state"] = "Tamil Nadu"
    return found


_AUTHORITY_KEYWORDS = re.compile(
    r"(tahsildar|revenue divisional officer|rdo|vao|village administrative officer|"
    r"municipality|corporation|panchayat|medical board|registrar(?: of births and deaths)?|"
    r"branch manager|revenue department)", re.I)


_PIN_RE = re.compile(r"\b(6[0-9]{5})\b")
_ADDRESS_VALUE_NOISE = re.compile(
    r"\b(?:pin\s*code|pincode|district|taluk|state|phone|mobile|ifsc|account)\b[:.\s]*", re.I)


def _tidy_address(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = _ADDRESS_VALUE_NOISE.sub(" ", value)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" ,.:-|")
    if cleaned.count(",") == 0 and len(cleaned) < 4:
        return None
    return cleaned or None


def _split_address_components(raw: str) -> Dict[str, str]:
    """Split a free-form OCR address into house/street/village/pincode.

    Format commonly seen on Tamil Nadu certificates:
      "12A, Gandhi Street, Thiruvarur, Thanjavur - 614001"
      "No.24 Anna Nagar Main Road, Kumbakonam Pin 612001"
    """
    out: Dict[str, str] = {}
    value = _ADDRESS_VALUE_NOISE.sub(" ", raw)
    pin = _PIN_RE.search(value)
    if pin:
        out["pincode"] = pin.group(1)
        value = value[:pin.start()] + value[pin.end():]
    value = re.sub(r"\s{2,}", " ", value).strip(" ,.:-|")
    parts = [p.strip(" .:-|") for p in re.split(r"[,\n]", value) if p.strip(" .:-|")]
    if not parts:
        return out
    # First part usually starts with the house/door number.
    if parts and re.match(r"^(?:no\.?|no\b|#|door|house|d\.?no\.?)?\s*[0-9]{1,5}[a-z]?(?:\s*/\s*[0-9]{1,5}[a-z]?)?\b",
                          parts[0], re.I):
        out["house_number"] = re.sub(r"^(?:no\.?|door|house|d\.?no\.?)\s*", "", parts[0], flags=re.I).strip()
        parts = parts[1:]
    if parts:
        out["street"] = parts[0]
    if len(parts) >= 2:
        out["village"] = parts[-1] if len(parts) == 2 else ", ".join(parts[1:-1])
    return out


def _extract_address_block(lines: List[Dict[str, Any]]) -> Tuple[Optional[str], Dict[str, str], Optional[Dict[str, Any]]]:
    """Collect a contiguous multi-line address block starting at an 'address'
    label line and continuing over lines that look like address content."""
    addr_re = re.compile(r"\baddress\b", re.I)
    stop_re = re.compile(
        r"\b(?:district|taluk|pin\s*code|pincode|state|phone|mobile|date|dob|gender|name)\b", re.I)
    for index, line in enumerate(lines):
        text = line.get("text", "")
        if not addr_re.search(text):
            continue
        after = text[addr_re.search(text).end():].strip(" :.=-\t")
        block = [after] if after else []
        for nxt in lines[index + 1: index + 6]:
            nxt_text = nxt.get("text", "").strip()
            if not nxt_text or stop_re.search(nxt_text) or re.search(r":", nxt_text):
                break
            block.append(nxt_text)
        joined = ", ".join(p for p in block if p)
        if not joined:
            continue
        return joined, _split_address_components(joined), line
    return None, {}, None


def extract_fields_for_type(doc_type: str, raw_text: str, lines: List[Dict[str, Any]]) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """Return ({field: {value, confidence, source}}, {field: evidence}) for the doc type."""
    text = raw_text or ""
    fields: Dict[str, Dict[str, Any]] = {}
    evidence: Dict[str, Dict[str, Any]] = {}

    def emit(field: str, value: Any, confidence: float, line: Optional[Dict[str, Any]] = None, source: str = "OCR"):
        if value is None or value == "" or value == []:
            return
        fields[field] = {"value": value, "confidence": round(confidence, 2), "source": source}
        if line:
            evidence[field] = {
                "sourceText": line.get("text"), "page": line.get("page"),
                "boundingBox": line.get("boundingBox"), "boundingBoxUnit": line.get("boundingBoxUnit"),
                "confidence": line.get("confidence"),
            }

    def find_line(pred) -> Optional[Dict[str, Any]]:
        for line in lines:
            if pred(line.get("text", "")):
                return line
        return None

    # --- multi-line address block (correct house/street/village split) --------
    address_line = find_line(lambda t: re.search(r"\baddress\b", t, re.I))
    addr_text, addr_parts, addr_line = _extract_address_block(lines)
    if "address" in DOC_TYPE_FIELDS.get(doc_type, []) and addr_text:
        emit("address", _tidy_address(addr_text), max(0.8, (addr_line or {}).get("confidence", 70) / 100), addr_line)
        for comp in ("house_number", "street", "village", "pincode"):
            if comp in DOC_TYPE_FIELDS.get(doc_type, []) and comp in addr_parts and comp not in fields:
                emit(comp, addr_parts[comp], 0.75, addr_line)

    # --- label-driven extraction from OCR lines -------------------------------
    for line_index, line in enumerate(lines):
        line_text = line.get("text", "")
        lowered = line_text.lower()
        line_conf = (line.get("confidence") or 70.0) / 100.0
        for pattern, field in _LABEL_ALIASES:
            m = re.search(pattern, lowered)
            if not m:
                continue
            if field == "document_number_inline":
                emit("document_number", m.group(1), line_conf, line)
                continue
            # value = remainder after the label
            after = line_text[m.end():].strip(" :.=-\t")
            if not after and line_index + 1 < len(lines):
                candidate = lines[line_index + 1].get("text", "").strip()
                if candidate and ":" not in candidate and "=" not in candidate:
                    after = candidate
            if not after:
                continue
            conf = line_conf
            if field == "name" and field not in fields:
                value = _clean_name(after)
                emit("name", value, conf, line)
            elif field == "date_of_birth" and "date_of_birth" not in fields:
                emit("date_of_birth", _normalize_date(after), conf, line)
            elif field == "age" and "age" not in fields:
                am = re.search(r"\d{1,3}", after)
                if am:
                    emit("age", int(am.group(0)), conf, line)
            elif field == "gender" and "gender" not in fields:
                emit("gender", _extract_gender(after), conf, line)
            elif field == "annual_income" and "annual_income" not in fields:
                emit("annual_income", _normalize_money(after), conf, line)
            elif field == "monthly_income" and "monthly_income" not in fields:
                emit("monthly_income", _normalize_money(after), conf, line)
            elif field == "income_source" and "income_source" not in fields:
                emit("income_source", after.strip()[:60] or None, conf, line)
            elif field == "certificate_number" and "certificate_number" not in fields:
                value = re.sub(r"[^A-Z0-9/\-]", "", after.upper())
                emit("certificate_number", value or None, conf, line)
            elif field == "ration_card_number" and "ration_card_number" not in fields:
                value = re.sub(r"[^A-Z0-9/\-]", "", after.upper())
                emit("ration_card_number", value or None, conf, line)
            elif field == "issue_date" and "issue_date" not in fields:
                emit("issue_date", _normalize_date(after), conf, line)
            elif field == "valid_until" and "valid_until" not in fields:
                emit("valid_until", _normalize_date(after), conf, line)
            elif field == "date_of_death" and "date_of_death" not in fields:
                emit("date_of_death", _normalize_date(after), conf, line)
            elif field == "issuing_authority" and "issuing_authority" not in fields:
                emit("issuing_authority", after.strip()[:80] or None, conf, line)
            elif field == "taluk" and "taluk" not in fields:
                emit("taluk", after.strip()[:40] or None, conf, line)
            elif field == "pincode" and "pincode" not in fields:
                pm = re.search(r"\b(6[0-9]{5})\b", after)
                emit("pincode", pm.group(1) if pm else None, conf, line)
            elif field == "district" and "district" not in fields:
                emit("district", after.strip()[:40] or None, conf, line)
            elif field == "branch_name" and "branch_name" not in fields:
                emit("branch_name", after.strip()[:60] or None, conf, line)
            elif field == "bank_name" and "bank_name" not in fields:
                # Prefer a line that looks like a bank title, or the remainder
                # after the label if it mentions a bank.
                candidate = after.strip()[:60]
                if candidate and re.search(r"bank", candidate, re.I):
                    emit("bank_name", candidate, conf, line)
                elif re.search(r"bank", line_text, re.I) and not re.search(r"ifsc|account|branch", lowered):
                    emit("bank_name", line_text.strip()[:60], conf, line)
            elif field == "address" and "address" not in fields:
                # Prefer the multi-line block result; fall back to this line's value.
                tidy = _tidy_address(after.strip()[:200])
                if tidy:
                    emit("address", tidy, conf, line)
            elif field == "disability_percentage" and "disability_percentage" not in fields:
                emit("disability_percentage", _extract_disability_pct(line_text), conf, line)
            elif field == "disability_type" and "disability_type" not in fields:
                emit("disability_type", after.strip()[:80] or None, conf, line)
            elif field == "card_type" and "card_type" not in fields:
                emit("card_type", after.strip()[:30] or None, conf, line)

    # --- pattern-driven (label-free) extraction -------------------------------
    if "ifsc" in DOC_TYPE_FIELDS.get(doc_type, []) and "ifsc" not in fields:
        ifsc = _extract_ifsc(text)
        line = find_line(lambda t: _extract_ifsc(t))
        emit("ifsc", ifsc, 0.95 if ifsc else 0, line)

    if "account_number_masked" in DOC_TYPE_FIELDS.get(doc_type, []) and "account_number_masked" not in fields:
        masked = _extract_inline_masked_account(text)
        line = find_line(lambda t: re.search(r"account|[0-9]{11,}", t, re.I))
        emit("account_number_masked", masked, 0.9 if masked else 0, line)

    if "document_number" in DOC_TYPE_FIELDS.get(doc_type, []) and "document_number" not in fields:
        docnum = _extract_doc_number(text)
        emit("document_number", docnum, 0.9 if docnum else 0)

    geo = _scan_geography(text)
    for gkey in ("district", "pincode", "state", "house_number", "street", "village"):
        if gkey in DOC_TYPE_FIELDS.get(doc_type, []) and gkey not in fields and gkey in geo:
            emit(gkey, geo[gkey], 0.85)

    if "gender" in DOC_TYPE_FIELDS.get(doc_type, []) and "gender" not in fields:
        emit("gender", _extract_gender(text), 0.7)

    if "disability_percentage" in DOC_TYPE_FIELDS.get(doc_type, []) and "disability_percentage" not in fields:
        pct = _extract_disability_pct(text)
        emit("disability_percentage", pct, 0.85 if pct else 0)

    # Authority keyword anywhere
    if "issuing_authority" in DOC_TYPE_FIELDS.get(doc_type, []) and "issuing_authority" not in fields:
        am = _AUTHORITY_KEYWORDS.search(text)
        if am:
            line = find_line(lambda t: _AUTHORITY_KEYWORDS.search(t))
            emit("issuing_authority", am.group(0).title(), 0.8, line)

    # Head of family fallback for ration card
    if doc_type == "RATION_CARD" and "head_of_family" not in fields and "name" in fields:
        emit("head_of_family", fields["name"]["value"], fields["name"]["confidence"], source="OCR")

    # Restrict to the schema for this document type, but fall back to the
    # generic schema if classification was UNKNOWN.
    allowed = set(DOC_TYPE_FIELDS.get(doc_type, DOC_TYPE_FIELDS["UNKNOWN"]))
    allowed |= {"name"}  # name is useful on every document
    fields = {k: v for k, v in fields.items() if k in allowed}

    # confidence: weighted mean of present fields
    return fields, evidence


def overall_extraction_confidence(fields: Dict[str, Dict[str, Any]]) -> Optional[float]:
    scores = [v["confidence"] for v in fields.values() if isinstance(v.get("confidence"), (int, float))]
    if not scores:
        return None
    return round(sum(scores) / len(scores), 2)

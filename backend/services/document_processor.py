import logging
import os
import re
import shutil
import statistics
import uuid
from datetime import date
from pathlib import Path

import cv2
import pymupdf as fitz
import numpy as np
import pytesseract
from PIL import Image
from pytesseract import Output

try:
    from rapidocr import RapidOCR
except ImportError:  # Tesseract remains available as a compatibility fallback.
    RapidOCR = None

from backend.models import DocumentProcessResponse, DocumentQualityResult, ExtractedNLPFields
from backend.services.document_intelligence import (
    DOC_TYPE_LABELS,
    classify_document,
    extract_fields_for_type,
    overall_extraction_confidence,
)

logger = logging.getLogger("pension_seva.doc_pipeline")

PIPELINE_VERSION = "pension-seva-doc-pipeline/3.1"
_rapid_ocr_engine = None
DISTRICTS = [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode",
    "Vellore", "Thoothukudi", "Dindigul", "Thanjavur", "Ranipet", "Virudhunagar", "Karur",
    "Nilgiris", "Kanchipuram", "Tiruvallur", "Cuddalore", "Villupuram", "Nagapattinam",
]


def check_image_quality(file_path: Path) -> DocumentQualityResult:
    try:
        if file_path.suffix.lower() == ".pdf":
            pdf = fitz.open(file_path)
            has_pages = len(pdf) > 0
            return DocumentQualityResult(
                blurScore=0, isBlurry=False, brightness=0, isBrightnessAcceptable=has_pages,
                contrast=0, isContrastAcceptable=has_pages, resolution="PDF",
                overallQuality="Good" if has_pages else "Needs Attention",
                guidanceNotes=["PDF opened successfully; scanned-page OCR may require a configured OCR engine."],
            )
        image = cv2.imread(str(file_path))
        if image is None:
            image = cv2.cvtColor(np.array(Image.open(file_path).convert("RGB")), cv2.COLOR_RGB2BGR)
        height, width = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness = float(np.mean(gray))
        contrast = float(np.std(gray))
        blurry, bright_ok, contrast_ok = blur < 60, 55 <= brightness <= 230, contrast > 30
        good = not blurry and bright_ok and contrast_ok and width >= 500 and height >= 500
        notes = []
        if blurry: notes.append("Image may be blurred; upload a sharper copy.")
        if not bright_ok: notes.append("Lighting or glare makes the document difficult to read.")
        if not contrast_ok: notes.append("Text contrast is low.")
        if width < 500 or height < 500: notes.append("Image resolution is low.")
        if good: notes.append("Image is legible according to the image quality checks.")
        return DocumentQualityResult(
            blurScore=round(blur, 2), isBlurry=blurry, brightness=round(brightness, 2),
            isBrightnessAcceptable=bright_ok, contrast=round(contrast, 2),
            isContrastAcceptable=contrast_ok, resolution=f"{width}x{height} px",
            overallQuality="Good" if good else "Needs Attention", guidanceNotes=notes,
        )
    except Exception:
        return DocumentQualityResult(
            blurScore=0, isBlurry=True, brightness=0, isBrightnessAcceptable=False,
            contrast=0, isContrastAcceptable=False, resolution="Unreadable",
            overallQuality="Needs Attention", guidanceNotes=["Document quality could not be evaluated; manual review is required."],
        )


def _normalize_date(raw_value: str):
    parts = re.split(r"[-/.]", raw_value.strip())
    if len(parts) != 3:
        return None
    if len(parts[0]) == 4:
        year, month, day = parts
    else:
        day, month, year = parts
        if len(year) == 2:
            year = f"19{year}" if int(year) > 40 else f"20{year}"
    try:
        return date(int(year), int(month), int(day)).isoformat()
    except (ValueError, TypeError):
        return None


def _parse_fields(raw_text: str, source_lines: list[dict]):
    fields = ExtractedNLPFields()
    evidence = {}
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    patterns = {
        "name": re.compile(r"\b(?:applicant\s+)?name\s*[:=-]\s*([A-Za-z][A-Za-z .'-]{1,79})", re.I),
        "dob": re.compile(r"\b(?:date\s+of\s+birth|dob)\s*[:=-]\s*(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})", re.I),
        "age": re.compile(r"\bage\s*[:=-]\s*(\d{1,3})\b", re.I),
        "annualIncome": re.compile(r"\b(?:annual\s+(?:household\s+)?income|income)\s*(?:is|:|=|-)?\s*(?:rs\.?|inr|₹)?\s*([0-9][0-9,]{2,})", re.I),
        "certificateNumber": re.compile(r"\b(?:certificate\s*(?:no\.?|number)|cert\s*(?:no\.?|number))\s*[:#=-]?\s*([A-Z0-9][A-Z0-9/-]{3,39})", re.I),
    }
    for name, pattern in patterns.items():
        found = None
        for line in lines:
            match = pattern.search(line)
            if match:
                found = (line, match.group(1).strip())
                break
        if not found:
            continue
        source_text, value = found
        if name == "name":
            value = re.split(r"\s{2,}|\s+\b(?:dob|date of birth|gender|address)\b", value, flags=re.I)[0].strip()
            fields.name = value or None
        elif name == "dob":
            fields.dob = _normalize_date(value)
        elif name == "age":
            fields.age = int(value)
        elif name == "annualIncome":
            try: fields.annualIncome = int(value.replace(",", ""))
            except ValueError: continue
        elif name == "certificateNumber":
            fields.certificateNumber = value
        line_data = next((line for line in source_lines if line.get("text", "").strip() == source_text), {})
        evidence[name] = {
            "sourceText": source_text, "page": line_data.get("page"),
            "boundingBox": line_data.get("boundingBox"), "boundingBoxUnit": line_data.get("boundingBoxUnit"),
            "confidence": line_data.get("confidence"),
        }
    district = next((item for item in DISTRICTS if re.search(rf"\b{re.escape(item)}\b", raw_text, re.I)), None)
    if district:
        fields.district = district
        line_data = next((line for line in source_lines if re.search(rf"\b{re.escape(district)}\b", line.get("text", ""), re.I)), {})
        evidence["district"] = {"sourceText": line_data.get("text"), "page": line_data.get("page"),
                                "boundingBox": line_data.get("boundingBox"), "boundingBoxUnit": line_data.get("boundingBoxUnit"),
                                "confidence": line_data.get("confidence")}
    fields.addressTokens = []
    scores = [entry["confidence"] for entry in evidence.values() if isinstance(entry.get("confidence"), (int, float))]
    if scores:
        fields.confidenceScore = statistics.mean(scores)
    return fields, evidence


def _extract_pdf(file_path: Path):
    document = fitz.open(file_path)
    pages, source_lines = [], []
    errors = []
    tesseract_exe = _resolve_tesseract()
    if tesseract_exe:
        pytesseract.pytesseract.tesseract_cmd = tesseract_exe

    for page_number, page in enumerate(document, start=1):
        page_lines = []
        page_dict = page.get_text("dict")
        for block in page_dict.get("blocks", []):
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                text = "".join(span.get("text", "") for span in spans).strip()
                if not text:
                    continue
                bbox = [min(span["bbox"][0] for span in spans), min(span["bbox"][1] for span in spans),
                        max(span["bbox"][2] for span in spans), max(span["bbox"][3] for span in spans)]
                page_lines.append({"text": text, "page": page_number, "boundingBox": bbox,
                                   "boundingBoxUnit": "PDF points", "confidence": None})
        text_layer = "\n".join(line["text"] for line in page_lines)
        if len(text_layer.strip()) >= 30:
            source_lines.extend(page_lines)
            pages.append(text_layer)
            continue

        if not _rapid_ocr_available() and not tesseract_exe:
            pages.append("")
            errors.append(f"Page {page_number} is scanned and no OCR engine is available; no values were inferred.")
            continue

        pix = page.get_pixmap(dpi=300, alpha=False)
        pil_image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        ocr_lines = _best_ocr_lines(pil_image, page_number=page_number)
        source_lines.extend(page_lines + ocr_lines)
        page_text = "\n".join(line["text"] for line in page_lines + ocr_lines)
        pages.append(page_text)
        if not ocr_lines:
            errors.append(f"No readable text was found on scanned page {page_number}.")

    raw_text = "\n".join(pages)
    return raw_text, source_lines, f"PyMuPDF {fitz.VersionBind}", errors


def _rapid_ocr_available() -> bool:
    return RapidOCR is not None


def _get_rapid_ocr():
    global _rapid_ocr_engine
    if RapidOCR is None:
        return None
    if _rapid_ocr_engine is None:
        _rapid_ocr_engine = RapidOCR()
    return _rapid_ocr_engine


def _rapid_ocr_lines(pil_image: Image.Image, page_number: int = 1) -> list[dict]:
    """Recognize text locally with RapidOCR; its ONNX models never upload documents."""
    try:
        rgb = np.asarray(pil_image.convert("RGB"))
        result = _get_rapid_ocr()(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
        texts = result.txts if result.txts is not None else []
        scores = result.scores if result.scores is not None else []
        boxes = result.boxes if result.boxes is not None else []
        lines = []
        for text, score, box in zip(texts, scores, boxes):
            text = str(text).strip()
            if not text:
                continue
            points = np.asarray(box, dtype=float).reshape(-1, 2)
            lines.append({
                "text": text, "page": page_number,
                "boundingBox": [int(points[:, 0].min()), int(points[:, 1].min()),
                                int(points[:, 0].max()), int(points[:, 1].max())],
                "boundingBoxUnit": "pixels", "confidence": float(score) * 100,
            })
        return lines
    except Exception:
        logger.exception("RapidOCR failed to process a document page")
        return []


TESSERACT_FALLBACK_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
]


def _resolve_tesseract() -> str | None:
    configured = os.getenv("TESSERACT_CMD")
    if configured and Path(configured).is_file():
        return configured
    located = shutil.which("tesseract")
    if located:
        return located
    for candidate in TESSERACT_FALLBACK_PATHS:
        if Path(candidate).is_file():
            return candidate
    return None


def _preprocess_image(pil_image: Image.Image, blur_score: float, contrast: float) -> Image.Image:
    """Adaptive preprocessing: light touch for good images, stronger for poor ones."""
    gray = cv2.cvtColor(np.array(pil_image.convert("RGB")), cv2.COLOR_RGB2GRAY)
    # Poor contrast -> CLAHE normalization
    if contrast < 30:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
    # Noisy / blurry -> mild denoise only (never aggressive threshold on good scans)
    if blur_score < 60 or contrast < 30:
        gray = cv2.fastNlMeansDenoising(gray, h=10)
    # Very dark or very bright -> rescale intensity
    mean = float(np.mean(gray))
    if mean < 80 or mean > 200:
        gray = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
    return Image.fromarray(gray)


def _group_ocr_words(data: dict) -> list[dict]:
    grouped = {}
    for index, raw_word in enumerate(data.get("text", [])):
        word = raw_word.strip()
        if not word:
            continue
        key = (data["page_num"][index], data["block_num"][index], data["par_num"][index], data["line_num"][index])
        try: confidence = float(data["conf"][index])
        except (ValueError, TypeError): confidence = -1.0
        group = grouped.setdefault(key, {"words": [], "left": [], "top": [], "right": [], "bottom": [], "scores": []})
        group["words"].append(word)
        left, top = int(data["left"][index]), int(data["top"][index])
        group["left"].append(left); group["top"].append(top)
        group["right"].append(left + int(data["width"][index])); group["bottom"].append(top + int(data["height"][index]))
        if confidence >= 0: group["scores"].append(confidence)
    return [
        {"text": " ".join(group["words"]), "page": key[0],
         "boundingBox": [min(group["left"]), min(group["top"]), max(group["right"]), max(group["bottom"])],
         "boundingBoxUnit": "pixels",
         "confidence": statistics.mean(group["scores"]) if group["scores"] else None}
        for key, group in grouped.items()
    ]


def _best_ocr_lines(pil_image: Image.Image, page_number: int = 1,
                    quality: DocumentQualityResult | None = None) -> list[dict]:
    if _rapid_ocr_available():
        lines = _rapid_ocr_lines(pil_image, page_number)
        if lines:
            return lines

    return _tesseract_ocr_lines(pil_image, quality, page_number)


def _tesseract_ocr_lines(pil_image: Image.Image, quality: DocumentQualityResult | None = None,
                         page_number: int = 1):
    tesseract_exe = _resolve_tesseract()
    if not tesseract_exe:
        return []
    pytesseract.pytesseract.tesseract_cmd = tesseract_exe
    languages = os.getenv("OCR_LANGUAGES", "eng").strip() or "eng"
    candidates = [pil_image]
    if quality is not None and (quality.isBlurry or not quality.isContrastAcceptable or not quality.isBrightnessAcceptable):
        candidates.append(_preprocess_image(pil_image, quality.blurScore, quality.contrast))

    best_lines, best_score = [], -1.0
    for image in candidates:
        for page_segmentation in (6, 11):
            data = pytesseract.image_to_data(
                image,
                lang=languages,
                config=f"--oem 3 --psm {page_segmentation}",
                output_type=Output.DICT,
            )
            lines = _group_ocr_words(data)
            confidence_scores = [line["confidence"] for line in lines if isinstance(line.get("confidence"), (int, float))]
            text_length = sum(len(line["text"]) for line in lines)
            average_confidence = statistics.mean(confidence_scores) if confidence_scores else 0
            score = average_confidence + min(text_length, 500) / 50
            if score > best_score:
                best_lines = lines
                best_score = score

    return [dict(line, page=page_number, boundingBoxUnit="pixels") for line in best_lines]


def _extract_image(file_path: Path, quality: DocumentQualityResult | None = None):
    tesseract_exe = _resolve_tesseract()
    if _rapid_ocr_available():
        engine, version = "RapidOCR", "ONNX Runtime"
    elif tesseract_exe:
        pytesseract.pytesseract.tesseract_cmd = tesseract_exe
        engine, version = "Tesseract", str(pytesseract.get_tesseract_version())
    else:
        return "", [], "ocr-unavailable", None, ["RapidOCR and Tesseract are unavailable; image extraction was not performed."]
    pil_image = Image.open(file_path)
    lines = _rapid_ocr_lines(pil_image) if engine == "RapidOCR" else []
    if not lines and tesseract_exe:
        pytesseract.pytesseract.tesseract_cmd = tesseract_exe
        if engine == "RapidOCR":
            engine = "Tesseract fallback"
        version = str(pytesseract.get_tesseract_version())
        lines = _tesseract_ocr_lines(pil_image, quality)
    errors = [] if lines else [f"{engine} found no readable text in the uploaded image."]
    return "\n".join(line["text"] for line in lines), lines, engine, version, errors


def _tesseract_ocr_lines(pil_image: Image.Image, quality: DocumentQualityResult | None = None,
                         page_number: int = 1):
    tesseract_exe = _resolve_tesseract()
    if not tesseract_exe:
        return []
    pytesseract.pytesseract.tesseract_cmd = tesseract_exe
    candidates = [pil_image]
    if quality is not None and (quality.isBlurry or not quality.isContrastAcceptable or not quality.isBrightnessAcceptable):
        candidates.append(_preprocess_image(pil_image, quality.blurScore, quality.contrast))
    best_lines, best_score = [], -1.0
    languages = os.getenv("OCR_LANGUAGES", "eng").strip() or "eng"
    for image in candidates:
        for page_segmentation in (6, 11):
            data = pytesseract.image_to_data(image, lang=languages,
                config=f"--oem 3 --psm {page_segmentation}", output_type=Output.DICT)
            lines = _group_ocr_words(data)
            scores = [line["confidence"] for line in lines if isinstance(line.get("confidence"), (int, float))]
            text_length = sum(len(line["text"]) for line in lines)
            score = (statistics.mean(scores) if scores else 0) + min(text_length, 500) / 50
            if score > best_score:
                best_lines, best_score = lines, score
    return [dict(line, page=page_number, boundingBoxUnit="pixels") for line in best_lines]


def extract_ocr_and_nlp(file_path: Path, doc_type: str = "General", quality: DocumentQualityResult | None = None):
    if file_path.suffix.lower() == ".pdf":
        raw_text, source_lines, version, errors = _extract_pdf(file_path)
        engine = ("PyMuPDF + RapidOCR" if _rapid_ocr_available() else
                  "PyMuPDF + Tesseract OCR" if _resolve_tesseract() else "PyMuPDF text-layer extraction")
    else:
        raw_text, source_lines, engine, version, errors = _extract_image(file_path, quality)
    fields, field_evidence = _parse_fields(raw_text, source_lines)
    return raw_text, fields, {
        "ocrEngine": engine, "ocrVersion": version, "pipelineVersion": PIPELINE_VERSION,
        "fieldEvidence": field_evidence, "processingErrors": errors, "sourceLines": source_lines,
    }


def process_uploaded_document(file_path: Path, original_filename: str, doc_type: str = "General") -> DocumentProcessResponse:
    quality = check_image_quality(file_path)
    raw_text, fields, trace = extract_ocr_and_nlp(file_path, doc_type=doc_type, quality=quality)

    # --- document intelligence: classify from ACTUAL OCR text, then extract
    # document-specific fields with per-field confidence.
    detected_type, classification_confidence, matched_keywords = classify_document(raw_text, original_filename, doc_type)
    lines = trace["sourceLines"] or [
        {"text": t, "page": None, "boundingBox": None, "boundingBoxUnit": None, "confidence": None}
        for t in raw_text.splitlines() if t.strip()
    ]
    doc_fields, doc_evidence = extract_fields_for_type(detected_type, raw_text, lines)

    legacy_fields = fields.model_dump()
    for source, target in {
        "name": "name",
        "date_of_birth": "dob",
        "age": "age",
        "annual_income": "annualIncome",
        "certificate_number": "certificateNumber",
        "district": "district",
    }.items():
        if doc_fields.get(source, {}).get("value") is not None:
            legacy_fields[target] = doc_fields[source]["value"]
    fields = ExtractedNLPFields(**legacy_fields)

    logger.info(
        "[OCR] file=%s type=%s text_length=%d fields_found=%d status=%s",
        original_filename, detected_type, len(raw_text or ""), len(doc_fields),
        "COMPLETED" if raw_text.strip() else "NEEDS_REVIEW",
    )

    status = "COMPLETED" if (raw_text or "").strip() and doc_fields else ("NEEDS_REVIEW" if (raw_text or "").strip() else "FAILED")
    return DocumentProcessResponse(
        docId=f"DOC-{uuid.uuid4().hex[:10].upper()}", originalName=original_filename,
        fileType=file_path.suffix.lower(), quality=quality, ocrText=raw_text, extractedFields=fields,
        ocrEngine=trace["ocrEngine"], ocrVersion=trace["ocrVersion"],
        pipelineVersion=trace["pipelineVersion"], fieldEvidence=trace["fieldEvidence"],
        processingErrors=trace["processingErrors"],
        detectedDocumentType=detected_type,
        detectedDocumentTypeLabel=DOC_TYPE_LABELS.get(detected_type, "General Document"),
        classificationConfidence=classification_confidence,
        classificationKeywords=matched_keywords[:8],
        documentFields=doc_fields,
        documentFieldEvidence=doc_evidence,
        extractionConfidence=overall_extraction_confidence(doc_fields),
        extractionStatus=status,
        autoFillNotice="Extracted values may be incomplete. Compare them with the source document before continuing.",
    )

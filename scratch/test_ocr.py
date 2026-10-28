# -*- coding: utf-8 -*-
import sys, tempfile
from pathlib import Path
sys.path.insert(0, '.')

from PIL import Image, ImageDraw, ImageFont
from backend.services.document_processor import process_uploaded_document

img = Image.new("RGB", (1200, 800), "white")
draw = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype("arial.ttf", 36)
except Exception:
    font = ImageFont.load_default()
draw.text((80, 100), "Applicant Name: Ramesh Kumar", fill="black", font=font)
draw.text((80, 200), "Date of Birth: 12/05/1958", fill="black", font=font)
draw.text((80, 300), "Annual Income: Rs. 45,000", fill="black", font=font)
draw.text((80, 400), "Certificate No: INC-2024-8891", fill="black", font=font)
draw.text((80, 500), "District: Chennai", fill="black", font=font)

path = Path(tempfile.gettempdir()) / "test_cert.png"
img.save(path)

result = process_uploaded_document(path, "test_cert.png", "Income Certificate")
print("OCR engine:", result.ocrEngine, result.ocrVersion)
print("Errors:", result.processingErrors)
print("Extracted fields:")
print("  name:", result.extractedFields.name)
print("  dob:", result.extractedFields.dob)
print("  annualIncome:", result.extractedFields.annualIncome)
print("  certificateNumber:", result.extractedFields.certificateNumber)
print("  district:", result.extractedFields.district)

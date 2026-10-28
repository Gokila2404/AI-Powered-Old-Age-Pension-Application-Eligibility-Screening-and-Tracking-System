# -*- coding: utf-8 -*-
import sys
from pathlib import Path
sys.path.insert(0, '.')

# Build a scanned-style PDF: a PNG image embedded in a PDF page (no text layer).
import fitz
from PIL import Image, ImageDraw, ImageFont

img = Image.new("RGB", (1200, 800), "white")
d = ImageDraw.Draw(img)
try: f = ImageFont.truetype("arial.ttf", 40)
except: f = ImageFont.load_default()
d.text((80, 100), "Applicant Name: Ramesh Kumar", fill="black", font=f)
d.text((80, 200), "Date of Birth: 12/05/1958", fill="black", font=f)
d.text((80, 300), "Annual Income: Rs. 45000", fill="black", font=f)
d.text((80, 400), "Certificate No: INC-2024-8891", fill="black", font=f)
img.save(r"scratch\scan_page.png")

pdf = fitz.open()
page = pdf.new_page(width=612, height=792)
page.insert_image(fitz.Rect(50, 50, 562, 500), filename=r"scratch\scan_page.png")
pdf.save(r"scratch\scan_cert.pdf")
pdf.close()

from backend.services.document_processor import process_uploaded_document

print("=== IMAGE ===")
r = process_uploaded_document(Path(r"scratch\test_upload.png"), "t.png", "Income Certificate")
print("engine:", r.ocrEngine, "| fields:", {k: v for k, v in r.extractedFields.model_dump().items() if k in ('name','dob','annualIncome','certificateNumber')})

print("=== SCANNED PDF ===")
r2 = process_uploaded_document(Path(r"scratch\scan_cert.pdf"), "t.pdf", "Income Certificate")
print("engine:", r2.ocrEngine)
print("errors:", r2.processingErrors)
print("fields:", {k: v for k, v in r2.extractedFields.model_dump().items() if k in ('name','dob','annualIncome','certificateNumber')})

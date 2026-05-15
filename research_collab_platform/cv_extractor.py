"""
cv_extractor.py  —  CV extraction server (Anthropic Claude backend)
====================================================================

FIRST TIME SETUP (run in your terminal once):
    pip install pdfplumber pytesseract pdf2image opencv-python flask flask-cors anthropic

SYSTEM DEPENDENCIES (Windows):
    1. Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
       → Install to: C:\\Program Files\\Tesseract-OCR\\
       → Tick "Additional language data → French" during install
    2. Poppler: https://github.com/oschwartz10612/poppler-windows/releases
       → Extract to: C:\\poppler\\
       → Add C:\\poppler\\Library\\bin to System PATH

macOS / Linux:
    brew install tesseract poppler          # macOS
    sudo apt install tesseract-ocr poppler-utils  # Ubuntu

TO START THE SERVER:
    set ANTHROPIC_API_KEY=sk-ant-...   (Windows CMD)
    export ANTHROPIC_API_KEY=sk-ant-...  (macOS/Linux)
    python cv_extractor.py

Server runs at http://localhost:5000
"""

import os
import re
import json

import pytesseract

# ── Windows path — adjust if you installed Tesseract elsewhere ────────────────
if os.name == "nt":
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
# ─────────────────────────────────────────────────────────────────────────────

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allow React dev server (localhost:3000 / 5173) to call this

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")


# ═══════════════════════════════════════════════════════════════════════════════
# 1. TEXT EXTRACTION
# ═══════════════════════════════════════════════════════════════════════════════

def extract_text_pdfplumber(pdf_path: str) -> str:
    """Extract text from a digital (non-scanned) PDF using pdfplumber."""
    import pdfplumber

    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            page_text = page.extract_text() or ""
            text += f"\n--- Page {i + 1} ---\n{page_text}"
    return text.strip()


def extract_text_ocr(pdf_path: str) -> str:
    """
    Fallback for scanned PDFs.
    Converts each page to a 300-DPI image, then runs Tesseract OCR.
    """
    from pdf2image import convert_from_path
    import cv2
    import numpy as np

    pages = convert_from_path(pdf_path, dpi=300)
    full_text = ""
    for i, page in enumerate(pages):
        img   = np.array(page)
        gray  = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        text  = pytesseract.image_to_string(bw, lang="eng+fra")
        full_text += f"\n--- Page {i + 1} ---\n{text}"
    return full_text.strip()


def extract_text(pdf_path: str) -> str:
    """
    Smart dispatcher: tries pdfplumber first (fast, accurate for digital PDFs).
    Falls back to OCR if extracted text is suspiciously short (scanned PDF).
    """
    text = extract_text_pdfplumber(pdf_path)
    if len(text) < 200:
        text = extract_text_ocr(pdf_path)
    if not text:
        raise ValueError("Could not extract any text from this PDF.")
    return text


# ═══════════════════════════════════════════════════════════════════════════════
# 2. STRUCTURED PARSING WITH CLAUDE (Anthropic)
# ═══════════════════════════════════════════════════════════════════════════════

def parse_with_claude(raw_text: str) -> dict:
    """
    Sends raw CV text to Claude claude-sonnet-4-5 and returns a structured dict
    matching the React SignUpPage form schema exactly.
    """
    import anthropic

    if not ANTHROPIC_API_KEY:
        raise ValueError(
            "ANTHROPIC_API_KEY is not set.\n"
            "  Windows:  set ANTHROPIC_API_KEY=sk-ant-...\n"
            "  macOS/Linux: export ANTHROPIC_API_KEY=sk-ant-..."
        )

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    prompt = f"""You are an expert CV parser. Extract all information from the CV below.

Return ONLY a valid JSON object with exactly this structure — no markdown, no backticks, no explanation:
{{
  "name": "full name",
  "email": "email address",
  "phone": "phone number",
  "linkedin": "linkedin url or null",
  "github": "github url or null",
  "location": "city and country or null",
  "summary": "professional summary in 1-2 sentences or null",
  "technical_skills": ["skill1", "skill2"],
  "soft_skills": ["skill1", "skill2"],
  "languages": ["language1", "language2"],
  "education": [
    {{
      "degree": "degree name",
      "field": "field of study",
      "school": "university or school name",
      "start_year": "year or null",
      "end_year": "year or null",
      "gpa": "gpa if mentioned or null"
    }}
  ],
  "experience": [
    {{
      "role": "job title",
      "company": "company name",
      "start_date": "start date",
      "end_date": "end date or Present",
      "description": "short summary of responsibilities"
    }}
  ],
  "certifications": [
    {{
      "name": "certification name",
      "issuer": "issuing organization",
      "year": "year or null"
    }}
  ],
  "projects": [
    {{
      "name": "project name",
      "description": "short description"
    }}
  ]
}}

Rules:
- Use null for missing strings, [] for missing arrays
- Do NOT invent any information not present in the CV
- Return ONLY the JSON, nothing else

CV TEXT:
{raw_text}"""

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()

    # Strip accidental markdown fences the model sometimes adds
    raw = re.sub(r"^```json\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"^```\s*",     "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```$",     "", raw, flags=re.MULTILINE)

    return json.loads(raw)  # raises json.JSONDecodeError if model misbehaved


# ═══════════════════════════════════════════════════════════════════════════════
# 3. FLASK ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/health", methods=["GET"])
def health():
    """Quick check — open http://localhost:5000/health in your browser."""
    return jsonify({
        "status": "ok",
        "anthropic_key_set": bool(ANTHROPIC_API_KEY),
    })


@app.route("/extract", methods=["POST"])
def extract_endpoint():
    """
    POST /extract
    Body  : multipart/form-data  with field "file" = your PDF
    Returns: JSON profile object  (same shape as the React SignUpPage state)
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Send a PDF in the 'file' field."}), 400

    uploaded = request.files["file"]

    # ── validation ──────────────────────────────────────────────────────────
    if not uploaded.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are accepted."}), 400

    content = uploaded.read()
    uploaded.seek(0)

    MB = 1024 * 1024
    if len(content) > 20 * MB:
        return jsonify({"error": "File too large. Maximum size is 20 MB."}), 413
    # ────────────────────────────────────────────────────────────────────────

    tmp_path = os.path.join(UPLOAD_FOLDER, uploaded.filename)
    uploaded.save(tmp_path)

    try:
        raw_text = extract_text(tmp_path)
        profile  = parse_with_claude(raw_text)
        return jsonify(profile)

    except json.JSONDecodeError:
        return jsonify({"error": "Model returned invalid JSON. Please try again."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 58)
    print("  ENSIA Research Hub — CV Extractor (Claude backend)")
    print("=" * 58)

    if not ANTHROPIC_API_KEY:
        print("\n⚠️  WARNING: ANTHROPIC_API_KEY is not set!")
        print("   Windows  : set ANTHROPIC_API_KEY=sk-ant-...")
        print("   macOS/Linux: export ANTHROPIC_API_KEY=sk-ant-...\n")
    else:
        print("  ✓ Anthropic API key loaded")

    print(f"\n  Listening on:  http://localhost:5000")
    print(f"  Health check:  http://localhost:5000/health")
    print(f"  Extract route: POST http://localhost:5000/extract")
    print("=" * 58 + "\n")

    app.run(host="0.0.0.0", port=5000, debug=False)
from io import BytesIO

import pdfplumber


def extract_pdf_text(pdf_bytes: bytes) -> str:
    chunks: list[str] = []
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if text.strip():
                chunks.append(text.strip())
    return "\n\n".join(chunks)

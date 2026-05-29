#!/usr/bin/env python3
"""Generate REGLAS.pdf from REGLAS.md without changing content."""

from __future__ import annotations

import re
from pathlib import Path

import markdown
from xhtml2pdf import pisa

ROOT = Path(__file__).resolve().parent.parent
MD_PATH = ROOT / "REGLAS.md"
PDF_PATH = ROOT / "REGLAS.pdf"

CSS = """
@page {
    size: A4;
    margin: 2cm 2.2cm 2.2cm 2.2cm;
    @frame footer {
        -pdf-frame-content: footerContent;
        bottom: 0.6cm;
        margin-left: 2.2cm;
        margin-right: 2.2cm;
        height: 0.8cm;
    }
}
body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #1e1e1e;
}
h1 {
    font-size: 17pt;
    color: #006699;
    text-align: center;
    margin: 0 0 8pt 0;
}
h2 {
    font-size: 12pt;
    color: #006699;
    margin: 16pt 0 6pt 0;
    border-bottom: 1px solid #006699;
    padding-bottom: 3pt;
}
h3 {
    font-size: 11pt;
    color: #005078;
    margin: 10pt 0 4pt 0;
}
p {
    margin: 0 0 6pt 0;
}
ul, ol {
    margin: 0 0 8pt 0;
    padding-left: 18pt;
}
li {
    margin: 0 0 4pt 0;
}
hr {
    border: none;
    border-top: 1px solid #cccccc;
    margin: 10pt 0;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0 10pt 0;
    font-size: 9pt;
}
th {
    background-color: #006699;
    color: #ffffff;
    font-weight: bold;
    padding: 5pt;
    border: 1px solid #006699;
    text-align: center;
}
td {
    padding: 5pt;
    border: 1px solid #999999;
    vertical-align: top;
}
.meta {
    text-align: center;
    margin-bottom: 10pt;
}
.footer-note {
    font-size: 9pt;
    font-style: italic;
    color: #444444;
    margin-top: 12pt;
}
.closing {
    text-align: center;
    font-weight: bold;
    color: #006699;
    margin-top: 14pt;
}
#footerContent {
    font-size: 8pt;
    color: #808080;
    text-align: center;
}
"""


def postprocess_html(html_body: str) -> str:
    html_body = re.sub(
        r"<p><strong>Versión Final</strong>",
        r'<p class="meta"><strong>Versión Final</strong>',
        html_body,
        count=1,
    )
    html_body = re.sub(
        r"<p><strong>¡Que comience",
        r'<p class="closing"><strong>¡Que comience',
        html_body,
        count=1,
    )
    html_body = re.sub(
        r"<p><em>Versión final del reglamento",
        r'<p class="footer-note"><em>Versión final del reglamento',
        html_body,
        count=1,
    )
    return html_body


def md_to_html_document(content: str) -> str:
    body = markdown.markdown(
        content,
        extensions=["tables", "nl2br", "sane_lists"],
    )
    body = postprocess_html(body)
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<style>{CSS}</style>
</head>
<body>
{body}
<div id="footerContent">La Mega Polla Mundialista 2026 — Reglamento</div>
</body>
</html>"""


def generate_pdf() -> Path:
    content = MD_PATH.read_text(encoding="utf-8")
    html_doc = md_to_html_document(content)

    with PDF_PATH.open("wb") as pdf_file:
        status = pisa.CreatePDF(html_doc.encode("utf-8"), dest=pdf_file, encoding="utf-8")

    if status.err:
        raise RuntimeError(f"Error generando PDF: {status.err}")

    return PDF_PATH


if __name__ == "__main__":
    out = generate_pdf()
    print(f"PDF generado: {out}")

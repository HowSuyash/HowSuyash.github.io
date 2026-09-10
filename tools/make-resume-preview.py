"""Regenerate assets/resume-preview.png from assets/resume.pdf.

Run this whenever you replace the resume — otherwise the résumé section
keeps showing the old page while the PDF link serves the new one.

    pip install pymupdf pillow
    python tools/make-resume-preview.py

A résumé is black text on white with a couple of link colours, so a
64-colour palette PNG is both smaller and sharper than JPEG or WebP
(135 KB here, against 211 KB for WebP and 327 KB for JPEG).
"""

import os
import sys

import pymupdf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, "assets", "resume.pdf")
OUT = os.path.join(ROOT, "assets", "resume-preview.png")

SCALE = 2          # render at 2x so it stays sharp on retina
MAX = (1200, 1700)
COLOURS = 64


def main():
    if not os.path.exists(PDF):
        sys.exit("missing %s" % PDF)

    doc = pymupdf.open(PDF)
    if doc.page_count > 1:
        print("note: %d pages, only page 1 is used as the preview" % doc.page_count)

    pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(SCALE, SCALE))
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    img.thumbnail(MAX, Image.LANCZOS)
    img.quantize(colors=COLOURS, method=Image.MEDIANCUT).save(OUT, "PNG", optimize=True)

    print("%s  %dx%d  %.0f KB" % (
        os.path.relpath(OUT, ROOT), img.width, img.height,
        os.path.getsize(OUT) / 1024))
    print("update the width/height attributes on the <img> in index.html "
          "if the dimensions changed")


if __name__ == "__main__":
    main()

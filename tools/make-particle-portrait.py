"""Regenerate assets/portrait-particles.webp from assets/portrait.jpg.

Part 2 (v2/) draws the portrait as a field of particles. It cannot use
the photo as it is: the background is a bokeh of bright lights, and
every one of them would become a cloud of particles. This cuts the
subject out, so the page only builds particles where the alpha is.

    pip install rembg pillow
    python tools/make-particle-portrait.py

The first run downloads the isnet-general-use model (~170 MB) to
~/.u2net. It was picked over u2net_human_seg, which dropped the ID card
and left a halo round the hair.

The photo is side-lit: one cheek blows out to white and the beard
swallows the smile, and at ~45 particles across a face both read as
noise. Local contrast (CLAHE) and a light unsharp mask bring the eyes
and the smile back. OpenCV comes with rembg, so it is no extra install.

The output is small on purpose. js/v2.js redraws it at the size of the
particle grid (about 210 rows) and reads one pixel per particle, so
anything past ~500px tall is bytes nobody sees. Lossy WebP with alpha
is 25 KB, against 115 KB for the same image as PNG.
"""

import os
import sys

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "portrait.jpg")
OUT = os.path.join(ROOT, "assets", "portrait-particles.webp")

MODEL = "isnet-general-use"
HEIGHT = 520       # px; the grid never samples more finely than this
PAD = 0.02         # breathing room round the subject, as a share of height
QUALITY = 82

CLAHE_CLIP = 2.0     # 3 already blows the lit cheek out into a white blob
SHARPEN = 1.0
SHARPEN_SIGMA = 2.5  # px, at HEIGHT


def main():
    if not os.path.exists(SRC):
        sys.exit("missing %s" % SRC)

    cut = remove(Image.open(SRC).convert("RGB"), session=new_session(MODEL))

    # tight crop to the subject, so the page can place the figure by its
    # own edges rather than the photo's
    left, top, right, bottom = cut.split()[3].point(lambda a: 255 if a > 24 else 0).getbbox()
    pad = int(cut.height * PAD)
    cut = cut.crop((max(0, left - pad), max(0, top - pad),
                    min(cut.width, right + pad), bottom))

    cut = cut.resize((round(cut.width * HEIGHT / cut.height), HEIGHT), Image.LANCZOS)
    alpha = cut.split()[3]

    # luminance only: the page tints it, so colour would be thrown away
    lum = np.array(cut.convert("L"))
    subject = np.array(alpha) > 128
    # the bokeh behind is about to be dropped; flatten it to the
    # subject's own median first, so it cannot skew the contrast of
    # the tiles along the edge of the figure
    lum[~subject] = int(np.median(lum[subject]))
    lum = cv2.createCLAHE(clipLimit=CLAHE_CLIP, tileGridSize=(8, 8)).apply(lum)
    blur = cv2.GaussianBlur(lum.astype(np.float32), (0, 0), SHARPEN_SIGMA)
    lum = np.clip(lum + SHARPEN * (lum - blur), 0, 255).astype(np.uint8)

    lum = Image.fromarray(lum)
    out = Image.merge("RGBA", (lum, lum, lum, alpha))
    out.save(OUT, "WEBP", quality=QUALITY, alpha_quality=90, method=6)

    print("%s  %dx%d  %.1f KB" % (os.path.relpath(OUT, ROOT), out.width, out.height,
                                  os.path.getsize(OUT) / 1024))


if __name__ == "__main__":
    main()

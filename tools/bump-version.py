"""Bump the ?v= on every local asset reference in index.html.

    python tools/bump-version.py

Why this exists: vercel.json serves /assets, /css and /js with
`max-age=31536000, immutable`, which tells the browser never to check
again. That is only safe if the URL changes when the file does — and
these filenames never change, so the query string is the only thing
that can. Bumping css and js by hand while forgetting the images is an
easy mistake to make, and the result is a visitor who keeps seeing last
week's photo for a year. One command, everything moves together.

Run it after changing ANY file under assets/, css/ or js/.
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "index.html")

# local references only — never touch the Google Fonts URL or any other host
REF = re.compile(
    r'((?:src|href|content)="'
    r'(?:https://howsuyash\.github\.io/)?'
    r'(?:assets|css|js)/[^"?]+)'
    r'(\?v=\d+)?"'
)


def main():
    html = open(PAGE, encoding="utf-8").read()

    seen = [int(v) for v in re.findall(r'\?v=(\d+)"', html)]
    nxt = (max(seen) + 1) if seen else 1
    if len(sys.argv) > 1:
        nxt = int(sys.argv[1])

    out, n = REF.subn(lambda m: '%s?v=%d"' % (m.group(1), nxt), html)
    open(PAGE, "w", encoding="utf-8").write(out)

    print("bumped %d references to ?v=%d" % (n, nxt))
    stale = sorted(set(re.findall(r'"((?:assets|css|js)/[^"?]+)"', out)))
    if stale:
        print("STILL UNVERSIONED (fix the regex):")
        for s in stale:
            print("   " + s)


if __name__ == "__main__":
    main()

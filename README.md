# Suyash Shukla — Portfolio

Personal site. Vanilla HTML, CSS and JavaScript — no framework, no build
step, no dependencies.

**Live:** [howsuyash.github.io](https://howsuyash.github.io) · part 2 at
[/v2/](https://howsuyash.github.io/v2/)

![The site](assets/og-image-v2.jpg)

## What's in it

The main page is built around a particle portrait.

- **Intro** — a dot drops and bounces, a bar lands on it to make "!", and
  the "!" tips left and right, knocking the name out letter by letter.
  SHUKLA then types itself on, and the full name slides down into the hero.
- **Portrait** — the photo, cut out and rebuilt from about twelve thousand
  squares on a canvas. They gather on arrival, part around the cursor, and
  blow away as the hero scrolls off.
- **The rest** — words that light up as you read, stacked project cards,
  a timeline that fills as you scroll, and a résumé page that tilts toward
  the cursor.

## Part 2

[`/v2/`](https://howsuyash.github.io/v2/) is the first design, kept as it
was: the same content as seven full-height chapters, each with its own
palette, so the page repaints through shades of near-black as it scrolls.
The two pages link to each other.

![Part 2](assets/og-image.jpg)

- **Hero** — the name is set in Roboto Flex, and every letter interpolates
  its `wght` and `wdth` axes by how close the cursor is, so the type swells
  under the pointer and settles as it leaves.
- **Work** — a pinned section that scrolls sideways through three projects:
  two with screenshots of the deployed site, and a schematic of Quenaire's
  retrieval pipeline drawn in markup.
- **Résumé** — page one of the PDF, rendered to an image and laid on the
  page like a sheet of paper.
- **Contact** — email, links, and a marquee.

## Running it

Any static server, from the repo root:

```bash
python -m http.server 5173
```

Then open <http://127.0.0.1:5173> (part 2 is at `/v2/`). Serve it rather
than opening `index.html` directly: from `file://` the browser will not
let the page read the photo's pixels, so the portrait shows as a still.

## Notes

Animations are written so they can only ever fail *visible* — content is
never hidden by a base style waiting on a script. Scroll reveals arm only
what starts below the fold, and the intro lifts itself if its script
never runs.

Motion is skipped entirely under `prefers-reduced-motion`, and the
cursor-driven effects are gated behind a fine pointer, so touch devices get
the static layout.

Deeper notes — how both pages are put together, tuning the effects,
regenerating the portrait and the résumé preview — are in
[DEVELOPING.md](DEVELOPING.md).

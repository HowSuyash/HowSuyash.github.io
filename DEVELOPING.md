# Developing

Working notes for this site — how it is put together and what to change
where. The short version is in [README.md](README.md).


Static site. No build step, no dependencies, no `npm install`.
Open `index.html` and it works.

```
portfolio/
├── index.html               all content lives here
├── css/styles.css           chapter themes + layout
├── js/main.js               the scroll engine
├── assets/
│   ├── favicon.svg
│   ├── portrait.jpg         the real photo, revealed on hover
│   ├── portrait.svg         the cowl that sits over it
│   ├── project-01..03.jpg   project screenshots
│   ├── resume.pdf           the real CV
│   ├── resume-preview.png   page 1, rendered  (regenerate — see below)
│   └── og-image.jpg         1200x630 social preview
├── tools/
│   └── make-resume-preview.py   dev script, not deployed
└── README.md
```

## The idea

The page is seven **chapters**. Each `<section>` declares
`data-chapter="light | dark | accent"`, and whichever chapter owns the middle
of the viewport repaints the entire page palette.

It is a **Batman theme**: the page never goes bright. The names `light` /
`dark` / `accent` are kept for the markup, but all three are now shades of
night — raised charcoal, deepest black, and a warm black with the
bat-signal burning behind the finale. The rhythm comes from depth rather
than inversion, so the chapter changes are quieter than a light-to-dark
flip would be. That is the trade for an all-dark page.

| # | Chapter | Theme | Motion |
|---|---|---|---|
| 1 | Hero | charcoal | Name in white, large portrait right; every letter warps toward the cursor |
| 2 | Approach | black | Words light up one at a time as the block crosses the viewport |
| 3 | Work | black | **Pinned** — the section sticks and projects scroll sideways |
| 4 | Skills | charcoal | Rows wipe with bat-signal yellow on hover |
| 5 | Experience | black | The rail draws itself down as you read |
| 6 | Résumé | charcoal | The PDF's first page as a tilted sheet; straightens on hover |
| 7 | Contact | warm black | Bat-signal glow behind the headline, giant marquee |

## Make it yours

Everything is in `index.html`, top to bottom.

| What | Where |
|---|---|
| Name, title, meta | `<head>` — the `EDIT: page metadata` block |
| Your name (the huge one) | `.hero__name` |
| Italic aside under the name | `.hero__since` |
| Availability / location line | `.hero__lang` |
| Your photo | `.hero__portrait` — see below |
| The one-line statement | `.manifesto__text` |
| Projects | `.reel__track` — JanVaani, Smart Attendance, CryptoCurrency, GitHub |
| Skills | `.caps__list` — four `<li class="cap">` |
| Experience + education | `.exp__list` |
| Résumé blurb + stats | `.resume__side` |
| Email + socials | `.contact` section |

### Still to fill in

Content is complete. Two optional extras:

Nothing outstanding.

Regenerate `assets/og-image.jpg` after any visual change to the hero, or
the link preview will show the old design:

```bash
chrome --headless=new --window-size=1200,630 --force-device-scale-factor=2        --screenshot=og-raw.png http://127.0.0.1:5173/
# then downscale to exactly 1200x630 and save as JPEG (~41 KB;
# PNG is 394 KB here — the opposite of the résumé, which is text)
```

### The résumé section

`assets/resume.pdf` is the real file. Chapter 6 shows
`assets/resume-preview.png` — page 1 rendered to an image — and clicking it
opens the PDF.

It is an image rather than an `<iframe>` on purpose: PDF embeds render
blank or force a download on most mobile browsers, and an image is styled
by the page like everything else.

**When you replace the resume, the preview does not update itself.** Drop
the new PDF at `assets/resume.pdf`, then:

```bash
pip install pymupdf pillow
python tools/make-resume-preview.py
```

That regenerates the preview and prints its dimensions — if they changed,
update `width`/`height` on the `<img>` in `index.html` so the page does not
shift while it loads. `tools/` is a dev script; it is not part of the
deployed site.

### Project previews

`assets/project-01…03.jpg` are real screenshots, 1200x900, ~125 KB total.
They were captured with headless Chrome:

```bash
chrome --headless=new --window-size=1280,960        --screenshot=shot.png https://your-demo-url
```

If a project is not deployed, clone it and render the source instead — the
result is the same as long as it has no backend:

```bash
git clone --depth 1 https://github.com/HowSuyash/<repo>
chrome --headless=new --window-size=1280,960        --screenshot=shot.png file:///abs/path/<repo>/index.html
```

On Windows PowerShell, do **not** redirect Chrome's stderr with `2>$null`
— it makes the screenshot look like it failed when the file was written
fine. Pipe to `Out-Null` instead.

Then cropped to 4:3 and saved as JPEG (the panel frame is
`aspect-ratio: 4/3` with `object-fit: cover; object-position: top center`,
so the top of the page always survives the crop).

To swap one out, replace the file and keep the name. The gradient behind
it stays as the loading colour. `.panel__visual--shot` switches off the
decorative grid overlay so it does not sit on top of the screenshot.

Your phone number is live on the page in `.contact__socials`. Delete that
line if you would rather not have it scraped.

Contact email is `suyashshukla0702@gmail.com`, in 2 places (the `mailto:`
link and the `data-copy` button).

### Adding or removing projects

Add another `<article class="panel">` inside `.reel__track`. The pinned
section measures the track and sets its own scroll height on load and on
resize, so the horizontal distance is always exact — nothing to configure.

One thing is **not** automatic: the `/ 04` total in `.reel__counter`.
Update that by hand.

### The animated background

`.aura` is a fixed layer at `z-index: 0` — above the page background,
below the content at `z-index: 2`. Three soft pools of light drift across
it on long, offset loops, with a faint 64px grid sliding underneath.

Two rules keep it cheap enough to run on a phone:

- **Only `transform` is animated.** Transforms are handled by the
  compositor, so none of this costs a layout or a paint per frame.
  Animating `background-position`, or a blur, would put it back on the
  main thread every single frame.
- **No `filter: blur()`.** The softness comes from the radial gradients
  themselves. A blur over a viewport-sized element is one of the most
  expensive things you can ask a browser to do continuously.

The grid tile is 64px and the drift is exactly one tile, so the loop wraps
with no visible jump. Below 700px the third pool is dropped — one less
composited layer, and it sat mostly off-screen at that width anyway.

`prefers-reduced-motion` already collapses every animation duration
globally, which freezes these where they stand: the layers stay, the
movement stops.

To calm it down, lower the percentages in the three `radial-gradient`
colour stops. To slow it, raise the `46s` / `61s` / `53s` durations —
keep them different, or the pools start moving in lockstep and the eye
picks up the pattern.

### Change the accent

`css/styles.css`, first block. One value:

```css
--accent-raw: #ffd84d;   /* bat-signal yellow (default) */
```

| Colour | Value |
|---|---|
| Amber | `#ffb020` |
| Ice blue | `#7dd3fc` |
| Acid green | `#ccff00` |

The three greys are next to it:

```css
--bone:  #f4f4f6;   /* text */
--coal:  #08080a;   /* deepest night */
--slate: #15151b;   /* raised charcoal */
```

Every chapter is dark now, so the accent only ever sits **on** near-black —
pick something bright. The name itself is hard-set to `#fff` in
`.hero__name`, brighter than body text on purpose.

One thing tuned for the dark page: the resting weight of the hero letters
is `wght 460` rather than 380. Thin white strokes on near-black read
optically grey, so the rest state is lifted until the name is
unmistakably white. See `REST` in `js/main.js` section 4c.

### Change the type

Two variables in `:root`, plus the Google Fonts `<link>` in `<head>`:

```css
--font-display: 'Bricolage Grotesque', ...;   /* headlines */
--font-flex:    'Roboto Flex', ...;           /* the hero name only */
--font-body:    'Inter', ...;                 /* paragraphs */
--font-mono:    'JetBrains Mono', ...;        /* labels and metadata */
```

Four faces is already the ceiling. There was a fifth — Instrument Serif,
italic, on the two lines under the name — and it was dropped: a decorative
serif next to a grotesk and a mono reads as an accident rather than a
choice. Those lines now use the body face and the mono label treatment,
which is what the eyebrows and the nav already use.

Display faces that suit this layout: `Anton`, `Syne`, `Archivo Expanded`,
`Space Grotesk`.

### Tuning the cursor effect on the name

Every letter of `.hero__name` is wrapped in its own `<span data-vft-letter>`
by JS. On pointer move, each one interpolates the **`wght`** and **`wdth`**
axes of Roboto Flex by how close the cursor is — so the name fattens and
widens under your pointer and settles back as you leave.

Four numbers control it, at the top of section 4c in `js/main.js`:

```js
var REST   = { wght: 460, wdth: 93 };    // at rest — light and slightly condensed
var HOT    = { wght: 900, wdth: 145 };   // directly under the cursor
var RADIUS = 190;                        // px of reach
```

Bigger `RADIUS` = a broader, softer wave. A bigger gap between `REST` and
`HOT` = more violent. Set `REST.wght` high and `HOT.wght` low to invert it,
so letters *thin out* as you approach.

This only works with a font that carries both axes. If you swap
`--font-flex`, pick another variable font with `wght` **and** `wdth`
(Roboto Flex, Recursive) and update the Google Fonts `<link>` — with a
static font the letters simply sit at their rest weight and nothing moves.

The effect is skipped entirely on touch devices and under
`prefers-reduced-motion`.

### The hero portrait

Two stacked layers inside `.hero__portrait`:

| Layer | File | Role |
|---|---|---|
| `.hero__portrait-cowl` | `assets/portrait.svg` | the hand-drawn cowl, on top, what you see at rest |
| `.hero__portrait-shot` | `assets/portrait.jpg` | the real photo underneath |

The photo carries a radial `mask-image` whose radius is `--r`. At rest
`--r` is `0px`, so the photo is masked away entirely and only the cowl
shows. On hover the radius opens to `165px`, cutting a moving window
through to the photo. JS does nothing but report the cursor position
inside the frame as `--mx` / `--my`; CSS owns the radius, which is why
`:hover` can drive it and a media query can switch the whole thing off.

`--r` and `--ring` are registered with `@property` as `<length>` so they
can be *transitioned* — an unregistered custom property jumps instead of
animating.

**On touch** there is no hover to open the mask, so JS drives it instead:
the portrait sweeps itself open the first time it scrolls into view, then
a tap toggles it and a drag moves the window. `touch-action: pan-y` keeps
vertical scrolling with the page, so the portrait can never trap a scroll.

JS adds `.can-unmask` when it is set up to do this. Without it — no JS, old
browser — the CSS drops the cowl and shows the photo plainly, because a
cowl nobody can open would hide the face for good.

The name has the same problem: no cursor to draw the wave with. On touch it
runs one pass by itself, left to right, driven from the frame loop that is
already running. One animation, then silence — a continuous loop would
re-lay-out the whole line every frame, which is what makes a cheap phone
stutter.

**Reveal size** is one token, `--reveal` on `.hero__portrait` (165px, 105px
under 900px, 92px under 700px). The mask and its ring both read it, so they
cannot drift apart. It must stay defined: `--r` is a registered property, so
an undefined `var()` silently falls back to its `0px` initial value and the
mask never opens at all.

**Replacing the photo:** crop 4:5, save as `assets/portrait.jpg`, and
update `width`/`height` on the `<img>`. `object-position: 50% 20%` keeps
the face in frame when the `max-height` guard crops the box on short
screens.

### Real project screenshots

Panel visuals are CSS gradients, so nothing is broken by missing images.
To use a real one, replace:

```html
<div class="panel__visual panel__visual--01" aria-hidden="true"><span>◈</span></div>
```

with:

```html
<img class="panel__visual" src="assets/project-01.png" alt="Orbit Analytics dashboard" />
```

and add to `styles.css`:

```css
img.panel__visual { object-fit: cover; }
```

## Run it locally

Double-click `index.html`, or serve it (clipboard copy needs a real origin
in some browsers):

```bash
python -m http.server 5173
# or
npx serve .
```

## Deploy — free

**Netlify Drop** — drag the folder onto https://app.netlify.com/drop. Live in ~10 seconds.

**Vercel**
```bash
npx vercel --prod
```

**GitHub Pages**
```bash
git init && git add -A && git commit -m "portfolio"
git branch -M main
git remote add origin https://github.com/YOURNAME/YOURNAME.github.io.git
git push -u origin main
```
Then Settings → Pages → Source: `main` / root.

## How the motion works

All scroll-linked animation runs in **one** `requestAnimationFrame` loop
(`js/main.js`, section 13). Each effect registers a task; the loop calls
them in order. Layout measurements are cached and only recomputed on a
debounced resize, so nothing thrashes the layout mid-scroll.

Everything is transform and opacity only — no animating width, height,
top or left — so it stays on the compositor.

## Fallbacks

- **No JavaScript** — `<html>` never gets the `.js` class. Split text stays
  visible, the pinned reel becomes an ordinary horizontal scroller with
  scroll-snap, nothing is hidden.
- **`prefers-reduced-motion`** — every scroll-linked task is skipped, the
  reel un-pins, the cursor is removed, transitions collapse to nothing.
- **Touch / coarse pointer** — custom cursor and magnetic hover never
  initialise.
- **`file://`** — clipboard falls back to `execCommand`.

## Accessibility notes

- Semantic sections, real heading order, skip link, visible focus rings
- Decorative visuals are `aria-hidden`; the ticker text is decorative
- Colour is never the only signal
- Print stylesheet un-pins the reel so the page prints as a flat document

The one honest tradeoff: a pinned horizontal section means the work chapter
takes several screens of scrolling to pass. That's the format. If you'd
rather have a plain vertical project list, delete the `data-reel` attribute
from `<section class="reel">` and the JS leaves it alone.

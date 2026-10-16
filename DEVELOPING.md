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
├── v2/index.html            part 2 — see "Part 2" below
├── css/v2.css               part 2's styles (shares nothing with part 1)
├── js/v2.js                 part 2's intro, particles and scroll
├── assets/
│   ├── favicon.svg
│   ├── portrait.jpg         the real photo, revealed on hover
│   ├── portrait.svg         the cowl that sits over it
│   ├── portrait-particles.webp  the photo cut out, for part 2 (generated)
│   ├── janvaani.jpg         project screenshots, named by project
│   ├── smart-attendance.jpg   so reordering never means renaming
│   ├── resume.pdf           the real CV
│   ├── resume-preview.png   page 1, rendered  (regenerate — see below)
│   ├── og-image.jpg         1200x630 social preview
│   └── og-image-v2.jpg      the same, for part 2
├── tools/                   dev scripts, not deployed
│   ├── make-resume-preview.py
│   ├── make-particle-portrait.py
│   └── bump-version.py
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
| Projects | `.reel__track` — Quenaire, JanVaani, Smart Attendance, GitHub |
| Skills | `.caps__list` — four `<li class="cap">` |
| Experience + education | `.exp__list` |
| Résumé blurb + stats | `.resume__side` |
| Email + socials | `.contact` section |

### Still to fill in

Content is complete. Two things are waiting on Quenaire itself:

- **A live link.** `www.quenaire.com` is still a parked domain, so the
  panel links to the source only. Add a `Live site` link next to it
  once the app is deployed.
- **A real screenshot.** The panel shows a schematic for now — see
  *Project previews* below for swapping one in.

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

Check the PDF's links before dropping it in. In LaTeX,
`\href{www.example.com}{...}` without `https://` exports as a *launch a
file* action rather than a web link, and does nothing in a browser's PDF
viewer. This one prints every link and its kind (`2` is a URL, `3` is
the broken launch kind):

```bash
python -c "import pymupdf; [print(l['kind'], l.get('uri') or l.get('file')) for p in pymupdf.open('assets/resume.pdf') for l in p.get_links()]"
```

### Cache busting — read this before changing any asset

`vercel.json` serves `/assets`, `/css` and `/js` with
`max-age=31536000, immutable`. That tells the browser never to check
again — not on a new deploy, not for a year. It is only safe because
**every local reference carries a `?v=`** — in `index.html`, `404.html`
and `v2/index.html`: the filenames never change, so the query string is
the only thing that can signal a new file.

After changing anything under `assets/`, `css/` or `js/`:

```bash
python tools/bump-version.py
```

It bumps every local reference on all three pages together (including
part 2's `../assets/...` paths) and leaves external URLs alone.
Bumping `css` and `js` by hand while forgetting the images is exactly the
mistake this prevents, and the symptom is nasty: the new file is live on
the server, every check passes, and visitors keep seeing the old one for
a year.

### Project previews

`assets/janvaani.jpg` and `assets/smart-attendance.jpg` are real
screenshots, 1200x900, ~100 KB together. They were captured with headless
Chrome:

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

**Quenaire** has no public deployment yet, so its panel is a schematic
written in markup (`.rag` in `styles.css`): a question, the three policy
passages retrieved for it, and the drafted answer. It is sized in `cqh`
units against the frame's height, so it fits at 4:3 and at the 16:10
phone crop alike. To replace it with a real screenshot, the Quenaire
repo already has a capture script — with `NEXT_PUBLIC_USE_MOCK_DATA=true`
and `NEXT_PUBLIC_ALLOW_DEMO_LOGIN=true` in `frontend/.env.local`:

```bash
cd frontend && npm run dev          # one terminal
npm run screenshots                 # another; writes to screenshots/
```

Crop the review queue or dashboard to 4:3, save it as
`assets/quenaire.jpg`, and swap the `.panel__visual--rag` div for the
same `panel__visual--shot` + `<img>` pattern the other two panels use.

Your phone number is live on the page in `.contact__socials`. Delete that
line if you would rather not have it scraped.

Contact email is `suyashshukla0702@gmail.com`, in 2 places (the `mailto:`
link and the `data-copy` button).

### Adding or removing projects

Add another `<article class="panel">` inside `.reel__track`. Everything
follows on its own: the pinned section measures the track and sets its own
scroll height, and the `/ 04` total in `.reel__counter` counts the panels
rather than being typed in.

### Analytics

Nothing is loaded until you set a code. Near the bottom of `index.html`:

```js
var CODE = '';                       // <- your goatcounter code
```

Sign up at [goatcounter.com](https://www.goatcounter.com) (free, no
cookies, no consent banner) and paste the site code in. While it is empty
the script returns immediately — no request, nothing broken.

GoatCounter rather than Vercel's own analytics because Vercel only counts
the `vercel.app` domain, and the canonical URL is the GitHub Pages one.

### Other site files

| File | Why |
|---|---|
| `404.html` | a wrong URL lands on the site's own page, not GitHub's grey one |
| `robots.txt` | points crawlers at the sitemap |
| `sitemap.xml` | one URL; update if pages are ever added |
| `site.webmanifest` | "Add to Home Screen" gets the bat icon and the right colours |

The `<meta name="theme-color">` that tints mobile browser chrome is kept in
step by `syncThemeColor()` in `js/main.js`. It reads `--bg` rather than
holding its own list of colours, so it is right for every chapter in both
palettes — and it reads the token, not the painted background, because the
painted one is mid-transition for .7s after any change.

The JSON-LD block in `<head>` declares the page as a `Person`. That is what
connects the site to the name in a search; keep `sameAs` and `knowsAbout`
current when the links or the stack change.

### The animated background

`.aura` is a fixed layer at `z-index: 0` — above the page background,
below the content at `z-index: 2`. Inside it:

| Layer | What it does |
|---|---|
| `.aura__haze` x3 | pools of light drifting on long, offset loops |
| `.aura__grid` | a faint 64px grid sliding diagonally |
| `.aura__dust` x2 | specks drifting up at two speeds, for depth |
| `.aura__beam` | a searchlight crossing the frame |

The beam starts and ends well outside the viewport, so the loop restart is
never seen and it needs no opacity keyframes to hide the seam. Each dust
layer is one tile of a few *irregularly placed* specks, repeated — the
irregular positions inside the tile are what stop it reading as the grid
it technically is, and each travels exactly one tile so it loops
seamlessly.

Two rules keep it cheap enough to run on a phone:

- **Only `transform` is animated.** Transforms are handled by the
  compositor, so none of this costs a layout or a paint per frame.
  Animating `background-position`, or a blur, would put it back on the
  main thread every single frame.
- **No `filter: blur()`.** The softness comes from the radial gradients
  themselves. A blur over a viewport-sized element is one of the most
  expensive things you can ask a browser to do continuously.

The grid tile is 64px and the drift is exactly one tile, so the loop wraps
with no visible jump. Below 700px the third pool and the far dust layer are dropped — two
fewer composited layers on the device least able to afford them, and the
pool sat mostly off-screen at that width anyway.

`prefers-reduced-motion` already collapses every animation duration
globally, which freezes these where they stand: the layers stay, the
movement stops.

To calm it down, lower the percentages in the three `radial-gradient`
colour stops. To slow it, raise the `46s` / `61s` / `53s` durations —
keep them different, or the pools start moving in lockstep and the eye
picks up the pattern.

### Night and day

`data-mode` on `<html>` is the palette; `data-theme` on `<body>` is the
chapter role. The chapter names (`light` / `dark` / `accent`) are **roles,
not brightness** — at night all three are shades of dark, by day all three
are shades of paper.

Night is written as `html:not([data-mode='day'])` so it also matches "no
attribute yet". An inline script in `<head>` sets the attribute before the
first paint, so the page is never briefly the wrong colour.

**Night is the default for everyone.** The OS preference is deliberately
not consulted: the site is built around the dark palette, and a visitor on
a light-mode laptop would otherwise never see it. The toggle in the nav is
the way out, and a stored choice wins. Storage is written **only on
click**, so nobody is pinned to a palette they never picked.

To follow the OS instead, put this back in the head script before the
`setAttribute`:

```js
if (m !== 'day' && m !== 'night') {
  m = window.matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night';
}
```

**Two accent tokens.** `--accent` is the fill and is the same yellow in
both modes, because it always carries dark ink on top. `--accent-line` is
for text and thin borders, and darkens to an amber by day — the same
bright yellow on paper is unreadable. Anything that paints accent *as
text or a border* must use `--accent-line`.

Every other palette value is a token too: `--name` (the hero name, a
little brighter than body ink), `--glow` (the bat-signal), and
`--haze-warm` / `--haze-cool` / `--haze-soft` for the drifting background.
Both modes define the same fourteen.

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

## Part 2 — `v2/`

A second page over the same content, after a particle-portrait intro.
It lives at `/v2/` and has its own `css/v2.css` and `js/v2.js`; nothing
is shared with part 1 except the images and the PDF, so either page can
change without touching the other. They link to each other: "Part 1" in
part 2's nav and footer.

It reaches the shared folders through `../`, so serve the repo root —
`python -m http.server 5173`, then <http://127.0.0.1:5173/v2/>.

### The intro

`js/v2.js` section 2. A dot drops and bounces; a bar lands on it to make
"!"; the "!" tips left and knocks up **S U Y**, swings right for
**A S H**, stands, then sinks away and the gap closes. **SHUKLA** then
types itself on letter by letter; the full name grows, and moves onto
the real hero title — measured, not guessed — before the stage is removed.

Every beat is an `at(ms, ...)` call inside `run()`, all on one clock, so
retiming is editing numbers. It runs about five and a half seconds.

- **Skipping** — any key, click, wheel or touch jumps to the end.
- **Skipped entirely** under reduced motion, and for deep links
  (`/v2/#work` lands on the work).
- **It cannot strand the page.** The curtain is a class, `is-intro`, set
  by an inline script in `<head>` so it is down before the first paint.
  That same script lifts it after four seconds unless `v2.js` has claimed
  the intro, and `v2.js` lifts it itself under two seconds after the
  intro should have ended, whatever happens.

The letters are measured against Inter Black (`.intro__slot` notes the
metrics), so the intro waits up to 1.5s for that font before starting.

**The name.** In the reference this was modelled on, the "!" stands
back up as the I of the name. SUYASH has no I, so here it sinks out
instead and the two halves close up.

**Changing the title.** The hero title is `.hero__word` in
`v2/index.html`; `TITLE` near the top of `intro()` must match it exactly,
in capitals. The intro turns SUYASH into `TITLE` one letter at a time and
skips letters that already match, so any word works (it was PORTFOLIO
once). If the new title is much shorter or longer, retune `--title` in
`css/v2.css`, which is sized so "SUYASH SHUKLA" fits on one line.

### The particle portrait

`js/v2.js` section 1. `assets/portrait-particles.webp` is drawn at the
size of the particle grid and every opaque pixel becomes one square,
coloured from a twelve-step navy-to-white ramp by the photo's brightness
plus a random nudge. The nudge is the mosaic.

| Knob | Where | What it does |
|---|---|---|
| `PALETTE` | top of section 1 | the ramp; keep it dark → light |
| `ROWS_WIDE` / `ROWS_NARROW` | top of section 1 | grid density: 210 rows is ~12.5k particles on desktop, 140 is ~5.5k on phones. Cost grows with the square |
| `REPEL` | top of section 1 | px of cursor reach |
| the `light` falloff | `buildParticles` | dims everything below the chest so the face carries the picture |

It draws in device pixels, rounded, so squares stay crisp at any pixel
ratio, and buckets particles by colour so `fillStyle` changes twelve
times a frame instead of twelve thousand. The loop stops while the hero
is off screen. On phones the cursor effect is off and the grid is
coarser.

**Replacing the photo.** Swap `assets/portrait.jpg` (part 1 uses it too),
then regenerate the cut-out:

```bash
pip install rembg pillow
python tools/make-particle-portrait.py
python tools/bump-version.py
```

The first run downloads a ~170 MB model. The script also flattens the
photo's side lighting with local contrast and a light sharpen — at ~45
particles across a face, that is the difference between eyes and noise.

**From `file://`** Chrome will not let a page read pixels from a local
image, so there are no particles; the cut-out shows as a still instead.
Serve the folder.

### The rest of part 2

| Effect | Where |
|---|---|
| Big chrome section words rise out of a mask | `[data-bigword]`, v2.js 4a |
| "Intro" paragraph lights word by word | `[data-words]`, v2.js 4c |
| Project cards stick and stack; the covered one shrinks | `[data-stack]`, v2.js 4d + `.project` |
| Timeline rail fills as you read | `[data-timeline]`, v2.js 4e |
| Skill cards glow under the cursor | `[data-glow]` |
| Résumé page tilts toward the cursor | `[data-tilt]` |

Hidden states only exist under classes the script adds (`is-armed`,
`is-intro`), so without JavaScript every section is plain and visible.
The portrait falls back to the cut-out as a tinted still.

**Gradient text and tracking.** Every chrome heading uses
`background-clip: text` with negative letter-spacing, which pushes the
last letter's ink past the end of its box — and the gradient is only
painted inside the box, so the letter gets shaved flat. Each of them
carries a little `padding-right` for that. Keep it if you add one.

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

/* =============================================================
   Portfolio — Kinetic Scroll Story
   Vanilla JS, zero dependencies.

   One requestAnimationFrame loop drives everything that is
   scroll-linked. Measurements are cached and only recomputed on
   resize. Without JS, or with prefers-reduced-motion, every
   section degrades to a plain readable block — the content is
   all in the HTML.
   ============================================================= */

(function () {
  'use strict';

  /* --------------------------------------------- helpers ----- */
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var vh = window.innerHeight;
  var vw = window.innerWidth;

  /* tasks run every frame; each returns nothing */
  var tasks = [];
  var onResize = [];

  /* ==========================================================
     1. SPLIT TEXT  —  [data-split]
     Each word gets an overflow-hidden mask so its characters can
     slide up from below. Splitting per word (not per line) means
     it survives any wrap point.
     ========================================================== */
  $$('[data-split]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    var index = 0;
    el.textContent = '';

    words.forEach(function (word, w) {
      var mask = document.createElement('span');
      mask.className = 'line-mask';

      word.split('').forEach(function (ch) {
        var span = document.createElement('span');
        span.className = 'char';
        span.style.setProperty('--i', index++);
        span.textContent = ch;
        mask.appendChild(span);
      });

      el.appendChild(mask);
      if (w < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  /* ==========================================================
     2. WORD REVEAL  —  [data-words]
     Words start dimmed and light up in sequence as the block
     travels through the viewport.
     ========================================================== */
  var wordBlocks = $$('[data-words]').map(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';

    var spans = words.map(function (word, i) {
      var span = document.createElement('span');
      span.className = 'word';
      span.textContent = word;
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return span;
    });

    return { el: el, words: spans, lit: -1 };
  });

  if (wordBlocks.length && !reduceMotion) {
    tasks.push(function () {
      wordBlocks.forEach(function (block) {
        var r = block.el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;

        // 0 when the block's top hits 85% of the viewport,
        // 1 by the time it has travelled a bit past the middle
        var p = clamp((vh * 0.85 - r.top) / (vh * 0.6), 0, 1);
        var target = Math.round(p * block.words.length);
        if (target === block.lit) return;

        block.words.forEach(function (w, i) {
          w.classList.toggle('is-lit', i < target);
        });
        block.lit = target;
      });
    });
  }

  /* ==========================================================
     3. CHAPTER THEMES
     Whichever chapter owns the middle of the viewport sets the
     palette for the whole page.
     ========================================================== */
  var chapters = $$('[data-chapter]');

  if (chapters.length && 'IntersectionObserver' in window) {
    var themeObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        document.body.setAttribute('data-theme', entry.target.getAttribute('data-chapter'));
      });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });

    chapters.forEach(function (c) { themeObs.observe(c); });
  }

  /* ==========================================================
     4. HERO  —  lifts and fades as you leave it
     ========================================================== */
  var heroSection = $('.hero');
  var portrait = $('[data-portrait]');

  /* the hero block lifts and fades as one unit — CSS reads
     --hero-p, so the transform stays out of JS's hands */
  if (heroSection && !reduceMotion) {
    tasks.push(function () {
      var p = clamp(window.scrollY / vh, 0, 1);
      heroSection.style.setProperty('--hero-p', p.toFixed(4));
    });
  }

  /* ==========================================================
     4b. HERO PORTRAIT  —  leans toward the cursor
     Same idea as the reference site: the image tracks the
     pointer. Here it stays anchored beside the name and tilts
     in 3D rather than flying around loose.
     ========================================================== */
  if (portrait && heroSection && finePointer && !reduceMotion) {
    var ptx = 0, pty = 0, pcx = 0, pcy = 0;

    heroSection.addEventListener('pointermove', function (e) {
      var r = heroSection.getBoundingClientRect();
      ptx = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
      pty = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
    }, { passive: true });

    heroSection.addEventListener('pointerleave', function () { ptx = 0; pty = 0; });

    tasks.push(function () {
      pcx = lerp(pcx, ptx, 0.07);
      pcy = lerp(pcy, pty, 0.07);
      /* gentler rotation than a small chip would take — the same
         angle reads as much more extreme on a large panel */
      portrait.style.transform =
        'translate3d(' + (pcx * 22).toFixed(2) + 'px,' + (pcy * 16).toFixed(2) + 'px,0)' +
        ' rotateY(' + (pcx * 11).toFixed(2) + 'deg)' +
        ' rotateX(' + (-pcy * 8).toFixed(2) + 'deg)';
    });
  }

  /* ==========================================================
     4b-ii. PORTRAIT UNMASK
     The cowl sits over the real photo; a radial mask on the photo
     opens around the cursor. CSS owns the radius (so :hover drives
     it and touch devices can opt out wholesale) — JS only reports
     where the pointer is inside the frame.

     Coordinates come from the element's own rect rather than
     offsetX/offsetY, which is unreliable on a 3D-transformed box.
     ========================================================== */
  if (portrait && !reduceMotion) {
    var aimMask = function (clientX, clientY) {
      var r = portrait.getBoundingClientRect();
      portrait.style.setProperty('--mx', (clientX - r.left).toFixed(1) + 'px');
      portrait.style.setProperty('--my', (clientY - r.top).toFixed(1) + 'px');
    };

    if (finePointer) {
      portrait.addEventListener('pointermove', function (e) {
        aimMask(e.clientX, e.clientY);
      }, { passive: true });

    } else {
      /* Touch has no hover, so the mask needs another way in. It
         sweeps itself open the first time it scrolls into view —
         nobody has to guess there is something to tap, and the face
         is seen either way. After that a tap toggles it and a drag
         moves the window. */
      portrait.classList.add('can-unmask');

      var isOpen = false;
      var down = false;
      var toggle = function (on) {
        isOpen = on;
        portrait.classList.toggle('is-open', on);
      };

      var revealed = false;
      tasks.push(function () {
        if (revealed) return;
        var r = portrait.getBoundingClientRect();
        if (r.top < vh * 0.75 && r.bottom > 0) {
          revealed = true;
          aimMask(r.left + r.width / 2, r.top + r.height * 0.34);
          toggle(true);
        }
      });

      portrait.addEventListener('pointerdown', function (e) {
        down = true;
        aimMask(e.clientX, e.clientY);
        toggle(!isOpen);
      });
      portrait.addEventListener('pointermove', function (e) {
        if (down) aimMask(e.clientX, e.clientY);
      }, { passive: true });
      var lift = function () { down = false; };
      portrait.addEventListener('pointerup', lift);
      portrait.addEventListener('pointercancel', lift);
    }
  }

  /* ==========================================================
     4c. VARIABLE-FONT PROXIMITY  —  [data-vft]
     Each letter becomes its own element, then interpolates its
     'wght' and 'wdth' axes by how near the cursor is. The name
     swells under the pointer and settles as it leaves.

     Rects are cached rather than re-read every frame: letters
     physically move as they widen, and measuring the moved
     letter feeds that movement back into its own proximity —
     which makes the whole line jitter.
     ========================================================== */
  /* heavier at rest than on a light page: thin white strokes on
     near-black read optically grey, so the resting weight is lifted
     until the name is unmistakably white. The cursor range stays wide. */
  var REST = { wght: 460, wdth: 93 };
  var HOT  = { wght: 900, wdth: 145 };
  var RADIUS = 190;                       // px of cursor reach

  function axes(w, d) {
    return "'wght' " + Math.round(w) + ", 'wdth' " + d.toFixed(1);
  }

  var vftHost = $('[data-vft]');
  var vftLetters = [];

  if (vftHost) {
    var vi = 0;
    /* snapshot first — we mutate childNodes as we go, and any
       element child (the portrait chip) must survive untouched */
    Array.prototype.slice.call(vftHost.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) return;
      var text = node.textContent.replace(/\s+/g, ' ');
      if (!text.trim() && text !== ' ') return;

      var frag = document.createDocumentFragment();
      text.split('').forEach(function (ch) {
        if (ch === ' ') {
          frag.appendChild(document.createTextNode(' '));
          return;
        }
        var s = document.createElement('span');
        s.className = 'vft-letter';
        s.setAttribute('data-vft-letter', '');
        s.style.setProperty('--i', vi++);
        s.style.fontVariationSettings = axes(REST.wght, REST.wdth);
        s.textContent = ch;
        frag.appendChild(s);
        vftLetters.push(s);
      });
      vftHost.replaceChild(frag, node);
    });
    /* no reveal step here on purpose — the entrance is a pure CSS
       animation off the base style, so the letters can never be
       left hidden if this script stalls or dies */
  }

  if (vftLetters.length && heroSection && finePointer && !reduceMotion) {
    var vRects = null;
    var vMeasuredAt = -1;
    var vPointer = null;
    var vQueued = 0;

    var measureVft = function () {
      vRects = vftLetters.map(function (l) {
        var r = l.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      vMeasuredAt = window.scrollY;
    };

    var applyVft = function () {
      vQueued = 0;
      if (!vPointer) return;
      if (!vRects || window.scrollY !== vMeasuredAt) measureVft();

      for (var i = 0; i < vftLetters.length; i++) {
        var dx = vPointer.x - vRects[i].x;
        var dy = vPointer.y - vRects[i].y;
        var p = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / RADIUS);
        vftLetters[i].style.fontVariationSettings = axes(
          REST.wght + (HOT.wght - REST.wght) * p,
          REST.wdth + (HOT.wdth - REST.wdth) * p
        );
      }
    };

    heroSection.addEventListener('pointerenter', measureVft);

    heroSection.addEventListener('pointermove', function (e) {
      vPointer = { x: e.clientX, y: e.clientY };
      if (!vQueued) vQueued = requestAnimationFrame(applyVft);
    }, { passive: true });

    heroSection.addEventListener('pointerleave', function () {
      vPointer = null;
      if (vQueued) { cancelAnimationFrame(vQueued); vQueued = 0; }
      vftLetters.forEach(function (l) {
        l.style.fontVariationSettings = axes(REST.wght, REST.wdth);
      });
    });

    onResize.push(function () { vRects = null; });
  }

  /* Touch has no cursor to draw the wave with, so it runs itself once
     — a single pass left to right, shortly after the letters have
     finished arriving. One animation, then silence: a continuous loop
     would re-lay-out the whole line every frame, which is exactly the
     kind of thing that makes a cheap phone stutter.

     Rects are measured once up front for the same reason as the
     cursor version: letters move as they widen, and re-measuring a
     moved letter feeds that movement back into its own proximity. */
  if (vftLetters.length && vftHost && !finePointer && !reduceMotion) {
    /* Driven from the frame loop that is already running rather than
       a fresh requestAnimationFrame chain — one loop, one place that
       can stall, and nothing to start up after the fact. */
    /* the clock starts now, not on the first frame — a task that
       needs two frames to get going will never start at all if the
       loop only gets one */
    var swStart = performance.now();
    var swDone = false, swPts = null;
    var swFrom = 0, swSpan = 0, swMid = 0;
    var SW_WAIT = 1200;   // let the letters finish arriving first
    var SW_DUR  = 1500;

    tasks.push(function () {
      if (swDone) return;

      var elapsed = performance.now() - swStart;
      if (elapsed < SW_WAIT) return;

      if (!swPts) {
        /* measured once: letters move as they widen, and re-measuring
           a moved letter feeds that movement back into its own
           proximity, which makes the line wobble */
        swPts = vftLetters.map(function (l) {
          var r = l.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
        var host = vftHost.getBoundingClientRect();
        swFrom = host.left - RADIUS;
        swSpan = host.width + RADIUS * 2;
        swMid = host.top + host.height / 2;
      }

      var t = Math.min(1, (elapsed - SW_WAIT) / SW_DUR);
      var x = swFrom + t * swSpan;

      for (var i = 0; i < vftLetters.length; i++) {
        var dx = x - swPts[i].x;
        var dy = swMid - swPts[i].y;
        var p = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / RADIUS);
        vftLetters[i].style.fontVariationSettings = axes(
          REST.wght + (HOT.wght - REST.wght) * p,
          REST.wdth + (HOT.wdth - REST.wdth) * p
        );
      }

      /* the pass ends past the last letter, so every one lands back
         on REST on its own — no reset needed */
      if (t >= 1) swDone = true;
    });
  }

  /* ==========================================================
     5. PINNED HORIZONTAL WORK REEL
     The section is made tall enough that scrolling through it
     translates the track by exactly its overflow width.
     ========================================================== */
  var reel = $('[data-reel]');
  var reelTrack = $('[data-reel-track]');
  var reelBar = $('[data-reel-bar]');
  var reelCurrent = $('[data-reel-current]');
  var reelDistance = 0;
  var reelPanels = reelTrack ? $$('.panel', reelTrack).length : 0;

  function measureReel() {
    if (!reel || !reelTrack || reduceMotion) return;
    reelTrack.style.transform = 'none';
    reelDistance = Math.max(0, reelTrack.scrollWidth - vw);
    reel.style.height = (vh + reelDistance) + 'px';
  }

  if (reel && reelTrack && !reduceMotion) {
    measureReel();
    onResize.push(measureReel);

    var lastPanel = -1;
    tasks.push(function () {
      if (!reelDistance) return;
      var r = reel.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;

      var p = clamp(-r.top / reelDistance, 0, 1);
      reelTrack.style.transform = 'translate3d(' + (-p * reelDistance).toFixed(2) + 'px,0,0)';

      if (reelBar) reelBar.style.transform = 'scaleX(' + p + ')';

      if (reelCurrent && reelPanels) {
        var n = clamp(Math.round(p * (reelPanels - 1)) + 1, 1, reelPanels);
        if (n !== lastPanel) {
          reelCurrent.textContent = n < 10 ? '0' + n : String(n);
          lastPanel = n;
        }
      }
    });
  }

  /* ==========================================================
     6. EXPERIENCE RAIL  —  line draws itself as you read
     ========================================================== */
  var expSection = $('[data-exp]');
  var expRail = $('[data-exp-rail]');

  if (expSection && expRail && !reduceMotion) {
    tasks.push(function () {
      var r = expSection.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var p = clamp((vh * 0.8 - r.top) / (r.height * 0.75), 0, 1);
      expRail.style.transform = 'scaleY(' + p + ')';
    });
  }

  /* ==========================================================
     7. SCROLL PROGRESS BAR
     ========================================================== */
  var progress = $('#progress');

  if (progress) {
    tasks.push(function () {
      var max = document.documentElement.scrollHeight - vh;
      progress.style.transform = 'scaleX(' + (max > 0 ? clamp(window.scrollY / max, 0, 1) : 0) + ')';
    });
  }

  /* ==========================================================
     8. TICKERS  —  base drift, and they speed up with the scroll
     ========================================================== */
  var tickers = $$('[data-ticker]').map(function (el) {
    return {
      el: el,
      dir: parseFloat(el.getAttribute('data-dir')) || 1,
      offset: 0,
      half: el.scrollWidth / 2
    };
  });

  onResize.push(function () {
    tickers.forEach(function (t) {
      t.el.style.transform = 'none';
      t.half = t.el.scrollWidth / 2;
    });
  });

  var velocity = 0;
  var lastY = window.scrollY;

  if (tickers.length && !reduceMotion) {
    tasks.push(function () {
      tickers.forEach(function (t) {
        if (!t.half) return;
        var speed = (0.4 + Math.min(Math.abs(velocity) * 0.08, 6)) * t.dir;
        t.offset += speed;
        if (t.offset > t.half) t.offset -= t.half;
        if (t.offset < 0) t.offset += t.half;
        t.el.style.transform = 'translate3d(' + (-t.offset).toFixed(2) + 'px,0,0)';
      });
    });
  }

  /* ==========================================================
     9. FADE-IN REVEALS
     Attributes are added here (before first paint, since this
     script is at the end of <body>) so nothing flashes.
     ========================================================== */
  var fadeTargets = $$('.cap, .exp__row, .contact__text, .contact__socials, .manifesto .eyebrow, .caps .eyebrow, .exp .eyebrow, .contact .eyebrow');

  if (!reduceMotion && 'IntersectionObserver' in window) {
    fadeTargets.forEach(function (el) {
      el.setAttribute('data-fade', '');
      /* Arm ONLY what starts below the fold. Anything already on
         screen keeps its visible base style, so it cannot blink
         out — which is what happens if you hide first and reveal
         later. This runs before first paint, so arming does not
         animate. */
      if (el.getBoundingClientRect().top > vh * 0.9) el.classList.add('is-armed');
    });

    /* Reveal from the frame loop rather than an IntersectionObserver.
       The loop is already running for the scroll effects, it cannot
       fail to fire, and elements drop out of the list as they are
       revealed — so this costs a handful of rect reads that shrink
       to nothing. An observer that silently never delivers leaves
       the whole section blank, which is the failure this replaces. */
    var armed = fadeTargets.filter(function (el) {
      return el.classList.contains('is-armed');
    });

    var revealArmed = function () {
      for (var i = armed.length - 1; i >= 0; i--) {
        var r = armed[i].getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) {
          armed[i].classList.remove('is-armed');
          armed.splice(i, 1);
        }
      }
    };

    if (armed.length) {
      tasks.push(revealArmed);
      /* a scroll listener as well as the frame loop: two independent
         paths to the same reveal, so one stalling cannot leave a
         section blank */
      window.addEventListener('scroll', revealArmed, { passive: true });
      revealArmed();
    }
  }

  /* split-text blocks animate when they enter */
  var splitTargets = $$('[data-split]');

  if (!reduceMotion && 'IntersectionObserver' in window) {
    splitTargets.forEach(function (el) {
      if (el.getBoundingClientRect().top > vh * 0.9) el.classList.add('is-armed');
    });

    /* same frame-loop reveal as the fades above */
    var armedSplits = splitTargets.filter(function (el) {
      return el.classList.contains('is-armed');
    });

    var revealSplits = function () {
      for (var i = armedSplits.length - 1; i >= 0; i--) {
        var r = armedSplits[i].getBoundingClientRect();
        if (r.top < vh * 0.88 && r.bottom > 0) {
          armedSplits[i].classList.remove('is-armed');
          armedSplits.splice(i, 1);
        }
      }
    };

    if (armedSplits.length) {
      tasks.push(revealSplits);
      window.addEventListener('scroll', revealSplits, { passive: true });
      revealSplits();
    }
  }

  /* ==========================================================
     10. CURSOR  —  a blend-mode dot that inverts what it covers
     ========================================================== */
  var cursor = $('#cursor');
  var cx = -100, cy = -100, tx = -100, ty = -100;

  if (cursor && finePointer && !reduceMotion) {
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX;
      ty = e.clientY;
      cursor.classList.add('is-active');
    }, { passive: true });

    document.addEventListener('pointerleave', function () {
      cursor.classList.remove('is-active');
    });

    $$('a, button, .cap, [data-magnetic]').forEach(function (el) {
      el.addEventListener('pointerenter', function () { cursor.classList.add('is-hover'); });
      el.addEventListener('pointerleave', function () { cursor.classList.remove('is-hover'); });
    });

    tasks.push(function () {
      cx = lerp(cx, tx, 0.18);
      cy = lerp(cy, ty, 0.18);
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    });
  }

  /* ==========================================================
     11. MAGNETIC ELEMENTS
     ========================================================== */
  if (finePointer && !reduceMotion) {
    $$('[data-magnetic]').forEach(function (el) {
      el.style.transition = 'transform .4s cubic-bezier(.22,1,.36,1)';

      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        el.style.transition = 'transform .1s linear';
        el.style.transform = 'translate(' + mx * 0.25 + 'px,' + my * 0.35 + 'px)';
      });

      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .5s cubic-bezier(.22,1,.36,1)';
        el.style.transform = 'translate(0,0)';
      });
    });
  }

  /* ==========================================================
     12. COPY TO CLIPBOARD
     ========================================================== */
  var toast = $('#toast');
  var toastTimer;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy') ? resolve() : reject();
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-copy');
      copyText(value).then(function () {
        showToast('Copied — ' + value);
        btn.classList.add('is-copied');
        setTimeout(function () { btn.classList.remove('is-copied'); }, 1600);
      }).catch(function () {
        showToast('Press Ctrl+C — ' + value);
      });
    });
  });

  /* ==========================================================
     13. THE LOOP
     ========================================================== */
  function frame() {
    var y = window.scrollY;
    velocity = lerp(velocity, y - lastY, 0.25);
    lastY = y;

    for (var i = 0; i < tasks.length; i++) tasks[i]();
    requestAnimationFrame(frame);
  }

  if (tasks.length) requestAnimationFrame(frame);

  /* ---------------------------------------------- resize ----- */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      vh = window.innerHeight;
      vw = window.innerWidth;
      onResize.forEach(function (fn) { fn(); });
    }, 150);
  });

  /* ------------------------------------------ font reflow ---- */
  /* Every measurement above depends on text width, and text width
     changes the moment the webfonts swap in. Re-run the measure
     pass once they land or the reel scrolls the wrong distance and
     the tickers wrap at the wrong point. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      onResize.forEach(function (fn) { fn(); });
    });
  }

  /* ---------------------------------------------- misc ------- */
  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();

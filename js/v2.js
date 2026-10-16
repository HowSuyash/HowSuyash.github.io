/* =============================================================
   Portfolio, part 2 — the particle portrait
   Vanilla JS, zero dependencies.

   In the order a visitor meets them:
     1. PORTRAIT  the photo rebuilt from ~12k squares on a canvas:
                  they gather on arrival, part around the cursor,
                  and blow away as the hero scrolls off
     2. INTRO     a dot drops, a bar lands on it to make "!", the
                  "!" tips over and knocks the name out letter by
                  letter, and the surname types itself on
     3. NAV       scroll spy, the sliding underline, progress, menu
     4. SCROLL    reveals, word lighting, the stacked project cards,
                  the timeline rail
     5. SMALL     card glow, résumé tilt, count-up, copy

   Everything a visitor reads is in the HTML. Hidden states only
   exist under classes this file adds, and the inline script in
   <head> lifts the intro curtain on its own if this never runs.
   ============================================================= */

(function () {
  'use strict';

  /* --------------------------------------------- helpers ----- */
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var el = function (tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; };

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var vw = window.innerWidth;
  var vh = window.innerHeight;

  var onScroll = [];   // each gets scrollY, once per frame while scrolling
  var onResize = [];

  /* ==========================================================
     1. PORTRAIT  —  [data-particles]

     The cut-out in data-src is drawn at the size of the particle
     grid, and every opaque pixel becomes one square. Its colour
     is a level on a twelve-step ramp from shadow navy to white:
     the photo's brightness, plus a random nudge — the nudge is
     what breaks a smooth photo into the mosaic.

     Squares are bucketed by level before drawing, so fillStyle
     changes twelve times a frame rather than twelve thousand.
     Everything is in device pixels, rounded, so squares stay
     crisp at any pixel ratio.
     ========================================================== */
  var portrait = (function () {
    var canvas = $('[data-particles]');
    var hero = $('[data-hero]');
    if (!canvas || !hero || !canvas.getContext) return null;

    var ctx = canvas.getContext('2d');

    var PALETTE = ['#121829', '#18203a', '#1f2a4b', '#28365e', '#334574', '#40568c',
                   '#5068a6', '#6680c0', '#8399d6', '#a7b7e8', '#d0d9f5', '#ffffff'];
    var LEVELS = PALETTE.length;

    var ROWS_WIDE = 210;     // grid rows across the portrait's height
    var ROWS_NARROW = 140;   // fewer on phones: under half the work
    var REPEL = 120;         // px of cursor reach
    var FORM_MS = 2900;      // longest any particle takes to arrive

    var img = new Image();
    var loaded = false;

    var W = 0, H = 0, dpr = 1;
    var n = 0, size = 2;
    var hx, hy, sx, sy, x, y, vx, vy, base, tw, sdx, sdy, delay, dur, dx, dy, lv, order;
    var counts = new Int32Array(LEVELS);

    var sn = 0, stX, stY, stA, stP, stV, stS;

    var phase = 'idle';          // idle -> forming -> formed
    var formStart = 0;
    var starStart = -1;          // -1: stars not lit yet
    var mx = -1e9, my = -1e9, pointerIn = false, settled = true;
    var scrollP = 0, onscreen = true, raf = 0;

    // roughly normal, sigma ~0.5 — cheap and good enough for a cloud
    function gauss() { return Math.random() + Math.random() + Math.random() - 1.5; }

    function buildStars() {
      sn = Math.round(W * H / (dpr * dpr) / 2600);
      stX = new Float32Array(sn); stY = new Float32Array(sn);
      stA = new Float32Array(sn); stP = new Float32Array(sn);
      stV = new Float32Array(sn); stS = new Uint8Array(sn);
      for (var i = 0; i < sn; i++) {
        stX[i] = Math.random() * W;
        stY[i] = Math.random() * H;
        stA[i] = .1 + Math.pow(Math.random(), 2) * .6;
        stP[i] = Math.random() * 6.283;
        stV[i] = .0006 + Math.random() * .0016;
        stS[i] = Math.max(1, Math.round(dpr * (Math.random() < .86 ? 1 : 1.7)));
      }
    }

    function buildParticles(cw, ch) {
      var aspect = img.naturalWidth / img.naturalHeight;
      var narrow = cw < 700;
      // as tall as the hero allows, but never so wide on a phone that
      // the face leaves the screen
      var ph = Math.min(ch * .98, cw * 1.15 / aspect);
      var rows = narrow ? ROWS_NARROW : ROWS_WIDE;
      var cell = ph / rows;
      var cols = Math.max(1, Math.round(ph * aspect / cell));
      var left = (cw - cols * cell) / 2;
      var top = ch * (narrow ? .12 : .085);

      var off = el('canvas');
      off.width = cols;
      off.height = rows;
      var octx = off.getContext('2d', { willReadFrequently: true });
      // the default 'low' skips pixels on a 2.5x reduction, and the
      // eyes are only a few particles wide — they alias into noise
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(img, 0, 0, cols, rows);
      var px;
      try { px = octx.getImageData(0, 0, cols, rows).data; }
      catch (e) { return; }     // file:// taints the canvas in Chrome; the still <img> stays

      var keep = [];
      for (var r = 0; r < rows; r++) {
        // lit from above: below the chest the figure falls away, so
        // the face carries the picture (and the ID card does not)
        var fr = clamp((r / rows - .42) / .53, 0, 1);
        var light = 1 - .5 * fr * fr * (3 - 2 * fr);
        for (var c = 0; c < cols; c++) {
          var k = (r * cols + c) * 4;
          var a = px[k + 3] / 255;
          // soft mask edges thin out instead of ending in a hard line
          if (a < .4 || Math.random() > a * a + .1) continue;
          var l = px[k] / 255;
          // and shadows go sparse, like the dither in the hair
          if (Math.random() < (1 - l) * .28) continue;
          keep.push(c, r, l * light);
        }
      }

      n = keep.length / 3;
      hx = new Float32Array(n); hy = new Float32Array(n);
      sx = new Float32Array(n); sy = new Float32Array(n);
      x = new Float32Array(n);  y = new Float32Array(n);
      vx = new Float32Array(n); vy = new Float32Array(n);
      dx = new Float32Array(n); dy = new Float32Array(n);
      sdx = new Float32Array(n); sdy = new Float32Array(n);
      base = new Float32Array(n); tw = new Float32Array(n);
      delay = new Float32Array(n); dur = new Float32Array(n);
      lv = new Int8Array(n); order = new Int32Array(n);

      size = Math.max(1, Math.round(cell * .78 * dpr));
      var cx = W / 2;
      var cy = (top + ph * .2) * dpr;      // about where the face is

      for (var i = 0; i < n; i++) {
        var l2 = keep[i * 3 + 2];
        hx[i] = Math.round((left + keep[i * 3] * cell) * dpr);
        hy[i] = Math.round((top + keep[i * 3 + 1] * cell) * dpr);
        x[i] = hx[i];
        y[i] = hy[i];

        // the top is pulled in a step, so even the brightest skin is a
        // mix of white and pale blue rather than a flat white block
        base[i] = l2 * (LEVELS - 1.6) + (Math.random() + Math.random() - 1) * 2.4 + .9;

        // where it flies to as the hero scrolls away: out from the
        // face, and mostly up
        var ang = Math.atan2(hy[i] - cy, hx[i] - cx) + (Math.random() - .5) * 1.4;
        var mag = (.2 + Math.random() * .8) * Math.max(W, H) * .5;
        sdx[i] = Math.cos(ang) * mag;
        sdy[i] = Math.sin(ang) * mag - (.1 + Math.random() * .4) * H;

        // where it starts when the portrait gathers: a loose cloud
        // around the figure. Bright particles arrive first, so the
        // face resolves before the shirt does.
        sx[i] = hx[i] + gauss() * W * .32;
        sy[i] = hy[i] + gauss() * H * .3 - H * .06;
        delay[i] = (1 - l2) * 450 + Math.random() * 850;
        dur[i] = 900 + Math.random() * 700;
      }

      hero.classList.add('has-particles');
    }

    function layout() {
      var r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.width = Math.round(r.width * dpr);
      H = canvas.height = Math.round(r.height * dpr);
      buildStars();
      if (loaded) {
        buildParticles(r.width, r.height);
        // a rebuild mid-gather would restart it; just finish instead
        if (phase === 'forming') phase = 'formed';
      }
      kick();
    }

    function drawStars(now) {
      if (starStart < 0) return;
      var g = reduceMotion ? 1 : clamp((now - starStart) / 1600, 0, 1);
      var shift = scrollP * H * .2;
      ctx.fillStyle = '#fff';
      for (var i = 0; i < sn; i++) {
        var a = stA[i] * g * (reduceMotion ? .8 : .55 + .45 * Math.sin(now * stV[i] + stP[i]));
        if (a < .02) continue;
        ctx.globalAlpha = a;
        ctx.fillRect(stX[i], stY[i] - shift, stS[i], stS[i]);
      }
      ctx.globalAlpha = 1;
    }

    function drawParticles(now) {
      var forming = phase === 'forming';
      var t = now - formStart;
      var s = reduceMotion ? 0 : scrollP;
      var ease = s * s;
      var fade = s * (LEVELS + 1);
      var physics = !forming && !settled;
      var R = REPEL * dpr, R2 = R * R;
      var energy = 0;
      var i, c;

      for (c = 0; c < LEVELS; c++) counts[c] = 0;

      for (i = 0; i < n; i++) {
        var px = x[i], py = y[i], l = base[i];

        if (forming) {
          var k = (t - delay[i]) / dur[i];
          if (k <= 0) { lv[i] = -1; continue; }
          if (k > 1) k = 1;
          var e = 1 - (1 - k) * (1 - k) * (1 - k);
          px = sx[i] + (hx[i] - sx[i]) * e;
          py = sy[i] + (hy[i] - sy[i]) * e;
          l *= .3 + .7 * e;
        } else if (physics) {
          var ddx = px - mx, ddy = py - my, d2 = ddx * ddx + ddy * ddy;
          if (d2 < R2) {
            var d = Math.sqrt(d2) || 1;
            var f = (1 - d / R) * 3.2 * dpr;
            vx[i] += ddx / d * f;
            vy[i] += ddy / d * f;
          }
          vx[i] = (vx[i] + (hx[i] - px) * .05) * .84;
          vy[i] = (vy[i] + (hy[i] - py) * .05) * .84;
          px += vx[i];
          py += vy[i];
          x[i] = px;
          y[i] = py;
          energy += (vx[i] < 0 ? -vx[i] : vx[i]) + (vy[i] < 0 ? -vy[i] : vy[i]);
        }

        if (tw[i] !== 0) {
          l += tw[i];
          tw[i] *= .9;
          if (tw[i] > -.05 && tw[i] < .05) tw[i] = 0;
        }

        if (s > 0) {
          px += sdx[i] * ease;
          py += sdy[i] * ease;
          l -= fade;
        }

        var li = Math.round(l);
        if (li < 0) { lv[i] = -1; continue; }
        if (li >= LEVELS) li = LEVELS - 1;
        lv[i] = li;
        counts[li]++;
        dx[i] = (px + .5) | 0;
        dy[i] = (py + .5) | 0;
      }

      // counting sort by level
      var start = 0;
      for (c = 0; c < LEVELS; c++) { var cnt = counts[c]; counts[c] = start; start += cnt; }
      for (i = 0; i < n; i++) if (lv[i] >= 0) order[counts[lv[i]]++] = i;

      start = 0;
      for (c = 0; c < LEVELS; c++) {
        var end = counts[c];
        if (end > start) {
          ctx.fillStyle = PALETTE[c];
          for (var j = start; j < end; j++) {
            var q = order[j];
            ctx.fillRect(dx[q], dy[q], size, size);
          }
        }
        start = end;
      }

      // shimmer: a handful flare or dip each frame and ease back
      if (!reduceMotion && !forming) {
        for (var m = 0, tn = n * .004; m < tn; m++) {
          tw[(Math.random() * n) | 0] = (Math.random() < .6 ? 2.6 : -3) * (.5 + Math.random());
        }
      }

      if (forming && t > FORM_MS) {
        phase = 'formed';
        for (i = 0; i < n; i++) { x[i] = hx[i]; y[i] = hy[i]; }
      }

      if (physics && !pointerIn && energy < n * .02) {
        settled = true;
        for (i = 0; i < n; i++) { x[i] = hx[i]; y[i] = hy[i]; vx[i] = 0; vy[i] = 0; }
      }
    }

    function loop(now) {
      raf = 0;
      if (!onscreen) return;
      ctx.clearRect(0, 0, W, H);
      drawStars(now);
      if (n && phase !== 'idle') drawParticles(now);
      // nothing to draw until start(); under reduced motion nothing
      // moves, so one frame per change
      var live = starStart >= 0 || phase !== 'idle';
      if (live && (!reduceMotion || phase === 'forming')) raf = requestAnimationFrame(loop);
    }

    function kick() {
      if (!raf && onscreen && W) raf = requestAnimationFrame(loop);
    }

    img.onload = function () { loaded = true; layout(); };
    img.src = canvas.getAttribute('data-src');

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onscreen = entries[0].isIntersecting;
        kick();
      }).observe(hero);
    }

    if (finePointer && !reduceMotion) {
      hero.addEventListener('pointermove', function (e) {
        var r = canvas.getBoundingClientRect();
        mx = (e.clientX - r.left) * dpr;
        my = (e.clientY - r.top) * dpr;
        pointerIn = true;
        settled = false;
        kick();
      });
      hero.addEventListener('pointerleave', function () {
        pointerIn = false;
        mx = my = -1e9;
      });
    }

    layout();

    return {
      hero: hero,
      // the stars come up at once; the particles start gathering
      // after `wait` ms, so they can be held until the title lands
      start: function (wait) {
        if (phase !== 'idle') return;
        starStart = performance.now();
        if (reduceMotion) {
          phase = 'formed';
        } else {
          phase = 'forming';
          formStart = performance.now() + (wait || 0);
        }
        kick();
      },
      setScroll: function (p) {
        if (p === scrollP) return;
        scrollP = p;
        kick();
      },
      layout: layout
    };
  })();

  /* ==========================================================
     2. INTRO  —  [data-intro]

     Timed from one clock with setTimeout, each beat a Web
     Animation. The "!" sits in a slot between SUY and ASH: it
     tips left and the first half pops up off it, swings right
     for the second half, stands, then sinks away and the gap
     closes. The word then becomes TITLE letter by letter —
     here SHUKLA types itself on after SUYASH — and is moved
     onto the real hero title (measured, not guessed) before the
     curtain is removed.

     Any key, click, wheel or touch skips straight to the end.
     ========================================================== */
  function intro(done) {
    var stage = $('[data-intro]');
    var heroWord = $('[data-hero-word]');

    if (!root.classList.contains('is-intro') || !stage || !heroWord || !stage.animate) {
      root.classList.remove('is-intro');
      done();
      return;
    }
    // tells the safety net in <head> that this file has the intro
    root.setAttribute('data-intro', 'run');

    var finished = false;
    var timers = [];
    function at(ms, fn) { timers.push(setTimeout(function () { if (!finished) fn(); }, ms)); }
    function play(node, frames, opts) { opts.fill = 'forwards'; return node.animate(frames, opts); }

    var IN = 'cubic-bezier(.55, 0, 1, .45)';
    var OUT = 'cubic-bezier(0, .55, .45, 1)';
    // must match the hero title's text exactly, as shown (uppercase)
    var TITLE = 'SUYASH SHUKLA';

    /* ---- the stage ---- */
    var bg = el('div', 'intro__bg');
    var word = el('div', 'intro__word');
    var slot = el('span', 'intro__slot');
    var glow = el('span', 'intro__glow');
    var bar = el('span', 'intro__bar');
    var dot = el('span', 'intro__dot');
    var skip = el('button', 'intro__skip');
    skip.type = 'button';
    skip.tabIndex = -1;
    skip.textContent = 'Skip intro';

    function letter(ch) { var s = el('span', 'intro__l'); s.textContent = ch; return s; }
    var first = 'SUY'.split('').map(letter);
    var second = 'ASH'.split('').map(letter);

    slot.appendChild(glow);
    slot.appendChild(bar);
    slot.appendChild(dot);
    first.forEach(function (s) { word.appendChild(s); });
    word.appendChild(slot);
    second.forEach(function (s) { word.appendChild(s); });
    stage.appendChild(bg);
    stage.appendChild(word);
    stage.appendChild(skip);
    stage.classList.add('is-live');

    word.style.fontSize = getComputedStyle(heroWord).fontSize;

    function flash(ms, peak) {
      at(ms, function () {
        play(glow, [{ opacity: 0 }, { opacity: peak, offset: .12 }, { opacity: 0 }],
             { duration: 900, easing: 'ease-out' });
      });
    }

    // a letter knocked up off the bar: lying toward it, then upright
    // with a little overshoot. side is -1 for the left half, 1 for the right.
    function pop(span, ms, side) {
      at(ms, function () {
        play(span, [
          { opacity: 0, transform: 'translateX(' + (-side * .3) + 'em) rotate(' + (side * 82) + 'deg) scale(.35)' },
          { opacity: 1, transform: 'rotate(' + (-side * 9) + 'deg) scale(1.04)', offset: .6 },
          { opacity: 1, transform: 'none' }
        ], { duration: 560, easing: 'cubic-bezier(.2, .75, .25, 1)' });
      });
    }

    function run() {
      var T = 150;

      // 1. the dot drops, bounces once, settles
      at(T, function () {
        play(dot, [
          { transform: 'translateY(-65vh)', easing: IN },
          { transform: 'translateY(0) scale(1.45, .6)', offset: .42, easing: OUT },
          { transform: 'translateY(-.55em) scale(.9, 1.1)', offset: .66, easing: IN },
          { transform: 'translateY(0) scale(1.2, .8)', offset: .86, easing: OUT },
          { transform: 'none' }
        ], { duration: 750 });
      });
      flash(T + 315, .9);
      flash(T + 645, .45);

      // 2. the bar lands on it: "!"
      at(T + 700, function () {
        play(bar, [
          { opacity: 1, transform: 'translateY(-70vh)', easing: IN },
          { opacity: 1, transform: 'translateY(0) scaleY(.8)', offset: .72, easing: OUT },
          { opacity: 1, transform: 'scaleY(1.06)', offset: .86 },
          { opacity: 1, transform: 'none' }
        ], { duration: 400 });
      });
      flash(T + 990, 1);

      at(T + 1110, function () {
        play(bar, [
          { opacity: 1, transform: 'none' },
          { opacity: 1, transform: 'rotate(9deg)', offset: .35 },
          { opacity: 1, transform: 'rotate(-5deg)', offset: .7 },
          { opacity: 1, transform: 'none' }
        ], { duration: 280, easing: 'ease-in-out' });
      });

      // 3. it tips left, and S U Y pop up off it, nearest first
      at(T + 1400, function () {
        play(bar, [
          { opacity: 1, transform: 'rotate(0deg)', easing: 'cubic-bezier(.6, 0, .9, .5)' },
          { opacity: 1, transform: 'rotate(-104deg)', offset: .78, easing: OUT },
          { opacity: 1, transform: 'rotate(-94deg)', offset: .9 },
          { opacity: 1, transform: 'rotate(-98deg)' }
        ], { duration: 380 });
      });
      pop(first[2], T + 1560, -1);
      pop(first[1], T + 1625, -1);
      pop(first[0], T + 1690, -1);

      // 4. swings over, and A S H follow
      at(T + 1820, function () {
        play(bar, [
          { opacity: 1, transform: 'rotate(-98deg)', easing: 'cubic-bezier(.45, 0, .55, 1)' },
          { opacity: 1, transform: 'rotate(104deg)', offset: .8, easing: OUT },
          { opacity: 1, transform: 'rotate(95deg)', offset: .9 },
          { opacity: 1, transform: 'rotate(98deg)' }
        ], { duration: 500 });
      });
      pop(second[0], T + 2080, 1);
      pop(second[1], T + 2145, 1);
      pop(second[2], T + 2210, 1);

      // 5. stands back up, then the "!" sinks away and the gap closes
      at(T + 2320, function () {
        play(bar, [
          { opacity: 1, transform: 'rotate(98deg)', easing: 'cubic-bezier(.5, 0, .5, 1)' },
          { opacity: 1, transform: 'rotate(-8deg)', offset: .72 },
          { opacity: 1, transform: 'rotate(3deg)', offset: .88 },
          { opacity: 1, transform: 'none' }
        ], { duration: 420 });
      });
      at(T + 2800, function () {
        play(bar, [{ opacity: 1, transform: 'none' }, { opacity: 1, transform: 'scaleY(0)' }],
             { duration: 280, easing: IN });
        play(dot, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(.3em) scale(.3)' }],
             { duration: 300, easing: IN });
        play(slot, [{ width: '.3em' }, { width: '0em' }],
             { duration: 360, delay: 140, easing: 'cubic-bezier(.65, 0, .35, 1)' });
      });

      // 6. the word turns into the title one letter at a time. Letters
      //    that already match are left alone, so with the full name as
      //    the title, SUYASH stays put and SHUKLA types itself on.
      var M = T + 3330;
      var letters = first.concat(second);
      var steps = 0;
      TITLE.split('').forEach(function (ch, i) {
        if (letters[i] && letters[i].textContent === ch) return;
        at(M + steps++ * 70, function () {
          var s = letters[i];
          if (s) {
            s.textContent = ch;
          } else {
            s = letter(ch);
            word.appendChild(s);
            letters.push(s);
          }
          play(s, [
            { opacity: .3, transform: 'translateY(-.12em) scaleY(.7)' },
            { opacity: 1, transform: 'none' }
          ], { duration: 220, easing: OUT });
        });
      });

      // 7. one word again — real kerning, one gradient, identical to
      //    the hero title — grows a touch, then moves onto it
      var L = M + steps * 70 + 190;
      at(L, function () {
        word.textContent = TITLE;
        word.classList.add('is-whole');
        play(word, [{ transform: 'scale(.86)' }, { transform: 'none' }],
             { duration: 380, easing: 'cubic-bezier(.3, 1.3, .5, 1)' });
      });

      at(L + 420, function () {
        var a = word.getBoundingClientRect();
        var b = heroWord.getBoundingClientRect();
        var move = play(word, [
          { transform: 'none' },
          { transform: 'translate(' + (b.left - a.left) + 'px, ' + (b.top - a.top) + 'px)' }
        ], { duration: 820, easing: 'cubic-bezier(.75, 0, .2, 1)' });
        play(bg, [{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 250, easing: 'linear' });

        // stars now, particles once the title has all but landed
        if (portrait) portrait.start(650);
        move.onfinish = function () { end(true); };
      });

      // belt and braces: whatever happens, the curtain comes up
      at(L + 3000, function () { end(false); });
    }

    function end(natural) {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      ['pointerdown', 'keydown', 'wheel', 'touchmove'].forEach(function (t) {
        window.removeEventListener(t, onSkip);
      });

      root.classList.remove('is-intro');
      root.removeAttribute('data-intro');

      if (natural) {
        // the word sits exactly on the title now; swap on the next frame
        requestAnimationFrame(function () { stage.remove(); });
      } else {
        stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' })
          .onfinish = function () { stage.remove(); };
      }
      done();
    }

    function onSkip(e) {
      if (e.type === 'keydown' && (e.ctrlKey || e.metaKey || e.altKey)) return;
      end(false);
    }
    ['pointerdown', 'keydown', 'wheel', 'touchmove'].forEach(function (t) {
      window.addEventListener(t, onSkip, { passive: true });
    });

    // the letters are measured against Inter Black; starting before it
    // has loaded would build them in the fallback face
    var go = function () { if (!go.ran) { go.ran = true; run(); } };
    if (document.fonts && document.fonts.load) {
      document.fonts.load('900 1em Inter', 'SUYAHKL').then(go, go);
      setTimeout(go, 1500);
    } else {
      go();
    }
  }

  intro(function () {
    if (portrait) portrait.start(0);
  });

  /* ==========================================================
     3. NAV  —  scroll spy, underline, progress, phone menu
     ========================================================== */
  var nav = $('[data-nav]');
  var navBar = $('[data-nav-bar]');
  var progress = $('[data-progress]');
  var spyLinks = $$('.nav__links a[href^="#"]');
  var spyTargets = spyLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var active = -1;

  function placeBar() {
    var a = spyLinks[active];
    if (!navBar || !a) return;
    navBar.style.width = a.offsetWidth + 'px';
    navBar.style.transform = 'translateX(' + a.offsetLeft + 'px)';
  }

  function setActive(i) {
    if (i === active) return;
    active = i;
    spyLinks.forEach(function (a, k) {
      a.classList.toggle('is-active', k === i);
      if (k === i) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    placeBar();
  }

  if (nav) {
    onScroll.push(function (y) {
      nav.classList.toggle('is-scrolled', y > 24);

      var max = root.scrollHeight - vh;
      if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';

      var cur = 0;
      for (var i = 0; i < spyTargets.length; i++) {
        if (spyTargets[i] && spyTargets[i].getBoundingClientRect().top < vh * .45) cur = i;
      }
      setActive(cur);
    });
    onResize.push(placeBar);
    // the underline is measured off the links, so wait for the font
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeBar);

    var toggle = $('[data-menu-toggle]');
    var setMenu = function (open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.querySelector('.nav__toggle-label').textContent = open ? 'Close' : 'Menu';
      root.style.overflow = open ? 'hidden' : '';
    };
    if (toggle) {
      toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
      $$('.nav__links a').forEach(function (a) {
        a.addEventListener('click', function () { if (nav.classList.contains('is-open')) setMenu(false); });
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
      });
    }
  }

  /* the portrait follows the hero off the top of the screen */
  if (portrait) {
    onScroll.push(function () {
      var r = portrait.hero.getBoundingClientRect();
      portrait.setScroll(clamp(-r.top / (r.height * .75), 0, 1));
    });
    onResize.push(portrait.layout);
  }

  /* ==========================================================
     4. SCROLL
     ========================================================== */

  /* 4a. BIG WORDS  —  [data-bigword]
     One overflow mask per word, one span per letter, so the
     letters can rise out of the mask. A plain copy stays for
     screen readers, which would otherwise spell the word out. */
  $$('[data-bigword]').forEach(function (h) {
    var text = h.textContent.trim();
    var visual = el('span');
    visual.setAttribute('aria-hidden', 'true');
    var i = 0;
    text.split(' ').forEach(function (w, wi) {
      if (wi) visual.appendChild(document.createTextNode(' '));
      var mask = el('span', 'bw');
      w.split('').forEach(function (ch) {
        var s = el('span', 'ch');
        s.textContent = ch;
        s.style.setProperty('--i', i++);
        mask.appendChild(s);
      });
      visual.appendChild(mask);
    });
    var label = el('span', 'sr-only');
    label.textContent = text;
    h.textContent = '';
    h.appendChild(label);
    h.appendChild(visual);
    h.classList.add('is-split');
  });

  /* 4b. REVEALS  —  [data-reveal], [data-bigword]
     Only what starts below the fold is armed (hidden), so nothing
     already on screen can blink out and back. */
  var revealables = $$('[data-reveal], [data-bigword]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        revealObs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px' });

    revealables.forEach(function (node) {
      if (node.getBoundingClientRect().top < vh) return;
      node.classList.add('is-armed');
      revealObs.observe(node);
    });
  }

  /* 4c. WORD LIGHTING  —  [data-words]
     Every word of the paragraph gets a span, walking the tree so
     <b> keeps its weight. They light in order as the block moves
     from the bottom of the screen to a little past the middle. */
  function splitWords(node, out) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 1) { splitWords(child, out); return; }
      if (child.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var s = el('span', 'w');
        s.textContent = part;
        out.push(s);
        frag.appendChild(s);
      });
      node.replaceChild(frag, child);
    });
  }

  if (!reduceMotion) {
    $$('[data-words]').forEach(function (block) {
      var words = [];
      splitWords(block, words);
      var lit = -1;
      block.classList.add('is-armed');
      onScroll.push(function () {
        var r = block.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = clamp((vh * .9 - r.top) / (vh * .55), 0, 1);
        var target = Math.round(p * words.length);
        if (target === lit) return;
        for (var i = 0; i < words.length; i++) words[i].classList.toggle('is-lit', i < target);
        lit = target;
      });
    });
  }

  /* 4d. PROJECT STACK  —  [data-stack]
     The cards are sticky in CSS. Here each one is told how much of
     it the next card covers (0..1), and CSS shrinks and dims it. */
  var cards = $$('[data-stack] > .project');
  if (cards.length > 1 && !reduceMotion) {
    onScroll.push(function () {
      if (vw <= 900) return;
      for (var i = 0; i < cards.length - 1; i++) {
        var a = cards[i].getBoundingClientRect();
        var b = cards[i + 1].getBoundingClientRect();
        var p = clamp((a.bottom - b.top) / a.height, 0, 1);
        cards[i].style.setProperty('--cover', p.toFixed(3));
      }
    });
  }

  /* 4e. TIMELINE  —  [data-timeline]
     The rail fills down to 60% of the viewport, and each row
     lights as the fill passes its dot. */
  var tl = $('[data-timeline]');
  var rail = $('[data-rail]');
  if (tl && rail && !reduceMotion) {
    var rows = $$('.tl__row', tl);
    tl.classList.add('is-armed');
    onScroll.push(function () {
      var r = tl.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      var p = clamp((vh * .6 - r.top) / r.height, 0, 1);
      rail.style.transform = 'scaleY(' + p + ')';
      var reach = r.top + r.height * p;
      rows.forEach(function (row) {
        row.classList.toggle('is-lit', row.getBoundingClientRect().top + 40 < reach);
      });
    });
  }

  /* ==========================================================
     5. SMALL THINGS
     ========================================================== */

  /* 5a. card glow follows the cursor — [data-glow] */
  if (finePointer) {
    $$('[data-glow]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* 5b. the résumé page tilts toward the cursor — [data-tilt] */
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5;
        var py = (e.clientY - r.top) / r.height - .5;
        card.style.setProperty('--rx', (-py * 10).toFixed(2) + 'deg');
        card.style.setProperty('--ry', (px * 12).toFixed(2) + 'deg');
        card.style.setProperty('--gx', ((px + .5) * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', ((py + .5) * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        ['--rx', '--ry', '--gx', '--gy'].forEach(function (p) { card.style.removeProperty(p); });
      });
    });
  }

  /* 5c. numbers count up the first time they are seen — [data-count]
     The real figure is in the HTML; only an armed one starts at 0. */
  if ('IntersectionObserver' in window && !reduceMotion) {
    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        countObs.unobserve(en.target);
        var node = en.target;
        var to = parseFloat(node.getAttribute('data-count'));
        var places = (node.getAttribute('data-count').split('.')[1] || '').length;
        var t0 = performance.now();
        (function tick(now) {
          var k = clamp((now - t0) / 1400, 0, 1);
          node.textContent = (to * (1 - Math.pow(1 - k, 3))).toFixed(places);
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: .6 });

    $$('[data-count]').forEach(function (node) {
      if (node.getBoundingClientRect().top < vh) return;
      node.textContent = (0).toFixed((node.getAttribute('data-count').split('.')[1] || '').length);
      countObs.observe(node);
    });
  }

  /* 5d. copy the address — [data-copy] */
  var toast = $('[data-toast]');
  var toastTimer = 0;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2200);
  }
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { say('Copied — ' + text); },
          function () { say(text); }
        );
      } else {
        say(text);
      }
    });
  });

  var year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  /* ==========================================================
     LOOP
     ========================================================== */
  var ticking = false;
  function runScroll() {
    ticking = false;
    var y = window.scrollY;
    for (var i = 0; i < onScroll.length; i++) onScroll[i](y);
  }
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(runScroll);
  }, { passive: true });

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      // phones fire resize as the URL bar slides; only a real change
      // in width is worth rebuilding twelve thousand particles for
      var widthChanged = window.innerWidth !== vw;
      vw = window.innerWidth;
      vh = window.innerHeight;
      onResize.forEach(function (fn) {
        if (fn !== (portrait && portrait.layout) || widthChanged) fn();
      });
      runScroll();
    }, 150);
  });

  runScroll();
})();

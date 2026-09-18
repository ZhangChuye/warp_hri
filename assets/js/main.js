/* Human Perception of Whole-Body Robot Motion — page interactions.
   Everything here is progressive enhancement: without JS the page is fully readable. */
(() => {
  'use strict';

  document.documentElement.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ------------------------------------------------------------------
     Reveal-on-scroll
     ------------------------------------------------------------------ */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ------------------------------------------------------------------
     Scroll-lit story: words brighten as each statement moves up the screen
     ------------------------------------------------------------------ */
  const ATOMS = '.tok, .grad'; // styled phrases that light up as one unit

  function splitWords(root) {
    root.querySelectorAll(ATOMS).forEach((el) => el.classList.add('w'));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest(ATOMS) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
        } else {
          const span = document.createElement('span');
          span.className = 'w';
          span.textContent = part;
          frag.appendChild(span);
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
    return Array.from(root.querySelectorAll('.w'));
  }

  const beats = Array.from(document.querySelectorAll('[data-lit]')).map((el) => ({
    el,
    words: reduceMotion ? [] : splitWords(el),
    dims: Array.from(el.querySelectorAll('.dim')),
    lit: -1,
  }));
  if (reduceMotion) beats.forEach((b) => b.dims.forEach((d) => d.classList.add('on')));

  const beatsBox = document.querySelector('.beats');
  const railFill = document.querySelector('.beats-fill');

  function updateStory() {
    const vh = window.innerHeight;
    beats.forEach((b) => {
      if (!b.words.length) return;
      const r = b.el.getBoundingClientRect();
      const start = vh * 0.86;               // first word lights when the top reaches here
      const span = vh * 0.34 + r.height;     // ...and the last one this many px later
      const lit = Math.round(clamp((start - r.top) / span, 0, 1) * b.words.length);
      if (lit === b.lit) return;
      b.lit = lit;
      b.words.forEach((w, i) => w.classList.toggle('on', i < lit));
      b.dims.forEach((d) => {
        const ws = d.querySelectorAll('.w');
        d.classList.toggle('on', ws.length > 0 && ws[ws.length - 1].classList.contains('on'));
      });
    });
    if (beatsBox && railFill) {
      const r = beatsBox.getBoundingClientRect();
      railFill.style.transform = `scaleY(${clamp((vh * 0.62 - r.top) / r.height, 0, 1).toFixed(4)})`;
    }
  }

  /* ------------------------------------------------------------------
     Navigation: highlight the section in view
     ------------------------------------------------------------------ */
  const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
  const navTargets = navLinks.map((a) => document.querySelector(a.getAttribute('href')));

  function updateNav() {
    const probe = window.innerHeight * 0.4;
    let current = -1;
    navTargets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= probe) current = i; });
    navLinks.forEach((a, i) => a.classList.toggle('is-current', i === current));
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; updateStory(); updateNav(); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateStory();
  updateNav();

  /* ------------------------------------------------------------------
     Hero: two arms whose hands follow the same path while the elbows differ
     ------------------------------------------------------------------ */
  const armCanvas = document.querySelector('.arm-canvas');
  if (armCanvas && armCanvas.getContext) initArms(armCanvas);

  function initArms(cv) {
    const ctx = cv.getContext('2d');
    const TAU = Math.PI * 2, PERIOD = 9000;
    const VIEW = { x: 112, y: 66, w: 396, h: 406 };  // drawing bounds in design units
    const S = { x: 195, y: 215 };                 // shoulder
    const L1 = 185, L2 = 175;                     // upper arm, forearm
    // Figure-eight hand path, kept well inside the reach so the two elbow branches stay apart.
    const C = { x: 385, y: 385 }, AX = 85, AY = 52, TILT = -0.2;
    const BLUE = '108,176,245', ORANGE = '255,157,92';
    const cosT = Math.cos(TILT), sinT = Math.sin(TILT);

    const wrist = (t) => {
      const x = AX * Math.sin(t), y = AY * Math.sin(2 * t);
      return { x: C.x + x * cosT - y * sinT, y: C.y + x * sinT + y * cosT };
    };
    // Two-link inverse kinematics; sign picks the elbow-down (+1) or elbow-up (-1) branch.
    const elbow = (w, sign) => {
      const dx = w.x - S.x, dy = w.y - S.y;
      const d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
      const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const th = Math.atan2(dy, dx) + sign * a;
      return { x: S.x + L1 * Math.cos(th), y: S.y + L1 * Math.sin(th) };
    };

    const N = 260, locusW = [], locusA = [], locusB = [];
    for (let i = 0; i <= N; i++) {
      const w = wrist((i / N) * TAU);
      locusW.push(w); locusA.push(elbow(w, 1)); locusB.push(elbow(w, -1));
    }

    let k = 1, ox = 0, oy = 0, dpr = 1;
    function resize() {
      const r = cv.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      k = Math.min(cv.width / VIEW.w, cv.height / VIEW.h);
      ox = (cv.width - VIEW.w * k) / 2 - VIEW.x * k;
      oy = (cv.height - VIEW.h * k) / 2 - VIEW.y * k;
    }

    const path = (pts) => {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    };

    function tail(fn, t, rgb, width) {
      const STEPS = 30, DT = 0.034;
      ctx.lineCap = 'round';
      for (let i = 0; i < STEPS; i++) {
        const p = fn(t - i * DT), q = fn(t - (i + 1) * DT);
        ctx.strokeStyle = `rgba(${rgb},${(0.85 * (1 - i / STEPS)).toFixed(3)})`;
        ctx.lineWidth = width * (1 - i / STEPS) + 0.4;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
    }

    function drawArm(e, w, rgb) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = `rgba(${rgb},0.55)`;
      ctx.shadowBlur = 22 * k;
      ctx.strokeStyle = `rgba(${rgb},0.9)`;
      ctx.lineWidth = 13;
      ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(e.x, e.y); ctx.lineTo(w.x, w.y); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(e.x, e.y); ctx.lineTo(w.x, w.y); ctx.stroke();
      ctx.fillStyle = '#0a0c12';
      ctx.beginPath(); ctx.arc(e.x, e.y, 8.5, 0, TAU); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = `rgb(${rgb})`; ctx.stroke();
    }

    function draw(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(k, 0, 0, k, ox, oy);

      // faint body for scale: head + torso
      ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(182, 118, 34, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(145, 168, 80, 280, 38); else ctx.rect(145, 168, 80, 280);
      ctx.fill(); ctx.stroke();

      // full elbow loci and the shared end-effector path
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `rgba(${BLUE},0.22)`; path(locusA); ctx.stroke();
      ctx.strokeStyle = `rgba(${ORANGE},0.22)`; path(locusB); ctx.stroke();
      ctx.setLineDash([5, 7]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      path(locusW); ctx.stroke(); ctx.setLineDash([]);

      // comet tails
      tail((tt) => elbow(wrist(tt), 1), t, BLUE, 3.2);
      tail((tt) => elbow(wrist(tt), -1), t, ORANGE, 3.2);
      tail(wrist, t, '255,255,255', 3.2);

      const w = wrist(t);
      drawArm(elbow(w, -1), w, ORANGE);
      drawArm(elbow(w, 1), w, BLUE);

      // shoulder
      ctx.fillStyle = '#0a0c12';
      ctx.beginPath(); ctx.arc(S.x, S.y, 11, 0, TAU); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(S.x, S.y, 3.5, 0, TAU); ctx.fill();

      // shared hand
      ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 18 * k;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w.x, w.y, 8, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(w.x, w.y, 15, 0, TAU); ctx.stroke();
    }

    const STILL = 5.3; // a phase where the two elbows are clearly apart
    let raf = 0, t0 = 0, phase = STILL;
    const frame = (now) => {
      if (!t0) t0 = now - (STILL / TAU) * PERIOD;
      phase = ((now - t0) / PERIOD) * TAU;
      draw(phase);
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && !reduceMotion) raf = requestAnimationFrame(frame); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; t0 = 0; };

    resize();
    draw(phase);
    window.addEventListener('resize', () => { resize(); draw(phase); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(cv);
    } else {
      start();
    }
  }

  /* ------------------------------------------------------------------
     Comparison video: autoplay in view, chapters, slow motion, fullscreen
     ------------------------------------------------------------------ */
  const video = document.getElementById('cmp-video');
  if (video) initPlayer(video);

  function initPlayer(v) {
    const frameEl = v.closest('.player-frame');
    const playBtn = document.getElementById('cmp-play');
    const speedBtn = document.getElementById('cmp-speed');
    const fullBtn = document.getElementById('cmp-full');
    const chapters = Array.from(document.querySelectorAll('.chapter')).map((el) => ({
      el, a: parseFloat(el.dataset.start), b: parseFloat(el.dataset.end),
    }));
    let userPaused = false;
    let raf = 0;

    const paint = () => {
      const t = v.currentTime;
      chapters.forEach((c) => {
        c.el.style.setProperty('--p', clamp((t - c.a) / (c.b - c.a), 0, 1).toFixed(4));
        c.el.classList.toggle('is-active', t >= c.a - 0.06 && t < c.b);
      });
    };
    const loop = () => { paint(); raf = v.paused ? 0 : requestAnimationFrame(loop); };
    const sync = () => {
      playBtn.classList.toggle('is-playing', !v.paused);
      playBtn.setAttribute('aria-label', v.paused ? 'Play video' : 'Pause video');
      if (!v.paused && !raf) raf = requestAnimationFrame(loop);
      paint();
    };
    const play = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };

    ['play', 'pause', 'seeked', 'loadedmetadata'].forEach((ev) => v.addEventListener(ev, sync));

    const toggle = () => {
      if (v.paused) { userPaused = false; play(); } else { userPaused = true; v.pause(); }
    };
    playBtn.addEventListener('click', toggle);
    v.addEventListener('click', toggle);

    speedBtn.addEventListener('click', () => {
      const slow = v.playbackRate === 1;
      v.playbackRate = slow ? 0.5 : 1;
      speedBtn.textContent = slow ? '0.5×' : '1×';
      speedBtn.setAttribute('aria-pressed', String(slow));
    });

    fullBtn.addEventListener('click', () => {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      if (frameEl.requestFullscreen) frameEl.requestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    });

    chapters.forEach((c) => c.el.addEventListener('click', () => {
      v.currentTime = c.a + 0.02;
      userPaused = false;
      play();
      paint();
    }));

    if ('IntersectionObserver' in window && !reduceMotion) {
      new IntersectionObserver(([e]) => {
        if (e.intersectionRatio >= 0.4) { if (!userPaused && v.paused) play(); }
        else if (!v.paused) v.pause();
      }, { threshold: [0, 0.4] }).observe(frameEl);
    }
    sync();
  }

  /* ------------------------------------------------------------------
     Robot figure: hovering a label, pin or line highlights the same part
     ------------------------------------------------------------------ */
  const stage = document.getElementById('rb-stage');
  if (stage) {
    const linked = Array.from(stage.querySelectorAll('[data-part]'));
    const setActive = (part) => {
      stage.classList.toggle('has-active', Boolean(part));
      linked.forEach((el) => el.classList.toggle('is-on', el.dataset.part === part));
    };
    linked.filter((el) => el.matches('.pin, .rb-part')).forEach((el) => {
      el.addEventListener('mouseenter', () => setActive(el.dataset.part));
      el.addEventListener('mouseleave', () => setActive(null));
      el.addEventListener('focus', () => setActive(el.dataset.part));
      el.addEventListener('blur', () => setActive(null));
      el.addEventListener('click', () => setActive(el.dataset.part));
    });
  }
})();

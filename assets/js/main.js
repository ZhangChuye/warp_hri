/* Human Perception of Whole-Body Robot Motion — page interactions.
   Progressive enhancement only: without JS the cards stack and the video has its native controls. */
(() => {
  'use strict';

  document.documentElement.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Sliding cards: one card per page, driven by swipe, arrows, dots or arrow keys
     ------------------------------------------------------------------ */
  document.querySelectorAll('[data-slider]').forEach((root) => {
    const track = root.querySelector('.slider-track');
    const slides = Array.from(track.children);
    const prev = root.querySelector('.slider-prev');
    const next = root.querySelector('.slider-next');
    const dotsBox = root.querySelector('.slider-dots');
    let current = 0;

    const go = (i) => {
      const k = Math.min(slides.length - 1, Math.max(0, i));
      track.scrollTo({ left: k * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
    };

    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Show card ${i + 1} of ${slides.length}`);
      dot.addEventListener('click', () => go(i));
      dotsBox.appendChild(dot);
      return dot;
    });

    const update = () => {
      current = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
      // aria-disabled rather than disabled, so a focused arrow keeps focus at either end
      prev.setAttribute('aria-disabled', String(current === 0));
      next.setAttribute('aria-disabled', String(current === slides.length - 1));
    };

    let ticking = false;
    track.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    }, { passive: true });

    prev.addEventListener('click', () => go(current - 1));
    next.addEventListener('click', () => go(current + 1));
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      go(current + (e.key === 'ArrowRight' ? 1 : -1));
    });
    window.addEventListener('resize', () => { track.scrollLeft = current * track.clientWidth; });

    update();
  });

  /* ------------------------------------------------------------------
     Comparison video: plays while in view, unless the viewer paused it
     ------------------------------------------------------------------ */
  const video = document.getElementById('cmp-video');
  if (video && 'IntersectionObserver' in window && !reduceMotion) {
    let userPaused = false;
    let autoPausing = false;
    video.addEventListener('pause', () => { if (!autoPausing) userPaused = true; autoPausing = false; });
    video.addEventListener('play', () => { userPaused = false; });

    new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.5) {
        if (!userPaused && video.paused) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
      } else if (!video.paused) {
        autoPausing = true;
        video.pause();
      }
    }, { threshold: [0, 0.5] }).observe(video);
  }

  /* ------------------------------------------------------------------
     Robot figure: hovering a list entry or a marker highlights its counterpart
     ------------------------------------------------------------------ */
  const robot = document.getElementById('robot-figure');
  if (robot) {
    const linked = Array.from(robot.querySelectorAll('[data-part]'));
    const setActive = (part) => linked.forEach((el) => el.classList.toggle('is-on', el.dataset.part === part));
    linked.forEach((el) => {
      el.addEventListener('mouseenter', () => setActive(el.dataset.part));
      el.addEventListener('mouseleave', () => setActive(null));
    });
  }
})();

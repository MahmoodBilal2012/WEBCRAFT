/* WEBCRAFT 3D showcase carousel — dependency-free interaction inspired by React Bits. */
(() => {
  const stage = document.querySelector('[data-ring-stage]');
  const track = document.querySelector('[data-ring-track]');
  if (!stage || !track) return;

  const cards = [...track.querySelectorAll('[data-ring-card]')];
  const prev = document.querySelector('[data-ring-prev]');
  const next = document.querySelector('[data-ring-next]');
  const count = document.querySelector('[data-ring-count]');
  const progress = document.querySelector('[data-ring-progress]');
  if (!cards.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let angle = 0;
  let rotation = 360 / cards.length;
  let radius = 420;
  let active = 0;
  let startX = 0;
  let lastX = 0;
  let pointerDown = false;
  let moved = false;
  let autoplay = null;
  let lastFrame = 0;

  const wrap = (n, max) => ((n % max) + max) % max;

  function measure() {
    const card = cards[0].getBoundingClientRect();
    const width = Math.max(280, stage.clientWidth);
    rotation = 360 / cards.length;
    radius = Math.max(card.width * 0.9, Math.min(width * 0.57, 470));
    layout();
  }

  function layout() {
    cards.forEach((card, index) => {
      const a = index * rotation + angle;
      const rad = a * Math.PI / 180;
      const depth = (Math.cos(rad) + 1) / 2;
      const focused = Math.abs((((a + 180) % 360) + 360) % 360 - 180) < rotation / 2;
      card.style.transform = `translate(-50%,-50%) rotateY(${a}deg) translateZ(${radius}px) scale(${0.82 + depth * 0.18})`;
      card.style.opacity = String(0.28 + depth * 0.72);
      card.style.zIndex = String(Math.round(depth * 100));
      card.style.filter = `brightness(${0.55 + depth * 0.45})`;
      card.style.pointerEvents = depth > 0.12 ? 'auto' : 'none';
      card.setAttribute('aria-current', focused ? 'true' : 'false');
    });
    active = wrap(Math.round(-angle / rotation), cards.length);
    if (count) count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    if (progress) progress.style.width = `${((active + 1) / cards.length) * 100}%`;
  }

  function rotateBy(step) {
    angle -= step * rotation;
    layout();
  }

  function startAutoplay() {
    stopAutoplay();
    if (reduceMotion || document.hidden) return;
    autoplay = window.setInterval(() => {
      if (!pointerDown && !stage.matches(':hover') && !stage.contains(document.activeElement)) rotateBy(1);
    }, 3600);
  }
  function stopAutoplay() {
    if (autoplay) window.clearInterval(autoplay);
    autoplay = null;
  }

  prev?.addEventListener('click', () => { rotateBy(-1); startAutoplay(); });
  next?.addEventListener('click', () => { rotateBy(1); startAutoplay(); });
  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerDown = true;
    moved = false;
    startX = lastX = event.clientX;
    stage.setPointerCapture?.(event.pointerId);
    stopAutoplay();
  });
  stage.addEventListener('pointermove', (event) => {
    if (!pointerDown) return;
    const dx = event.clientX - lastX;
    if (Math.abs(event.clientX - startX) > 5) moved = true;
    angle += dx * 0.22;
    lastX = event.clientX;
    layout();
  });
  function finishDrag() {
    if (!pointerDown) return;
    pointerDown = false;
    if (moved) {
      const snapped = Math.round(angle / rotation) * rotation;
      const from = angle;
      const start = performance.now();
      const duration = reduceMotion ? 0 : 180;
      function snap(now) {
        const t = duration ? Math.min(1, (now - start) / duration) : 1;
        const eased = 1 - Math.pow(1 - t, 3);
        angle = from + (snapped - from) * eased;
        layout();
        if (t < 1) requestAnimationFrame(snap);
      }
      requestAnimationFrame(snap);
    }
    startAutoplay();
  }
  stage.addEventListener('pointerup', finishDrag);
  stage.addEventListener('pointercancel', finishDrag);
  stage.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); rotateBy(-1); startAutoplay(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); rotateBy(1); startAutoplay(); }
    if (event.key === 'Home') { event.preventDefault(); angle = 0; layout(); }
  });
  cards.forEach((card, index) => {
    card.addEventListener('click', () => {
      if (moved) { moved = false; return; }
      const diff = wrap(index - active, cards.length);
      rotateBy(diff > cards.length / 2 ? diff - cards.length : diff);
    });
    card.addEventListener('focus', () => {
      const diff = wrap(index - active, cards.length);
      if (diff) rotateBy(diff > cards.length / 2 ? diff - cards.length : diff);
    });
  });
  document.addEventListener('visibilitychange', () => document.hidden ? stopAutoplay() : startAutoplay());
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stage);
  else window.addEventListener('resize', measure, { passive: true });
  measure();
  startAutoplay();
})();
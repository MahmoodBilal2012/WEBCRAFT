/* WEBCRAFT 3D carousel.
   A dependency-free adaptation of the circular 3D layout pattern shown in
   React Bits, adjusted for this site's static HTML/CSS/JS structure. */
(() => {
  'use strict';

  const stage = document.querySelector('[data-ring-stage]');
  const track = document.querySelector('[data-ring-track]');
  if (!stage || !track) return;

  const cards = Array.from(track.querySelectorAll('[data-ring-card]'));
  const previous = document.querySelector('[data-ring-prev]');
  const next = document.querySelector('[data-ring-next]');
  const counter = document.querySelector('[data-ring-count]');
  const progress = document.querySelector('[data-ring-progress]');
  if (!cards.length) return;

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const count = cards.length;
  const stepAngle = 360 / count;
  const autoplaySpeed = 12; // degrees per second
  const gap = 25;

  let angle = 0;
  let radius = 0;
  let activeIndex = 0;
  let pointerDown = false;
  let pointerMoved = false;
  let pointerStartX = 0;
  let pointerLastX = 0;
  let pointerLastTime = 0;
  let dragVelocity = 0;
  let pressedCardIndex = -1;
  let animationFrame = 0;
  let autoFrame = 0;
  let lastAutoFrame = 0;
  let snapFrame = 0;
  let interactingUntil = 0;

  const wrapIndex = (value, length) => ((value % length) + length) % length;
  const wrapDegrees = value => ((((value + 180) % 360) + 360) % 360) - 180;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  function render() {
    // The track sits one radius behind the camera. The front card is therefore
    // at z=0 rather than directly in front of the camera, preventing huge cards.
    track.style.transform = `translateZ(${-radius}px) rotateY(${angle}deg)`;

    cards.forEach((card, index) => {
      const cardAngle = index * stepAngle;
      const currentAngle = cardAngle + angle;
      const radians = currentAngle * Math.PI / 180;
      const depth = (Math.cos(radians) + 1) / 2;
      const scale = 0.94 + depth * 0.06;

      // Each card is placed once on the ring. The whole ring rotates, keeping
      // card spacing stable and making the left/right cards bend naturally.
      card.style.transform =
        `translate(-50%, -50%) rotateY(${cardAngle}deg) translateZ(${radius}px) scale(${scale})`;
      card.style.opacity = String(0.26 + depth * 0.74);
      card.style.zIndex = String(Math.round(depth * 100));
      card.style.filter = `brightness(${0.58 + depth * 0.42})`;
      card.style.pointerEvents = depth > 0.08 ? 'auto' : 'none';
      card.setAttribute('aria-current', Math.abs(wrapDegrees(currentAngle)) < stepAngle / 2 ? 'true' : 'false');
    });

    activeIndex = wrapIndex(Math.round(-angle / stepAngle), count);
    if (counter) counter.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
    if (progress) progress.style.width = `${((activeIndex + 1) / count) * 100}%`;
  }

  function measure() {
    const cardWidth = cards[0].offsetWidth || 220;
    const idealRadius = (cardWidth + gap) / (2 * Math.sin(Math.PI / count));
    const stageWidth = stage.clientWidth || window.innerWidth;
    radius = Math.max(cardWidth * 0.65, Math.min(idealRadius, stageWidth * 0.6));
    render();
  }

  function cancelSnap() {
    if (snapFrame) cancelAnimationFrame(snapFrame);
    snapFrame = 0;
  }

  function animateTo(targetAngle, duration = 420) {
    cancelSnap();
    const from = angle;
    const delta = targetAngle - from;
    interactingUntil = performance.now() + duration;
    if (prefersReducedMotion || duration <= 0 || Math.abs(delta) < 0.01) {
      angle = targetAngle;
      render();
      return;
    }
    const start = performance.now();
    const animate = now => {
      const t = Math.min(1, (now - start) / duration);
      angle = from + delta * easeOutCubic(t);
      render();
      if (t < 1) snapFrame = requestAnimationFrame(animate);
      else snapFrame = 0;
    };
    snapFrame = requestAnimationFrame(animate);
  }

  function rotateBy(steps) {
    animateTo(angle - steps * stepAngle);
  }

  function goToCard(index) {
    const difference = wrapIndex(index - activeIndex, count);
    const shortest = difference > count / 2 ? difference - count : difference;
    rotateBy(shortest);
  }

  function stopAutoplay() {
    if (autoFrame) cancelAnimationFrame(autoFrame);
    autoFrame = 0;
    lastAutoFrame = 0;
  }

  function autoplayTick(now) {
    if (!lastAutoFrame) lastAutoFrame = now;
    const deltaSeconds = Math.min((now - lastAutoFrame) / 1000, 0.05);
    lastAutoFrame = now;

    const shouldPause =
      document.hidden ||
      pointerDown ||
      stage.matches(':hover') ||
      stage.contains(document.activeElement) ||
      now < interactingUntil;

    if (!shouldPause && !prefersReducedMotion) {
      angle -= autoplaySpeed * deltaSeconds;
      render();
    }
    autoFrame = requestAnimationFrame(autoplayTick);
  }

  function startAutoplay() {
    stopAutoplay();
    if (prefersReducedMotion || document.hidden) return;
    autoFrame = requestAnimationFrame(autoplayTick);
  }

  previous?.addEventListener('click', () => rotateBy(-1));
  next?.addEventListener('click', () => rotateBy(1));

  stage.addEventListener('dragstart', event => event.preventDefault());

  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    cancelSnap();
    pointerDown = true;
    pointerMoved = false;
    pointerStartX = event.clientX;
    pointerLastX = event.clientX;
    pointerLastTime = event.timeStamp;
    dragVelocity = 0;
    pressedCardIndex = cards.indexOf(event.target.closest?.('[data-ring-card]'));
    stopAutoplay();
    try {
      stage.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may be unavailable for synthetic events; dragging still works.
    }
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });

  stage.addEventListener('pointermove', event => {
    if (!pointerDown) return;
    const dx = event.clientX - pointerLastX;
    const elapsed = Math.max(1, event.timeStamp - pointerLastTime);
    if (Math.abs(event.clientX - pointerStartX) > 5) pointerMoved = true;
    angle += dx * 0.22;
    dragVelocity = (dx * 0.22) / elapsed;
    pointerLastX = event.clientX;
    pointerLastTime = event.timeStamp;
    render();
  });

  function finishPointer(event) {
    if (!pointerDown) return;
    pointerDown = false;
    const isNormalRelease = event.type === 'pointerup';

    if (pointerMoved) {
      // A short momentum projection gives a quick swipe a little follow-through,
      // then snapping brings a card back to the central focus position.
      const projectedAngle = angle + Math.max(-80, Math.min(80, dragVelocity * 150 * 0.6));
      animateTo(Math.round(projectedAngle / stepAngle) * stepAngle, 240);
    } else if (isNormalRelease && pressedCardIndex >= 0) {
      goToCard(pressedCardIndex);
    }

    pressedCardIndex = -1;
    startAutoplay();
  }

  stage.addEventListener('pointerup', finishPointer);
  stage.addEventListener('pointercancel', finishPointer);
  stage.addEventListener('lostpointercapture', event => {
    if (pointerDown) finishPointer(event);
  });

  // Keyboard users can focus a card and use the arrow keys to rotate the ring.
  cards.forEach((card, index) => {
    card.addEventListener('click', event => {
      if (event.detail === 0) goToCard(index);
    });
  });

  stage.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      rotateBy(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      rotateBy(1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      animateTo(0);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
  } else {
    window.addEventListener('resize', measure, { passive: true });
  }

  measure();
  startAutoplay();
})();
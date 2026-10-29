/** Desktop-only depth: a passive scroll listener, one frame per scroll burst. */
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const desktop = matchMedia('(min-width: 1025px) and (pointer: fine)');
const hero = document.querySelector<HTMLElement>('.hero');
const portrait = document.querySelector<HTMLElement>('.hero__retrato img');
let frame = 0;
let listening = false;

function paint() {
  frame = 0;
  if (!hero || !portrait) return;
  const rect = hero.getBoundingClientRect();
  // Cap the travel so the image stays within its existing frame.
  const progress = Math.min(1, Math.max(0, -rect.top / rect.height));
  portrait.style.transform = `translateY(${(progress * 26).toFixed(2)}px) scale(1.06)`;
}
function schedule() {
  if (!frame) frame = requestAnimationFrame(paint);
}
function sync() {
  const enabled = !reduced.matches && desktop.matches && !!hero && !!portrait;
  if (enabled && !listening) {
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    listening = true;
  } else if (!enabled && listening) {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    listening = false;
  }
  if (enabled) schedule();
  else {
    cancelAnimationFrame(frame);
    frame = 0;
    portrait?.style.removeProperty('transform');
  }
}
reduced.addEventListener('change', sync);
desktop.addEventListener('change', sync);
window.addEventListener('pageshow', sync);
window.addEventListener('pagehide', () => {
  cancelAnimationFrame(frame);
  frame = 0;
});
sync();

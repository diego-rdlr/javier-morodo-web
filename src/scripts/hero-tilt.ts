/** The portrait follows the pointer by at most two degrees; text stays still. */
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const pointer = matchMedia('(min-width: 1025px) and (hover: hover) and (pointer: fine)');
const header = document.querySelector<HTMLElement>('.hero');
const portrait = document.querySelector<HTMLElement>('.hero__retrato');
let enabled = false;
let frame = 0;
let x = 0;
let y = 0;

function render() {
  frame = 0;
  if (portrait) portrait.style.transform = `perspective(1200px) rotateX(${-y * 2}deg) rotateY(${x * 2}deg)`;
}
function move(event: PointerEvent) {
  if (!header || event.pointerType !== 'mouse') return;
  const rect = header.getBoundingClientRect();
  x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
  y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
  if (!frame) frame = requestAnimationFrame(render);
}
function reset() {
  cancelAnimationFrame(frame);
  frame = 0;
  x = y = 0;
  portrait?.style.removeProperty('transform');
}
function sync() {
  const next = !motion.matches && pointer.matches;
  if (next && !enabled) {
    header?.addEventListener('pointermove', move, { passive: true });
    header?.addEventListener('pointerleave', reset);
  } else if (!next && enabled) {
    header?.removeEventListener('pointermove', move);
    header?.removeEventListener('pointerleave', reset);
    reset();
  }
  enabled = next;
}
motion.addEventListener('change', sync);
pointer.addEventListener('change', sync);
window.addEventListener('blur', reset);
window.addEventListener('pagehide', reset);
sync();

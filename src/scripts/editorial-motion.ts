/** Small, one-shot editorial cues. HTML stays visible if JS fails or is disabled. */
const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
const active = new Map<Element, Animation>();
const seen = new WeakSet<Element>();
const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

function play(element: Element, frames: Keyframe[], duration = 720, delay = 0) {
  if (preference.matches || element.contains(document.activeElement)) return;
  const animation = element.animate(frames, { duration, delay, easing: ease, fill: 'backwards' });
  active.set(element, animation);
  const clear = () => active.delete(element);
  animation.onfinish = clear;
  animation.oncancel = clear;
}

function rise(element: Element, delay = 0) {
  play(element, [
    { opacity: 0, transform: 'translateY(14px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], 720, delay);
}

// The headline is immediately readable. Only its supporting voice settles in.
if (!location.hash && window.scrollY < 40) {
  document.querySelectorAll('.hero__kicker, .hero__bajada, .hero__botones')
    .forEach((element, index) => rise(element, index * 90));
}

// Explicit selection keeps the long page quiet between narrative moments.
const selectors = [
  '.sobre__titulo', '.sobre__dimensiones > li', '.trayectoria__titulo',
  '.hito__tarjeta', '.linea__progreso', '.educacion__intro',
  '.libro__titulo', '.libro__portada-img', '.libro .dimension',
  '.corex__titulo', '.corex__portada-img', '.ecuacion > li',
  '.inversiones__titulo', '.suscripcion__titulo',
];

const observer = new IntersectionObserver((entries) => {
  // Stagger only siblings entering together, never a whole offscreen section.
  const groups = new Map<Element | null, number>();
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const element = entry.target;
    observer.unobserve(element);
    if (seen.has(element)) continue;
    seen.add(element);
    if (preference.matches) continue;
    const parent = element.classList.contains('hito__tarjeta')
      ? element.closest('.linea__hitos') : element.parentElement;
    const index = groups.get(parent) ?? 0;
    groups.set(parent, index + 1);
    if (element.matches('.linea__progreso')) {
      play(element, [
        { transform: 'scaleX(0)', transformOrigin: 'left' },
        { transform: 'scaleX(1)', transformOrigin: 'left' },
      ], 1100);
    } else if (element.matches('.libro__portada-img, .corex__portada-img')) {
      play(element, [
        { opacity: 0.45, transform: 'translateY(18px) scale(0.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ], 950);
    } else {
      rise(element, Math.min(index * 85, 340));
    }
  }
}, { threshold: 0.12 });

document.querySelectorAll(selectors.join(',')).forEach((element) => observer.observe(element));

// Keyboard navigation and live accessibility settings always win over motion.
document.addEventListener('focusin', (event) => {
  for (const [element, animation] of active) {
    if (event.target instanceof Node && element.contains(event.target)) animation.cancel();
  }
});
preference.addEventListener('change', () => {
  if (preference.matches) active.forEach((animation) => animation.cancel());
});
window.addEventListener('pagehide', () => {
  active.forEach((animation) => animation.cancel());
});

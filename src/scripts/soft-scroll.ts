import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let scroll: Lenis | undefined;

function destroy() {
  scroll?.destroy();
  scroll = undefined;
}

function init() {
  if (reduced.matches) {
    destroy();
    return;
  }
  // One instance, including when returning through the browser's back/forward cache.
  scroll ??= new Lenis({
    autoRaf: true,
    lerp: 0.09,
    smoothWheel: true,
    syncTouch: false,
    anchors: { duration: 0.85 },
    respectReducedMotion: true,
  });
}

reduced.addEventListener('change', init);
window.addEventListener('pagehide', destroy);
window.addEventListener('pageshow', init);
init();

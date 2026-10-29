import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
const source = stripTypeScriptTypes(readFileSync(new URL('../src/scripts/hero-depth.ts', import.meta.url), 'utf8'));
function setup({ reduced = false, desktop = true } = {}) {
  const events = new Map();
  const frames = new Map();
  let id = 0;
  const media = [reduced, desktop].map(matches => ({ matches, addEventListener(_, fn) { this.change = fn; } }));
  const style = { removeProperty(name) { delete this[name]; } };
  runInNewContext(source, {
    matchMedia: query => query.includes('reduced') ? media[0] : media[1],
    document: { querySelector: selector => selector === '.hero' ? { getBoundingClientRect: () => ({ top: -500, height: 1000 }) } : { style } },
    window: { addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) },
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  return { events, frames, media, style, flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); } };
}
test('depth is disabled on touch-sized screens and with reduced motion', () => {
  for (const options of [{ desktop: false }, { reduced: true }]) {
    const scene = setup(options);
    assert.equal(scene.events.has('scroll'), false);
    assert.equal(scene.frames.size, 0);
    assert.equal(scene.style.transform, undefined);
  }
});
test('scroll bursts use one frame and live preference removes depth and listeners', () => {
  const scene = setup();
  scene.events.get('scroll')();
  scene.events.get('scroll')();
  assert.equal(scene.frames.size, 1);
  scene.flush();
  assert.equal(scene.style.transform, 'translateY(13.00px) scale(1.06)');
  scene.media[0].matches = true;
  scene.media[0].change();
  assert.equal(scene.events.has('scroll'), false);
  assert.equal(scene.style.transform, undefined);
});

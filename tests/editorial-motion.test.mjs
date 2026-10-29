import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

const source = stripTypeScriptTypes(readFileSync(new URL('../src/scripts/editorial-motion.ts', import.meta.url), 'utf8'));

function setup({ reduced = false, hash = '' } = {}) {
  const listeners = {};
  const animations = [];
  const preference = { matches: reduced, addEventListener: (_, fn) => { listeners.preference = fn; } };
  class Element {
    parentElement = null;
    classList = { contains: () => false };
    contains(node) { return this === node; }
    matches() { return false; }
    animate(frames, options) {
      const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; this.oncancel?.(); } };
      animations.push(animation);
      return animation;
    }
  }
  const hero = new Element();
  const heading = new Element();
  let observer;
  const document = {
    activeElement: null,
    querySelectorAll: selector => selector.startsWith('.hero') ? [hero] : [heading],
    addEventListener: (type, fn) => { listeners[type] = fn; },
  };
  runInNewContext(source, {
    window: { matchMedia: () => preference, scrollY: 0, addEventListener: (type, fn) => { listeners[type] = fn; } },
    location: { hash }, document, Node: Element,
    IntersectionObserver: class {
      constructor(callback) { observer = callback; }
      observe() {}
      unobserve() {}
    },
  });
  return { animations, preference, listeners, heading, hero, enter: () => observer([{ target: heading, isIntersecting: true }]) };
}

test('reduced motion keeps initial and scrolled content static', () => {
  const scene = setup({ reduced: true });
  scene.enter();
  assert.equal(scene.animations.length, 0);
});

test('scroll cues play once and never retain a hidden end state', () => {
  const scene = setup({ hash: '#libro' });
  assert.equal(scene.animations.length, 0);
  scene.enter();
  scene.enter();
  assert.equal(scene.animations.length, 1);
  assert.equal(scene.animations[0].options.fill, 'backwards');
  assert.equal(scene.animations[0].frames.at(-1).opacity, 1);
});

test('changing the motion preference cancels active animation', () => {
  const scene = setup();
  scene.enter();
  scene.preference.matches = true;
  scene.listeners.preference();
  assert.ok(scene.animations.every(animation => animation.cancelled));
});

test('keyboard focus immediately reveals its animated container', () => {
  const scene = setup();
  scene.listeners.focusin({ target: scene.hero });
  assert.equal(scene.animations[0].cancelled, true);
});

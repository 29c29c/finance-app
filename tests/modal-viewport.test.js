const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { window: { FinanceUI: {} } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/assets/modal-viewport.js'), 'utf8'), context);
const { bindModalViewport } = context.window.FinanceUI;

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    dispatch(name) { for (const fn of listeners.get(name) || []) fn(); },
    count() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
  };
}

function fixture(withVisualViewport = true) {
  const viewport = Object.assign(eventTarget(), { height: 844, width: 390, offsetTop: 0, offsetLeft: 0 });
  const frames = new Map();
  let frameId = 0;
  const environment = Object.assign(eventTarget(), {
    innerHeight: 844,
    innerWidth: 390,
    document: { activeElement: null },
    visualViewport: withVisualViewport ? viewport : undefined,
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  const values = new Map();
  const overlay = { dataset: {}, style: { setProperty(key, value) { values.set(key, value); } } };
  const input = { matches: () => true, getBoundingClientRect: () => ({ top: 450, bottom: 498 }) };
  const scroller = Object.assign(eventTarget(), {
    scrollTop: 0,
    contains: element => element === input,
    getBoundingClientRect: () => ({ top: 150, bottom: 460 }),
  });
  let scrollTop = 0;
  Object.defineProperty(scroller, 'scrollTop', { get: () => scrollTop, set: value => { scrollTop = Math.max(0, value); } });
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); };
  return { environment, viewport, overlay, scroller, input, values, frames, flush };
}

test('keyboard shrinks only the visual viewport: modal uses visible height and pan offset', () => {
  const f = fixture();
  const cleanup = bindModalViewport(f.overlay, f.scroller, f.environment);
  f.flush();
  f.viewport.height = 480;
  f.viewport.offsetTop = 64;
  f.viewport.offsetLeft = 5;
  f.viewport.width = 385;
  f.viewport.dispatch('resize');
  f.viewport.dispatch('scroll');
  assert.equal(f.frames.size, 1, 'resize and pan updates share one animation frame');
  assert.equal(f.values.get('--modal-viewport-height'), '480px', 'keyboard bounds update even before animation frames resume');
  assert.equal(f.values.get('--modal-viewport-top'), '64px');
  f.flush();
  assert.equal(f.environment.innerHeight, 844, 'layout viewport remains unchanged');
  assert.equal(f.values.get('--modal-viewport-height'), '480px');
  assert.equal(f.values.get('--modal-viewport-top'), '64px');
  assert.equal(f.values.get('--modal-viewport-left'), '5px');
  assert.equal(f.values.get('--modal-viewport-width'), '385px');
  f.viewport.height = 340; f.viewport.dispatch('resize'); f.flush();
  assert.equal(f.overlay.dataset.compact, 'true', 'short visible areas use a compact header');
  f.viewport.height = 844; f.viewport.offsetTop = 0; f.viewport.dispatch('resize'); f.flush();
  assert.equal(f.values.get('--modal-viewport-height'), '844px');
  assert.equal(f.values.get('--modal-viewport-top'), '0px');
  assert.equal(f.overlay.dataset.compact, 'false');
  cleanup();
});

test('focus and keyboard resize reveal a field by scrolling only the form', () => {
  const f = fixture();
  const cleanup = bindModalViewport(f.overlay, f.scroller, f.environment);
  f.flush();
  f.environment.document.activeElement = f.input;
  f.scroller.dispatch('focusin'); f.flush();
  assert.equal(f.scroller.scrollTop, 50);
  f.input.getBoundingClientRect = () => ({ top: 100, bottom: 148 });
  f.viewport.dispatch('resize'); f.flush();
  assert.equal(f.scroller.scrollTop, 0);
  f.environment.document.activeElement = { matches: () => false };
  f.viewport.dispatch('resize'); f.flush();
  assert.equal(f.scroller.scrollTop, 0, 'unrelated focus does not scroll the form');
  cleanup();
});

test('fallback browsers use innerHeight and update on window resize', () => {
  const f = fixture(false);
  const cleanup = bindModalViewport(f.overlay, f.scroller, f.environment);
  f.flush(); f.environment.innerHeight = 420; f.environment.dispatch('resize'); f.flush();
  assert.equal(f.values.get('--modal-viewport-height'), '420px');
  assert.equal(f.values.get('--modal-viewport-top'), '0px');
  cleanup();
});

test('closing a modal removes viewport/focus listeners and cancels pending work', () => {
  const f = fixture();
  const cleanup = bindModalViewport(f.overlay, f.scroller, f.environment);
  assert.equal(f.frames.size, 1);
  cleanup();
  assert.equal(f.frames.size, 0);
  assert.equal(f.viewport.count(), 0);
  assert.equal(f.environment.count(), 0);
  assert.equal(f.scroller.count(), 0);
  f.viewport.dispatch('resize'); f.scroller.dispatch('focusin'); f.environment.dispatch('resize');
  assert.equal(f.frames.size, 0);
});

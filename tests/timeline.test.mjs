import test from 'node:test';
import assert from 'node:assert/strict';

import { createTimeline } from '../classical-cipher-lab/js/visualizers/timeline.js';

function fakeClock() {
  let nextId = 1;
  const callbacks = new Map();
  const cleared = [];
  return {
    setTimer(callback, delay) { const id = nextId++; callbacks.set(id, { callback, delay }); return id; },
    clearTimer(id) { cleared.push(id); callbacks.delete(id); },
    tick(id = [...callbacks.keys()][0]) { callbacks.get(id)?.callback(); },
    callbacks,
    cleared
  };
}

test('timeline loads steps and respects next/previous bounds', () => {
  const timeline = createTimeline(() => {});
  assert.deepEqual(timeline.getState(), { status: 'idle', index: -1, total: 0, speed: 900, step: null });
  timeline.load([{ id: 1 }, { id: 2 }]);
  assert.equal(timeline.getState().index, 0);
  timeline.previous();
  assert.equal(timeline.getState().index, 0);
  timeline.next();
  timeline.next();
  assert.equal(timeline.getState().index, 1);
  assert.equal(timeline.getState().status, 'complete');
});

test('timeline play advances and pauses at completion', () => {
  const clock = fakeClock();
  const timeline = createTimeline(() => {}, clock);
  timeline.load([{ id: 1 }, { id: 2 }]);
  timeline.play();
  assert.equal(timeline.getState().status, 'playing');
  clock.tick();
  assert.equal(timeline.getState().index, 1);
  clock.tick();
  assert.equal(timeline.getState().status, 'complete');
  assert.equal(clock.callbacks.size, 0);
});

test('speed changes restart a running timer and reset cancels it', () => {
  const clock = fakeClock();
  const timeline = createTimeline(() => {}, clock);
  timeline.load([{ id: 1 }, { id: 2 }]);
  timeline.play();
  const firstId = [...clock.callbacks.keys()][0];
  timeline.setSpeed(300);
  assert.ok(clock.cleared.includes(firstId));
  assert.equal([...clock.callbacks.values()][0].delay, 300);
  timeline.reset();
  assert.equal(clock.callbacks.size, 0);
  assert.equal(timeline.getState().index, 0);
  assert.equal(timeline.getState().status, 'ready');
});

test('loading new steps cancels playback from the previous route', () => {
  const clock = fakeClock();
  const timeline = createTimeline(() => {}, clock);
  timeline.load([{ id: 'old-1' }, { id: 'old-2' }]);
  timeline.play();
  const oldTimer = [...clock.callbacks.keys()][0];
  timeline.load([{ id: 'new' }]);
  assert.ok(clock.cleared.includes(oldTimer));
  assert.equal(timeline.getState().step.id, 'new');
  assert.equal(timeline.getState().status, 'ready');
});

test('switching away from a 256-step animation cancels stale playback', () => {
  const clock = fakeClock();
  const timeline = createTimeline(() => {}, clock);
  timeline.load(Array.from({ length: 256 }, (_, id) => ({ id })));
  timeline.play();
  const staleTimer = [...clock.callbacks.keys()][0];
  timeline.load([{ id: 'next-route' }]);
  assert.ok(clock.cleared.includes(staleTimer));
  assert.equal(clock.callbacks.size, 0);
  assert.equal(timeline.getState().step.id, 'next-route');
});

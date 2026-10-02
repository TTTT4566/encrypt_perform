export function createTimeline(onChange, clock = {}) {
  const setTimer = clock.setTimer ?? ((callback, delay) => globalThis.setInterval(callback, delay));
  const clearTimer = clock.clearTimer ?? ((id) => globalThis.clearInterval(id));
  let steps = [];
  let index = -1;
  let status = 'idle';
  let speed = 900;
  let timer = null;

  const snapshot = () => ({ status, index, total: steps.length, speed, step: index >= 0 ? steps[index] : null });
  const emit = () => onChange(snapshot());
  const stopTimer = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  function load(nextSteps) {
    stopTimer();
    steps = Array.isArray(nextSteps) ? nextSteps.slice() : [];
    index = steps.length ? 0 : -1;
    status = steps.length ? 'ready' : 'idle';
    emit();
  }

  function next() {
    if (!steps.length) return;
    if (index < steps.length - 1) index += 1;
    if (index >= steps.length - 1) {
      status = 'complete';
      stopTimer();
    }
    emit();
  }

  function previous() {
    if (!steps.length) return;
    stopTimer();
    index = Math.max(0, index - 1);
    status = 'paused';
    emit();
  }

  function play() {
    if (!steps.length) return;
    if (status === 'complete') index = 0;
    stopTimer();
    status = 'playing';
    timer = setTimer(next, speed);
    emit();
  }

  function pause() {
    if (!steps.length) return;
    stopTimer();
    status = 'paused';
    emit();
  }

  function reset() {
    stopTimer();
    index = steps.length ? 0 : -1;
    status = steps.length ? 'ready' : 'idle';
    emit();
  }

  function setSpeed(nextSpeed) {
    speed = Math.max(150, Number(nextSpeed) || 900);
    if (status === 'playing') {
      stopTimer();
      timer = setTimer(next, speed);
    }
    emit();
  }

  return { load, next, previous, play, pause, reset, setSpeed, getState: snapshot };
}

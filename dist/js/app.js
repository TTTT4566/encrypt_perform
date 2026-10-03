import { algorithms, getAlgorithm } from './catalog.js';
import { renderAlgorithmPage, renderIntro, renderStep } from './visualizers/renderer.js';
import { createTimeline } from './visualizers/timeline.js';

const main = document.querySelector('#main-content');
const crumb = document.querySelector('#crumb-current');
const sidebar = document.querySelector('#sidebar');
const backdrop = document.querySelector('#backdrop');
const menuButton = document.querySelector('#menu-button');
const toast = document.querySelector('#toast');
let activeAlgorithm = null;
let activeResult = null;
let toastTimer = null;

const timeline = createTimeline((state) => {
  const stage = document.querySelector('#visual-stage');
  if (stage) stage.innerHTML = renderStep(state);
  const play = document.querySelector('[data-action="play"]');
  if (play) {
    const label = state.status === 'playing' ? '暂停' : state.status === 'complete' ? '重播' : '播放';
    play.querySelector('span').textContent = label;
    play.classList.toggle('is-playing', state.status === 'playing');
  }
  const previous = document.querySelector('[data-action="previous"]');
  const next = document.querySelector('[data-action="next"]');
  if (previous) previous.disabled = state.index <= 0;
  if (next) next.disabled = state.index < 0 || state.index >= state.total - 1;
});

function modesFor(meta) {
  return Array.isArray(meta.modes) && meta.modes.length ? meta.modes : ['encrypt', 'decrypt'];
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function setDrawer(open) {
  sidebar.classList.toggle('open', open);
  backdrop.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  if (!open && document.activeElement?.closest('.sidebar')) menuButton.focus();
}

function routeId() { return location.hash.replace('#', '') || 'intro'; }

function updateNavigation(id) {
  document.querySelectorAll('.nav-link').forEach((link) => {
    const active = link.dataset.route === id;
    link.classList.toggle('active', active);
    active ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current');
  });
}

function collectKey(form) {
  const key = {};
  const preserve = form.elements.preserve;
  if (preserve) key.preserve = preserve.checked;
  for (const field of activeAlgorithm.meta.keyFields ?? []) {
    const control = form.elements[field.name];
    key[field.name] = field.type === 'number' ? Number(control.value) : control.value;
  }
  if (activeAlgorithm.meta.id === 'hill') key.matrix = [[key.m00, key.m01], [key.m10, key.m11]];
  return key;
}

function setResult(result, mode) {
  activeResult = result;
  const strip = document.querySelector('#result-strip');
  const detail = document.querySelector('#result-detail');
  strip.hidden = false;
  document.querySelector('#result-label').textContent = mode === 'hash' ? '摘要结果' : mode === 'encrypt' ? '加密结果' : '解密结果';
  document.querySelector('#result-output').textContent = result.output;
  detail.textContent = mode === 'decrypt' ? result.resultDetail ?? '' : '';
  detail.hidden = !detail.textContent;
}

function runExperiment() {
  const form = document.querySelector('#cipher-form');
  const error = document.querySelector('#form-error');
  error.textContent = '';
  try {
    const mode = form.elements.mode.value;
    const operation = activeAlgorithm[mode];
    if (typeof operation !== 'function') throw new Error('当前算法不支持该运算模式');
    const result = operation(form.elements.input.value, collectKey(form));
    setResult(result, mode);
    timeline.load(result.steps);
  } catch (reason) {
    activeResult = null;
    timeline.load([]);
    document.querySelector('#result-strip').hidden = true;
    error.textContent = reason instanceof Error ? reason.message : '参数无法处理，请检查输入。';
  }
}

function setMode(mode) {
  const form = document.querySelector('#cipher-form');
  form.elements.mode.value = mode;
  document.querySelectorAll('.mode-button').forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('#message-label').textContent = mode === 'hash' ? '摘要内容' : mode === 'encrypt' ? '明文' : '密文';
  document.querySelectorAll('[data-key-label]').forEach((label) => {
    const modeLabel = label.getAttribute(`data-label-${mode}`);
    if (modeLabel) label.textContent = modeLabel;
  });
  const runLabel = document.querySelector('[data-action="run"] span');
  if (runLabel) runLabel.textContent = mode === 'hash' ? '生成摘要' : '运行实验';
  runExperiment();
}

function loadPreset() {
  const form = document.querySelector('#cipher-form');
  const defaults = activeAlgorithm.meta.defaults;
  form.elements.input.value = defaults.input;
  if (form.elements.preserve) form.elements.preserve.checked = Boolean(defaults.preserve);
  for (const field of activeAlgorithm.meta.keyFields ?? []) {
    form.elements[field.name].value = defaults[field.name] ?? defaults.key?.[field.name] ?? field.value;
  }
  setMode(modesFor(activeAlgorithm.meta)[0]);
  showToast('已载入教材示例');
}

function bindWorkbench() {
  const form = document.querySelector('#cipher-form');
  form.addEventListener('submit', (event) => { event.preventDefault(); runExperiment(); });
  document.querySelectorAll('.mode-button').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  document.querySelector('[data-action="preset"]').addEventListener('click', loadPreset);
  document.querySelector('[data-action="previous"]').addEventListener('click', timeline.previous);
  document.querySelector('[data-action="next"]').addEventListener('click', timeline.next);
  document.querySelector('[data-action="reset"]').addEventListener('click', timeline.reset);
  document.querySelector('[data-action="play"]').addEventListener('click', () => timeline.getState().status === 'playing' ? timeline.pause() : timeline.play());
  const speed = document.querySelector('[name="speed"]');
  speed.addEventListener('input', () => {
    const delay = 1680 - Number(speed.value);
    timeline.setSpeed(delay);
    speed.nextElementSibling.textContent = `${(900 / delay).toFixed(1)}×`;
  });
  document.querySelector('[data-action="copy"]').addEventListener('click', async () => {
    if (!activeResult) return;
    try { await navigator.clipboard.writeText(activeResult.output); showToast('结果已复制'); }
    catch { showToast('复制失败，请手动选择结果'); }
  });
  form.addEventListener('input', (event) => {
    if (event.target.matches('textarea, input:not([name="mode"])')) {
      timeline.load([]);
      document.querySelector('#result-strip').hidden = true;
      document.querySelector('#form-error').textContent = '参数已修改，请重新运行实验。';
    }
  });
  runExperiment();
}

function renderRoute() {
  timeline.load([]);
  const id = routeId();
  activeAlgorithm = getAlgorithm(id);
  activeResult = null;
  const route = activeAlgorithm ? id : 'intro';
  updateNavigation(route);
  crumb.textContent = activeAlgorithm?.meta.title ?? '开始学习';
  main.innerHTML = activeAlgorithm ? renderAlgorithmPage(activeAlgorithm) : renderIntro(algorithms);
  if (activeAlgorithm) bindWorkbench();
  setDrawer(false);
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'auto' });
}

menuButton.addEventListener('click', () => setDrawer(!sidebar.classList.contains('open')));
backdrop.addEventListener('click', () => setDrawer(false));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setDrawer(false); });
sidebar.addEventListener('click', (event) => { if (event.target.closest('a')) setDrawer(false); });
window.addEventListener('hashchange', renderRoute);
renderRoute();

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function icon(name) {
  const paths = {
    play: '<path d="m8 5 11 7-11 7z"/>',
    pause: '<path d="M8 5h3v14H8zm5 0h3v14h-3z"/>',
    previous: '<path d="M7 5v14M18 6l-8 6 8 6z"/>',
    next: '<path d="M17 5v14M6 6l8 6-8 6z"/>',
    reset: '<path d="M4 12a8 8 0 1 0 3-6.2L4 8m0-5v5h5"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? ''}</svg>`;
}

export function renderIntro(algorithms) {
  const cards = algorithms.map(({ meta }) => `
    <a class="algorithm-card" href="#${meta.id}">
      <div class="card-index">${meta.code}</div>
      <div class="card-copy"><span>${escapeHtml(meta.category)}</span><h2>${escapeHtml(meta.title)}</h2><p>${escapeHtml(meta.summary)}</p></div>
      <span class="card-open" aria-hidden="true">↗</span>
    </a>`).join('');
  return `
    <section class="intro-page">
      <div class="eyebrow"><span></span>CLASSICAL CRYPTOGRAPHY</div>
      <div class="intro-heading">
        <div><h1>从凯撒位移到机械转轮</h1><p>选择一个算法，修改明文和密钥，然后逐步观察字符如何被变换。每个实验都可以反向解密。</p></div>
        <div class="intro-count"><strong>08</strong><span>交互实验</span></div>
      </div>
      <div class="learning-path"><strong>建议路径</strong><span>替代规则</span><i></i><span>矩阵与置换</span><i></i><span>密钥流与机械结构</span></div>
      <div class="algorithm-grid">${cards}</div>
      <aside class="info-callout"><strong>开始前请注意</strong><p>这里使用较小、直观的参数帮助理解原理。所有实现仅用于教学，不适用于真实安全通信。</p></aside>
    </section>`;
}

function renderKeyFields(meta) {
  return meta.keyFields.map((field) => `
    <label class="field ${meta.id === 'hill' ? 'field-compact' : ''}">
      <span>${escapeHtml(field.label)}</span>
      <input name="${escapeHtml(field.name)}" type="${field.type}" value="${escapeHtml(field.value)}"
        ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.max !== undefined ? `max="${field.max}"` : ''}
        ${field.maxlength ? `maxlength="${field.maxlength}"` : ''} ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ''} />
    </label>`).join('');
}

export function renderAlgorithmPage(algorithm) {
  const { meta } = algorithm;
  return `
    <article class="algorithm-page" data-algorithm="${meta.id}">
      <header class="algorithm-header">
        <div>
          <div class="eyebrow"><span></span>${escapeHtml(meta.category)} · EXPERIMENT ${meta.code}</div>
          <h1>${escapeHtml(meta.title)}</h1>
          <p>${escapeHtml(meta.summary)}</p>
        </div>
        <div class="formula-card"><span>核心规则</span><code>${escapeHtml(meta.formula)}</code></div>
      </header>

      <section class="workbench" aria-label="${escapeHtml(meta.title)}实验台">
        <form class="control-panel" id="cipher-form" novalidate>
          <div class="panel-heading"><span>${icon('flask')}</span><div><strong>实验参数</strong><small>修改后重新运行</small></div></div>
          <div class="mode-switch" role="group" aria-label="运算模式">
            <button type="button" class="mode-button active" data-mode="encrypt">加密</button>
            <button type="button" class="mode-button" data-mode="decrypt">解密</button>
            <input type="hidden" name="mode" value="encrypt" />
          </div>
          <label class="field field-message"><span id="message-label">明文</span><textarea name="input" rows="4" spellcheck="false">${escapeHtml(meta.defaults.input)}</textarea></label>
          <div class="key-fields ${meta.id === 'hill' ? 'matrix-fields' : ''}">${renderKeyFields(meta)}</div>
          <label class="check-field"><input type="checkbox" name="preserve" ${meta.defaults.preserve ? 'checked' : ''}/><span>保留空格、数字和标点</span></label>
          <p class="form-error" id="form-error" role="alert"></p>
          <div class="primary-actions">
            <button class="primary-button" type="submit" data-action="run">${icon('play')}运行实验</button>
            <button class="secondary-button" type="button" data-action="preset">载入示例</button>
          </div>
        </form>

        <div class="stage-panel">
          <div class="stage-toolbar">
            <div class="timeline-actions">
              <button type="button" class="tool-button" data-action="previous" aria-label="上一步">${icon('previous')}</button>
              <button type="button" class="tool-button play-button" data-action="play">${icon('play')}<span>播放</span></button>
              <button type="button" class="tool-button" data-action="next" aria-label="下一步">${icon('next')}</button>
              <button type="button" class="tool-button" data-action="reset" aria-label="重置">${icon('reset')}</button>
            </div>
            <label class="speed-control"><span>速度</span><input type="range" name="speed" min="180" max="1500" step="110" value="900" aria-label="动画速度" /><strong>1.0×</strong></label>
          </div>
          <div class="visual-stage" id="visual-stage" aria-live="polite"><div class="stage-empty"><span>∴</span><strong>准备实验</strong><p>点击“运行实验”生成逐步动画。</p></div></div>
          <div class="result-strip" id="result-strip" hidden>
            <div><span id="result-label">加密结果</span><output id="result-output"></output></div>
            <button type="button" class="copy-button" data-action="copy">${icon('copy')}复制</button>
          </div>
        </div>
      </section>

      <section class="explanation-grid">
        <div class="explain-card"><span class="explain-number">01</span><div><h2>它如何工作</h2><p>${escapeHtml(meta.summary)}</p><code>${escapeHtml(meta.formula)}</code></div></div>
        <div class="explain-card warning-card"><span class="explain-number">!</span><div><h2>安全性提示</h2><p>${escapeHtml(meta.note)}</p></div></div>
      </section>
    </article>`;
}

function renderAlphabet(data) {
  return `<div class="letter-track">${[...alphabet].map((letter, index) => `<span class="${index === data.from ? 'source' : ''} ${index === data.to ? 'target' : ''}">${letter}<small>${index}</small></span>`).join('')}</div>`;
}

function renderFormula(step) {
  return `<div class="symbol-transform"><span>${escapeHtml(step.input)}</span><b>→</b><span>${escapeHtml(step.output)}</span></div>`;
}

function renderTableau(step) {
  return `<div class="tableau-visual"><div><small>消息</small><strong>${escapeHtml(step.input)}</strong></div><b>+</b><div><small>密钥</small><strong>${escapeHtml(step.key)}</strong></div><b>=</b><div class="result"><small>结果</small><strong>${escapeHtml(step.output)}</strong></div></div>`;
}

function renderPlayfair(data) {
  const active = new Set(data.positions.map(({ row, column }) => `${row}-${column}`));
  return `<div class="playfair-grid">${data.grid.flatMap((row, r) => row.map((letter, c) => `<span class="${active.has(`${r}-${c}`) ? 'active' : ''}">${letter}</span>`)).join('')}</div>`;
}

function renderMatrix(data) {
  return `<div class="matrix-visual"><div class="matrix">${data.matrix.flat().map((value) => `<span>${value}</span>`).join('')}</div><b>×</b><div class="vector">${data.vector.map((value) => `<span>${value}</span>`).join('')}</div><b>mod 26 =</b><div class="vector result">${data.resultVector.map((value) => `<span>${value}</span>`).join('')}</div></div>`;
}

function renderColumnar(data) {
  const keyword = [...data.keyword];
  const rows = data.grid ?? [];
  return `<div class="grid-scroll"><table class="column-grid"><thead><tr>${keyword.map((char, index) => `<th class="${index === data.activeColumn ? 'active' : ''}">${char}<small>${index + 1}</small></th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${keyword.map((_, index) => `<td class="${index === data.activeColumn ? 'active' : ''}">${escapeHtml(row[index] ?? '·')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function renderBits(data) {
  const bitRow = (label, value, className = '') => `<div class="bit-row ${className}"><span>${label}</span>${[...value].map((bit) => `<b>${bit}</b>`).join('')}</div>`;
  return `<div class="bits-visual">${bitRow('消息', data.inputBits)}${bitRow('密钥', data.keyBits)}${bitRow('XOR', data.xorBits, 'accent')}${bitRow('模26输出', data.outputBits, 'result')}</div>`;
}

function renderRotor(data) {
  return `<div class="rotor-visual"><div class="rotor-stack">${data.after.map((position, index) => `<div class="rotor"><small>转轮 ${index + 1}</small><strong>${position}</strong><span>${data.before[index]} → ${position}</span></div>`).join('')}</div><div class="signal-path">${data.path.map((letter, index) => `<span class="${index === 0 ? 'source' : index === data.path.length - 1 ? 'target' : ''}">${letter}</span>${index < data.path.length - 1 ? '<i>›</i>' : ''}`).join('')}</div></div>`;
}

export function renderStep(state) {
  if (!state?.step) return '<div class="stage-empty"><span>∴</span><strong>准备实验</strong><p>点击“运行实验”生成逐步动画。</p></div>';
  const { step, index, total } = state;
  const visuals = {
    alphabet: () => renderAlphabet(step.data), formula: () => renderFormula(step), tableau: () => renderTableau(step),
    playfair: () => renderPlayfair(step.data), matrix: () => renderMatrix(step.data), columnar: () => renderColumnar(step.data),
    bits: () => renderBits(step.data), rotor: () => renderRotor(step.data)
  };
  return `
    <div class="step-view">
      <div class="step-meta"><span>STEP ${String(index + 1).padStart(2, '0')}</span><strong>${index + 1} / ${total}</strong></div>
      <div class="progress-track"><i style="width:${((index + 1) / total) * 100}%"></i></div>
      <div class="step-heading"><div><small>当前操作</small><h2>${escapeHtml(step.title)}</h2></div><div class="mini-transform"><span>${escapeHtml(step.input)}</span><b>→</b><span>${escapeHtml(step.output)}</span></div></div>
      <div class="visualization">${(visuals[step.kind] ?? (() => renderFormula(step)))()}</div>
      <div class="step-equation"><span>计算</span><code>${escapeHtml(step.formula)}</code></div>
      <p class="step-detail">${escapeHtml(step.detail)}</p>
    </div>`;
}

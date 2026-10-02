const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
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

function modesFor(meta) {
  return Array.isArray(meta.modes) && meta.modes.length ? meta.modes : ['encrypt', 'decrypt'];
}

function modeLabel(mode) {
  return ({ encrypt: '加密', decrypt: '解密', hash: '哈希' })[mode] ?? mode;
}

function inputLabel(mode) {
  return ({ encrypt: '明文', decrypt: '密文', hash: '摘要内容' })[mode] ?? '输入';
}

function actionLabel(mode) {
  return mode === 'hash' ? '生成摘要' : '运行实验';
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
      <div class="eyebrow"><span></span>INTERACTIVE CRYPTOGRAPHY</div>
      <div class="intro-heading">
        <div><h1>从古典密码到现代密码学</h1><p>选择一个算法，修改输入与密钥，然后逐步观察字符、字节、矩阵和寄存器如何变化。</p></div>
        <div class="intro-count"><strong>${String(algorithms.length).padStart(2, '0')}</strong><span>交互实验</span></div>
      </div>
      <div class="learning-path"><strong>建议路径</strong><span>替代与置换</span><i></i><span>分组与流密码</span><i></i><span>公钥与哈希函数</span></div>
      <div class="algorithm-grid">${cards}</div>
      <aside class="info-callout"><strong>开始前请注意</strong><p>这里使用直观参数帮助理解原理。所有实现仅用于教学，不适用于真实安全通信。</p></aside>
    </section>`;
}

function renderKeyFields(meta) {
  return (meta.keyFields ?? []).map((field) => `
    <label class="field ${meta.id === 'hill' ? 'field-compact' : ''}">
      <span>${escapeHtml(field.label)}</span>
      <input name="${escapeHtml(field.name)}" type="${field.type}" value="${escapeHtml(field.value)}"
        ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.max !== undefined ? `max="${field.max}"` : ''}
        ${field.maxlength ? `maxlength="${field.maxlength}"` : ''} ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ''} />
    </label>`).join('');
}

export function renderAlgorithmPage(algorithm) {
  const { meta } = algorithm;
  const modes = modesFor(meta);
  const initialMode = modes[0];
  const showPreserveOption = meta.showPreserveOption ?? true;
  const modeButtons = modes.map((mode, index) => `<button type="button" class="mode-button${index === 0 ? ' active' : ''}" data-mode="${mode}" aria-pressed="${index === 0}">${modeLabel(mode)}</button>`).join('');
  return `
    <article class="algorithm-page" data-algorithm="${meta.id}" data-modes="${modes.join(',')}">
      <header class="algorithm-header">
        <div><div class="eyebrow"><span></span>${escapeHtml(meta.category)} · EXPERIMENT ${meta.code}</div><h1>${escapeHtml(meta.title)}</h1><p>${escapeHtml(meta.summary)}</p></div>
        <div class="formula-card"><span>核心规则</span><code>${escapeHtml(meta.formula)}</code></div>
      </header>
      <section class="workbench" aria-label="${escapeHtml(meta.title)}实验台">
        <form class="control-panel" id="cipher-form" novalidate>
          <div class="panel-heading"><span>${icon('flask')}</span><div><strong>实验参数</strong><small>修改后重新运行</small></div></div>
          <div class="mode-switch mode-count-${modes.length}" role="group" aria-label="运算模式">
            ${modeButtons}<input type="hidden" name="mode" value="${initialMode}" />
          </div>
          <label class="field field-message"><span id="message-label">${inputLabel(initialMode)}</span><textarea name="input" rows="4" spellcheck="false">${escapeHtml(meta.defaults.input)}</textarea></label>
          <div class="key-fields ${meta.id === 'hill' ? 'matrix-fields' : ''}">${renderKeyFields(meta)}</div>
          ${showPreserveOption ? `<label class="check-field"><input type="checkbox" name="preserve" ${meta.defaults.preserve ? 'checked' : ''}/><span>保留空格、数字和标点</span></label>` : ''}
          <p class="form-error" id="form-error" role="alert"></p>
          <div class="primary-actions"><button class="primary-button" type="submit" data-action="run">${icon('play')}<span>${actionLabel(initialMode)}</span></button><button class="secondary-button" type="button" data-action="preset">载入示例</button></div>
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
          <div class="visual-stage" id="visual-stage" aria-live="polite"><div class="stage-empty"><span>∴</span><strong>准备实验</strong><p>点击“${actionLabel(initialMode)}”生成逐步动画。</p></div></div>
          <div class="result-strip" id="result-strip" hidden><div><span id="result-label">${initialMode === 'hash' ? '摘要结果' : '加密结果'}</span><output id="result-output"></output></div><button type="button" class="copy-button" data-action="copy">${icon('copy')}复制</button></div>
        </div>
      </section>
      <section class="explanation-grid">
        <div class="explain-card"><span class="explain-number">01</span><div><h2>它如何工作</h2><p>${escapeHtml(meta.summary)}</p><code>${escapeHtml(meta.formula)}</code></div></div>
        <div class="explain-card warning-card"><span class="explain-number">!</span><div><h2>安全性提示</h2><p>${escapeHtml(meta.note)} 本实验仅用于教学，不适用于真实安全通信。</p></div></div>
      </section>
    </article>`;
}

function renderAlphabet(data) {
  return `<div class="letter-track">${[...alphabet].map((letter, index) => `<span class="${index === data.from ? 'source' : ''} ${index === data.to ? 'target' : ''}">${letter}<small>${index}</small></span>`).join('')}</div>`;
}
function renderFormula(step) { return `<div class="symbol-transform"><span>${escapeHtml(step.input)}</span><b>→</b><span>${escapeHtml(step.output)}</span></div>`; }
function renderTableau(step) { return `<div class="tableau-visual"><div><small>消息</small><strong>${escapeHtml(step.input)}</strong></div><b>+</b><div><small>密钥</small><strong>${escapeHtml(step.key)}</strong></div><b>=</b><div class="result"><small>结果</small><strong>${escapeHtml(step.output)}</strong></div></div>`; }
function renderPlayfair(data) {
  const active = new Set(data.positions.map(({ row, column }) => `${row}-${column}`));
  return `<div class="playfair-grid">${data.grid.flatMap((row, r) => row.map((letter, c) => {
    const className = [active.has(`${r}-${c}`) ? 'active' : '', letter === 'I' ? 'merged-letter' : ''].filter(Boolean).join(' ');
    const mergedLabel = letter === 'I' ? ' aria-label="I 和 J 共用一个方格"' : '';
    return `<span class="${className}"${mergedLabel}>${letter === 'I' ? 'I/J' : letter}</span>`;
  })).join('')}</div>`;
}
function renderMatrix(data) { return `<div class="matrix-visual"><div class="matrix">${data.matrix.flat().map((value) => `<span>${value}</span>`).join('')}</div><b>×</b><div class="vector">${data.vector.map((value) => `<span>${value}</span>`).join('')}</div><b>mod 26 =</b><div class="vector result">${data.resultVector.map((value) => `<span>${value}</span>`).join('')}</div></div>`; }
function renderColumnar(data) {
  const keyword = [...data.keyword]; const rows = data.grid ?? [];
  return `<div class="grid-scroll"><table class="column-grid"><thead><tr>${keyword.map((char, index) => `<th class="${index === data.activeColumn ? 'active' : ''}">${char}<small>${index + 1}</small></th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${keyword.map((_, index) => `<td class="${index === data.activeColumn ? 'active' : ''}">${escapeHtml(row[index] ?? '·')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderBits(data) {
  const row = (label, value, className = '') => `<div class="bit-row ${className}"><span>${label}</span>${[...value].map((bit) => `<b>${bit}</b>`).join('')}</div>`;
  return `<div class="bits-visual">${row('消息', data.inputBits)}${row('密钥', data.keyBits)}${row('XOR', data.xorBits, 'accent')}${row('模26输出', data.outputBits, 'result')}</div>`;
}
function renderRotor(data) { return `<div class="rotor-visual"><div class="rotor-stack">${data.after.map((position, index) => `<div class="rotor"><small>转轮 ${index + 1}</small><strong>${position}</strong><span>${data.before[index]} → ${position}</span></div>`).join('')}</div><div class="signal-path">${data.path.map((letter, index) => `<span class="${index === 0 ? 'source' : index === data.path.length - 1 ? 'target' : ''}">${letter}</span>${index < data.path.length - 1 ? '<i>›</i>' : ''}`).join('')}</div></div>`; }

function byteLabel(value) {
  return typeof value === 'number' && value >= 0 && value <= 255 ? value.toString(16).padStart(2, '0').toUpperCase() : String(value);
}

function renderByteGrid(data) {
  const values = data.bytes ?? data.values ?? [];
  return `<div class="byte-grid" aria-label="字节网格">${values.map((value, index) => `<span><small>${index}</small><b>${escapeHtml(byteLabel(value))}</b></span>`).join('')}</div>`;
}

function renderAesState(data) {
  const state = data.state ?? [];
  const cells = [];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const value = state[row + 4 * column];
      cells.push(`<span><small>r${row}c${column}</small><b>${byteLabel(value ?? 0)}</b></span>`);
    }
  }
  return `<div class="aes-state" aria-label="AES 4×4 状态矩阵">${cells.join('')}</div>`;
}

function renderKeySchedule(data) {
  return `<div class="key-schedule" aria-label="AES 轮密钥"><strong>K${escapeHtml(data.round)}</strong><div>${(data.roundKey ?? []).map((value, index) => `<span><small>${index}</small>${byteLabel(value)}</span>`).join('')}</div></div>`;
}

function renderModularMath(data) {
  const rows = data.trace ?? [];
  return `<div class="modular-math" aria-label="模幂平方乘轨迹"><div class="math-summary"><span>底数 ${escapeHtml(data.base)}</span><span>指数 ${escapeHtml(data.exponent)}</span><span>模数 ${escapeHtml(data.modulus)}</span></div><div class="trace-scroll"><table><thead><tr><th>轮</th><th>位</th><th>因子</th><th>累计结果</th></tr></thead><tbody>${rows.map((entry) => `<tr><td>${entry.iteration}</td><td>${entry.bit}</td><td>${escapeHtml(entry.factor)}</td><td>${escapeHtml(entry.result)}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function renderPermutation(data) {
  return `<div class="permutation-window" aria-label="RC4 置换状态窗口"><div class="pointer-summary"><span>i = ${escapeHtml(data.i)}</span><span>j = ${escapeHtml(data.j)}</span>${data.t !== undefined ? `<span>t = ${escapeHtml(data.t)}</span>` : ''}</div><div class="permutation-cells">${(data.window ?? []).map((cell) => `<span class="${cell.isI ? 'pointer-i' : ''} ${cell.isJ ? 'pointer-j' : ''}"><small>S[${cell.index}]</small><b>${cell.value}</b></span>`).join('')}</div>${data.keyStreamByte !== undefined ? `<p>密钥流字节 <strong>${byteLabel(data.keyStreamByte)}</strong>，输入 <strong>${byteLabel(data.sourceByte)}</strong>，输出 <strong>${byteLabel(data.resultByte)}</strong></p>` : ''}</div>`;
}

function renderRegisters(data) {
  const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].filter((name) => data[name] !== undefined);
  const entries = names.length
    ? names.map((name) => [name.toUpperCase(), data[name]])
    : (data.state ?? []).map((value, index) => [`H${index}`, value]);
  return `<div class="register-cards" aria-label="哈希工作寄存器">${entries.map(([name, value]) => `<div><small>${name}</small><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>`;
}

function renderMessageSchedule(data) {
  const index = data.wordIndex ?? data.operation ?? 0;
  return `<div class="message-schedule" aria-label="消息扩展字"><small>${data.endian === 'little' ? '小端消息字' : '消息扩展字'}</small><strong>${data.endian === 'little' ? 'M' : 'W'}[${escapeHtml(index)}]</strong><code>${escapeHtml(data.value ?? '')}</code></div>`;
}

function renderKeyDerivation(data) {
  return `<div class="key-derivation" aria-label="RSA 密钥推导">${['p', 'q', 'n', 'phi', 'e', 'd'].filter((name) => data[name] !== undefined).map((name) => `<div><small>${name === 'phi' ? 'φ(n)' : name}</small><strong>${escapeHtml(data[name])}</strong></div>`).join('')}</div>`;
}

export function renderStep(state) {
  if (!state?.step) return '<div class="stage-empty"><span>∴</span><strong>准备实验</strong><p>点击“运行实验”生成逐步动画。</p></div>';
  const { step, index, total } = state;
  const visuals = {
    alphabet: () => renderAlphabet(step.data), formula: () => renderFormula(step), tableau: () => renderTableau(step),
    playfair: () => renderPlayfair(step.data), matrix: () => renderMatrix(step.data), columnar: () => renderColumnar(step.data),
    bits: () => renderBits(step.data), rotor: () => renderRotor(step.data), 'byte-grid': () => renderByteGrid(step.data),
    'state-matrix': () => renderAesState(step.data), 'key-schedule': () => renderKeySchedule(step.data),
    'modular-math': () => renderModularMath(step.data), 'key-derivation': () => renderKeyDerivation(step.data),
    permutation: () => renderPermutation(step.data), 'ksa-state': () => renderPermutation(step.data), 'prga-state': () => renderPermutation(step.data),
    registers: () => renderRegisters(step.data), 'message-schedule': () => renderMessageSchedule(step.data),
    'message-word': () => renderMessageSchedule(step.data), 'hash-state': () => renderRegisters(step.data),
    padding: () => renderByteGrid(step.data), digest: () => renderByteGrid(step.data)
  };
  return `<div class="step-view">
    <div class="step-meta"><span>STEP ${String(index + 1).padStart(2, '0')}</span><strong>${index + 1} / ${total}</strong></div>
    <div class="progress-track"><i style="width:${((index + 1) / total) * 100}%"></i></div>
    <div class="step-heading"><div><small>当前操作</small><h2>${escapeHtml(step.title)}</h2></div><div class="mini-transform"><span>${escapeHtml(step.input)}</span><b>→</b><span>${escapeHtml(step.output)}</span></div></div>
    <div class="visualization">${(visuals[step.kind] ?? (() => renderFormula(step)))()}</div>
    <div class="step-equation"><span>计算</span><code>${escapeHtml(step.formula)}</code></div><p class="step-detail">${escapeHtml(step.detail)}</p>
  </div>`;
}

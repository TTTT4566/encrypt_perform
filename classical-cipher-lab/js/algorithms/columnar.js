import { normalizeLetters, requireLetters } from '../core/text.js';

export const meta = {
  id: 'columnar', title: '列置换密码', code: '06', category: '数学与置换', difficulty: '基础',
  summary: '不改变字符本身，只把字符写进表格后按密钥确定的列顺序重新读出。',
  formula: '按行写入 → 按密钥排序读取列',
  note: '字母频率完全不变，重排结构可以通过统计与猜词恢复。',
  defaults: { input: 'WE ARE DISCOVERED', keyword: 'CAB', preserve: false },
  keyFields: [{ name: 'keyword', label: '列关键词', type: 'text', value: 'CAB', placeholder: '例如 ZEBRA' }]
};

function getOrder(keyword) {
  return [...keyword].map((char, index) => ({ char, index }))
    .sort((left, right) => left.char.localeCompare(right.char) || left.index - right.index)
    .map(({ index }) => index);
}

export function validate(input, key = {}) {
  requireLetters(input);
  if (normalizeLetters(key.keyword).length < 2) throw new Error('列关键词至少需要两个英文字母');
}

function makeGrid(letters, columns) {
  const rows = [];
  for (let index = 0; index < letters.length; index += columns) rows.push([...letters.slice(index, index + columns)]);
  return rows;
}

export function encrypt(input, key = {}) {
  validate(input, key);
  const letters = requireLetters(input);
  const keyword = normalizeLetters(key.keyword);
  const order = getOrder(keyword);
  const grid = makeGrid(letters, keyword.length);
  const steps = [];
  let output = '';
  order.forEach((column, index) => {
    const value = grid.map((row) => row[column]).filter(Boolean).join('');
    output += value;
    steps.push({
      index, kind: 'columnar', title: `读取第 ${column + 1} 列`, input: value, output,
      formula: `关键词排序第 ${index + 1} 位 → 原第 ${column + 1} 列`,
      detail: `依次读出 ${value}，追加到密文。`, data: { grid, order, activeColumn: column, keyword }
    });
  });
  return { output, normalized: letters, steps, grid, order };
}

export function decrypt(input, key = {}) {
  validate(input, key);
  const letters = requireLetters(input);
  const keyword = normalizeLetters(key.keyword);
  const columns = keyword.length;
  const order = getOrder(keyword);
  const fullRows = Math.floor(letters.length / columns);
  const remainder = letters.length % columns;
  const columnLengths = Array.from({ length: columns }, (_, index) => fullRows + (index < remainder ? 1 : 0));
  const columnData = Array(columns).fill('');
  const steps = [];
  let cursor = 0;
  order.forEach((column, index) => {
    const value = letters.slice(cursor, cursor + columnLengths[column]);
    columnData[column] = value;
    cursor += value.length;
    steps.push({
      index, kind: 'columnar', title: `回填第 ${column + 1} 列`, input: value, output: columnData.filter(Boolean).join(' · '),
      formula: `该列长度 = ${columnLengths[column]}`, detail: `按密钥顺序把 ${value} 放回原第 ${column + 1} 列。`,
      data: { columns: columnData.slice(), order, activeColumn: column, keyword }
    });
  });
  let output = '';
  const rowCount = Math.ceil(letters.length / columns);
  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < columns; column += 1) output += columnData[column][row] ?? '';
  }
  const grid = makeGrid(output, columns);
  steps.forEach((step) => { step.data.grid = grid; });
  return { output, normalized: letters, steps, grid, order };
}

export const createSteps = (mode, input, key = {}) => (mode === 'decrypt' ? decrypt : encrypt)(input, key).steps;

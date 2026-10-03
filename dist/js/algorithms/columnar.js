import { requireLetters } from '../core/text.js';
import { invertPermutation, parsePermutation } from '../core/permutation.js';

export const meta = {
  id: 'columnar', title: '列置换密码', code: '07', category: '数学与置换', difficulty: '基础',
  summary: '把明文按行写入矩阵，用数字密钥置换各列，再按列读出密文。',
  formula: '按行写入 → 按 σ 置换列 → 逐列读出',
  note: '字母频率完全不变，重排结构可以通过统计与猜词恢复。',
  defaults: { input: 'WE ARE DISCOVERED', key: 312 },
  keyFields: [{
    name: 'key', label: '置换密钥 σ', labels: { decrypt: '原置换密钥 σ' },
    type: 'number', value: 312, placeholder: '例如 312'
  }],
  showPreserveOption: false
};

function normalizeCiphertext(input) {
  const ciphertext = String(input ?? '').toUpperCase();
  if (!/[A-Z]/.test(ciphertext)) throw new Error('密文中至少需要一个英文字母');
  if (/[^A-Z ]/.test(ciphertext)) throw new Error('密文只能包含英文字母和补位空格');
  return ciphertext;
}

export function validate(input, key = {}, decrypting = false) {
  const permutation = parsePermutation(key.key);
  const text = decrypting ? normalizeCiphertext(input) : requireLetters(input);
  if (decrypting && text.length % permutation.length !== 0) {
    throw new Error(`密文长度必须是分组长度 ${permutation.length} 的倍数`);
  }
  return { text, permutation };
}

function makeGrid(text, columns) {
  const rows = [];
  for (let index = 0; index < text.length; index += columns) rows.push([...text.slice(index, index + columns)]);
  return rows;
}

export function encrypt(input, key = {}) {
  const { text: letters, permutation } = validate(input, key);
  const columns = permutation.length;
  const rowCount = Math.ceil(letters.length / columns);
  const padded = letters.padEnd(rowCount * columns, ' ');
  const originalGrid = makeGrid(padded, columns);
  const grid = originalGrid.map((row) => permutation.map((column) => row[column - 1]));
  const identity = Array.from({ length: columns }, (_, index) => index + 1);
  const steps = [
    {
      index: 0, kind: 'columnar', title: `按行写入 ${rowCount}×${columns} 矩阵`, input: letters, output: padded,
      formula: `m = ${columns}，不足整行时用空格补齐`, detail: `将明文按每行 ${columns} 个字符写入矩阵。`,
      data: { grid: originalGrid, columnLabels: identity, activeColumn: -1, permutation }
    },
    {
      index: 1, kind: 'columnar', title: '按密钥 σ 交换列的位置', input: identity.join(''), output: permutation.join(''),
      formula: `(1, 2, …, ${columns}) → (${permutation.join(', ')})`, detail: '新矩阵的每一列依次取自密钥指定的原列。',
      data: { grid, columnLabels: permutation, activeColumn: -1, permutation }
    }
  ];
  let output = '';
  permutation.forEach((originalColumn, column) => {
    const value = grid.map((row) => row[column]).join('');
    output += value;
    steps.push({
      index: steps.length, kind: 'columnar', title: `读取置换后第 ${column + 1} 列`, input: value, output,
      formula: `置换后第 ${column + 1} 列 = 原第 ${originalColumn} 列`,
      detail: '从上到下读出该列，并追加到密文。',
      data: { grid, columnLabels: permutation, activeColumn: column, permutation }
    });
  });
  return { output, normalized: letters, steps, grid, originalGrid, permutation };
}

export function decrypt(input, key = {}) {
  const { text: ciphertext, permutation } = validate(input, key, true);
  const columns = permutation.length;
  const rowCount = ciphertext.length / columns;
  const grid = Array.from({ length: rowCount }, () => Array(columns));
  const steps = [];
  let cursor = 0;
  permutation.forEach((originalColumn, column) => {
    const value = ciphertext.slice(cursor, cursor + rowCount);
    value.split('').forEach((char, row) => { grid[row][column] = char; });
    cursor += value.length;
    steps.push({
      index: steps.length, kind: 'columnar', title: `按列写入置换后第 ${column + 1} 列`, input: value, output: ciphertext.slice(0, cursor),
      formula: `列长 n = ${rowCount}`, detail: `该列对应原矩阵的第 ${originalColumn} 列。`,
      data: { grid: grid.map((row) => row.slice()), columnLabels: permutation, activeColumn: column, permutation }
    });
  });
  const inverse = invertPermutation(permutation);
  steps.push({
    index: steps.length, kind: 'columnar', title: '计算逆置换 σ⁻¹', input: permutation.join(''), output: inverse.join(''),
    formula: `σ⁻¹ = (${inverse.join(', ')})`, detail: '逆置换由原置换密钥自动计算',
    data: { grid: grid.map((row) => row.slice()), columnLabels: permutation, activeColumn: -1, permutation, inverse }
  });
  const restoredGrid = grid.map((row) => inverse.map((permutedColumn) => row[permutedColumn - 1]));
  const paddedPlaintext = restoredGrid.flat().join('');
  const output = paddedPlaintext.trimEnd();
  const identity = Array.from({ length: columns }, (_, index) => index + 1);
  steps.push({
    index: steps.length, kind: 'columnar', title: '按逆置换 σ⁻¹ 恢复列', input: inverse.join(''), output: identity.join(''),
    formula: '原第 i 列 ← 置换后第 σ⁻¹(i) 列', detail: '按逆置换把各列放回原来的位置。',
    data: { grid: restoredGrid, columnLabels: identity, activeColumn: -1, permutation, inverse }
  });
  steps.push({
    index: steps.length, kind: 'columnar', title: '按行读出明文', input: paddedPlaintext, output,
    formula: '逐行读取并移除末尾补位空格', detail: '恢复最终明文。',
    data: { grid: restoredGrid, columnLabels: identity, activeColumn: -1, permutation, inverse }
  });
  return {
    output, normalized: ciphertext, steps, grid: restoredGrid, permutedGrid: grid, permutation, inverse,
    resultDetail: `逆置换 σ⁻¹：${inverse.join('')}`
  };
}

export const createSteps = (mode, input, key = {}) => (mode === 'decrypt' ? decrypt : encrypt)(input, key).steps;

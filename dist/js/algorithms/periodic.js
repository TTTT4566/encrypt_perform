import { requireLetters } from '../core/text.js';
import { invertPermutation, parsePermutation } from '../core/permutation.js';

export const meta = {
  id: 'periodic', title: '周期置换密码', code: '06', category: '数学与置换', difficulty: '基础',
  summary: '把明文按固定长度分组，并在每个分组内部按照同一个数字置换重新排列字符。',
  formula: '(m₁, m₂, …, mₙ) → (mσ(1), mσ(2), …, mσ(n))',
  note: '周期置换只改变字符位置，短分组和重复结构仍可能泄露明文规律。',
  defaults: { input: 'CRYPTOGRAPHY', key: 351642 },
  keyFields: [{
    name: 'key', label: '置换密钥 σ', labels: { decrypt: '原置换密钥 σ' },
    type: 'number', value: 351642, placeholder: '例如 351642'
  }],
  showPreserveOption: false
};

function normalizeCiphertext(input) {
  const ciphertext = String(input ?? '').toUpperCase();
  if (!/[A-Z]/.test(ciphertext)) throw new Error('密文中至少需要一个英文字母');
  if (/[^A-Z ]/.test(ciphertext)) throw new Error('密文只能包含英文字母和补位空格');
  return ciphertext;
}

function transformGroup(group, permutation) {
  return permutation.map((position) => group[position - 1]).join('');
}

export function validate(input, key = {}, decrypting = false) {
  const permutation = parsePermutation(key.key);
  const text = decrypting ? normalizeCiphertext(input) : requireLetters(input);
  if (decrypting && text.length % permutation.length !== 0) {
    throw new Error(`密文长度必须是分组长度 ${permutation.length} 的倍数`);
  }
  return { text, permutation };
}

function groupStep(index, groupIndex, source, result, permutation, output, decrypting) {
  return {
    index, kind: 'periodic', title: `${decrypting ? '恢复' : '置换'}第 ${groupIndex + 1} 组`, input: source, output,
    formula: `(${source.split('').join(', ')}) → (${result.split('').join(', ')})`,
    detail: `按照 (${permutation.join(', ')}) 依次读取当前分组的位置。`,
    data: {
      source: [...source], result: [...result], permutation,
      permutationLabel: decrypting ? '读取顺序 σ⁻¹' : '读取顺序 σ',
      sourceLabel: decrypting ? '密文分组' : '明文分组', resultLabel: decrypting ? '恢复分组' : '置换后'
    }
  };
}

export function encrypt(input, key = {}) {
  const { text: letters, permutation } = validate(input, key);
  const groupLength = permutation.length;
  const padded = letters.padEnd(Math.ceil(letters.length / groupLength) * groupLength, ' ');
  const groups = [];
  const steps = [];
  let output = '';
  for (let offset = 0; offset < padded.length; offset += groupLength) {
    const source = padded.slice(offset, offset + groupLength);
    const result = transformGroup(source, permutation);
    output += result;
    groups.push({ source, result });
    steps.push(groupStep(steps.length, offset / groupLength, source, result, permutation, output, false));
  }
  return { output, normalized: letters, steps, groups, permutation };
}

export function decrypt(input, key = {}) {
  const { text: ciphertext, permutation } = validate(input, key, true);
  const inverse = invertPermutation(permutation);
  const groupLength = permutation.length;
  const groups = [];
  const steps = [{
    index: 0, kind: 'periodic', title: '计算逆置换 σ⁻¹', input: permutation.join(''), output: inverse.join(''),
    formula: `σ⁻¹ = (${inverse.join(', ')})`, detail: '逆置换由原置换密钥自动计算，不需要另行输入。',
    data: {
      source: permutation.map(String), result: inverse.map(String), permutation: inverse,
      permutationLabel: '逆置换 σ⁻¹',
      sourceLabel: '原置换 σ', resultLabel: '逆置换 σ⁻¹'
    }
  }];
  let paddedPlaintext = '';
  for (let offset = 0; offset < ciphertext.length; offset += groupLength) {
    const source = ciphertext.slice(offset, offset + groupLength);
    const result = transformGroup(source, inverse);
    paddedPlaintext += result;
    groups.push({ source, result });
    steps.push(groupStep(steps.length, offset / groupLength, source, result, inverse, paddedPlaintext, true));
  }
  const output = paddedPlaintext.trimEnd();
  if (output !== paddedPlaintext) {
    steps.push({
      index: steps.length, kind: 'formula', title: '移除末尾补位空格', input: paddedPlaintext, output,
      formula: 'P = trimEnd(Padded P)', detail: '只移除加密时添加在末组末尾的补位空格。'
    });
  }
  return {
    output, normalized: ciphertext, steps, groups, permutation, inverse,
    resultDetail: `逆置换 σ⁻¹：${inverse.join('')}`
  };
}

export const createSteps = (mode, input, key = {}) => (mode === 'decrypt' ? decrypt : encrypt)(input, key).steps;

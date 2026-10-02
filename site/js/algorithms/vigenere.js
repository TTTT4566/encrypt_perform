import { mod } from '../core/math.js';
import { letterToNumber, normalizeLetters, numberToLetter, requireLetters, transformLetters } from '../core/text.js';

export const meta = {
  id: 'vigenere', title: '维吉尼亚密码', code: '03', category: '替代密码', difficulty: '基础',
  summary: '让密钥循环参与位移，同一个明文字母会随位置变成不同密文字母。',
  formula: 'Cᵢ = (Mᵢ + Kᵢ) mod 26',
  note: '重复密钥会产生周期，可以通过 Kasiski 检验等方法分析。',
  defaults: { input: 'ATTACK AT DAWN', keyword: 'LEMON', preserve: true },
  keyFields: [{ name: 'keyword', label: '密钥', type: 'text', value: 'LEMON', placeholder: '例如 LEMON' }]
};

export function validate(input, key = {}) {
  requireLetters(input);
  const keyword = normalizeLetters(key.keyword);
  if (!keyword) throw new Error('关键词中至少需要一个英文字母');
}

function run(input, key = {}, direction) {
  validate(input, key);
  const keyword = normalizeLetters(key.keyword);
  const steps = [];
  const output = transformLetters(input, (char, index) => {
    const keyChar = keyword[index % keyword.length];
    const x = letterToNumber(char);
    const k = letterToNumber(keyChar);
    const y = mod(x + direction * k, 26);
    const result = numberToLetter(y);
    steps.push({
      index, kind: 'tableau', title: `第 ${index + 1} 个字母`, input: char, key: keyChar, output: result,
      formula: `(${x} ${direction > 0 ? '+' : '−'} ${k}) mod 26 = ${y}`,
      detail: `使用循环密钥中的 ${keyChar}（位移 ${k}）。`,
      data: { row: k, column: x, to: y, direction }
    });
    return result;
  }, key.preserve !== false);
  return { output, normalized: String(input).toUpperCase(), steps };
}

export const encrypt = (input, key = {}) => run(input, key, 1);
export const decrypt = (input, key = {}) => run(input, key, -1);
export const createSteps = (mode, input, key = {}) => (mode === 'decrypt' ? decrypt : encrypt)(input, key).steps;

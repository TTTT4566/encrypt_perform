import { mod } from '../core/math.js';
import { letterToNumber, normalizeLetters, numberToLetter, requireLetters, transformLetters } from '../core/text.js';

export const meta = {
  id: 'otp', title: '一次一密', code: '07', category: '密钥流与机械', difficulty: '基础',
  summary: '让随机、等长且只使用一次的密钥与消息逐位组合，可获得理论上的完全保密。',
  formula: 'Cᵢ = (Mᵢ + Kᵢ) mod 26',
  note: '安全性依赖真正随机、等长、秘密且永不复用的密钥；教学关键词不满足真实条件。',
  defaults: { input: 'HELLO', keyword: 'XMCKL', preserve: true },
  keyFields: [{ name: 'keyword', label: '等长密钥', type: 'text', value: 'XMCKL', placeholder: '长度不少于消息' }]
};

export function validate(input, key = {}) {
  const letters = requireLetters(input);
  const keyword = normalizeLetters(key.keyword);
  if (keyword.length < letters.length) throw new Error('一次一密的密钥至少与消息等长');
}

function bits(value) {
  return value.toString(2).padStart(5, '0');
}

function run(input, key = {}, direction) {
  validate(input, key);
  const keyword = normalizeLetters(key.keyword);
  const steps = [];
  const output = transformLetters(input, (char, index) => {
    const keyChar = keyword[index];
    const x = letterToNumber(char);
    const k = letterToNumber(keyChar);
    const y = mod(x + direction * k, 26);
    const result = numberToLetter(y);
    steps.push({
      index, kind: 'bits', title: `组合 ${char} 与 ${keyChar}`, input: char, key: keyChar, output: result,
      formula: `(${x} ${direction > 0 ? '+' : '−'} ${k}) mod 26 = ${y}`,
      detail: '字母运算使用模 26；下方五位视图用于帮助理解 Vernam 的逐位组合思想。',
      data: { inputBits: bits(x), keyBits: bits(k), xorBits: bits(x ^ k), outputBits: bits(y), direction }
    });
    return result;
  }, key.preserve !== false);
  return { output, normalized: String(input).toUpperCase(), steps };
}

export const encrypt = (input, key = {}) => run(input, key, 1);
export const decrypt = (input, key = {}) => run(input, key, -1);
export const createSteps = (mode, input, key = {}) => (mode === 'decrypt' ? decrypt : encrypt)(input, key).steps;

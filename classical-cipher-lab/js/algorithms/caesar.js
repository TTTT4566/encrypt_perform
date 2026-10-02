import { mod } from '../core/math.js';
import { letterToNumber, numberToLetter, requireLetters, transformLetters } from '../core/text.js';

export const meta = {
  id: 'caesar', title: '凯撒密码', code: '01', category: '替代密码', difficulty: '入门',
  summary: '把每个字母沿字母表移动固定距离，是理解替代密码最直观的入口。',
  formula: 'Eₖ(x) = (x + k) mod 26',
  note: '密钥空间只有 26 种，可以被穷举攻击轻易破解。',
  defaults: { input: 'HELLO CIPHER', shift: 3, preserve: true },
  keyFields: [{ name: 'shift', label: '位移量 k', type: 'number', min: 0, max: 25, value: 3 }]
};

export function validate(input, key = {}) {
  requireLetters(input);
  if (!Number.isInteger(Number(key.shift))) throw new Error('位移量必须是整数');
}

function run(input, key = {}, direction) {
  validate(input, key);
  const shift = mod(Number(key.shift), 26) * direction;
  const preserve = key.preserve !== false;
  const steps = [];
  const output = transformLetters(input, (char, index) => {
    const x = letterToNumber(char);
    const y = mod(x + shift, 26);
    const result = numberToLetter(y);
    steps.push({
      index, kind: 'alphabet', title: `处理字母 ${char}`, input: char, output: result,
      formula: `(${x} ${direction > 0 ? '+' : '−'} ${Math.abs(shift)}) mod 26 = ${y}`,
      detail: `从 ${char} 沿字母表${direction > 0 ? '向右' : '向左'}移动 ${Math.abs(shift)} 格。`,
      data: { from: x, to: y, shift: Math.abs(shift), direction }
    });
    return result;
  }, preserve);
  return { output, normalized: String(input).toUpperCase(), steps };
}

export const encrypt = (input, key = {}) => run(input, key, 1);
export const decrypt = (input, key = {}) => run(input, key, -1);
export const createSteps = (mode, input, key = {}) => (mode === 'decrypt' ? decrypt : encrypt)(input, key).steps;

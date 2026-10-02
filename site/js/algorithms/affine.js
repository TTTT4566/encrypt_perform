import { gcd, mod, modInverse } from '../core/math.js';
import { letterToNumber, numberToLetter, requireLetters, transformLetters } from '../core/text.js';

export const meta = {
  id: 'affine', title: '仿射密码', code: '02', category: '替代密码', difficulty: '基础',
  summary: '用一次线性变换替代字母，关键是乘法系数必须在模 26 下可逆。',
  formula: 'E(x) = (ax + b) mod 26',
  note: '仍然保持单字母频率分布，无法抵抗频率分析。',
  defaults: { input: 'ATTACK AT DAWN', a: 5, b: 8, preserve: true },
  keyFields: [
    { name: 'a', label: '乘数 a', type: 'number', min: 1, max: 25, value: 5 },
    { name: 'b', label: '偏移 b', type: 'number', min: 0, max: 25, value: 8 }
  ]
};

export function validate(input, key = {}) {
  requireLetters(input);
  const a = Number(key.a);
  const b = Number(key.b);
  if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error('a 和 b 必须是整数');
  if (gcd(a, 26) !== 1) throw new Error('a 必须与 26 互素，才能进行解密');
}

function run(input, key = {}, decrypting = false) {
  validate(input, key);
  const a = mod(Number(key.a), 26);
  const b = mod(Number(key.b), 26);
  const inverse = decrypting ? modInverse(a, 26) : null;
  const steps = [];
  const output = transformLetters(input, (char, index) => {
    const x = letterToNumber(char);
    const y = decrypting ? mod(inverse * (x - b), 26) : mod(a * x + b, 26);
    const result = numberToLetter(y);
    steps.push({
      index, kind: 'formula', title: `处理字母 ${char}`, input: char, output: result,
      formula: decrypting
        ? `${inverse} × (${x} − ${b}) mod 26 = ${y}`
        : `(${a} × ${x} + ${b}) mod 26 = ${y}`,
      detail: decrypting ? `${a} 在模 26 下的逆元是 ${inverse}。` : `先乘 ${a}，再加 ${b}。`,
      data: { from: x, to: y, a, b, inverse }
    });
    return result;
  }, key.preserve !== false);
  return { output, normalized: String(input).toUpperCase(), steps };
}

export const encrypt = (input, key = {}) => run(input, key, false);
export const decrypt = (input, key = {}) => run(input, key, true);
export const createSteps = (mode, input, key = {}) => (mode === 'decrypt' ? decrypt : encrypt)(input, key).steps;

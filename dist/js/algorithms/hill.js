import { gcd, mod, modInverse } from '../core/math.js';
import { letterToNumber, numberToLetter, requireLetters } from '../core/text.js';

export const meta = {
  id: 'hill', title: 'Hill 密码', code: '05', category: '数学与置换', difficulty: '进阶',
  summary: '把字母组成向量，用可逆矩阵一次混合多个字符。',
  formula: 'C = K · M (mod 26)',
  note: '已知足够多的明密文向量后，可以通过线性代数恢复密钥矩阵。',
  defaults: { input: 'HELP', m00: 3, m01: 3, m10: 2, m11: 5, preserve: false },
  keyFields: [
    { name: 'm00', label: '矩阵 a', type: 'number', value: 3 },
    { name: 'm01', label: '矩阵 b', type: 'number', value: 3 },
    { name: 'm10', label: '矩阵 c', type: 'number', value: 2 },
    { name: 'm11', label: '矩阵 d', type: 'number', value: 5 }
  ]
};

function parseMatrix(key = {}) {
  const raw = key.matrix ?? [[key.m00, key.m01], [key.m10, key.m11]];
  const matrix = raw.map((row) => row.map(Number));
  if (matrix.length !== 2 || matrix.some((row) => row.length !== 2 || row.some((value) => !Number.isInteger(value)))) {
    throw new Error('Hill 密钥必须是 2×2 整数矩阵');
  }
  return matrix.map((row) => row.map((value) => mod(value, 26)));
}

export function validate(input, key = {}, decrypting = false) {
  const letters = requireLetters(input);
  if (decrypting && letters.length % 2 !== 0) throw new Error('Hill 密文长度必须是偶数');
  const [[a, b], [c, d]] = parseMatrix(key);
  const determinant = mod(a * d - b * c, 26);
  if (gcd(determinant, 26) !== 1) throw new Error('密钥矩阵在模 26 下不可逆');
}

function inverseMatrix(matrix) {
  const [[a, b], [c, d]] = matrix;
  const determinant = mod(a * d - b * c, 26);
  const inverse = modInverse(determinant, 26);
  return [[mod(inverse * d, 26), mod(-inverse * b, 26)], [mod(-inverse * c, 26), mod(inverse * a, 26)]];
}

function run(input, key = {}, decrypting = false) {
  validate(input, key, decrypting);
  const originalMatrix = parseMatrix(key);
  const matrix = decrypting ? inverseMatrix(originalMatrix) : originalMatrix;
  let letters = requireLetters(input);
  const padded = !decrypting && letters.length % 2 !== 0;
  if (padded) letters += 'X';
  const steps = [];
  let output = '';
  for (let index = 0; index < letters.length; index += 2) {
    const pair = letters.slice(index, index + 2);
    const vector = [...pair].map(letterToNumber);
    const resultVector = [
      mod(matrix[0][0] * vector[0] + matrix[0][1] * vector[1], 26),
      mod(matrix[1][0] * vector[0] + matrix[1][1] * vector[1], 26)
    ];
    const result = resultVector.map(numberToLetter).join('');
    output += result;
    steps.push({
      index: index / 2, kind: 'matrix', title: `向量 ${pair}`, input: pair, output: result,
      formula: `[${matrix[0].join(' ')}; ${matrix[1].join(' ')}] × [${vector.join(', ')}] mod 26 = [${resultVector.join(', ')}]`,
      detail: decrypting ? '使用密钥矩阵的模逆矩阵恢复字母。' : '用密钥矩阵乘以当前字母向量。',
      data: { matrix, vector, resultVector, pair, result }
    });
  }
  return { output, normalized: letters, steps, padded, matrix };
}

export const encrypt = (input, key = {}) => run(input, key, false);
export const decrypt = (input, key = {}) => run(input, key, true);
export const createSteps = (mode, input, key = {}) => (mode === 'decrypt' ? decrypt : encrypt)(input, key).steps;

import { mod } from '../core/math.js';
import { letterToNumber, normalizeLetters, numberToLetter, requireLetters, transformLetters } from '../core/text.js';

const WIRINGS = [
  'EKMFLGDQVZNTOWYHXUSPAIBRCJ',
  'AJDKSIRUXBLHWTMCQGZNPYFVOE',
  'BDFHJLCPRTXVZNYEIWGAKMUSQO'
].map((wiring) => [...wiring].map(letterToNumber));
const INVERSES = WIRINGS.map((wiring) => {
  const inverse = Array(26);
  wiring.forEach((value, index) => { inverse[value] = index; });
  return inverse;
});
const REFLECTOR = [...'YRUHQSLDPXNGOKMIEBFZCWVJAT'].map(letterToNumber);

export const meta = {
  id: 'rotor', title: '转轮机密码', code: '08', category: '密钥流与机械', difficulty: '进阶',
  summary: '每处理一个字母，转轮位置都会改变，让替代关系随时间不断变化。',
  formula: '键盘 → 转轮 III → II → I → 反射器 → I → II → III',
  note: '这是三转轮教学模型，不是历史 Enigma 的完整机械复刻。',
  defaults: { input: 'SECRETMESSAGE', positions: 'AAA', preserve: true },
  keyFields: [{ name: 'positions', label: '初始位置', type: 'text', value: 'AAA', maxlength: 3, placeholder: '三个字母，如 AAA' }]
};

export function validate(input, key = {}) {
  requireLetters(input);
  if (!/^[A-Za-z]{3}$/.test(String(key.positions ?? ''))) throw new Error('初始位置必须是三个英文字母');
}

function throughRotor(value, rotor, position, inverse = false) {
  const shifted = mod(value + position, 26);
  const wired = (inverse ? INVERSES : WIRINGS)[rotor][shifted];
  return mod(wired - position, 26);
}

function stepPositions(positions) {
  positions[2] = mod(positions[2] + 1, 26);
  if (positions[2] === 0) {
    positions[1] = mod(positions[1] + 1, 26);
    if (positions[1] === 0) positions[0] = mod(positions[0] + 1, 26);
  }
}

function processValue(value, positions) {
  const path = [value];
  let current = value;
  for (const rotor of [2, 1, 0]) {
    current = throughRotor(current, rotor, positions[rotor]);
    path.push(current);
  }
  current = REFLECTOR[current];
  path.push(current);
  for (const rotor of [0, 1, 2]) {
    current = throughRotor(current, rotor, positions[rotor], true);
    path.push(current);
  }
  return { value: current, path };
}

function run(input, key = {}) {
  validate(input, key);
  const initial = normalizeLetters(key.positions);
  const positions = [...initial].map(letterToNumber);
  const steps = [];
  const output = transformLetters(input, (char, index) => {
    const before = positions.map(numberToLetter);
    stepPositions(positions);
    const after = positions.map(numberToLetter);
    const transformed = processValue(letterToNumber(char), positions);
    const result = numberToLetter(transformed.value);
    steps.push({
      index, kind: 'rotor', title: `按下 ${char}`, input: char, output: result,
      formula: `${char} → ${transformed.path.slice(1, 4).map(numberToLetter).join(' → ')} → 反射 → ${transformed.path.slice(4).map(numberToLetter).join(' → ')}`,
      detail: `处理前转轮为 ${before.join('')}，推进后为 ${after.join('')}。`,
      data: { before, after, path: transformed.path.map(numberToLetter), result }
    });
    return result;
  }, key.preserve !== false);
  return { output, normalized: String(input).toUpperCase(), steps, initial };
}

export const encrypt = (input, key = {}) => run(input, key);
export const decrypt = (input, key = {}) => run(input, key);
export const createSteps = (mode, input, key = {}) => (mode === 'decrypt' ? decrypt : encrypt)(input, key).steps;

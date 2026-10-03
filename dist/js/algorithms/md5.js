import { assertMaxBytes, bytesToHex, utf8ToBytes } from '../core/bytes.js';

const INITIAL_STATE = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
const SHIFTS = [
  7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
  5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
  4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
  6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21
];
const CONSTANTS = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0);

function normalizeBytes(bytes) {
  const normalized = Array.from(bytes ?? []);
  if (normalized.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new Error('MD5 输入只能包含 0 到 255 的字节');
  }
  return normalized;
}

function add32(...values) {
  return values.reduce((sum, value) => (sum + (value >>> 0)) >>> 0, 0);
}

function rotateLeft(value, amount) {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

function hexWord(value) {
  return (value >>> 0).toString(16).padStart(8, '0');
}

function padMessage(bytes) {
  const padded = normalizeBytes(bytes);
  const bitLength = BigInt(padded.length) * 8n;
  padded.push(0x80);
  while (padded.length % 64 !== 56) padded.push(0);
  for (let shift = 0n; shift <= 56n; shift += 8n) {
    padded.push(Number((bitLength >> shift) & 0xffn));
  }
  return padded;
}

function blockWords(block) {
  return Array.from({ length: 16 }, (_, index) => {
    const offset = index * 4;
    return (
      block[offset] |
      (block[offset + 1] << 8) |
      (block[offset + 2] << 16) |
      (block[offset + 3] << 24)
    ) >>> 0;
  });
}

function wordsToLittleEndianBytes(words) {
  return words.flatMap((word) => [word & 0xff, (word >>> 8) & 0xff, (word >>> 16) & 0xff, word >>> 24]);
}

function paddingStep(source, padded) {
  return {
    kind: 'padding',
    title: 'MD5 消息填充',
    input: `${source.length} 字节`,
    output: `${padded.length} 字节 / ${padded.length / 64} 个分组`,
    formula: 'M || 1 || 0…0 || length₆₄(le)',
    detail: '追加 1 位和 0 位，再以小端格式写入原消息的 64 位长度。',
    data: { sourceLength: source.length, paddedLength: padded.length, bytes: padded.slice(), endian: 'little' }
  };
}

function wordStep(blockIndex, wordIndex, value) {
  return {
    kind: 'message-word',
    title: `分组 ${blockIndex + 1} · M[${wordIndex}]`,
    input: `字节 ${wordIndex * 4}–${wordIndex * 4 + 3}`,
    output: hexWord(value),
    formula: 'M[i] = littleEndian32(block[4i..4i+3])',
    detail: 'MD5 将每个 512 位分组解释为 16 个小端 32 位消息字。',
    data: { blockIndex, wordIndex, value: hexWord(value), endian: 'little' }
  };
}

function registerStep(blockIndex, operation, wordIndex, registers, mixed, rotated) {
  const [a, b, c, d] = registers;
  return {
    kind: 'registers',
    title: `分组 ${blockIndex + 1} · 操作 ${operation + 1}/64`,
    input: `M[${wordIndex}], K[${operation}], s=${SHIFTS[operation]}`,
    output: registers.map(hexWord).join(' '),
    formula: 'B = B + leftRotate(A + F(B,C,D) + K[i] + M[g], s[i])',
    detail: `第 ${Math.floor(operation / 16) + 1} 轮布尔函数更新 A、B、C、D。`,
    data: {
      blockIndex,
      operation,
      round: Math.floor(operation / 16),
      wordIndex,
      a: hexWord(a), b: hexWord(b), c: hexWord(c), d: hexWord(d),
      mixed: hexWord(mixed), rotated: hexWord(rotated)
    }
  };
}

export function md5Bytes(bytes, withSteps = false) {
  const source = normalizeBytes(bytes);
  const padded = padMessage(source);
  const state = INITIAL_STATE.slice();
  const steps = withSteps ? [paddingStep(source, padded)] : [];

  for (let offset = 0; offset < padded.length; offset += 64) {
    const blockIndex = offset / 64;
    const words = blockWords(padded.slice(offset, offset + 64));
    if (withSteps) words.forEach((value, wordIndex) => steps.push(wordStep(blockIndex, wordIndex, value)));

    let [a, b, c, d] = state;
    for (let operation = 0; operation < 64; operation += 1) {
      let f;
      let wordIndex;
      if (operation < 16) {
        f = ((b & c) | (~b & d)) >>> 0;
        wordIndex = operation;
      } else if (operation < 32) {
        f = ((d & b) | (~d & c)) >>> 0;
        wordIndex = (5 * operation + 1) % 16;
      } else if (operation < 48) {
        f = (b ^ c ^ d) >>> 0;
        wordIndex = (3 * operation + 5) % 16;
      } else {
        f = (c ^ (b | ~d)) >>> 0;
        wordIndex = (7 * operation) % 16;
      }

      const mixed = add32(a, f, CONSTANTS[operation], words[wordIndex]);
      const rotated = rotateLeft(mixed, SHIFTS[operation]);
      const previousD = d;
      d = c;
      c = b;
      b = add32(b, rotated);
      a = previousD;
      if (withSteps) steps.push(registerStep(blockIndex, operation, wordIndex, [a, b, c, d], mixed, rotated));
    }

    const registers = [a, b, c, d];
    for (let index = 0; index < 4; index += 1) state[index] = add32(state[index], registers[index]);
    if (withSteps) {
      steps.push({
        kind: 'hash-state',
        title: `累计分组 ${blockIndex + 1} 的 MD5 状态`,
        input: registers.map(hexWord).join(' '),
        output: state.map(hexWord).join(' '),
        formula: 'stateᵢ = stateᵢ + workingᵢ mod 2³²',
        detail: '把 64 次操作后的四个工作寄存器相加到链式状态。',
        data: { blockIndex, state: state.map(hexWord) }
      });
    }
  }

  const digest = wordsToLittleEndianBytes(state);
  if (!withSteps) return digest;
  const result = bytesToHex(digest);
  steps.push({
    kind: 'digest',
    title: '输出 MD5 摘要',
    input: state.map(hexWord).join(' '),
    output: result,
    formula: 'digest = LE(A) || LE(B) || LE(C) || LE(D)',
    detail: '将四个 32 位状态字按小端顺序拼接为 128 位摘要。',
    data: { bytes: digest.slice(), result, endian: 'little' }
  });
  steps.forEach((step, index) => { step.index = index; });
  return { digest, steps };
}

export const meta = {
  id: 'md5', title: 'MD5', code: '14', category: '现代哈希函数', difficulty: '进阶',
  modes: ['hash'], showPreserveOption: false,
  summary: '观察 MD5 的小端填充、四轮布尔函数与 64 次寄存器操作。',
  formula: 'Stateᵢ = Compress(Stateᵢ₋₁, Mᵢ)',
  note: 'MD5 已被证明不安全，不能用于数字签名、证书或抗碰撞安全场景。',
  defaults: { input: 'message digest', key: {} },
  keyFields: []
};

export function hash(input) {
  const source = assertMaxBytes(utf8ToBytes(input), 256);
  const { digest, steps } = md5Bytes(source, true);
  return {
    output: bytesToHex(digest),
    normalized: String(input ?? ''),
    steps,
    details: { byteCount: source.length, blockCount: Math.ceil((source.length + 9) / 64) }
  };
}

export function createSteps(_mode, input) {
  return hash(input).steps;
}

import { assertMaxBytes, bytesToHex, utf8ToBytes } from '../core/bytes.js';

const INITIAL_STATE = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];

const ROUND_CONSTANTS = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
];

function normalizeBytes(bytes) {
  const normalized = Array.from(bytes ?? []);
  if (normalized.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new Error('SHA-256 输入只能包含 0 到 255 的字节');
  }
  return normalized;
}

function rotateRight(value, amount) {
  return ((value >>> amount) | (value << (32 - amount))) >>> 0;
}

function add32(...values) {
  return values.reduce((sum, value) => (sum + (value >>> 0)) >>> 0, 0);
}

function hexWord(value) {
  return (value >>> 0).toString(16).padStart(8, '0');
}

function padMessage(bytes) {
  const padded = normalizeBytes(bytes);
  const bitLength = BigInt(padded.length) * 8n;
  padded.push(0x80);
  while (padded.length % 64 !== 56) padded.push(0);
  for (let shift = 56n; shift >= 0n; shift -= 8n) {
    padded.push(Number((bitLength >> shift) & 0xffn));
  }
  return padded;
}

function wordsToBytes(words) {
  return words.flatMap((word) => [word >>> 24, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff]);
}

function scheduleForBlock(block) {
  const schedule = new Array(64);
  for (let index = 0; index < 16; index += 1) {
    const offset = index * 4;
    schedule[index] = (
      (block[offset] << 24) |
      (block[offset + 1] << 16) |
      (block[offset + 2] << 8) |
      block[offset + 3]
    ) >>> 0;
  }
  for (let index = 16; index < 64; index += 1) {
    const s0 = (rotateRight(schedule[index - 15], 7) ^ rotateRight(schedule[index - 15], 18) ^ (schedule[index - 15] >>> 3)) >>> 0;
    const s1 = (rotateRight(schedule[index - 2], 17) ^ rotateRight(schedule[index - 2], 19) ^ (schedule[index - 2] >>> 10)) >>> 0;
    schedule[index] = add32(schedule[index - 16], s0, schedule[index - 7], s1);
  }
  return schedule;
}

function paddingStep(source, padded) {
  return {
    kind: 'padding',
    title: 'SHA-256 消息填充',
    input: `${source.length} 字节`,
    output: `${padded.length} 字节 / ${padded.length / 64} 个分组`,
    formula: 'M || 1 || 0…0 || length₆₄',
    detail: '追加 1 位、若干 0 位和 64 位大端消息长度，使总长度成为 512 位的整数倍。',
    data: { sourceLength: source.length, paddedLength: padded.length, bytes: padded.slice() }
  };
}

function scheduleStep(blockIndex, wordIndex, value) {
  return {
    kind: 'message-schedule',
    title: `分组 ${blockIndex + 1} · W[${wordIndex}]`,
    input: wordIndex < 16 ? '消息分组中的大端字' : `W[${wordIndex - 16}], W[${wordIndex - 15}], W[${wordIndex - 7}], W[${wordIndex - 2}]`,
    output: hexWord(value),
    formula: wordIndex < 16 ? 'W[t] = M[t]' : 'W[t] = σ₁(W[t−2]) + W[t−7] + σ₀(W[t−15]) + W[t−16]',
    detail: 'SHA-256 为每个 512 位分组扩展出 64 个 32 位消息字。',
    data: { blockIndex, wordIndex, value: hexWord(value) }
  };
}

function registerStep(blockIndex, round, registers, temporary1, temporary2) {
  const [a, b, c, d, e, f, g, h] = registers;
  return {
    kind: 'registers',
    title: `分组 ${blockIndex + 1} · 压缩轮 ${round + 1}/64`,
    input: `T1=${hexWord(temporary1)}, T2=${hexWord(temporary2)}`,
    output: registers.map(hexWord).join(' '),
    formula: 'T₁=h+Σ₁(e)+Ch(e,f,g)+K[t]+W[t]；T₂=Σ₀(a)+Maj(a,b,c)',
    detail: '更新 a 到 h 八个 32 位工作寄存器。',
    data: {
      blockIndex,
      round,
      a: hexWord(a), b: hexWord(b), c: hexWord(c), d: hexWord(d),
      e: hexWord(e), f: hexWord(f), g: hexWord(g), h: hexWord(h),
      temporary1: hexWord(temporary1), temporary2: hexWord(temporary2)
    }
  };
}

export function sha256Bytes(bytes, withSteps = false) {
  const source = normalizeBytes(bytes);
  const padded = padMessage(source);
  const state = INITIAL_STATE.slice();
  const steps = withSteps ? [paddingStep(source, padded)] : [];

  for (let offset = 0; offset < padded.length; offset += 64) {
    const blockIndex = offset / 64;
    const schedule = scheduleForBlock(padded.slice(offset, offset + 64));
    if (withSteps) schedule.forEach((value, wordIndex) => steps.push(scheduleStep(blockIndex, wordIndex, value)));

    let [a, b, c, d, e, f, g, h] = state;
    for (let round = 0; round < 64; round += 1) {
      const sigma1 = (rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)) >>> 0;
      const choose = ((e & f) ^ (~e & g)) >>> 0;
      const temporary1 = add32(h, sigma1, choose, ROUND_CONSTANTS[round], schedule[round]);
      const sigma0 = (rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)) >>> 0;
      const majority = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temporary2 = add32(sigma0, majority);
      h = g;
      g = f;
      f = e;
      e = add32(d, temporary1);
      d = c;
      c = b;
      b = a;
      a = add32(temporary1, temporary2);
      if (withSteps) steps.push(registerStep(blockIndex, round, [a, b, c, d, e, f, g, h], temporary1, temporary2));
    }

    const registers = [a, b, c, d, e, f, g, h];
    for (let index = 0; index < 8; index += 1) state[index] = add32(state[index], registers[index]);
    if (withSteps) {
      steps.push({
        kind: 'hash-state',
        title: `累计分组 ${blockIndex + 1} 的哈希状态`,
        input: registers.map(hexWord).join(' '),
        output: state.map(hexWord).join(' '),
        formula: 'Hᵢ = Hᵢ + workingᵢ mod 2³²',
        detail: '把本分组压缩后的工作寄存器逐字相加到链式状态中。',
        data: { blockIndex, state: state.map(hexWord) }
      });
    }
  }

  const digest = wordsToBytes(state);
  if (!withSteps) return digest;
  const result = bytesToHex(digest);
  steps.push({
    kind: 'digest',
    title: '输出 SHA-256 摘要',
    input: state.map(hexWord).join(' '),
    output: result,
    formula: 'digest = H₀ || H₁ || … || H₇',
    detail: '按大端顺序拼接八个 32 位状态字，得到 256 位摘要。',
    data: { bytes: digest.slice(), result }
  });
  steps.forEach((step, index) => { step.index = index; });
  return { digest, steps };
}

export const meta = {
  id: 'sha256', title: 'SHA-256', code: '13', category: '现代哈希函数', difficulty: '进阶',
  modes: ['hash'], showPreserveOption: false,
  summary: '从消息填充、消息扩展到 64 轮压缩，完整观察 SHA-256 摘要生成。',
  formula: 'Hᵢ = Compress(Hᵢ₋₁, Mᵢ)',
  note: '哈希是单向摘要，不提供解密操作。',
  defaults: { input: 'abc', key: {} },
  keyFields: []
};

export function hash(input) {
  const source = assertMaxBytes(utf8ToBytes(input), 256);
  const { digest, steps } = sha256Bytes(source, true);
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

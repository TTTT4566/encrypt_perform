import { assertMaxBytes, bytesToHex, bytesToUtf8, hexToBytes, pkcs7Pad, pkcs7Unpad, utf8ToBytes } from '../core/bytes.js';

const SBOX = [
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
];

const INV_SBOX = Array.from({ length: 256 });
SBOX.forEach((value, index) => { INV_SBOX[value] = index; });
const RCON = [0x00,0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

function requireBlock(bytes, label) {
  const block = Array.from(bytes ?? []);
  if (block.length !== 16 || block.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new Error(`${label}必须恰好包含 16 个字节`);
  }
  return block;
}

function xorWords(left, right) {
  return left.map((value, index) => value ^ right[index]);
}

function rotateWord(word) {
  return [word[1], word[2], word[3], word[0]];
}

function substituteWord(word) {
  return word.map((value) => SBOX[value]);
}

export function expandKey(keyBytes) {
  const key = requireBlock(keyBytes, 'AES-128 密钥');
  const words = Array.from({ length: 4 }, (_, index) => key.slice(index * 4, index * 4 + 4));
  for (let index = 4; index < 44; index += 1) {
    let temporary = words[index - 1].slice();
    if (index % 4 === 0) {
      temporary = substituteWord(rotateWord(temporary));
      temporary[0] ^= RCON[index / 4];
    }
    words.push(xorWords(words[index - 4], temporary));
  }
  return Array.from({ length: 11 }, (_, round) => words.slice(round * 4, round * 4 + 4).flat());
}

function addRoundKey(state, roundKey) {
  return state.map((value, index) => value ^ roundKey[index]);
}

function substituteBytes(state, box) {
  return state.map((value) => box[value]);
}

function shiftRows(state, inverse = false) {
  const output = new Array(16);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const sourceColumn = (column + (inverse ? 4 - row : row)) % 4;
      output[row + 4 * column] = state[row + 4 * sourceColumn];
    }
  }
  return output;
}

function multiply(left, right) {
  let a = left;
  let b = right;
  let result = 0;
  while (b > 0) {
    if (b & 1) result ^= a;
    a = (a << 1) ^ (a & 0x80 ? 0x11b : 0);
    b >>= 1;
  }
  return result & 0xff;
}

function mixColumns(state, inverse = false) {
  const matrix = inverse
    ? [[14,11,13,9],[9,14,11,13],[13,9,14,11],[11,13,9,14]]
    : [[2,3,1,1],[1,2,3,1],[1,1,2,3],[3,1,1,2]];
  const output = new Array(16);
  for (let column = 0; column < 4; column += 1) {
    const values = state.slice(column * 4, column * 4 + 4);
    for (let row = 0; row < 4; row += 1) {
      output[column * 4 + row] = matrix[row].reduce((sum, coefficient, index) => sum ^ multiply(values[index], coefficient), 0);
    }
  }
  return output;
}

function record(recorder, operation, round, state, roundKey = null) {
  recorder?.({ operation, round, state: state.slice(), roundKey: roundKey?.slice() ?? null });
}

function encryptWithRoundKeys(block, roundKeys, recorder) {
  let state = requireBlock(block, 'AES 分组');
  record(recorder, 'Input', 0, state);
  state = addRoundKey(state, roundKeys[0]);
  record(recorder, 'AddRoundKey', 0, state, roundKeys[0]);
  for (let round = 1; round <= 9; round += 1) {
    state = substituteBytes(state, SBOX);
    record(recorder, 'SubBytes', round, state);
    state = shiftRows(state);
    record(recorder, 'ShiftRows', round, state);
    state = mixColumns(state);
    record(recorder, 'MixColumns', round, state);
    state = addRoundKey(state, roundKeys[round]);
    record(recorder, 'AddRoundKey', round, state, roundKeys[round]);
  }
  state = substituteBytes(state, SBOX);
  record(recorder, 'SubBytes', 10, state);
  state = shiftRows(state);
  record(recorder, 'ShiftRows', 10, state);
  state = addRoundKey(state, roundKeys[10]);
  record(recorder, 'AddRoundKey', 10, state, roundKeys[10]);
  return state;
}

function decryptWithRoundKeys(block, roundKeys, recorder) {
  let state = requireBlock(block, 'AES 分组');
  record(recorder, 'Input', 10, state);
  state = addRoundKey(state, roundKeys[10]);
  record(recorder, 'AddRoundKey', 10, state, roundKeys[10]);
  for (let round = 9; round >= 1; round -= 1) {
    state = shiftRows(state, true);
    record(recorder, 'InvShiftRows', round, state);
    state = substituteBytes(state, INV_SBOX);
    record(recorder, 'InvSubBytes', round, state);
    state = addRoundKey(state, roundKeys[round]);
    record(recorder, 'AddRoundKey', round, state, roundKeys[round]);
    state = mixColumns(state, true);
    record(recorder, 'InvMixColumns', round, state);
  }
  state = shiftRows(state, true);
  record(recorder, 'InvShiftRows', 0, state);
  state = substituteBytes(state, INV_SBOX);
  record(recorder, 'InvSubBytes', 0, state);
  state = addRoundKey(state, roundKeys[0]);
  record(recorder, 'AddRoundKey', 0, state, roundKeys[0]);
  return state;
}

export function encryptBlock(blockBytes, keyBytes) {
  return encryptWithRoundKeys(blockBytes, expandKey(keyBytes));
}

export function decryptBlock(blockBytes, keyBytes) {
  return decryptWithRoundKeys(blockBytes, expandKey(keyBytes));
}


export const meta = {
  id: 'aes', title: 'AES-128', code: '10', category: '现代分组密码', difficulty: '进阶',
  modes: ['encrypt', 'decrypt'], showPreserveOption: false,
  summary: '以 128 位分组和 128 位密钥展示 AES 的十轮字节与矩阵变换。',
  formula: 'Stateᵣ = Round(Stateᵣ₋₁, Kᵣ)',
  note: 'ECB 会泄露数据模式，本实验仅用于观察 AES 核心轮函数。',
  defaults: { input: 'Two One Nine Two', key: 'Thats my Kung Fu' },
  keyFields: [{ name: 'key', label: '16 字节密钥', type: 'text', value: 'Thats my Kung Fu' }]
};

function parseKey(key = {}) {
  const keyBytes = utf8ToBytes(key.key ?? '');
  if (keyBytes.length !== 16) throw new Error('AES-128 密钥必须恰好是 16 个 UTF-8 字节');
  return keyBytes;
}

function keyScheduleSteps(roundKeys) {
  return roundKeys.map((roundKey, round) => ({
    index: round,
    kind: 'key-schedule',
    title: `轮密钥 K${round}`,
    input: round === 0 ? '原始密钥' : `K${round - 1}`,
    output: bytesToHex(roundKey, true),
    formula: round === 0 ? 'K₀ = 原始 128 位密钥' : `K${round} = KeyExpansion(K${round - 1})`,
    detail: `AES-128 的第 ${round} 个 128 位轮密钥。`,
    data: { round, roundKey: roundKey.slice() }
  }));
}

function stateStep(recorded, blockIndex) {
  const stateHex = bytesToHex(recorded.state, true);
  return {
    kind: 'state-matrix',
    title: `分组 ${blockIndex + 1} · 第 ${recorded.round} 轮 ${recorded.operation}`,
    input: stateHex,
    output: stateHex,
    formula: recorded.operation,
    detail: `以列优先顺序显示当前 4×4 AES 状态矩阵。`,
    data: {
      blockIndex,
      round: recorded.round,
      operation: recorded.operation,
      state: recorded.state.slice(),
      roundKey: recorded.roundKey?.slice() ?? null
    }
  };
}

function resultStep(mode, input, output, bytes) {
  return {
    kind: 'byte-grid',
    title: mode === 'encrypt' ? '拼接密文分组' : '移除填充并解码',
    input,
    output,
    formula: mode === 'encrypt' ? 'Ciphertext = C₀ || C₁ || …' : 'UTF-8(PKCS#7⁻¹(P))',
    detail: mode === 'encrypt' ? '所有加密分组按原顺序拼接为十六进制密文。' : '验证并移除 PKCS#7 填充，再按 UTF-8 恢复文本。',
    data: { mode, bytes: bytes.slice(), result: output }
  };
}

export function encrypt(input, key = {}) {
  const keyBytes = parseKey(key);
  const sourceBytes = assertMaxBytes(utf8ToBytes(input), 256);
  const padded = pkcs7Pad(sourceBytes, 16);
  const roundKeys = expandKey(keyBytes);
  const steps = keyScheduleSteps(roundKeys);
  steps.push({
    kind: 'byte-grid',
    title: 'UTF-8 编码与 PKCS#7 填充',
    input: String(input ?? ''),
    output: bytesToHex(padded, true),
    formula: `padding = ${padded.length - sourceBytes.length}`,
    detail: `原始 ${sourceBytes.length} 字节，填充后 ${padded.length} 字节。`,
    data: { mode: 'padding', source: sourceBytes.slice(), bytes: padded.slice() }
  });

  const encryptedBytes = [];
  for (let offset = 0; offset < padded.length; offset += 16) {
    const blockIndex = offset / 16;
    const block = padded.slice(offset, offset + 16);
    const encryptedBlock = encryptWithRoundKeys(block, roundKeys, (recorded) => {
      steps.push(stateStep(recorded, blockIndex));
    });
    encryptedBytes.push(...encryptedBlock);
  }

  const output = bytesToHex(encryptedBytes, true);
  steps.push(resultStep('encrypt', String(input ?? ''), output, encryptedBytes));
  steps.forEach((step, index) => { step.index = index; });
  return {
    output,
    normalized: String(input ?? ''),
    steps,
    details: { blocks: encryptedBytes.length / 16, paddingLength: padded.length - sourceBytes.length }
  };
}

export function decrypt(input, key = {}) {
  const keyBytes = parseKey(key);
  const cipherBytes = hexToBytes(input);
  if (cipherBytes.length === 0 || cipherBytes.length % 16 !== 0) {
    throw new Error('AES 密文长度必须是 16 字节的整数倍');
  }

  const roundKeys = expandKey(keyBytes);
  const steps = keyScheduleSteps(roundKeys);
  const paddedBytes = [];
  for (let offset = 0; offset < cipherBytes.length; offset += 16) {
    const blockIndex = offset / 16;
    const block = cipherBytes.slice(offset, offset + 16);
    const decryptedBlock = decryptWithRoundKeys(block, roundKeys, (recorded) => {
      steps.push(stateStep(recorded, blockIndex));
    });
    paddedBytes.push(...decryptedBlock);
  }

  const plainBytes = assertMaxBytes(pkcs7Unpad(paddedBytes, 16), 256);
  const output = bytesToUtf8(plainBytes);
  steps.push(resultStep('decrypt', String(input ?? ''), output, plainBytes));
  steps.forEach((step, index) => { step.index = index; });
  return {
    output,
    normalized: String(input ?? '').replace(/\s+/g, '').toUpperCase(),
    steps,
    details: { blocks: cipherBytes.length / 16, paddingLength: paddedBytes.length - plainBytes.length }
  };
}

export function createSteps(mode, input, key = {}) {
  return (mode === 'decrypt' ? decrypt : encrypt)(input, key).steps;
}


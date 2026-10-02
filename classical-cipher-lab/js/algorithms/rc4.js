import { assertMaxBytes, bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from '../core/bytes.js';

function normalizeBytes(bytes, label) {
  const normalized = Array.from(bytes ?? []);
  if (normalized.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new Error(`${label}只能包含 0 到 255 的整数`);
  }
  return normalized;
}

function stateWindow(state, i, j) {
  const indexes = new Set();
  for (const center of [i, j]) {
    for (let offset = -2; offset <= 2; offset += 1) indexes.add((center + offset + 256) % 256);
  }
  return [...indexes].slice(0, 9).sort((a, b) => a - b).map((index) => ({
    index,
    value: state[index],
    isI: index === i,
    isJ: index === j
  }));
}

function validateKeyBytes(keyBytes) {
  const key = normalizeBytes(keyBytes, 'RC4 密钥');
  if (key.length < 1 || key.length > 256) throw new Error('RC4 密钥长度必须是 1 到 256 个 UTF-8 字节');
  return key;
}

export function ksa(keyBytes) {
  const key = validateKeyBytes(keyBytes);
  const state = Array.from({ length: 256 }, (_, index) => index);
  const trace = [];
  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    j = (j + state[i] + key[i % key.length]) % 256;
    const leftBefore = state[i];
    const rightBefore = state[j];
    [state[i], state[j]] = [state[j], state[i]];
    trace.push({
      i,
      j,
      keyByte: key[i % key.length],
      leftBefore,
      rightBefore,
      leftAfter: state[i],
      rightAfter: state[j],
      window: stateWindow(state, i, j)
    });
  }
  return { state, trace };
}

export function applyRc4(inputBytes, keyBytes) {
  const source = normalizeBytes(inputBytes, 'RC4 输入');
  const { state, trace: ksaTrace } = ksa(keyBytes);
  const working = state.slice();
  const output = [];
  const prgaTrace = [];
  let i = 0;
  let j = 0;

  source.forEach((sourceByte, byteIndex) => {
    i = (i + 1) % 256;
    j = (j + working[i]) % 256;
    const leftBefore = working[i];
    const rightBefore = working[j];
    [working[i], working[j]] = [working[j], working[i]];
    const t = (working[i] + working[j]) % 256;
    const keyStreamByte = working[t];
    const resultByte = sourceByte ^ keyStreamByte;
    output.push(resultByte);
    prgaTrace.push({
      byteIndex,
      i,
      j,
      t,
      leftBefore,
      rightBefore,
      leftAfter: working[i],
      rightAfter: working[j],
      keyStreamByte,
      sourceByte,
      resultByte,
      window: stateWindow(working, i, j)
    });
  });

  return { output, ksaTrace, prgaTrace };
}

export const meta = {
  id: 'rc4', title: 'RC4', code: '11', category: '现代流密码', difficulty: '进阶',
  modes: ['encrypt', 'decrypt'], showPreserveOption: false,
  summary: '逐步观察 RC4 的 256 次密钥调度交换和伪随机密钥流生成。',
  formula: 'Cᵢ = Pᵢ ⊕ Kᵢ',
  note: 'RC4 已不再安全，本实验只用于理解置换状态与流密码结构。',
  defaults: { input: 'Plaintext', key: 'Key' },
  keyFields: [{ name: 'key', label: '密钥', type: 'text', value: 'Key' }]
};

function parseKey(key = {}) {
  return validateKeyBytes(utf8ToBytes(key.key ?? ''));
}

function ksaStep(entry) {
  return {
    kind: 'ksa-state',
    title: `KSA 交换 ${entry.i + 1}/256`,
    input: `i=${entry.i}, j=${entry.j}, key=${entry.keyByte}`,
    output: `S[${entry.i}]=${entry.leftAfter}, S[${entry.j}]=${entry.rightAfter}`,
    formula: 'j = (j + S[i] + key[i mod keyLength]) mod 256',
    detail: '更新 j 后交换 S[i] 与 S[j]；窗口只显示两个指针附近的状态。',
    data: { ...entry }
  };
}

function prgaStep(entry) {
  return {
    kind: 'prga-state',
    title: `PRGA 字节 ${entry.byteIndex + 1}`,
    input: entry.sourceByte.toString(16).padStart(2, '0').toUpperCase(),
    output: entry.resultByte.toString(16).padStart(2, '0').toUpperCase(),
    formula: `S[(S[i]+S[j]) mod 256] = ${entry.keyStreamByte}；${entry.sourceByte} ⊕ ${entry.keyStreamByte} = ${entry.resultByte}`,
    detail: '移动 i、j，交换状态，再从 S[t] 取出一个密钥流字节与输入异或。',
    data: { ...entry }
  };
}

function finalStep(mode, input, output, bytes) {
  return {
    kind: 'byte-grid',
    title: mode === 'encrypt' ? '输出十六进制密文' : '恢复 UTF-8 文本',
    input,
    output,
    formula: mode === 'encrypt' ? 'Hex(C₀ || C₁ || …)' : 'UTF-8(P₀ || P₁ || …)',
    detail: mode === 'encrypt' ? '将异或结果按大写十六进制拼接。' : '将异或恢复的字节严格按 UTF-8 解码。',
    data: { mode, bytes: bytes.slice(), result: output }
  };
}

function buildResult(mode, input, sourceBytes, keyBytes) {
  const applied = applyRc4(sourceBytes, keyBytes);
  const output = mode === 'encrypt' ? bytesToHex(applied.output, true) : bytesToUtf8(applied.output);
  const steps = [
    ...applied.ksaTrace.map(ksaStep),
    ...applied.prgaTrace.map(prgaStep),
    finalStep(mode, String(input ?? ''), output, applied.output)
  ];
  steps.forEach((step, index) => { step.index = index; });
  return {
    output,
    normalized: mode === 'encrypt' ? String(input ?? '') : String(input ?? '').replace(/\s+/g, '').toUpperCase(),
    steps,
    details: { ksaSteps: applied.ksaTrace.length, prgaSteps: applied.prgaTrace.length, byteCount: sourceBytes.length }
  };
}

export function encrypt(input, key = {}) {
  const sourceBytes = assertMaxBytes(utf8ToBytes(input), 256);
  return buildResult('encrypt', input, sourceBytes, parseKey(key));
}

export function decrypt(input, key = {}) {
  const sourceBytes = assertMaxBytes(hexToBytes(input), 256);
  return buildResult('decrypt', input, sourceBytes, parseKey(key));
}

export function createSteps(mode, input, key = {}) {
  return (mode === 'decrypt' ? decrypt : encrypt)(input, key).steps;
}

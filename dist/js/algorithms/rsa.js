import { assertMaxBytes, bytesToUtf8, utf8ToBytes } from '../core/bytes.js';
import { gcdBigInt, isPrime, modInverseBigInt, modPowBigInt } from '../core/modern-math.js';

const DEFAULT_KEY = { p: 61, q: 53, e: 17 };

function asInteger(value, label) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return BigInt(value.trim());
  throw new Error(`${label}必须是整数`);
}

function normalizeKey(key = {}) {
  return {
    p: asInteger(key.p ?? DEFAULT_KEY.p, 'p'),
    q: asInteger(key.q ?? DEFAULT_KEY.q, 'q'),
    e: asInteger(key.e ?? DEFAULT_KEY.e, 'e')
  };
}

export function deriveKeyPair(key = {}) {
  const { p, q, e } = normalizeKey(key);
  if (p === q) throw new Error('p 和 q 必须是两个不同的素数');
  if (!isPrime(p) || !isPrime(q)) throw new Error('p 和 q 必须都是素数');

  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  if (e <= 1n || e >= phi) throw new Error('e 必须满足 1 < e < φ(n)');
  if (gcdBigInt(e, phi) !== 1n) throw new Error('e 必须与 φ(n) 互素');
  if (n <= 255n) throw new Error('模数 n 必须大于 255，才能逐字节处理 UTF-8 数据');

  const d = modInverseBigInt(e, phi);
  return {
    p,
    q,
    e,
    n,
    phi,
    d,
    publicKey: { e, n },
    privateKey: { d, n }
  };
}

function validateBlock(value, modulus, label) {
  const block = asInteger(value, label);
  const n = asInteger(modulus, '模数 n');
  if (block < 0n || block >= n) throw new Error(`${label}必须在 [0, n) 范围内`);
  return { block, n };
}

export function encryptNumber(message, publicKey) {
  if (!publicKey) throw new Error('缺少 RSA 公钥');
  const { block, n } = validateBlock(message, publicKey.n, '明文数值');
  const e = asInteger(publicKey.e, '公钥指数 e');
  return modPowBigInt(block, e, n);
}

export function decryptNumber(cipher, privateKey) {
  if (!privateKey) throw new Error('缺少 RSA 私钥');
  const { block, n } = validateBlock(cipher, privateKey.n, '密文数值');
  const d = asInteger(privateKey.d, '私钥指数 d');
  return modPowBigInt(block, d, n);
}

export const meta = {
  id: 'rsa', title: 'RSA', code: '10', category: '现代公钥密码', difficulty: '进阶',
  modes: ['encrypt', 'decrypt'], showPreserveOption: false,
  summary: '用小素数逐字节演示 RSA 密钥生成和平方-乘模幂运算。',
  formula: 'c = mᵉ mod n，m = cᵈ mod n',
  note: '逐字节且无填充的 RSA 仅用于教学；真实系统必须使用 OAEP 等安全填充。',
  defaults: { input: 'RSA 密码', key: { ...DEFAULT_KEY } },
  keyFields: [
    { name: 'p', label: '素数 p', type: 'number', value: 61, min: 2 },
    { name: 'q', label: '素数 q', type: 'number', value: 53, min: 2 },
    { name: 'e', label: '公钥指数 e', type: 'number', value: 17, min: 2 }
  ]
};

function stringTrace(trace) {
  return trace.map((entry) => ({
    iteration: entry.iteration,
    exponent: entry.exponent.toString(),
    bit: entry.bit,
    factor: entry.factor.toString(),
    result: entry.result.toString()
  }));
}

function keyStep(pair) {
  return {
    index: 0,
    kind: 'key-derivation',
    title: '生成 RSA 密钥对',
    input: `p=${pair.p}, q=${pair.q}, e=${pair.e}`,
    output: `n=${pair.n}, φ(n)=${pair.phi}, d=${pair.d}`,
    formula: 'n=pq；φ(n)=(p−1)(q−1)；d=e⁻¹ mod φ(n)',
    detail: '先计算模数与欧拉函数，再用扩展欧几里得算法求私钥指数。',
    data: {
      p: pair.p.toString(),
      q: pair.q.toString(),
      e: pair.e.toString(),
      n: pair.n.toString(),
      phi: pair.phi.toString(),
      d: pair.d.toString()
    }
  };
}

function modularStep(mode, value, exponent, modulus, byteIndex) {
  const calculation = modPowBigInt(value, exponent, modulus, true);
  const result = calculation.result.toString();
  return {
    kind: 'modular-math',
    title: `${mode === 'encrypt' ? '加密' : '解密'}第 ${byteIndex + 1} 个字节块`,
    input: value.toString(),
    output: result,
    formula: `${value}^${exponent} mod ${modulus} = ${result}`,
    detail: '按指数二进制位执行平方-乘算法；每一行都是一次模乘状态。',
    data: {
      mode,
      byteIndex,
      base: value.toString(),
      exponent: exponent.toString(),
      modulus: modulus.toString(),
      result,
      trace: stringTrace(calculation.trace)
    }
  };
}

function resultStep(mode, input, output, values) {
  return {
    kind: 'byte-grid',
    title: mode === 'encrypt' ? '组合十进制密文块' : 'UTF-8 解码',
    input,
    output,
    formula: mode === 'encrypt' ? 'C = c₀ c₁ … cₙ' : 'text = UTF-8(m₀,m₁,…,mₙ)',
    detail: mode === 'encrypt' ? '每个 UTF-8 字节对应一个空格分隔的 RSA 密文整数。' : '将每个模幂结果恢复为字节，再严格按 UTF-8 解码。',
    data: { mode, values: values.map(String), result: output }
  };
}

function finalize(steps) {
  steps.forEach((step, index) => { step.index = index; });
  return steps;
}

export function encrypt(input, key = {}) {
  const pair = deriveKeyPair(key);
  const bytes = assertMaxBytes(utf8ToBytes(input), 256);
  const steps = [keyStep(pair)];
  const encrypted = bytes.map((byte, byteIndex) => {
    const step = modularStep('encrypt', BigInt(byte), pair.e, pair.n, byteIndex);
    steps.push(step);
    return BigInt(step.data.result);
  });
  const output = encrypted.map(String).join(' ');
  steps.push(resultStep('encrypt', String(input ?? ''), output, encrypted));
  return {
    output,
    normalized: String(input ?? ''),
    steps: finalize(steps),
    details: { byteCount: bytes.length, n: pair.n.toString(), d: pair.d.toString() }
  };
}

function parseCiphertext(input) {
  const normalized = String(input ?? '').trim();
  if (!normalized) throw new Error('RSA 十进制密文不能为空');
  const tokens = normalized.split(/\s+/);
  if (tokens.some((token) => !/^\d+$/.test(token))) {
    throw new Error('RSA 密文只能包含空格分隔的十进制整数');
  }
  if (tokens.length > 256) throw new Error('输入不能超过 256 个 RSA 密文块');
  return tokens.map((token) => BigInt(token));
}

export function decrypt(input, key = {}) {
  const pair = deriveKeyPair(key);
  const cipherBlocks = parseCiphertext(input);
  const steps = [keyStep(pair)];
  const bytes = cipherBlocks.map((block, byteIndex) => {
    validateBlock(block, pair.n, '密文数值');
    const step = modularStep('decrypt', block, pair.d, pair.n, byteIndex);
    steps.push(step);
    const value = BigInt(step.data.result);
    if (value > 255n) throw new Error('RSA 解密结果无法映射为 UTF-8 字节');
    return Number(value);
  });
  const output = bytesToUtf8(assertMaxBytes(bytes, 256));
  steps.push(resultStep('decrypt', String(input ?? ''), output, bytes));
  return {
    output,
    normalized: cipherBlocks.map(String).join(' '),
    steps: finalize(steps),
    details: { byteCount: bytes.length, n: pair.n.toString(), d: pair.d.toString() }
  };
}

export function createSteps(mode, input, key = {}) {
  return (mode === 'decrypt' ? decrypt : encrypt)(input, key).steps;
}

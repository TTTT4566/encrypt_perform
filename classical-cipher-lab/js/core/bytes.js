const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function normalizeBytes(bytes) {
  const normalized = Array.from(bytes ?? []);
  if (normalized.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new Error('字节数组只能包含 0 到 255 的整数');
  }
  return normalized;
}

function validateBlockSize(blockSize) {
  if (!Number.isInteger(blockSize) || blockSize < 1 || blockSize > 255) {
    throw new Error('分组长度必须是 1 到 255 的整数');
  }
}

export function utf8ToBytes(text) {
  return Array.from(encoder.encode(String(text ?? '')));
}

export function bytesToUtf8(bytes) {
  try {
    return decoder.decode(Uint8Array.from(normalizeBytes(bytes)));
  } catch (error) {
    throw new Error('字节序列不是合法的 UTF-8 文本', { cause: error });
  }
}

export function bytesToHex(bytes, uppercase = false) {
  const output = normalizeBytes(bytes).map((value) => value.toString(16).padStart(2, '0')).join('');
  return uppercase ? output.toUpperCase() : output;
}

export function hexToBytes(hex) {
  const normalized = String(hex ?? '').replace(/\s+/g, '');
  if (normalized.length % 2 !== 0) throw new Error('十六进制输入长度必须是偶数');
  if (!/^[0-9a-f]*$/i.test(normalized)) throw new Error('十六进制输入包含非法字符');
  return normalized.match(/.{2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? [];
}

export function assertMaxBytes(bytes, max = 256) {
  const normalized = normalizeBytes(bytes);
  if (!Number.isInteger(max) || max < 0) throw new Error('字节上限必须是非负整数');
  if (normalized.length > max) throw new Error(`输入不能超过 ${max} 个 UTF-8 字节`);
  return normalized;
}

export function pkcs7Pad(bytes, blockSize = 16) {
  validateBlockSize(blockSize);
  const normalized = normalizeBytes(bytes);
  const paddingLength = blockSize - (normalized.length % blockSize || 0);
  return normalized.concat(new Array(paddingLength).fill(paddingLength));
}

export function pkcs7Unpad(bytes, blockSize = 16) {
  validateBlockSize(blockSize);
  const normalized = normalizeBytes(bytes);
  if (normalized.length === 0 || normalized.length % blockSize !== 0) {
    throw new Error('PKCS#7 填充数据长度无效');
  }
  const paddingLength = normalized.at(-1);
  if (paddingLength < 1 || paddingLength > blockSize) throw new Error('PKCS#7 填充值无效');
  const padding = normalized.slice(-paddingLength);
  if (padding.some((value) => value !== paddingLength)) throw new Error('PKCS#7 填充内容无效');
  return normalized.slice(0, -paddingLength);
}

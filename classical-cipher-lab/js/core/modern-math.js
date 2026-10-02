function asBigInt(value, label = '数值') {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return BigInt(value.trim());
  throw new Error(`${label}必须是整数`);
}

function abs(value) {
  return value < 0n ? -value : value;
}

export function gcdBigInt(a, b) {
  let left = abs(asBigInt(a));
  let right = abs(asBigInt(b));
  while (right !== 0n) [left, right] = [right, left % right];
  return left;
}

export function extendedGcdBigInt(a, b) {
  const originalA = asBigInt(a);
  const originalB = asBigInt(b);
  let oldR = abs(originalA);
  let r = abs(originalB);
  let oldS = 1n;
  let s = 0n;
  let oldT = 0n;
  let t = 1n;

  while (r !== 0n) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
    [oldT, t] = [t, oldT - quotient * t];
  }

  return {
    gcd: oldR,
    x: originalA < 0n ? -oldS : oldS,
    y: originalB < 0n ? -oldT : oldT
  };
}

export function modInverseBigInt(value, modulus) {
  const mod = asBigInt(modulus, '模数');
  if (mod <= 1n) throw new Error('模数必须大于 1');
  const normalized = ((asBigInt(value) % mod) + mod) % mod;
  const { gcd, x } = extendedGcdBigInt(normalized, mod);
  if (gcd !== 1n) throw new Error('该数值在指定模数下不存在模逆元');
  return ((x % mod) + mod) % mod;
}

export function modPowBigInt(base, exponent, modulus, withTrace = false) {
  const mod = asBigInt(modulus, '模数');
  let power = asBigInt(exponent, '指数');
  if (mod <= 0n) throw new Error('模数必须大于 0');
  if (power < 0n) throw new Error('指数不能为负数');

  let factor = ((asBigInt(base, '底数') % mod) + mod) % mod;
  let result = 1n % mod;
  const trace = [];
  let iteration = 0;

  while (power > 0n) {
    const bit = power & 1n;
    if (bit === 1n) result = (result * factor) % mod;
    trace.push({ iteration, exponent: power, bit: Number(bit), factor, result });
    factor = (factor * factor) % mod;
    power >>= 1n;
    iteration += 1;
  }

  return withTrace ? { result, trace } : result;
}

export function isPrime(value) {
  const candidate = asBigInt(value);
  if (candidate < 2n) return false;
  if (candidate === 2n) return true;
  if (candidate % 2n === 0n) return false;
  for (let divisor = 3n; divisor * divisor <= candidate; divisor += 2n) {
    if (candidate % divisor === 0n) return false;
  }
  return true;
}

export function mod(value, base) {
  return ((value % base) + base) % base;
}

export function gcd(a, b) {
  let x = Math.abs(Number(a));
  let y = Math.abs(Number(b));
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

export function modInverse(value, base) {
  const normalized = mod(value, base);
  for (let candidate = 1; candidate < base; candidate += 1) {
    if (mod(normalized * candidate, base) === 1) return candidate;
  }
  throw new Error(`${value} 在模 ${base} 下不存在逆元`);
}

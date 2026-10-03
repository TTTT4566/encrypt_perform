export function parsePermutation(rawKey) {
  const source = String(rawKey ?? '');
  if (!/^\d+$/.test(source)) throw new Error('置换密钥必须只包含数字');
  if (source.length < 2 || source.length > 9) throw new Error('置换密钥长度必须为 2 到 9 位');
  const permutation = [...source].map(Number);
  const length = permutation.length;
  if (new Set(permutation).size !== length || permutation.some((value) => value < 1 || value > length)) {
    throw new Error(`置换密钥必须是 1 到 ${length} 的无重复排列`);
  }
  return permutation;
}

export function invertPermutation(permutation) {
  const inverse = Array(permutation.length);
  permutation.forEach((sourcePosition, targetPosition) => {
    inverse[sourcePosition - 1] = targetPosition + 1;
  });
  return inverse;
}

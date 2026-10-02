export function normalizeLetters(text, preserveNonLetters = false) {
  const source = String(text ?? '').toUpperCase();
  return preserveNonLetters ? source : source.replace(/[^A-Z]/g, '');
}

export function requireLetters(text, label = '消息') {
  const letters = normalizeLetters(text);
  if (!letters) throw new Error(`${label}中至少需要一个英文字母`);
  return letters;
}

export function transformLetters(text, transform, preserveNonLetters = true) {
  let letterIndex = 0;
  let output = '';
  for (const char of String(text ?? '').toUpperCase()) {
    if (/[A-Z]/.test(char)) {
      output += transform(char, letterIndex);
      letterIndex += 1;
    } else if (preserveNonLetters) {
      output += char;
    }
  }
  return output;
}

export function letterToNumber(char) {
  return char.charCodeAt(0) - 65;
}

export function numberToLetter(value) {
  return String.fromCharCode(65 + ((value % 26) + 26) % 26);
}

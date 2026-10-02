import { normalizeLetters, requireLetters } from '../core/text.js';

const ALPHABET = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';

export const meta = {
  id: 'playfair', title: 'Playfair 密码', code: '04', category: '替代密码', difficulty: '进阶',
  summary: '把明文拆成字母对，并根据它们在 5×5 密钥方阵中的位置进行替换。',
  formula: '同行右移 · 同列下移 · 矩形交换列',
  note: '双字母频率仍会泄露语言特征，现代计算可以快速破解。',
  defaults: { input: 'HIDE THE GOLD IN THE TREE STUMP', keyword: 'PLAYFAIR EXAMPLE', preserve: false },
  keyFields: [{ name: 'keyword', label: '方阵关键词', type: 'text', value: 'PLAYFAIR EXAMPLE', placeholder: '例如 MONARCHY' }]
};

export function buildSquare(keyword) {
  const source = (normalizeLetters(keyword).replaceAll('J', 'I') + ALPHABET);
  const letters = [...new Set(source)].filter((char) => ALPHABET.includes(char));
  const grid = Array.from({ length: 5 }, (_, row) => letters.slice(row * 5, row * 5 + 5));
  const positions = new Map();
  grid.forEach((line, row) => line.forEach((char, column) => positions.set(char, { row, column })));
  return { grid, positions };
}

export function preparePlaintext(input) {
  const letters = requireLetters(input).replaceAll('J', 'I');
  const pairs = [];
  for (let index = 0; index < letters.length;) {
    const first = letters[index];
    const second = letters[index + 1];
    if (!second) {
      pairs.push(`${first}X`);
      index += 1;
    } else if (first === second) {
      pairs.push(`${first}X`);
      index += 1;
    } else {
      pairs.push(first + second);
      index += 2;
    }
  }
  return { text: pairs.join(''), pairs };
}

export function validate(input, key = {}, decrypting = false) {
  const letters = requireLetters(input);
  if (!normalizeLetters(key.keyword)) throw new Error('方阵关键词中至少需要一个英文字母');
  if (decrypting && letters.length % 2 !== 0) throw new Error('Playfair 密文长度必须是偶数');
}

function transformPair(pair, square, direction) {
  const [a, b] = pair;
  const pa = square.positions.get(a);
  const pb = square.positions.get(b);
  let oa;
  let ob;
  let rule;
  if (pa.row === pb.row) {
    oa = square.grid[pa.row][(pa.column + direction + 5) % 5];
    ob = square.grid[pb.row][(pb.column + direction + 5) % 5];
    rule = direction > 0 ? '同行：向右移动一格' : '同行：向左移动一格';
  } else if (pa.column === pb.column) {
    oa = square.grid[(pa.row + direction + 5) % 5][pa.column];
    ob = square.grid[(pb.row + direction + 5) % 5][pb.column];
    rule = direction > 0 ? '同列：向下移动一格' : '同列：向上移动一格';
  } else {
    oa = square.grid[pa.row][pb.column];
    ob = square.grid[pb.row][pa.column];
    rule = '矩形：保持行不变，交换所在列';
  }
  return { output: oa + ob, rule, positions: [pa, pb] };
}

function run(input, key = {}, decrypting = false) {
  validate(input, key, decrypting);
  const square = buildSquare(key.keyword);
  const pairs = decrypting
    ? normalizeLetters(input).replaceAll('J', 'I').match(/.{2}/g)
    : preparePlaintext(input).pairs;
  const steps = [];
  const output = pairs.map((pair, index) => {
    const transformed = transformPair(pair, square, decrypting ? -1 : 1);
    steps.push({
      index, kind: 'playfair', title: `字母对 ${pair}`, input: pair, output: transformed.output,
      formula: transformed.rule, detail: `在方阵中定位 ${pair[0]} 与 ${pair[1]}，应用${transformed.rule.split('：')[0]}规则。`,
      data: { grid: square.grid, positions: transformed.positions, pair, result: transformed.output }
    });
    return transformed.output;
  }).join('');
  return { output, normalized: pairs.join(''), steps, grid: square.grid };
}

export const encrypt = (input, key = {}) => run(input, key, false);
export const decrypt = (input, key = {}) => run(input, key, true);
export const createSteps = (mode, input, key = {}) => (mode === 'decrypt' ? decrypt : encrypt)(input, key).steps;

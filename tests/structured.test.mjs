import test from 'node:test';
import assert from 'node:assert/strict';

import * as playfair from '../dist/js/algorithms/playfair.js';
import * as hill from '../dist/js/algorithms/hill.js';
import * as periodic from '../dist/js/algorithms/periodic.js';
import * as columnar from '../dist/js/algorithms/columnar.js';

test('Playfair matches the classic PLAYFAIR EXAMPLE vector', () => {
  const encrypted = playfair.encrypt('HIDE THE GOLD IN THE TREE STUMP', { keyword: 'PLAYFAIR EXAMPLE' });
  assert.equal(encrypted.output, 'BMODZBXDNABEKUDMUIXMMOUVIF');
  assert.equal(playfair.decrypt(encrypted.output, { keyword: 'PLAYFAIR EXAMPLE' }).output, 'HIDETHEGOLDINTHETREXESTUMP');
});

test('Playfair deterministically merges I/J and splits repeated letters', () => {
  const prepared = playfair.preparePlaintext('JELLY');
  assert.deepEqual(prepared.pairs, ['IE', 'LX', 'LY']);
  assert.equal(prepared.text, 'IELXLY');
});

test('Hill 2x2 matches the HELP vector and round trips', () => {
  const key = { matrix: [[3, 3], [2, 5]] };
  const encrypted = hill.encrypt('HELP', key);
  assert.equal(encrypted.output, 'HIAT');
  assert.equal(hill.decrypt(encrypted.output, key).output, 'HELP');
});

test('Hill rejects a matrix without a modular inverse', () => {
  assert.throws(() => hill.encrypt('TEST', { matrix: [[2, 4], [2, 4]] }), /可逆/);
});

test('Periodic transposition matches the textbook CRYPTOGRAPHY vector', () => {
  const encrypted = periodic.encrypt('CRYPTOGRAPHY', { key: 351642 });
  assert.equal(encrypted.output, 'YTCOPRAHGYPR');
  const decrypted = periodic.decrypt(encrypted.output, { key: 351642 });
  assert.equal(decrypted.output, 'CRYPTOGRAPHY');
  assert.equal(decrypted.resultDetail, '逆置换 σ⁻¹：361524');
  assert.deepEqual(decrypted.steps.slice(0, 3).map(({ title }) => title), [
    '计算逆置换 σ⁻¹',
    '恢复第 1 组',
    '恢复第 2 组'
  ]);
  assert.equal(decrypted.steps[1].data.permutationLabel, '读取顺序 σ⁻¹');
});

test('Periodic transposition pads the final group with spaces', () => {
  const encrypted = periodic.encrypt('HELLO', { key: 312 });
  assert.equal(encrypted.output, 'LHE LO');
  assert.equal(periodic.decrypt(encrypted.output, { key: 312 }).output, 'HELLO');
});

test('Periodic transposition validates its permutation and ciphertext length', () => {
  for (const key of [1, 112, 124, '31A2']) {
    assert.throws(() => periodic.encrypt('HELLO', { key }), /密钥|置换/);
  }
  assert.throws(() => periodic.encrypt('HELLO', { key: '1234567890' }), /2 到 9 位/);
  assert.throws(() => periodic.decrypt('ABCDE', { key: 312 }), /密文长度.*倍数/);
});

test('Columnar transposition applies the explicit numeric permutation', () => {
  const encrypted = columnar.encrypt('WEAREDISCOVERED', { key: 312 });
  assert.equal(encrypted.output, 'ADCEDWRIOREESVE');
  assert.equal(columnar.decrypt(encrypted.output, { key: 312 }).output, 'WEAREDISCOVERED');
});

test('Columnar transposition pads the final row with spaces before reading columns', () => {
  const encrypted = columnar.encrypt('WEAREDISCOVEREDX', { key: 312 });
  assert.equal(encrypted.output, 'ADCED WRIORXEESVE ');
  assert.deepEqual(encrypted.grid.at(-1), [' ', 'X', ' ']);
  assert.equal(columnar.decrypt(encrypted.output, { key: 312 }).output, 'WEAREDISCOVEREDX');
});

test('Columnar transposition rejects keys that are not permutations of 1 through m', () => {
  for (const key of [1, 112, 124, '31A2']) {
    assert.throws(() => columnar.encrypt('HELLO', { key }), /密钥|置换/);
  }
});

test('Columnar transposition rejects ciphertext that cannot fill complete columns', () => {
  assert.throws(() => columnar.decrypt('ABCDE', { key: 312 }), /密文长度.*倍数/);
});

test('Columnar decryption reveals the derived inverse before applying it', () => {
  const { steps } = columnar.decrypt('ADCEDWRIOREESVE', { key: 312 });
  assert.deepEqual(steps.slice(-3).map(({ title }) => title), [
    '计算逆置换 σ⁻¹',
    '按逆置换 σ⁻¹ 恢复列',
    '按行读出明文'
  ]);
  assert.equal(steps.at(-3).input, '312');
  assert.equal(steps.at(-3).output, '231');
  assert.deepEqual(steps.at(-3).data.grid[0], ['A', 'W', 'E']);
  assert.deepEqual(steps.at(-2).data.grid[0], ['W', 'E', 'A']);
});

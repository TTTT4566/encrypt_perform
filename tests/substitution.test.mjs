import test from 'node:test';
import assert from 'node:assert/strict';

import * as caesar from '../dist/js/algorithms/caesar.js';
import * as affine from '../dist/js/algorithms/affine.js';
import * as vigenere from '../dist/js/algorithms/vigenere.js';

test('Caesar matches the HELLO shift-3 vector and round trips', () => {
  const encrypted = caesar.encrypt('HELLO', { shift: 3 });
  assert.equal(encrypted.output, 'KHOOR');
  assert.equal(caesar.decrypt(encrypted.output, { shift: 3 }).output, 'HELLO');
  assert.equal(encrypted.steps[0].formula, '(7 + 3) mod 26 = 10');
});

test('Caesar preserves punctuation without transforming it', () => {
  assert.equal(caesar.encrypt('HI, 2!', { shift: 1, preserve: true }).output, 'IJ, 2!');
});

test('Affine matches the a=5 b=8 vector and round trips', () => {
  const encrypted = affine.encrypt('ATTACK', { a: 5, b: 8 });
  assert.equal(encrypted.output, 'IZZISG');
  assert.equal(affine.decrypt(encrypted.output, { a: 5, b: 8 }).output, 'ATTACK');
});

test('Affine rejects a values that have no inverse modulo 26', () => {
  assert.throws(() => affine.encrypt('TEST', { a: 2, b: 1 }), /互素/);
});

test('Vigenere matches the classic LEMON vector and round trips', () => {
  const encrypted = vigenere.encrypt('ATTACKATDAWN', { keyword: 'LEMON' });
  assert.equal(encrypted.output, 'LXFOPVEFRNHR');
  assert.equal(vigenere.decrypt(encrypted.output, { keyword: 'LEMON' }).output, 'ATTACKATDAWN');
});

test('Vigenere punctuation does not consume a key character', () => {
  assert.equal(vigenere.encrypt('A!A', { keyword: 'BC', preserve: true }).output, 'B!C');
});

test('substitution ciphers reject messages without letters', () => {
  assert.throws(() => caesar.encrypt('123 !', { shift: 3 }), /英文字母/);
  assert.throws(() => vigenere.encrypt('', { keyword: 'KEY' }), /英文字母/);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeLetters } from '../dist/js/core/text.js';
import { gcd, mod, modInverse } from '../dist/js/core/math.js';

test('normalizeLetters uppercases letters and removes non-letters by default', () => {
  assert.equal(normalizeLetters('Hello, 密码 123!'), 'HELLO');
});

test('normalizeLetters preserves non-letters when requested', () => {
  assert.equal(normalizeLetters('Hi, 2!', true), 'HI, 2!');
});

test('mod always returns a non-negative residue', () => {
  assert.equal(mod(-3, 26), 23);
});

test('gcd handles positive and negative values', () => {
  assert.equal(gcd(-15, 26), 1);
  assert.equal(gcd(12, 26), 2);
});

test('modInverse returns the multiplicative inverse', () => {
  assert.equal(modInverse(5, 26), 21);
});

test('modInverse rejects values without an inverse', () => {
  assert.throws(() => modInverse(2, 26), /逆元/);
});

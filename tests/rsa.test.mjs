import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSteps,
  decrypt,
  decryptNumber,
  deriveKeyPair,
  encrypt,
  encryptNumber,
  meta
} from '../classical-cipher-lab/js/algorithms/rsa.js';

const defaultKey = { p: 61, q: 53, e: 17 };

test('RSA derives the textbook key pair', () => {
  const pair = deriveKeyPair(defaultKey);
  assert.equal(pair.n, 3233n);
  assert.equal(pair.phi, 3120n);
  assert.equal(pair.d, 2753n);
  assert.deepEqual(pair.publicKey, { e: 17n, n: 3233n });
  assert.deepEqual(pair.privateKey, { d: 2753n, n: 3233n });
});

test('RSA matches the textbook 65 ↔ 2790 numeric vector', () => {
  const pair = deriveKeyPair(defaultKey);
  assert.equal(encryptNumber(65n, pair.publicKey), 2790n);
  assert.equal(decryptNumber(2790n, pair.privateKey), 65n);
});

test('RSA maps UTF-8 bytes to space-separated decimal blocks and round trips', () => {
  const encrypted = encrypt('RSA 密码', defaultKey);
  assert.match(encrypted.output, /^\d+( \d+)*$/);
  assert.equal(decrypt(encrypted.output, defaultKey).output, 'RSA 密码');
  assert.equal(encrypted.details.byteCount, new TextEncoder().encode('RSA 密码').length);
});

test('RSA validates key parameters before deriving a key pair', () => {
  assert.throws(() => deriveKeyPair({ p: '6.1', q: 53, e: 17 }), /整数/);
  assert.throws(() => deriveKeyPair({ p: 61, q: 61, e: 17 }), /不同/);
  assert.throws(() => deriveKeyPair({ p: 60, q: 53, e: 17 }), /素数/);
  assert.throws(() => deriveKeyPair({ p: 13, q: 17, e: 12 }), /互素/);
  assert.throws(() => deriveKeyPair({ p: 13, q: 17, e: 5 }), /大于 255/);
});

test('RSA validates numeric messages and ciphertext blocks', () => {
  const pair = deriveKeyPair(defaultKey);
  assert.throws(() => encryptNumber(-1, pair.publicKey), /范围/);
  assert.throws(() => encryptNumber(3233, pair.publicKey), /范围/);
  assert.throws(() => decryptNumber(-1, pair.privateKey), /范围/);
  assert.throws(() => decryptNumber(3233, pair.privateKey), /范围/);
});

test('RSA rejects malformed decimal ciphertext tokens', () => {
  assert.throws(() => decrypt('12 nope 34', defaultKey), /十进制整数/);
  assert.throws(() => decrypt('12  34.5', defaultKey), /十进制整数/);
  assert.throws(() => decrypt('', defaultKey), /不能为空/);
});

test('RSA enforces the 256-byte teaching limit', () => {
  assert.throws(() => encrypt('a'.repeat(257), defaultKey), /256/);
});

test('RSA rejects decrypted bytes that are not valid UTF-8', () => {
  const pair = deriveKeyPair(defaultKey);
  const invalidUtf8Cipher = encryptNumber(255, pair.publicKey).toString();
  assert.throws(() => decrypt(invalidUtf8Cipher, defaultKey), /UTF-8/);
});

test('RSA animation exposes key derivation and square-and-multiply traces', () => {
  const result = encrypt('A', defaultKey);
  const modularSteps = result.steps.filter((step) => step.kind === 'modular-math');
  assert.ok(result.steps.some((step) => step.kind === 'key-derivation'));
  assert.ok(modularSteps.length > 0);
  assert.ok(modularSteps[0].data.trace.length > 0);
  assert.equal(
    modularSteps.at(-1).data.result,
    encryptNumber(65, deriveKeyPair(defaultKey).publicKey).toString()
  );
  assert.equal(result.steps.at(-1).data.result, result.output);
  assert.deepEqual(createSteps('encrypt', 'A', defaultKey), result.steps);
});

test('RSA metadata declares encrypt and decrypt teaching modes', () => {
  assert.deepEqual(meta.modes, ['encrypt', 'decrypt']);
  assert.equal(meta.id, 'rsa');
  assert.equal(meta.keyFields.length, 3);
});

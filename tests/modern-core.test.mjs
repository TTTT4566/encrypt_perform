import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertMaxBytes,
  bytesToHex,
  bytesToUtf8,
  hexToBytes,
  pkcs7Pad,
  pkcs7Unpad,
  utf8ToBytes
} from '../classical-cipher-lab/js/core/bytes.js';
import {
  extendedGcdBigInt,
  gcdBigInt,
  isPrime,
  modInverseBigInt,
  modPowBigInt
} from '../classical-cipher-lab/js/core/modern-math.js';

test('UTF-8 helpers preserve multibyte Chinese text', () => {
  const bytes = utf8ToBytes('密码学');

  assert.deepEqual(bytes, [0xe5, 0xaf, 0x86, 0xe7, 0xa0, 0x81, 0xe5, 0xad, 0xa6]);
  assert.equal(bytesToUtf8(bytes), '密码学');
});

test('hex helpers support case selection and whitespace-tolerant parsing', () => {
  const bytes = [0x00, 0xff, 0xa1];

  assert.equal(bytesToHex(bytes), '00ffa1');
  assert.equal(bytesToHex(bytes, true), '00FFA1');
  assert.deepEqual(hexToBytes('00 ff\nA1'), bytes);
});

test('hex parsing rejects odd length and non-hexadecimal input', () => {
  assert.throws(() => hexToBytes('ABC'), /十六进制.*偶数/);
  assert.throws(() => hexToBytes('GG'), /十六进制/);
});

test('byte limits use UTF-8 bytes instead of JavaScript characters', () => {
  assert.deepEqual(assertMaxBytes(utf8ToBytes('密'), 3), [0xe5, 0xaf, 0x86]);
  assert.throws(() => assertMaxBytes(utf8ToBytes('密'), 2), /2 个 UTF-8 字节/);
  assert.throws(() => assertMaxBytes(new Array(257).fill(0), 256), /256 个 UTF-8 字节/);
});

test('UTF-8 decoding rejects malformed byte sequences', () => {
  assert.throws(() => bytesToUtf8([0xff]), /UTF-8/);
});

test('PKCS#7 adds a full padding block and removes valid padding', () => {
  const source = new Array(16).fill(0x41);
  const padded = pkcs7Pad(source, 16);

  assert.equal(padded.length, 32);
  assert.deepEqual(padded.slice(16), new Array(16).fill(16));
  assert.deepEqual(pkcs7Unpad(padded, 16), source);
});

test('PKCS#7 rejects malformed padding', () => {
  assert.throws(() => pkcs7Unpad([1, 2, 2, 3], 4), /PKCS#7/);
});


test('BigInt gcd and extended gcd agree on Bézout coefficients', () => {
  assert.equal(gcdBigInt(17n, 3120n), 1n);
  const { gcd, x, y } = extendedGcdBigInt(17n, 3120n);

  assert.equal(gcd, 1n);
  assert.equal(17n * x + 3120n * y, gcd);
});

test('BigInt modular inverse and exponentiation match the RSA teaching vector', () => {
  assert.equal(modInverseBigInt(17n, 3120n), 2753n);
  assert.equal(modPowBigInt(65n, 17n, 3233n), 2790n);
});

test('modular exponentiation trace finishes at the direct result', () => {
  const traced = modPowBigInt(65n, 17n, 3233n, true);

  assert.equal(traced.result, 2790n);
  assert.ok(traced.trace.length > 0);
  assert.equal(traced.trace.at(-1).result, traced.result);
});

test('prime detection accepts primes and rejects composites', () => {
  assert.equal(isPrime(61n), true);
  assert.equal(isPrime(53), true);
  assert.equal(isPrime(1n), false);
  assert.equal(isPrime(91n), false);
});

test('modular inverse rejects non-coprime values', () => {
  assert.throws(() => modInverseBigInt(6n, 9n), /模逆元/);
});

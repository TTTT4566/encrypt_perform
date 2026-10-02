import assert from 'node:assert/strict';
import test from 'node:test';

import { createSteps, decrypt, decryptBlock, encrypt, encryptBlock, expandKey, meta } from '../classical-cipher-lab/js/algorithms/aes.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '../classical-cipher-lab/js/core/bytes.js';

const key = hexToBytes('000102030405060708090A0B0C0D0E0F');
const plain = hexToBytes('00112233445566778899AABBCCDDEEFF');
const cipher = '69C4E0D86A7B0430D8CDB78070B4C55A';

test('AES-128 encrypts the FIPS-197 single-block vector', () => {
  assert.equal(bytesToHex(encryptBlock(plain, key), true), cipher);
});

test('AES-128 decrypts the FIPS-197 single-block vector', () => {
  assert.deepEqual(decryptBlock(hexToBytes(cipher), key), plain);
});

test('AES-128 expands the key into eleven 16-byte round keys', () => {
  const roundKeys = expandKey(key);

  assert.equal(roundKeys.length, 11);
  assert.ok(roundKeys.every((roundKey) => roundKey.length === 16));
  assert.equal(bytesToHex(roundKeys[0], true), '000102030405060708090A0B0C0D0E0F');
  assert.equal(bytesToHex(roundKeys[10], true), '13111D7FE3944A17F307A78B4D2B30C5');
});


const teachingKey = { key: 'Thats my Kung Fu' };

test('AES-128 ECB applies PKCS#7 and round trips UTF-8 text', () => {
  const encrypted = encrypt('现代 AES demo', teachingKey);
  const decrypted = decrypt(encrypted.output, teachingKey);

  assert.match(encrypted.output, /^[0-9A-F]+$/);
  assert.equal(encrypted.output.length, 32);
  assert.equal(decrypted.output, '现代 AES demo');
});

test('AES-128 ECB preserves the classic first-block teaching vector', () => {
  const first = encrypt('Two One Nine Two', teachingKey);
  const second = encrypt('Two One Nine Two', teachingKey);

  assert.equal(first.output, second.output);
  assert.equal(first.output.length, 64);
  assert.equal(first.output.slice(0, 32), '29C3505F571420F6402299B31A02D73A');
});

test('AES-128 validates UTF-8 key size and ciphertext block size', () => {
  assert.throws(() => encrypt('test', { key: '123456789012345' }), /16 个 UTF-8 字节/);
  assert.throws(() => encrypt('test', { key: '密钥密钥密钥' }), /16 个 UTF-8 字节/);
  assert.throws(() => decrypt('AA', teachingKey), /16 字节的整数倍/);
});

test('AES-128 rejects malformed PKCS#7 and invalid UTF-8 plaintext', () => {
  const keyBytes = utf8ToBytes(teachingKey.key);
  const badPadding = bytesToHex(encryptBlock(new Array(16).fill(0), keyBytes), true);
  const invalidUtf8 = bytesToHex(encryptBlock([0xff, ...new Array(15).fill(15)], keyBytes), true);

  assert.throws(() => decrypt(badPadding, teachingKey), /PKCS#7/);
  assert.throws(() => decrypt(invalidUtf8, teachingKey), /UTF-8/);
});

test('AES-128 exposes complete animation results and inverse round steps', () => {
  assert.deepEqual(meta.modes, ['encrypt', 'decrypt']);
  const encrypted = encrypt('AES', teachingKey);
  const encryptionSteps = createSteps('encrypt', 'AES', teachingKey);
  const decryptionSteps = createSteps('decrypt', encrypted.output, teachingKey);

  assert.ok(encryptionSteps.length > 40);
  assert.equal(encryptionSteps.at(-1).output, encrypted.output);
  assert.ok(decryptionSteps.some((step) => step.title.includes('InvShiftRows')));
  assert.equal(decryptionSteps.at(-1).output, 'AES');
});

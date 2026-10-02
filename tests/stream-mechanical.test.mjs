import test from 'node:test';
import assert from 'node:assert/strict';

import * as otp from '../dist/js/algorithms/otp.js';
import * as rotor from '../dist/js/algorithms/rotor.js';

test('OTP matches the HELLO/XMCKL vector and round trips', () => {
  const encrypted = otp.encrypt('HELLO', { keyword: 'XMCKL' });
  assert.equal(encrypted.output, 'EQNVZ');
  assert.equal(otp.decrypt(encrypted.output, { keyword: 'XMCKL' }).output, 'HELLO');
  assert.equal(encrypted.steps[0].data.inputBits, '00111');
  assert.equal(encrypted.steps[0].data.keyBits, '10111');
});

test('OTP rejects a key shorter than the message', () => {
  assert.throws(() => otp.encrypt('HELLO', { keyword: 'KEY' }), /至少与消息等长/);
});

test('rotor cipher is involutive with the same initial positions', () => {
  const key = { positions: 'AAA', preserve: true };
  const encrypted = rotor.encrypt('HELLO WORLD', key);
  assert.notEqual(encrypted.output, 'HELLO WORLD');
  assert.equal(rotor.decrypt(encrypted.output, key).output, 'HELLO WORLD');
});

test('rotor starts from the configured position on every run', () => {
  const key = { positions: 'MCK' };
  assert.equal(rotor.encrypt('TESTING', key).output, rotor.encrypt('TESTING', key).output);
  assert.deepEqual(rotor.encrypt('A', key).steps[0].data.before, ['M', 'C', 'K']);
});

test('rotor validates three-letter positions', () => {
  assert.throws(() => rotor.encrypt('TEST', { positions: 'AA' }), /三个英文字母/);
});

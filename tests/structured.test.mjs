import test from 'node:test';
import assert from 'node:assert/strict';

import * as playfair from '../dist/js/algorithms/playfair.js';
import * as hill from '../dist/js/algorithms/hill.js';
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

test('Columnar transposition uses stable keyword ranking', () => {
  const encrypted = columnar.encrypt('WEAREDISCOVERED', { keyword: 'CAB' });
  assert.equal(encrypted.output, 'EESVEADCEDWRIOR');
  assert.equal(columnar.decrypt(encrypted.output, { keyword: 'CAB' }).output, 'WEAREDISCOVERED');
});

test('Columnar transposition reconstructs uneven columns', () => {
  const message = 'WEAREDISCOVEREDX';
  const encrypted = columnar.encrypt(message, { keyword: 'CAB' });
  assert.equal(encrypted.output, 'EESVEADCEDWRIORX');
  assert.equal(columnar.decrypt(encrypted.output, { keyword: 'CAB' }).output, message);
});

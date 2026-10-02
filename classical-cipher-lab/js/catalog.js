import * as caesar from './algorithms/caesar.js';
import * as affine from './algorithms/affine.js';
import * as vigenere from './algorithms/vigenere.js';
import * as playfair from './algorithms/playfair.js';
import * as hill from './algorithms/hill.js';
import * as columnar from './algorithms/columnar.js';
import * as otp from './algorithms/otp.js';
import * as rotor from './algorithms/rotor.js';

export const algorithms = [caesar, affine, vigenere, playfair, hill, columnar, otp, rotor];

export function getAlgorithm(id) {
  return algorithms.find((algorithm) => algorithm.meta.id === id) ?? null;
}

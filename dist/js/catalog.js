import * as caesar from './algorithms/caesar.js';
import * as affine from './algorithms/affine.js';
import * as vigenere from './algorithms/vigenere.js';
import * as playfair from './algorithms/playfair.js';
import * as hill from './algorithms/hill.js';
import * as periodic from './algorithms/periodic.js';
import * as columnar from './algorithms/columnar.js';
import * as otp from './algorithms/otp.js';
import * as rotor from './algorithms/rotor.js';
import * as aes from './algorithms/aes.js';
import * as rsa from './algorithms/rsa.js';
import * as rc4 from './algorithms/rc4.js';
import * as sha256 from './algorithms/sha256.js';
import * as md5 from './algorithms/md5.js';

export const algorithms = [
  caesar, affine, vigenere, playfair, hill, periodic, columnar, otp, rotor,
  aes, rsa, rc4, sha256, md5
];

export function getAlgorithm(id) {
  return algorithms.find((algorithm) => algorithm.meta.id === id) ?? null;
}

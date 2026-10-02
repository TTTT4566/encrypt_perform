# Modern Cipher Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing visual cryptography lab from 8 classical modules to 13 modules by adding educational AES-128, RSA, RC4, SHA-256, and MD5 implementations with step-by-step animation.

**Architecture:** Keep `classical-cipher-lab` as the only authored static-site source and generate `dist` with a deterministic build script. Add byte/math primitives, one focused module per algorithm, capability metadata for encrypt/decrypt versus hash-only pages, and new renderer kinds consumed by the existing timeline.

**Tech Stack:** Native HTML, CSS, JavaScript ES modules, Node.js built-in test runner, no runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-02-modern-cipher-extension-design.md`

## Global Constraints

- Implement exactly AES-128, RSA, RC4, SHA-256, and MD5; preserve all eight existing modules.
- Keep all computation local in the browser and add no third-party runtime dependency.
- Limit modern-algorithm input to 256 UTF-8 bytes.
- AES is AES-128-ECB with PKCS#7; RSA uses small editable teaching parameters; RC4 and MD5 must be labeled insecure.
- AES and RC4 ciphertext is uppercase hexadecimal; RSA ciphertext is space-separated decimal; SHA-256 and MD5 digests are lowercase hexadecimal.
- SHA-256 and MD5 expose only `hash`; they never render a decrypt control.
- `classical-cipher-lab` is authored source, `dist` is generated, and obsolete `site` is removed only after build parity is verified.
- Every production change follows red-green TDD and every task ends with a focused commit.

## Review Focus

- UTF-8 byte length differs from JavaScript string length: keys and 256-byte limits must use encoded bytes, with multibyte tests in Tasks 1, 2, 3, and 4.
- Binary decryption can produce invalid UTF-8: AES, RSA, and RC4 must reject it rather than insert replacement characters, tested in their owning tasks.
- JavaScript bitwise operations are signed: SHA-256 and MD5 must normalize all additions/rotations to unsigned 32-bit values, covered by known multi-block vectors in Tasks 5 and 6.
- Long timelines can retain stale playback: switching between a 256-step RC4 KSA and another route must cancel playback, covered in Task 7.
- Generated output can drift from source: Task 8 verifies a clean build recreates `dist`, contains all 13 routes, and leaves no `site` directory.

---

## File Map

- `classical-cipher-lab/js/core/bytes.js`: UTF-8, hex, size-limit, XOR, and PKCS#7 helpers.
- `classical-cipher-lab/js/core/modern-math.js`: BigInt gcd, inverse, modular exponentiation, primality, and trace helpers.
- `classical-cipher-lab/js/algorithms/{aes,rsa,rc4,sha256,md5}.js`: algorithm logic, metadata, validation, and animation steps.
- `classical-cipher-lab/js/catalog.js`: register 13 modules in display order.
- `classical-cipher-lab/js/app.js`: capability-driven modes, form labels, presets, and execution.
- `classical-cipher-lab/js/visualizers/renderer.js`: mode-aware pages and modern step renderers.
- `classical-cipher-lab/assets/{layout-base,theme-light}.css`: modern visualization layout and responsive states.
- `classical-cipher-lab/index.html`: navigation groups, count, metadata, and modern routes.
- `scripts/build.mjs`: deterministic source-to-`dist` build.
- `tests/*.test.mjs`: algorithm and shared-core vectors.
- `release-tests/*.test.mjs`: page, build, navigation, and integration behavior.

### Task 1: Byte encoding and modern math primitives

**Files:**
- Create: `classical-cipher-lab/js/core/bytes.js`
- Create: `classical-cipher-lab/js/core/modern-math.js`
- Create: `tests/modern-core.test.mjs`

**Interfaces:**
- Produces: `utf8ToBytes(text)`, `bytesToUtf8(bytes)`, `bytesToHex(bytes, uppercase = false)`, `hexToBytes(hex)`, `assertMaxBytes(bytes, max = 256)`, `pkcs7Pad(bytes, blockSize = 16)`, `pkcs7Unpad(bytes, blockSize = 16)`.
- Produces: `gcdBigInt(a, b)`, `extendedGcdBigInt(a, b)`, `modInverseBigInt(value, modulus)`, `modPowBigInt(base, exponent, modulus, withTrace = false)`, `isPrime(value)`.

- [ ] **Step 1: Write failing byte-helper tests**

Test UTF-8 round trip with `密码学`, uppercase/lowercase hex conversion, whitespace-tolerant hex parsing, rejection of odd/non-hex input, 257-byte rejection, strict invalid UTF-8 rejection, and PKCS#7 full-block padding plus malformed-unpad rejection.

- [ ] **Step 2: Run the byte tests and verify RED**

Run: `node --test tests/modern-core.test.mjs`

Expected: FAIL because `js/core/bytes.js` does not exist.

- [ ] **Step 3: Implement the byte helpers**

Use `TextEncoder` and fatal `TextDecoder`; return plain byte arrays so tests and renderers can serialize them without typed-array coupling.

- [ ] **Step 4: Write failing BigInt math tests**

Assert `gcdBigInt(17n, 3120n) === 1n`, `modInverseBigInt(17n, 3120n) === 2753n`, `modPowBigInt(65n, 17n, 3233n) === 2790n`, trace reconstruction, and prime/composite detection.

- [ ] **Step 5: Implement modern math and run GREEN**

Run: `node --test tests/modern-core.test.mjs`

Expected: all modern-core tests PASS with no warnings.

- [ ] **Step 6: Commit Task 1**

```bash
git add classical-cipher-lab/js/core/bytes.js classical-cipher-lab/js/core/modern-math.js tests/modern-core.test.mjs
git commit -m "feat: add modern cipher core helpers"
```

### Task 2: AES-128 educational implementation

**Files:**
- Create: `classical-cipher-lab/js/algorithms/aes.js`
- Create: `tests/aes.test.mjs`

**Interfaces:**
- Consumes: Task 1 byte helpers.
- Produces: `encryptBlock(blockBytes, keyBytes)`, `decryptBlock(blockBytes, keyBytes)`, `expandKey(keyBytes)`, `encrypt(input, key)`, `decrypt(input, key)`, `createSteps(mode, input, key)`, and `meta` with modes `['encrypt', 'decrypt']`.
- `key` shape: `{ key: string }`; key text must encode to exactly 16 bytes.

- [ ] **Step 1: Write the failing FIPS-197 test**

Use literal key `000102030405060708090A0B0C0D0E0F`, block `00112233445566778899AABBCCDDEEFF`, and expected cipher `69C4E0D86A7B0430D8CDB78070B4C55A`; test both block directions.

- [ ] **Step 2: Run the AES vector and verify RED**

Run: `node --test tests/aes.test.mjs`

Expected: FAIL because `aes.js` does not exist.

- [ ] **Step 3: Implement AES block transforms and key expansion**

Use column-major AES state ordering, the fixed AES S-box/inverse S-box, Rcon, GF(2^8) multiplication, 10 rounds, and snapshots after each named transform.

- [ ] **Step 4: Add failing text-mode tests**

Assert ECB/PKCS#7 round trip for `现代 AES demo`, deterministic uppercase hex output, full-block padding, 15-byte and multibyte-overlength key rejection, non-block ciphertext rejection, bad padding rejection, invalid UTF-8 rejection, named inverse-round steps during decryption, and final animation output equality.

- [ ] **Step 5: Implement text encrypt/decrypt and animation results**

Keep the complete transform snapshots in `steps`; include block index, round number, state, round key, title, formula, detail, input, output, and kind `state-matrix` or `key-schedule`.

- [ ] **Step 6: Run AES and core tests**

Run: `node --test tests/modern-core.test.mjs tests/aes.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add classical-cipher-lab/js/algorithms/aes.js tests/aes.test.mjs
git commit -m "feat: add AES-128 teaching module"
```

### Task 3: RSA educational implementation

**Files:**
- Create: `classical-cipher-lab/js/algorithms/rsa.js`
- Create: `tests/rsa.test.mjs`

**Interfaces:**
- Consumes: Task 1 byte and BigInt helpers.
- Produces: `deriveKeyPair(key)`, `encryptNumber(message, publicKey)`, `decryptNumber(cipher, privateKey)`, `encrypt(input, key)`, `decrypt(input, key)`, `createSteps(mode, input, key)`, and `meta`.
- `key` shape: `{ p: number|string, q: number|string, e: number|string }`; defaults are 61, 53, and 17.

- [ ] **Step 1: Write failing textbook-vector tests**

Assert `n=3233`, `phi=3120`, `d=2753`, encrypting 65 yields 2790, and decrypting 2790 restores 65.

- [ ] **Step 2: Run the RSA vector and verify RED**

Run: `node --test tests/rsa.test.mjs`

Expected: FAIL because `rsa.js` does not exist.

- [ ] **Step 3: Implement parameter validation and numeric operations**

Reject non-integers, equal/non-prime p and q, non-coprime e, `n <= 255`, and ciphertext outside `[0,n)`; preserve BigInt precision and stringify only at the UI boundary.

- [ ] **Step 4: Add failing text and error tests**

Round-trip `RSA 密码`, assert space-separated decimal output, malformed token rejection, 257-byte input rejection, invalid UTF-8 rejection, and a non-empty modular-math trace whose last result equals the direct operation.

- [ ] **Step 5: Implement text mapping and modular-math steps**

Emit key-derivation steps followed by one square-and-multiply trace per UTF-8 byte using kind `modular-math`.

- [ ] **Step 6: Run RSA and prerequisite tests**

Run: `node --test tests/modern-core.test.mjs tests/rsa.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add classical-cipher-lab/js/algorithms/rsa.js tests/rsa.test.mjs
git commit -m "feat: add RSA teaching module"
```

### Task 4: RC4 educational implementation

**Files:**
- Create: `classical-cipher-lab/js/algorithms/rc4.js`
- Create: `tests/rc4.test.mjs`

**Interfaces:**
- Consumes: Task 1 byte helpers.
- Produces: `ksa(keyBytes)`, `applyRc4(inputBytes, keyBytes)`, `encrypt(input, key)`, `decrypt(input, key)`, `createSteps(mode, input, key)`, and `meta`.
- `key` shape: `{ key: string }`; key length is 1–256 UTF-8 bytes.

- [ ] **Step 1: Write the failing RC4 known-vector test**

Assert key `Key` and plaintext `Plaintext` produce `BBF316E8D940AF0AD3`, and that applying the stream again restores the bytes.

- [ ] **Step 2: Run the RC4 vector and verify RED**

Run: `node --test tests/rc4.test.mjs`

Expected: FAIL because `rc4.js` does not exist.

- [ ] **Step 3: Implement KSA and PRGA with traces**

Return all 256 KSA swaps and one PRGA record per byte; each record includes i, j, t when applicable, swapped values, a bounded S-array window, key-stream byte, source byte, and result byte.

- [ ] **Step 4: Add failing UI-level and boundary tests**

Round-trip `RC4 示例`, assert uppercase hex output, exactly 256 KSA steps, empty/257-byte key rejection, malformed hex rejection, 257-byte message rejection, strict invalid UTF-8 rejection, and final animation output equality.

- [ ] **Step 5: Implement wrappers and run GREEN**

Run: `node --test tests/modern-core.test.mjs tests/rc4.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add classical-cipher-lab/js/algorithms/rc4.js tests/rc4.test.mjs
git commit -m "feat: add RC4 teaching module"
```

### Task 5: SHA-256 implementation

**Files:**
- Create: `classical-cipher-lab/js/algorithms/sha256.js`
- Create: `tests/sha256.test.mjs`

**Interfaces:**
- Consumes: Task 1 UTF-8 and hex helpers.
- Produces: `sha256Bytes(bytes, withSteps = false)`, `hash(input)`, `createSteps(mode, input)`, and `meta` with modes `['hash']`.

- [ ] **Step 1: Write failing standard-vector tests**

Use literal digests for empty input, `abc`, and `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789` (`db4bfcbd4da0cd85a60c3c37d3fbd8805c77f15fc6b1fdfe614ee0a7c8fdb4c0`).

- [ ] **Step 2: Run vectors and verify RED**

Run: `node --test tests/sha256.test.mjs`

Expected: FAIL because `sha256.js` does not exist.

- [ ] **Step 3: Implement padding, schedule, and compression**

Use unsigned 32-bit addition/rotation, big-endian words, all 64 constants, and record padding, W[0..63], 64 register rounds per block, and state accumulation.

- [ ] **Step 4: Add failing behavior tests**

Assert lowercase 64-character output, 257-byte rejection, `meta.modes` equals `['hash']`, non-empty `message-schedule` and `registers` steps, and last-step output equality.

- [ ] **Step 5: Implement wrappers and run GREEN**

Run: `node --test tests/modern-core.test.mjs tests/sha256.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add classical-cipher-lab/js/algorithms/sha256.js tests/sha256.test.mjs
git commit -m "feat: add SHA-256 teaching module"
```

### Task 6: MD5 implementation

**Files:**
- Create: `classical-cipher-lab/js/algorithms/md5.js`
- Create: `tests/md5.test.mjs`

**Interfaces:**
- Consumes: Task 1 UTF-8 and hex helpers.
- Produces: `md5Bytes(bytes, withSteps = false)`, `hash(input)`, `createSteps(mode, input)`, and `meta` with modes `['hash']`.

- [ ] **Step 1: Write failing standard-vector tests**

Use literal digests for empty input, `abc`, `message digest`, and `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789` (`d174ab98d277d9f5a5611c2c9f419d9f`).

- [ ] **Step 2: Run vectors and verify RED**

Run: `node --test tests/md5.test.mjs`

Expected: FAIL because `md5.js` does not exist.

- [ ] **Step 3: Implement little-endian padding and 64 operations**

Use unsigned 32-bit additions, the four MD5 functions, standard shift table and sine constants; record padding, message words, round/register state, and little-endian digest assembly.

- [ ] **Step 4: Add failing behavior tests**

Assert lowercase 32-character output, 257-byte rejection, hash-only metadata, 64 register operations for one block, insecure warning text, and last-step output equality.

- [ ] **Step 5: Implement wrappers and run GREEN**

Run: `node --test tests/modern-core.test.mjs tests/md5.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit Task 6**

```bash
git add classical-cipher-lab/js/algorithms/md5.js tests/md5.test.mjs
git commit -m "feat: add MD5 teaching module"
```

### Task 7: Capability-driven UI and modern visualizers

**Files:**
- Modify: `classical-cipher-lab/js/catalog.js`
- Modify: `classical-cipher-lab/js/app.js`
- Modify: `classical-cipher-lab/js/visualizers/renderer.js`
- Modify: `classical-cipher-lab/assets/layout-base.css`
- Modify: `classical-cipher-lab/assets/theme-light.css`
- Modify: `classical-cipher-lab/index.html`
- Create: `release-tests/modern-ui.test.mjs`
- Modify: `release-tests/final-acceptance.test.mjs`
- Modify: `tests/timeline.test.mjs`

**Interfaces:**
- Consumes: all five algorithm `meta` objects and standard result/step shapes.
- Produces: 13-route catalog, metadata-driven mode controls, and renderers for `byte-grid`, `state-matrix`, `key-schedule`, `modular-math`, `permutation`, `registers`, and `message-schedule`.

- [ ] **Step 1: Write failing catalog and page tests**

Assert exact ordered IDs `caesar, affine, vigenere, playfair, hill, columnar, otp, rotor, aes, rsa, rc4, sha256, md5`; assert intro count 13; assert five navigation links; assert SHA-256/MD5 pages contain one hash mode and no decrypt mode; assert AES/RSA/RC4 retain encrypt/decrypt; assert all five pages render their algorithm-specific security warning.

- [ ] **Step 2: Run UI tests and verify RED**

Run: `node --test release-tests/modern-ui.test.mjs release-tests/final-acceptance.test.mjs`

Expected: FAIL because modern modules are not registered or rendered.

- [ ] **Step 3: Register modules and make forms capability-driven**

Default missing `meta.modes` to `['encrypt','decrypt']` and missing `showPreserveOption` to true for backward compatibility; hide preserve for modern modules; call `activeAlgorithm[mode]`; update input/result labels for `hash`.

- [ ] **Step 4: Implement the seven modern renderers and styles**

Keep each renderer a focused function that accepts only `step.data`; use scrollable windows for schedules/permutations, 4×4 grids for AES, compact register cards for hashes, and existing active/result color tokens.

- [ ] **Step 5: Add stale-playback and renderer behavior tests**

Load a 256-step timeline, start it, load another route, and assert the old timer is canceled; render one real step from each modern module and assert its named visualization and accessible text are present.

- [ ] **Step 6: Run all source and UI tests**

Run: `node --test tests/*.test.mjs release-tests/*.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit Task 7**

```bash
git add classical-cipher-lab release-tests tests/timeline.test.mjs
git commit -m "feat: integrate modern cipher visualizations"
```

### Task 8: Deterministic build, source consolidation, and documentation

**Files:**
- Create: `scripts/build.mjs`
- Modify: `package.json`
- Modify: `classical-cipher-lab/README.md`
- Create: `release-tests/build.test.mjs`
- Delete: `site/**`
- Regenerate: `dist/**`

**Interfaces:**
- Produces: `npm run build` that replaces only the resolved workspace `dist` directory with `classical-cipher-lab/index.html`, `assets`, and `js`.
- Produces: `npm test` that runs `tests/*.test.mjs` and `release-tests/*.test.mjs` after a build.

- [ ] **Step 1: Write the failing build behavior test**

Create a sentinel in `dist`, run `node scripts/build.mjs`, assert the sentinel is removed, required assets exist, all five modern modules exist, built catalog renders 13 modules, and source/dist entry assets match byte-for-byte.

- [ ] **Step 2: Run the build test and verify RED**

Run: `node --test release-tests/build.test.mjs`

Expected: FAIL because `scripts/build.mjs` does not exist.

- [ ] **Step 3: Implement guarded build and package scripts**

Resolve source and output from the script location; refuse to delete unless output basename is exactly `dist` and its parent is the repository root; copy only public static content.

- [ ] **Step 4: Build and run the complete suite**

Run: `npm run build`

Run: `npm test`

Expected: build exits 0; all old and new tests PASS with no warnings.

- [ ] **Step 5: Remove obsolete source copy and update README**

Delete only the resolved repository `site` directory after the successful parity test. Document 13 modules, source location, build, launch, input formats, and teaching-only security limits.

- [ ] **Step 6: Rebuild and verify final filesystem**

Run: `npm run build`

Run: `npm test`

Run: `git status --short`

Expected: tests PASS; `site` is absent; only intended Task 8 changes are listed.

- [ ] **Step 7: Commit Task 8**

```bash
git add package.json scripts/build.mjs classical-cipher-lab/README.md release-tests/build.test.mjs dist
git add -u site
git commit -m "build: consolidate cipher lab source"
```

### Task 9: Final acceptance and remote backup

**Files:**
- Modify: `release-tests/final-acceptance.test.mjs`

**Interfaces:**
- Consumes: completed Tasks 1–8.
- Produces: evidence that every completion criterion in the spec is covered and a pushed `main` branch.

- [ ] **Step 1: Add the final acceptance matrix**

Add one table-driven test that maps every spec completion criterion to observable behavior: 13 catalog IDs, five modern operations, non-empty animation steps, hash-only controls, algorithm-specific warning copy, generated `dist`, absent `site`, and build/test scripts.

- [ ] **Step 2: Run final verification**

Run: `npm run build`

Run: `npm test`

Run: `git diff --check`

Expected: all commands exit 0; all 13 modules and five modern standard vectors are verified.

- [ ] **Step 3: Commit the acceptance matrix**

```bash
git add release-tests/final-acceptance.test.mjs
git commit -m "test: verify modern cipher release"
```

- [ ] **Step 4: Push and verify the remote commit**

Run: `git push origin main`

Run: `git ls-remote --heads origin main`

Expected: remote `refs/heads/main` equals local `HEAD`.


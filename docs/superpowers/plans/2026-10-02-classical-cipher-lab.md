# Classical Cipher Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished static teaching website with a left documentation sidebar and eight interactive classical-cipher animation modules.

**Architecture:** A framework-free single-page application uses hash routing and pure ES modules. Each algorithm returns both a final result and deterministic animation steps; a shared timeline renders those steps without embedding DOM logic in the cipher implementations.

**Tech Stack:** HTML5, CSS, browser JavaScript modules, SVG/CSS animation, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-02-classical-cipher-lab-design.md`

## Global Constraints

- Include exactly the eight approved algorithms: Caesar, Affine, Vigenere, Playfair, Hill 2x2, Columnar Transposition, One-Time Pad/Vernam, and a three-rotor teaching model.
- Remain a static site with no backend and no framework build step.
- Keep algorithm calculation independent from DOM rendering.
- Desktop uses a fixed left directory; mobile uses an accessible navigation drawer.
- Support encrypt, decrypt, preset example, play, pause, previous, next, speed, and reset.
- Normalize letters to uppercase and make punctuation handling explicit.
- Label the site as educational and unsuitable for production security.
- Respect keyboard use, 200% text scaling, and `prefers-reduced-motion`.

## Review Focus

- Empty or punctuation-only messages must show a useful validation error and never start an empty timeline; covered in Task 2 tests.
- Affine and Hill keys without modular inverses must be rejected before calculation; covered in Tasks 2 and 3 tests.
- Playfair repeated-letter splitting and I/J normalization must be deterministic; covered in Task 3 tests.
- Columnar decryption must recover messages whose lengths do not divide evenly by the number of columns; covered in Task 3 tests.
- Changing routes or editing inputs during playback must cancel the previous timer and reset timeline state; covered in Task 5 tests and browser verification.

---

### Task 1: Static shell and shared contracts

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `assets/styles.css`
- Create: `js/core/text.js`
- Create: `js/core/math.js`
- Create: `tests/core.test.mjs`

**Interfaces:**
- Produces: `normalizeLetters(text, preserveNonLetters)`, `gcd(a, b)`, `mod(value, base)`, and `modInverse(value, base)` for all cipher modules.
- Produces: the semantic page shell, sidebar navigation targets, content mount point, drawer controls, metadata, and embedded SVG favicon.

- [ ] **Step 1: Write failing core utility tests** for uppercase normalization, punctuation preservation, positive modulo, GCD, invertible values, and non-invertible values.
- [ ] **Step 2: Run `node --test tests/core.test.mjs`** and verify failure because the modules do not exist.
- [ ] **Step 3: Implement the core utilities** with pure functions and explicit errors for impossible modular inverses.
- [ ] **Step 4: Build the semantic HTML shell and theme tokens** with all eight hash links and the educational disclaimer.
- [ ] **Step 5: Run `node --test tests/core.test.mjs`** and verify all assertions pass.

### Task 2: Caesar, Affine, and Vigenere engines

**Files:**
- Create: `js/algorithms/caesar.js`
- Create: `js/algorithms/affine.js`
- Create: `js/algorithms/vigenere.js`
- Create: `tests/substitution.test.mjs`

**Interfaces:**
- Consumes: core text and modular arithmetic helpers from Task 1.
- Produces: each module exports `{ meta, validate, encrypt, decrypt, createSteps }`; result objects contain `{ output, normalized, steps }`.

- [ ] **Step 1: Write failing known-vector and round-trip tests** for Caesar, Affine, and Vigenere, including empty input and invalid Affine `a`.
- [ ] **Step 2: Run `node --test tests/substitution.test.mjs`** and confirm missing-module failures.
- [ ] **Step 3: Implement Caesar** with 0-25 key normalization and per-character shift steps.
- [ ] **Step 4: Implement Affine** with `gcd(a, 26) === 1`, modular inverse decryption, and substituted formula values in each step.
- [ ] **Step 5: Implement Vigenere** with alphabetic key validation and punctuation that does not consume the key index.
- [ ] **Step 6: Run the substitution test file** and verify known vectors, validation, and round trips pass.

### Task 3: Playfair, Hill, and Columnar engines

**Files:**
- Create: `js/algorithms/playfair.js`
- Create: `js/algorithms/hill.js`
- Create: `js/algorithms/columnar.js`
- Create: `tests/structured.test.mjs`

**Interfaces:**
- Consumes: core text and modular arithmetic helpers from Task 1.
- Produces: the common algorithm interface plus visualization data for 5x5 grids, 2x2 matrices, and column grids.

- [ ] **Step 1: Write failing known-vector and round-trip tests** for Playfair preprocessing, Hill 2x2 multiplication/inversion, and uneven Columnar messages.
- [ ] **Step 2: Run `node --test tests/structured.test.mjs`** and confirm missing-module failures.
- [ ] **Step 3: Implement Playfair** with I/J merging, keyword deduplication, repeated-pair splitting, X padding, and row/column/rectangle step metadata.
- [ ] **Step 4: Implement Hill 2x2** with determinant validation, X padding, encryption matrices, and modular inverse matrices for decryption.
- [ ] **Step 5: Implement Columnar Transposition** with stable keyword ranking, row fill, ordered column read, and correct uneven-column reconstruction.
- [ ] **Step 6: Run the structured test file** and verify all vectors, invalid keys, and round trips pass.

### Task 4: One-Time Pad and rotor engines

**Files:**
- Create: `js/algorithms/otp.js`
- Create: `js/algorithms/rotor.js`
- Create: `tests/stream-mechanical.test.mjs`

**Interfaces:**
- Consumes: core text and modular helpers from Task 1.
- Produces: the common algorithm interface; OTP steps include alphabetic and five-bit views, rotor steps include positions and forward/reflect/return paths.

- [ ] **Step 1: Write failing tests** for OTP known vectors, insufficient key rejection, rotor involution, and rotor reset behavior.
- [ ] **Step 2: Run `node --test tests/stream-mechanical.test.mjs`** and confirm missing-module failures.
- [ ] **Step 3: Implement OTP/Vernam** using mod-26 output and matching XOR teaching metadata without claiming the displayed five-bit mapping is a production OTP format.
- [ ] **Step 4: Implement the three-rotor teaching model** with fixed permutations, inverse mappings, stepping, reflector, initial positions, and deterministic path metadata.
- [ ] **Step 5: Run the stream/mechanical test file** and verify encryption, decryption, validation, and reset behavior.

### Task 5: Shared timeline, route rendering, and controls

**Files:**
- Create: `js/visualizers/timeline.js`
- Create: `js/visualizers/renderer.js`
- Create: `js/catalog.js`
- Create: `js/app.js`
- Create: `tests/timeline.test.mjs`
- Modify: `assets/styles.css`

**Interfaces:**
- Consumes: all eight common algorithm modules.
- Produces: `createTimeline(onChange)`, `renderAlgorithmPage(module)`, `renderStep(step)`, hash routing, form adapters, playback controls, result copying, and mobile drawer behavior.

- [ ] **Step 1: Write failing timeline tests** for initial state, next/previous bounds, play/pause, speed changes, reset, and timer cancellation on data replacement.
- [ ] **Step 2: Run `node --test tests/timeline.test.mjs`** and verify failure because the timeline does not exist.
- [ ] **Step 3: Implement the timeline state machine** with injectable timer functions so playback is deterministic in tests.
- [ ] **Step 4: Implement the algorithm catalog and hash router** with unknown hashes falling back to the introduction.
- [ ] **Step 5: Implement the shared workbench renderer** and algorithm-specific key fields and visualization panels.
- [ ] **Step 6: Implement keyboard, drawer, copy, route cancellation, reduced-motion, and inline validation behaviors.**
- [ ] **Step 7: Complete the visual system** for the fixed sidebar, readable content column, controls, matrices, tables, letter cells, bit rows, rotor path, active/error/complete states, and responsive layouts.
- [ ] **Step 8: Run `node --test tests/timeline.test.mjs`** and verify all timeline assertions pass.

### Task 6: Complete verification and first-version handoff

**Files:**
- Create: `tests/site-smoke.test.mjs`
- Modify: implementation files only when verification reveals a defect.

**Interfaces:**
- Consumes: the complete static site.
- Produces: test and browser evidence that the first version works as specified.

- [ ] **Step 1: Write a smoke test** that verifies metadata, all eight navigation targets, module catalog entries, disclaimer, and required playback controls.
- [ ] **Step 2: Run `node --test tests/*.test.mjs`** and fix only demonstrated failures until the full suite passes.
- [ ] **Step 3: Serve the site locally** and verify there are no load or console errors.
- [ ] **Step 4: Inspect desktop layout** at approximately 1440x900 and exercise at least one substitution, one matrix/grid, OTP, and rotor animation.
- [ ] **Step 5: Inspect mobile layout** at approximately 390x844, confirm the drawer, controls, local grid scrolling, focus behavior, and absence of page-level horizontal overflow.
- [ ] **Step 6: Exercise all eight preset examples** in both encrypt and decrypt modes and confirm animation final outputs match direct results.
- [ ] **Step 7: Report the local entry file and verification results** without publishing unless the user asks for deployment.

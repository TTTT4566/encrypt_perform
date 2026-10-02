import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const source = resolve(root, 'classical-cipher-lab');
const output = resolve(root, 'dist');

test('build replaces dist with an exact public copy of the canonical source', async () => {
  const sentinel = resolve(output, 'obsolete-sentinel.txt');
  writeFileSync(sentinel, 'remove me', 'utf8');

  const built = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(built.status, 0, built.stderr || built.stdout);
  assert.equal(existsSync(sentinel), false, 'stale dist files must be removed');

  for (const relativePath of [
    'index.html', 'assets/styles.css', 'assets/modern-visualizers.css', 'js/app.js', 'js/catalog.js',
    'js/algorithms/aes.js', 'js/algorithms/rsa.js', 'js/algorithms/rc4.js',
    'js/algorithms/sha256.js', 'js/algorithms/md5.js'
  ]) {
    assert.equal(existsSync(resolve(output, relativePath)), true, `${relativePath} should be built`);
  }

  const builtCatalog = await import(`${pathToFileURL(resolve(output, 'js/catalog.js')).href}?build=${Date.now()}`);
  assert.equal(builtCatalog.algorithms.length, 13);

  for (const relativePath of ['index.html', 'assets/styles.css', 'assets/modern-visualizers.css', 'js/app.js', 'js/catalog.js']) {
    assert.deepEqual(readFileSync(resolve(output, relativePath)), readFileSync(resolve(source, relativePath)), `${relativePath} should match source byte-for-byte`);
  }
});

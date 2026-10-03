import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const source = resolve(root, 'classical-cipher-lab');
const output = resolve(root, 'dist');

function listPublicFiles(directory) {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, resolve(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .sort();
}

test('committed dist is an exact copy of the canonical public source', () => {
  const sourceFiles = [
    'index.html',
    ...listPublicFiles(resolve(source, 'assets')).map((path) => `assets/${path}`),
    ...listPublicFiles(resolve(source, 'js')).map((path) => `js/${path}`)
  ].sort();
  const outputFiles = listPublicFiles(output);

  assert.deepEqual(outputFiles, sourceFiles, 'run npm run build before committing');
  for (const relativePath of sourceFiles) {
    assert.ok(
      readFileSync(resolve(output, relativePath)).equals(readFileSync(resolve(source, relativePath))),
      `${relativePath} is stale; run npm run build before committing`
    );
  }
});

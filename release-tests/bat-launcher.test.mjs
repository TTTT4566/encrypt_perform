import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('Windows launcher passes --open to Node without command truncation', () => {
  const folder = mkdtempSync(join(tmpdir(), 'cipher-bat-'));
  const fakeNode = join(folder, 'node.cmd');
  writeFileSync(fakeNode, '@echo off\r\necho FAKE_NODE_ARGS:%*\r\nexit /b 0\r\n', 'utf8');

  try {
    const site = resolve('classical-cipher-lab');
    const result = spawnSync('cmd.exe', ['/d', '/c', '.\\启动网站.bat'], {
      cwd: site,
      env: { ...process.env, PATH: `${folder};${process.env.PATH}` },
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /FAKE_NODE_ARGS:serve\.mjs --open/);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /not recognized|不是内部或外部命令/i);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

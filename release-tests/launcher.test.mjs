import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

const serverFile = resolve('classical-cipher-lab/serve.mjs');

function waitFor(predicate, timeoutMs = 2500) {
  const started = Date.now();
  return new Promise((resolveWait, reject) => {
    const tick = () => {
      if (predicate()) return resolveWait();
      if (Date.now() - started >= timeoutMs) return reject(new Error('等待浏览器打开信号超时'));
      setTimeout(tick, 30);
    };
    tick();
  });
}

test('the --open launcher signals the browser only after the server is listening', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'cipher-launcher-'));
  const probe = join(folder, 'opened-url.txt');
  let stdout = '';
  const child = spawn(process.execPath, [serverFile, '--open'], {
    env: { ...process.env, PORT: '0', BROWSER_OPEN_PROBE: probe },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });

  try {
    await waitFor(() => stdout.includes('古典密码实验室已启动'));
    await waitFor(() => existsSync(probe));
    const url = readFileSync(probe, 'utf8').trim();
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
    assert.ok(stdout.indexOf('已启动') < stdout.indexOf('正在打开浏览器'));
  } finally {
    child.kill();
    rmSync(folder, { recursive: true, force: true });
  }
});

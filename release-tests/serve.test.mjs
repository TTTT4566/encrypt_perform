import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

const serverFile = resolve('classical-cipher-lab/serve.mjs');

function waitForUrl(child, timeoutMs = 3000) {
  return new Promise((resolveUrl, reject) => {
    let stdout = '';
    const timeout = setTimeout(() => reject(new Error(`等待服务器地址超时：${stdout}`)), timeoutMs);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      const match = stdout.match(/http:\/\/127\.0\.0\.1:\d+\//);
      if (match) {
        clearTimeout(timeout);
        resolveUrl(match[0]);
      }
    });
  });
}

test('Node server can serve generated dist with JavaScript module MIME', async () => {
  const child = spawn(process.execPath, [serverFile, '--root=dist'], {
    cwd: resolve('.'),
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    const url = await waitForUrl(child);
    const script = await fetch(`${url}js/app.js`);
    assert.equal(script.status, 200);
    assert.match(script.headers.get('content-type') ?? '', /^text\/javascript/);
    assert.match(await script.text(), /from '\.\/catalog\.js'/);

    const sourceOnlyReadme = await fetch(`${url}README.md`);
    assert.equal(sourceOnlyReadme.status, 404, '--root=dist must not serve canonical-source-only files');
  } finally {
    child.kill();
  }
});

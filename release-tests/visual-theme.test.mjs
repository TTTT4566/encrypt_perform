import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

test('light theme renders a white sidebar and content without a black main focus frame', () => {
  const folder = mkdtempSync(join(tmpdir(), 'cipher-theme-'));
  const fixture = join(folder, 'fixture.html');
  const stylesheet = pathToFileURL(resolve('classical-cipher-lab/assets/styles.css')).href;
  writeFileSync(fixture, `<!doctype html>
    <html><head><link rel="stylesheet" href="${stylesheet}"></head>
    <body><aside class="sidebar"></aside><main tabindex="-1"></main><div class="result-strip"></div>
    <script>window.onload=()=>{const m=document.querySelector('main');m.focus();
      document.body.dataset.sidebar=getComputedStyle(document.querySelector('.sidebar')).backgroundColor;
      document.body.dataset.result=getComputedStyle(document.querySelector('.result-strip')).backgroundColor;
      document.body.dataset.outline=getComputedStyle(m).outlineStyle;};</script></body></html>`, 'utf8');

  try {
    const rendered = spawnSync(edge, [
      '--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--dump-dom', pathToFileURL(fixture).href
    ], { encoding: 'utf8' });
    assert.equal(rendered.status, 0, rendered.stderr);
    assert.match(rendered.stdout, /data-sidebar="rgb\(255, 255, 255\)"/);
    assert.match(rendered.stdout, /data-result="rgb\(255, 255, 255\)"/);
    assert.match(rendered.stdout, /data-outline="none"/);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

import { spawn } from 'node:child_process';
import { createReadStream, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const host = '127.0.0.1';
const requestedPort = Number(process.env.PORT ?? 4173);
const shouldOpen = process.argv.includes('--open');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function openBrowser(url) {
  const probe = process.env.BROWSER_OPEN_PROBE;
  if (probe) {
    writeFileSync(probe, url, 'utf8');
    return;
  }

  const commands = {
    win32: ['rundll32.exe', ['url.dll,FileProtocolHandler', url]],
    darwin: ['open', [url]],
    linux: ['xdg-open', [url]]
  };
  const [command, args] = commands[process.platform] ?? commands.linux;
  const opener = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
  opener.on('error', () => console.error(`浏览器未能自动打开，请手动访问：${url}`));
  opener.unref();
}

const server = createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filename = resolve(root, relative);
    const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;
    if (filename !== root && !filename.startsWith(rootPrefix)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const info = statSync(filename);
    if (!info.isFile()) throw new Error('Not a file');
    response.writeHead(200, {
      'Content-Type': types[extname(filename).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    createReadStream(filename).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not Found');
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE' && shouldOpen) {
    const url = `http://${host}:${requestedPort}/`;
    console.log(`端口 ${requestedPort} 已有服务，正在打开现有地址：${url}`);
    openBrowser(url);
    process.exitCode = 0;
    return;
  }
  console.error(`启动失败：${error.message}`);
  process.exitCode = 1;
});

server.listen(requestedPort, host, () => {
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : requestedPort;
  const url = `http://${host}:${actualPort}/`;
  console.log(`古典密码实验室已启动：${url}`);
  if (shouldOpen) {
    console.log('正在打开浏览器...');
    openBrowser(url);
  }
  console.log('关闭此窗口或按 Ctrl+C 即可停止。');
});

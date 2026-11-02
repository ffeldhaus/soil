import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const MARKETING_DIR = import.meta.dirname;
const REPO_ROOT = path.resolve(MARKETING_DIR, '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');

const PORT = 4412;
const DEBUG_PORT = 9346;

const customScreenshotArg = process.argv.find((a) => a.startsWith('--screenshot='));
const customScreenshotPath = customScreenshotArg ? path.resolve(customScreenshotArg.split('=')[1]) : null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function resolveAssetPath(urlPath) {
  if (urlPath === '/' || urlPath === '/flyer-dark.html') {
    return path.join(MARKETING_DIR, 'flyer-dark.html');
  }
  if (urlPath === '/flyer-light.html') {
    return path.join(MARKETING_DIR, 'flyer-light.html');
  }
  if (urlPath === '/SOIL-screenshot.png' && customScreenshotPath) {
    return customScreenshotPath;
  }
  return path.join(PUBLIC_DIR, urlPath);
}

function startFlyerServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      const filePath = resolveAssetPath(urlPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
      res.writeHead(404);
      res.end('Not found');
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function waitForDebuggerUrl(port) {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const pages = await res.json();
      const page = pages.find((p) => p.type === 'page' && p.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('Could not connect to Chrome DevTools Protocol');
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();

    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const msgId = ++id;
          return new Promise((res, rej) => {
            pending.set(msgId, { res, rej });
            ws.send(JSON.stringify({ id: msgId, method, params }));
          });
        },
        close() {
          ws.close();
        },
      });
    });

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(String(event.data));
      if (data.id && pending.has(data.id)) {
        const { res, rej } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) rej(new Error(data.error.message));
        else res(data.result);
      }
    });

    ws.addEventListener('error', reject);
  });
}

async function renderVariant(cdp, routePath, outPng, outJpg) {
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${routePath}` });

  for (let i = 0; i < 30; i++) {
    const evalRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return {
          loaded: imgs.length > 0 && imgs.every(img => img.complete && img.naturalWidth > 0),
          scrollHeight: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
        };
      })()`,
      returnByValue: true,
    });
    if (evalRes?.result?.value?.loaded) {
      // biome-ignore lint/suspicious/noConsole: CLI script output
      console.log(`Layout metrics (${routePath}):`, evalRes.result.value);
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  await new Promise((r) => setTimeout(r, 400));

  const pngShot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const pngBuf = Buffer.from(pngShot.data, 'base64');
  fs.writeFileSync(outPng, pngBuf);

  const jpgShot = await cdp.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 92,
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const jpgBuf = Buffer.from(jpgShot.data, 'base64');
  fs.writeFileSync(outJpg, jpgBuf);

  // biome-ignore lint/suspicious/noConsole: CLI script output
  console.log(`Saved PNG: ${outPng} (${pngBuf.length} bytes)`);
  // biome-ignore lint/suspicious/noConsole: CLI script output
  console.log(`Saved JPG: ${outJpg} (${jpgBuf.length} bytes)`);
}

async function main() {
  const server = await startFlyerServer();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soil-flyer-'));

  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${userDataDir}`,
      '--window-size=1240,1754',
      '--force-device-scale-factor=2',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  try {
    const wsUrl = await waitForDebuggerUrl(DEBUG_PORT);
    const cdp = await createCdpClient(wsUrl);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1240,
      height: 1754,
      deviceScaleFactor: 2,
      mobile: false,
    });

    await renderVariant(
      cdp,
      '/flyer-dark.html',
      path.join(MARKETING_DIR, 'SOIL-Flyer-Biologie-A4-dunkel.png'),
      path.join(MARKETING_DIR, 'SOIL-Flyer-Biologie-A4-dunkel.jpg'),
    );

    await renderVariant(
      cdp,
      '/flyer-light.html',
      path.join(MARKETING_DIR, 'SOIL-Flyer-Biologie-A4-hell.png'),
      path.join(MARKETING_DIR, 'SOIL-Flyer-Biologie-A4-hell.jpg'),
    );

    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
    server.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

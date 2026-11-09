import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const BROWSER_DIR = path.join(REPO_ROOT, 'dist/soil/browser');
const OUT_DIR = path.join(REPO_ROOT, 'marketing/store-assets');
const PORT = 4401;
const DEBUG_PORT = 9349;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      let filePath = path.join(BROWSER_DIR, urlPath === '/' ? 'index.html' : urlPath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const indexCandidate = path.join(filePath, 'index.html');
        if (fs.existsSync(indexCandidate)) {
          filePath = indexCandidate;
        } else {
          filePath = path.join(BROWSER_DIR, 'index.html');
        }
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function buildLocalGameState() {
  const gameId = 'local-screenshot';
  const playerUid = `player-${gameId}-1`;
  const cropCycle = [
    'Rye',
    'Fieldbean',
    'Rapeseed',
    'Pea',
    'Grass',
    'Fallow',
    'Wheat',
    'Corn',
    'Potato',
    'Beet',
    'Barley',
    'Oat',
  ];

  const baseYields = {
    Rye: 68,
    Fieldbean: 38,
    Rapeseed: 43,
    Pea: 37,
    Grass: 0,
    Fallow: 0,
    Wheat: 91,
    Corn: 102,
    Potato: 425,
    Beet: 760,
    Barley: 86,
    Oat: 60,
  };

  const parcelsRound6 = Array.from({ length: 40 }, (_, i) => {
    const crop = cropCycle[i % cropCycle.length];
    const soil = 96 + ((i * 3) % 11);
    const nutrition = 92 + ((i * 5) % 14);
    return {
      index: i,
      crop,
      soil,
      nutrition,
      yield: baseYields[crop] || 0,
    };
  });

  const parcelsFallow = Array.from({ length: 40 }, (_, i) => ({
    index: i,
    crop: 'Fallow',
    soil: 100,
    nutrition: 100,
    yield: 0,
  }));

  const currentDecisionParcels = {};
  for (let i = 0; i < 40; i++) {
    currentDecisionParcels[i] = cropCycle[i % cropCycle.length];
  }

  const allRoundsList = [
    {
      number: 0,
      parcelsSnapshot: parcelsFallow,
      weather: 'Normal',
      vermin: [],
    },
    ...[1, 2, 3, 4, 5].map((roundNum) => ({
      number: roundNum,
      parcelsSnapshot: parcelsRound6.map((p, idx) => ({
        ...p,
        crop: cropCycle[(idx + roundNum) % cropCycle.length],
        soil: Math.max(88, Math.min(108, p.soil - 2 + (roundNum % 3))),
        nutrition: Math.max(85, Math.min(110, p.nutrition - 3 + (roundNum % 4))),
      })),
      weather: roundNum === 3 ? 'Drought' : 'Normal',
      vermin: roundNum === 4 ? ['Aphid'] : [],
      decision: {
        roundNumber: roundNum,
        organic: false,
        fertilizer: true,
        pesticide: false,
        organisms: true,
        animals: 10,
        machines: 2,
        parcels: currentDecisionParcels,
      },
      result: {
        profit: 11200 + roundNum * 1450,
        capital: 100000 + roundNum * 12400,
        income: 42800 + roundNum * 1200,
        MarketResult: { totalIncome: 34200 },
        expenses: {
          seeds: 8400,
          fertilizer: 2100,
          pesticide: 0,
          organisms: 1400,
          animals: 3200,
          machines: 4800,
          runningCosts: 6000,
          totalExpenses: 25900,
        },
        subsidies: {
          greenStrip: 1200,
          bio: 0,
          totalSubsidies: 3800,
        },
        events: {
          weather: roundNum === 3 ? 'Drought' : 'Normal',
          vermin: roundNum === 4 ? ['Aphid'] : [],
        },
        harvest: {
          Wheat: 364,
          Rye: 272,
          Barley: 258,
          Oat: 180,
          Potato: 1275,
          Corn: 306,
          Beet: 2280,
          Rapeseed: 172,
          Pea: 148,
          Fieldbean: 152,
        },
      },
    })),
    {
      number: 6,
      parcelsSnapshot: parcelsRound6,
      weather: 'Normal',
      vermin: ['PotatoBeetle'],
      decision: {
        roundNumber: 6,
        organic: false,
        fertilizer: true,
        pesticide: false,
        organisms: true,
        animals: 10,
        machines: 2,
        parcels: currentDecisionParcels,
      },
    },
  ];

  const playerState = {
    uid: playerUid,
    displayName: 'Hof Sonnenfeld',
    isAi: false,
    capital: 164800,
    currentRound: 6,
    submittedRound: 5,
    status: 'active',
    activeContractId: 'legume-initiative',
    history: [
      { round: 0, capital: 100000, profit: 0, avgSoil: 100, avgNutrition: 100 },
      { round: 1, capital: 112400, profit: 12400, avgSoil: 99, avgNutrition: 98 },
      { round: 2, capital: 125900, profit: 13500, avgSoil: 100, avgNutrition: 97 },
      { round: 3, capital: 134100, profit: 8200, avgSoil: 98, avgNutrition: 96 },
      { round: 4, capital: 148600, profit: 14500, avgSoil: 100, avgNutrition: 99 },
      { round: 5, capital: 164800, profit: 16200, avgSoil: 101, avgNutrition: 100 },
    ],
  };

  const game = {
    id: gameId,
    name: 'Schulklasse 10b – Nachhaltige Fruchtfolge',
    adminUid: 'local-admin',
    config: {
      numPlayers: 4,
      numRounds: 10,
      numAi: 3,
      aiLevel: 'middle',
      startCapital: 100000,
    },
    settings: {
      playerLabel: 'Team',
      allowOrganic: true,
      allowFertilizer: true,
      allowPesticide: true,
      allowOrganisms: true,
      allowAnimals: true,
      allowMachines: true,
    },
    currentRound: 6,
    status: 'in_progress',
    players: {
      [playerUid]: playerState,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  return {
    game,
    playerState,
    lastRound: allRoundsList[6],
    allRounds: {
      [playerUid]: allRoundsList,
    },
  };
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

async function saveShot(cdp, filename) {
  const pngShot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const outPath = path.join(OUT_DIR, filename);
  const buf = Buffer.from(pngShot.data, 'base64');
  fs.writeFileSync(outPath, buf);
  // biome-ignore lint/suspicious/noConsole: CLI output
  console.log(`Saved ${filename} (${(buf.length / 1024).toFixed(0)} KB)`);
}

async function waitForBoardLoaded(cdp) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const evalRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const parcels = document.querySelectorAll('app-parcel');
        const imgs = Array.from(document.querySelectorAll('img'));
        const allLoaded = imgs.length >= 40 && imgs.every(img => img.complete && img.naturalWidth > 0);
        return { parcelCount: parcels.length, allLoaded };
      })()`,
      returnByValue: true,
    });
    const val = evalRes?.result?.value;
    if (val?.parcelCount === 40 && val?.allLoaded) {
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  await new Promise((r) => setTimeout(r, 600));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startStaticServer();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soil-store-assets-'));

  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${userDataDir}`,
      '--window-size=1920,1080',
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

    const localState = buildLocalGameState();
    const seedScript = `
      localStorage.setItem('soil_guest_uid', 'player-local-screenshot-1');
      localStorage.setItem('soil_guest_name', 'Hof Sonnenfeld');
      localStorage.setItem('soil_active_local_game', 'local-screenshot');
      localStorage.setItem('soil_tour_seen', 'true');
      localStorage.setItem('soil_tour_disabled', 'true');
      localStorage.setItem('soil_welcome_seen_local-screenshot', 'true');
      localStorage.setItem('soil_collected_stickers', JSON.stringify(['fruchtfolge-meister', 'humus-pionier', 'nuetzlings-allianz']));
      localStorage.setItem('soil_local_games', JSON.stringify(['local-screenshot']));
      localStorage.setItem('soil_game_local-screenshot', ${JSON.stringify(JSON.stringify(localState))});
    `;
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: seedScript });

    // --- 1. Landscape 16:9 (1920x1080) Screenshots (Tablet 7", Tablet 10", PC, Desktop) ---
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1.5, // produces exact 1920 x 1080 px
      mobile: false,
    });

    // 1a. Game Board with Soil & Nutrition Overlays (1920x1080)
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/game?gameId=local-screenshot` });
    await waitForBoardLoaded(cdp);
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        document.querySelector('button[aria-label="Toggle soil quality overlay"]')?.click();
        document.querySelector('button[aria-label="Toggle nutrition overlay"]')?.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 400));
    await saveShot(cdp, 'screenshot-16x9-1-spielbrett.png');

    // 1b. Planting Modal Open on Parcel 0 (1920x1080)
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const p = document.querySelector('app-parcel[data-index="0"]');
        p?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
      })()`,
    });
    await new Promise((r) => setTimeout(r, 600));
    await saveShot(cdp, 'screenshot-16x9-2-kulturauswahl.png');

    // 1c. Team & Achievements Modal with Stickers (1920x1080)
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/game?gameId=local-screenshot` });
    await waitForBoardLoaded(cdp);
    await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('button[title*="Team & Auszeichnungen"]')?.click()`,
    });
    await new Promise((r) => setTimeout(r, 600));
    await saveShot(cdp, 'screenshot-16x9-3-hof-auszeichnungen.png');

    // 1d. User Manual & Crop Database (1920x1080)
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/manual` });
    await new Promise((r) => setTimeout(r, 900));
    await saveShot(cdp, 'screenshot-16x9-4-handbuch.png');

    // 1e. Landing Page (1920x1080)
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
    await new Promise((r) => setTimeout(r, 800));
    await saveShot(cdp, 'screenshot-16x9-5-startseite.png');

    // --- 2. Portrait 9:16 (1080x1920) Smartphone Screenshots ---
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 640,
      deviceScaleFactor: 3, // produces exact 1080 x 1920 px
      mobile: true,
    });

    // 2a. Mobile Game Board with Soil & Nutrition (1080x1920)
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/game?gameId=local-screenshot` });
    await waitForBoardLoaded(cdp);
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        document.querySelector('button[title="Bodenqualität"]')?.click();
        document.querySelector('button[title="Nährstoffe"]')?.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 400));
    await saveShot(cdp, 'screenshot-9x16-1-spielbrett-mobil.png');

    // 2b. Mobile Planting Modal (1080x1920)
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const p = document.querySelector('app-parcel[data-index="0"]');
        p?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
      })()`,
    });
    await new Promise((r) => setTimeout(r, 600));
    await saveShot(cdp, 'screenshot-9x16-2-kulturauswahl-mobil.png');

    // 2c. Mobile Landing Page (1080x1920)
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
    await new Promise((r) => setTimeout(r, 800));
    await saveShot(cdp, 'screenshot-9x16-3-startseite-mobil.png');

    // 2d. Mobile Manual (1080x1920)
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/manual` });
    await new Promise((r) => setTimeout(r, 800));
    await saveShot(cdp, 'screenshot-9x16-4-handbuch-mobil.png');

    // --- 3. Google Play Feature Graphic (1024x500 px) ---
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1024,
      height: 500,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/game?gameId=local-screenshot` });
    await waitForBoardLoaded(cdp);
    // Add a clean Feature Graphic title badge overlay on the left side over the board
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const sideCol = document.querySelector('.board-side-column');
        if (sideCol) sideCol.style.display = 'none';
        const wrapper = document.querySelector('.board-grid-wrapper');
        if (wrapper) wrapper.style.paddingLeft = '390px';
        window.dispatchEvent(new Event('resize'));
        const banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;padding:0 40px;background:linear-gradient(90deg, rgba(17,24,39,0.98) 0%, rgba(17,24,39,0.95) 36%, rgba(17,24,39,0.0) 54%);font-family:system-ui,-apple-system,sans-serif;color:#fff;pointer-events:none;';
        banner.innerHTML = \`
          <div style="max-width:350px;">
            <div style="display:inline-block;padding:4px 10px;border-radius:6px;background:#065f46;border:1px solid #10b981;color:#d1fae5;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px;">
              Online-Planspiel &amp; Simulation (BNE)
            </div>
            <div style="font-size:64px;font-weight:900;line-height:0.95;letter-spacing:-0.04em;margin-bottom:12px;color:#ffffff;">
              SOIL
            </div>
            <div style="font-size:17px;font-weight:600;line-height:1.35;color:#e5e7eb;margin-bottom:14px;">
              Vierzig Felder. Zehn Jahre Zeit.<br/>Landwirtschaft, Bodenqualität &amp; Ökonomie.
            </div>
            <div style="font-size:12px;color:#9ca3af;font-family:monospace;">
              Biologie · Geographie · Wirtschaft · Kl. 5–13
            </div>
          </div>
        \`;
        document.body.appendChild(banner);
      })()`,
    });
    await new Promise((r) => setTimeout(r, 200));
    await saveShot(cdp, 'feature-graphic-1024x500.png');

    // --- 4. Google Play Games on PC Cover Graphic (1920x1080, 16:9, NO TEXT allowed) ---
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/assets/images/bauernhof-landscape-hd.webp` });
    await new Promise((r) => setTimeout(r, 500));
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;background:#111827;';
        const img = document.querySelector('img');
        if (img) {
          img.style.cssText = 'width:100vw;height:100vh;object-fit:cover;display:block;';
        }
      })()`,
    });
    await new Promise((r) => setTimeout(r, 200));
    await saveShot(cdp, 'play-games-pc-cover-1920x1080-notext.png');

    // --- 5. Google Play Games on PC Transparent Logo (600x400 px, transparent PNG) ---
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 600,
      height: 400,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Emulation.setDefaultBackgroundColorOverride', {
      color: { r: 0, g: 0, b: 0, a: 0 },
    });
    const logoHtml = `<!doctype html>
<html>
<body style="margin:0;padding:0;width:600px;height:400px;background:transparent;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;">
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 48px;border-radius:28px;background:rgba(17,24,39,0.92);border:3px solid #10b981;box-shadow:0 16px 40px rgba(0,0,0,0.6);">
    <div style="font-size:128px;font-weight:900;letter-spacing:-0.05em;line-height:0.95;color:#ffffff;">SOIL</div>
    <div style="margin-top:8px;font-size:20px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#34d399;">Planspiel Landwirtschaft</div>
  </div>
</body>
</html>`;
    await cdp.send('Page.navigate', {
      url: `data:text/html;base64,${Buffer.from(logoHtml).toString('base64')}`,
    });
    await new Promise((r) => setTimeout(r, 300));
    await saveShot(cdp, 'play-games-pc-logo-600x400-transparent.png');

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

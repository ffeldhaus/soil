import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const BROWSER_DIR = path.join(REPO_ROOT, 'dist/soil/browser');
const OUTPUT_PATH = path.join(REPO_ROOT, 'public/SOIL-screenshot.jpg');
const PORT = 4399;
const DEBUG_PORT = 9344;

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

  const makeRound = (num, snapshot, capital) => ({
    number: num,
    parcelsSnapshot: snapshot,
    avgSoil: 101,
    avgNutrition: 98,
    nextWeather: 'Normal',
    weatherForecast: {
      hintText: 'Ruhige Wetterlage oder Dürre möglich.',
      likelyWeathers: ['Normal', 'Drought'],
      confidence: 'tendency',
    },
    activeContract: {
      id: 'legume-initiative',
      name: 'Regionale Eiweiß-Initiative',
      description: 'Mindestens 6 Parzellen Ackerbohne oder Erbse zur regionalen Stickstoffbindung anbauen.',
      reward: 7000,
    },
    decision: {
      machines: 1,
      organic: true,
      fertilizer: false,
      pesticide: false,
      organisms: true,
      parcels: Object.fromEntries(snapshot.map((p) => [p.index, p.crop])),
    },
    result: {
      profit: 4850,
      capital,
      harvestSummary: {},
      expenses: { seeds: 8200, labor: 14500, running: 3500, investments: 2600, overdraftInterest: 0, total: 28800 },
      income: 21450,
      subsidies: 12200,
      contractBonus: 3500,
      overdraftInterest: 0,
      sustainabilityScore: 1120,
      insolvent: false,
      unlockedStickers: ['fruchtfolge-meister', 'humus-pionier', 'nuetzlings-allianz'],
      marketPrices: {},
      events: {
        weather: 'Normal',
        vermin: num === 6 ? ['aphid-black'] : [],
      },
      bioSiegel: true,
      machineRealLevel: 1,
    },
  });

  const allRoundsList = [
    makeRound(0, parcelsFallow, 100000),
    makeRound(1, parcelsFallow, 102400),
    makeRound(2, parcelsFallow, 105100),
    makeRound(3, parcelsFallow, 107800),
    makeRound(4, parcelsFallow, 110200),
    makeRound(5, parcelsFallow, 111900),
    makeRound(6, parcelsRound6, 114250),
  ];

  const playerState = {
    uid: playerUid,
    displayName: 'Hof Sonnenfeld',
    isAi: false,
    playerNumber: 1,
    capital: 114250,
    currentRound: 6,
    history: allRoundsList,
    avgSoil: 101,
    avgNutrition: 98,
    sustainabilityScore: 1120,
    insolvent: false,
    unlockedStickers: ['fruchtfolge-meister', 'humus-pionier', 'nuetzlings-allianz'],
  };

  const game = {
    id: gameId,
    name: 'Biologie-Kurs 10b',
    hostUid: playerUid,
    status: 'in_progress',
    currentRoundNumber: 6,
    settings: {
      length: 10,
      difficulty: 'normal',
      playerLabel: 'Team',
    },
    config: {
      numPlayers: 1,
      numAi: 0,
      numRounds: 10,
      difficulty: 'normal',
      playerLabel: 'Team',
      advisorEnabled: true,
      seed: 'BIO2026',
    },
    players: {
      [playerUid]: playerState,
    },
    playerSecrets: {
      1: { password: '1234' },
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

async function main() {
  if (!fs.existsSync(BROWSER_DIR)) {
    throw new Error(`Build output not found at ${BROWSER_DIR}. Run "npm run build" first.`);
  }
  const server = await startStaticServer();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soil-screenshot-'));

  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${userDataDir}`,
      '--window-size=1920,1377',
      '--force-device-scale-factor=1',
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
      width: 1920,
      height: 1377,
      deviceScaleFactor: 1,
      mobile: false,
    });

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
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/game?gameId=local-screenshot` });

    for (let attempt = 0; attempt < 40; attempt++) {
      const evalRes = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const parcels = document.querySelectorAll('app-parcel');
          const imgs = Array.from(document.querySelectorAll('img'));
          const allLoaded = imgs.length >= 42 && imgs.every(img => img.complete && img.naturalWidth > 0);
          return { parcelCount: parcels.length, imgCount: imgs.length, allLoaded };
        })()`,
        returnByValue: true,
      });
      const val = evalRes?.result?.value;
      if (val?.parcelCount === 40 && val?.allLoaded) {
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    await new Promise((r) => setTimeout(r, 1000));

    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 84,
      fromSurface: true,
      captureBeyondViewport: false,
    });

    const buf = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(OUTPUT_PATH, buf);
    // biome-ignore lint/suspicious/noConsole: CLI script output
    console.log(`Saved ${OUTPUT_PATH} (${buf.length} bytes)`);
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


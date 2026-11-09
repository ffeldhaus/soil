import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist/soil/browser');
const OUT_DIR =
  process.env.AUDIT_OUT_DIR ||
  '/Users/florian/.gemini/antigravity/brain/e33e5bbd-fde7-4500-bd87-ab1f634126fc/scratch/device-audit';

async function loadPlaywright() {
  const candidates = [
    'playwright',
    'playwright-core',
    '/Users/florian/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs',
    '/Users/florian/dev/ebuch-konvertierung/node_modules/playwright/index.mjs',
  ];
  for (const spec of candidates) {
    try {
      return await import(spec);
    } catch {
      // try next candidate
    }
  }
  throw new Error('Could not resolve playwright or playwright-core.');
}

const DEVICES = [
  {
    id: 'iphone-se-portrait',
    width: 375,
    height: 667,
    engine: 'webkit',
    safeArea: { top: 20, right: 0, bottom: 0, left: 0 },
  },
  {
    id: 'iphone-16-pro-portrait',
    width: 393,
    height: 852,
    engine: 'webkit',
    safeArea: { top: 59, right: 0, bottom: 34, left: 0 },
  },
  {
    id: 'iphone-16-pro-landscape',
    width: 852,
    height: 393,
    engine: 'webkit',
    safeArea: { top: 0, right: 59, bottom: 21, left: 59 },
  },
  {
    id: 'ipad-air-portrait',
    width: 820,
    height: 1180,
    engine: 'webkit',
    safeArea: { top: 24, right: 0, bottom: 20, left: 0 },
  },
  {
    id: 'ipad-air-landscape',
    width: 1180,
    height: 820,
    engine: 'webkit',
    safeArea: { top: 24, right: 0, bottom: 20, left: 0 },
  },
  {
    id: 'pixel-8-portrait',
    width: 412,
    height: 915,
    engine: 'chromium',
    safeArea: { top: 28, right: 0, bottom: 24, left: 0 },
  },
  {
    id: 'pixel-fold-folded',
    width: 419,
    height: 680,
    engine: 'chromium',
    safeArea: { top: 0, right: 52, bottom: 24, left: 0 },
  },
  {
    id: 'pixel-fold-unfolded',
    width: 841,
    height: 701,
    engine: 'chromium',
    safeArea: { top: 0, right: 52, bottom: 24, left: 0 },
  },
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp4': 'video/mp4',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

let activeSafeArea = { top: 0, right: 0, bottom: 0, left: 0 };

function substituteSafeAreaVars(content, safeArea) {
  return content
    .replace(/env\(\s*safe-area-inset-top(?:\s*,\s*[^)]+)?\)/g, `${safeArea.top}px`)
    .replace(/env\(\s*safe-area-inset-right(?:\s*,\s*[^)]+)?\)/g, `${safeArea.right}px`)
    .replace(/env\(\s*safe-area-inset-bottom(?:\s*,\s*[^)]+)?\)/g, `${safeArea.bottom}px`)
    .replace(/env\(\s*safe-area-inset-left(?:\s*,\s*[^)]+)?\)/g, `${safeArea.left}px`);
}

function startStaticServer(port = 4299) {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: CLI static server request handler
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', `http://localhost:${port}`);
    let pathname = decodeURIComponent(reqUrl.pathname);

    if (pathname === '/sw.js' || pathname === '/ngsw-worker.js') {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end('self.addEventListener("install", () => self.skipWaiting());');
      return;
    }

    if (pathname.endsWith('/')) {
      const dirIndex = path.join(DIST_DIR, pathname, 'index.html');
      if (fs.existsSync(dirIndex)) {
        pathname = path.posix.join(pathname, 'index.html');
      } else {
        pathname = '/index.html';
      }
    }

    let filePath = path.join(DIST_DIR, pathname);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const htmlCandidate = path.join(DIST_DIR, pathname, 'index.html');
      if (fs.existsSync(htmlCandidate)) {
        filePath = htmlCandidate;
      } else {
        filePath = path.join(DIST_DIR, 'index.html');
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    if (ext === '.css') {
      const raw = fs.readFileSync(filePath, 'utf8');
      const rewritten = substituteSafeAreaVars(raw, activeSafeArea);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      });
      res.end(rewritten);
      return;
    }

    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function buildSeededLocalGameState() {
  const gameId = 'local-audit-1';
  const playerUid = `player-${gameId}-1`;
  const aiUid = `player-${gameId}-2`;
  const cropCycle = [
    'Beet',
    'Fallow',
    'Fieldbean',
    'Potato',
    'Corn',
    'Wheat',
    'Grass',
    'Barley',
    'Oat',
    'Rye',
    'Rapeseed',
    'Pea',
  ];
  const yieldMap = {
    Beet: 450,
    Fallow: 0,
    Fieldbean: 38,
    Potato: 380,
    Corn: 95,
    Wheat: 76,
    Grass: 0,
    Barley: 68,
    Oat: 54,
    Rye: 62,
    Rapeseed: 41,
    Pea: 34,
  };

  const r1Parcels = Array.from({ length: 40 }, (_, i) => {
    // Keep same crop on i = 0 (Beet), 2 (Fieldbean), 3 (Potato) to trigger bad rotation badge;
    // rotate crop on other parcels so both bad-rotation and normal parcels are tested.
    const crop =
      i === 0 || i === 2 || i === 3 ? cropCycle[i % cropCycle.length] : cropCycle[(i + 1) % cropCycle.length];
    return {
      index: i,
      crop,
      soil: 96 + (i % 5) * 2,
      nutrition: 92 + (i % 4) * 3,
      yield: yieldMap[crop] || 50,
    };
  });

  const r2Parcels = Array.from({ length: 40 }, (_, i) => {
    const crop = cropCycle[i % cropCycle.length];
    return {
      index: i,
      crop,
      soil: i === 0 ? 96 : 94 + (i % 6) * 2,
      nutrition: i === 0 ? 92 : 90 + (i % 5) * 3,
      yield: yieldMap[crop] ?? 50,
    };
  });

  const parcel0Factors = {
    baseYield: 500,
    rotationFactor: 0.8,
    soilFactor: 0.96,
    nutritionFactor: 0.92,
    weatherFactor: 0.9,
    pestFactor: 1.0,
    machineBonus: 0.05,
    organicFactor: 1.0,
    finalYield: 450,
    soilDelta: {
      cropImpact: -4,
      rotationEffect: -4,
      fertilizerEffect: 0,
      organicEffect: 0,
      organismsEffect: 0,
      pesticideEffect: 0,
      machineCompaction: -1,
      weatherEffect: -2,
      animalBonus: 0,
      recoveryBonus: 0,
      total: -11,
    },
    nutritionDelta: {
      cropDemand: -18,
      legumeFixation: 0,
      fertilizerSupply: 20,
      total: 2,
    },
  };

  const activeContract = {
    id: 'legume-initiative',
    name: 'Leguminosen-Initiative',
    description: 'Baue auf mindestens 6 Parzellen Ackerbohnen oder Erbsen an.',
    reward: 6000,
  };

  const makeRound = (num, parcelsSnapshot, weather, vermin, capital, profit) => ({
    number: num,
    parcelsSnapshot,
    avgSoil: 98,
    avgNutrition: 95,
    nextWeather: 'Drought',
    weatherForecast: {
      hintText: 'Wetterbericht: Trockenheit erwartet.',
      likelyWeathers: ['Drought', 'Normal'],
      confidence: 'tendency',
    },
    activeContract,
    parcelFactors: { 0: parcel0Factors },
    decision: {
      machines: 1,
      organic: false,
      fertilizer: true,
      pesticide: false,
      organisms: true,
      parcels: Object.fromEntries(parcelsSnapshot.map((p) => [p.index, p.crop])),
    },
    result: {
      profit,
      capital,
      harvestSummary: { Beet: 1800, Wheat: 300, Potato: 1520, Fieldbean: 152, Corn: 380 },
      expenses: { seeds: 12000, labor: 9500, running: 4200, investments: 5000, overdraftInterest: 0, total: 30700 },
      income: 42700,
      subsidies: 4500,
      contractBonus: num === 2 ? 6000 : 0,
      overdraftInterest: 0,
      sustainabilityScore: 108,
      insolvent: false,
      unlockedStickers: ['first-harvest', 'legume-friend'],
      marketPrices: {},
      events: { weather, vermin },
      bioSiegel: false,
      machineRealLevel: 1,
    },
  });

  const round0 = makeRound(0, r1Parcels, 'Normal', [], 100000, 0);
  const round1 = makeRound(1, r1Parcels, 'Normal', [], 112000, 12000);
  const round2 = makeRound(2, r2Parcels, 'Drought', ['potato-beetle'], 128500, 16500);

  const playerState = {
    uid: playerUid,
    displayName: 'Hof Sonnenschein',
    isAi: false,
    playerNumber: 1,
    capital: 128500,
    currentRound: 2,
    history: [round0, round1, round2],
    avgSoil: 98,
    avgNutrition: 95,
    sustainabilityScore: 108,
    insolvent: false,
    unlockedStickers: ['first-harvest', 'legume-friend'],
  };

  const aiState = {
    uid: aiUid,
    displayName: 'KI-Hof Mittel',
    isAi: true,
    aiLevel: 'middle',
    playerNumber: 2,
    capital: 118000,
    currentRound: 2,
    history: [round0, round1, round2],
    avgSoil: 94,
    avgNutrition: 91,
    sustainabilityScore: 101,
    insolvent: false,
    unlockedStickers: ['first-harvest'],
  };

  return {
    game: {
      id: gameId,
      name: 'Audit Spiel',
      hostUid: 'guest-audit-1',
      status: 'in_progress',
      currentRoundNumber: 2,
      settings: {
        length: 10,
        difficulty: 'normal',
        playerLabel: 'Team',
      },
      config: {
        numPlayers: 2,
        numAi: 1,
        numRounds: 10,
        difficulty: 'normal',
        advisorEnabled: true,
        advancedPricingEnabled: true,
        seed: 'AUDIT1',
      },
      players: {
        [playerUid]: playerState,
        [aiUid]: aiState,
      },
      playerSecrets: { 1: { password: '1234' }, 2: { password: '5678' } },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    },
    playerState,
    lastRound: round2,
    allRounds: {
      [playerUid]: [round0, round1, round2],
      [aiUid]: [round0, round1, round2],
    },
  };
}

async function injectSafeAreaInDom(page, safeArea) {
  await page.evaluate((sa) => {
    const replaceVars = (str) =>
      str
        .replace(/env\(\s*safe-area-inset-top(?:\s*,\s*[^)]+)?\)/g, `${sa.top}px`)
        .replace(/env\(\s*safe-area-inset-right(?:\s*,\s*[^)]+)?\)/g, `${sa.right}px`)
        .replace(/env\(\s*safe-area-inset-bottom(?:\s*,\s*[^)]+)?\)/g, `${sa.bottom}px`)
        .replace(/env\(\s*safe-area-inset-left(?:\s*,\s*[^)]+)?\)/g, `${sa.left}px`);

    for (const styleEl of document.querySelectorAll('style')) {
      if (styleEl.textContent?.includes('safe-area-inset')) {
        styleEl.textContent = replaceVars(styleEl.textContent);
      }
    }
  }, safeArea);
}

async function collectPerfMetrics(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const domNodes = document.getElementsByTagName('*').length;
    const mem = performance.memory ? Math.round((performance.memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10 : null;
    const cls = window.__auditCls || 0;
    return {
      domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : 0,
      loadMs: nav ? Math.round(nav.loadEventEnd) : 0,
      domNodes,
      jsHeapMb: mem,
      cls: Math.round(cls * 10000) / 10000,
    };
  });
}

async function checkBoardAssertions(page, device, viewName) {
  return page.evaluate(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: comprehensive board geometry and badge assertions
    ({ safeArea, view }) => {
      const failures = [];
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // b. Top HUD accessibility & safe-area clearance
      const hud = document.querySelector('header[aria-label="Spiel-Kopfleiste"]');
      if (!hud) {
        failures.push('Missing <header aria-label="Spiel-Kopfleiste">');
      } else {
        const controls = hud.querySelectorAll('button, a');
        for (const el of controls) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) continue;
          if (rect.top < safeArea.top - 1) {
            failures.push(
              `HUD control "${(el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim()}" top=${rect.top.toFixed(1)} < safeArea.top=${safeArea.top}`,
            );
          }
          if (rect.height < 24) {
            failures.push(
              `HUD control "${(el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim()}" height=${rect.height.toFixed(1)} < 24`,
            );
          }
        }
      }

      // d. Board horizontal centering
      const grid = document.querySelector('.game-grid');
      if (!grid) {
        failures.push('Missing .game-grid');
      } else {
        const gRect = grid.getBoundingClientRect();
        const gridCenter = (gRect.left + gRect.right) / 2;
        const viewportCenter = vw / 2;
        if (Math.abs(gridCenter - viewportCenter) > 4) {
          failures.push(
            `Grid horizontal center=${gridCenter.toFixed(1)} deviates from viewport center=${viewportCenter.toFixed(1)} by ${Math.abs(gridCenter - viewportCenter).toFixed(1)}px (> 4px)`,
          );
        }

        // g. Footer height & 1-click Impressum/Datenschutz
        const footer = document.querySelector('footer');
        if (!footer) {
          failures.push('Missing <footer>');
        } else {
          const fRect = footer.getBoundingClientRect();
          const isPortrait = vh >= vw;
          const maxFooterH = isPortrait ? 36 + safeArea.bottom * 0.6 : 36;
          if (fRect.height > maxFooterH) {
            failures.push(`Footer height=${fRect.height.toFixed(1)}px > ${maxFooterH.toFixed(1)}px`);
          }
          if (gRect.bottom > fRect.top + 2) {
            failures.push(`.game-grid bottom=${gRect.bottom.toFixed(1)} overlaps footer top=${fRect.top.toFixed(1)}`);
          }
          for (const href of ['/impressum', '/privacy']) {
            const link = footer.querySelector(`a[href="${href}"]`);
            if (!link) {
              failures.push(`Missing footer link a[href="${href}"]`);
            } else {
              const lRect = link.getBoundingClientRect();
              if (lRect.width < 10 || lRect.height < 10 || lRect.bottom > vh + 1 || lRect.right > vw + 1) {
                failures.push(
                  `Footer link ${href} out of viewport or hidden (${JSON.stringify({ left: lRect.left, top: lRect.top, right: lRect.right, bottom: lRect.bottom })})`,
                );
              }
            }
          }
        }
      }

      // e. No parcel badge clipping or truncation
      const parcels = Array.from(document.querySelectorAll('app-parcel'));
      if (parcels.length !== 40) {
        failures.push(`Expected 40 app-parcel elements, found ${parcels.length}`);
      }

      // Check parcel 0 and first 12 parcels covering all crop names
      const indicesToInspect = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      for (const idx of indicesToInspect) {
        const parcelEl = document.querySelector(`app-parcel[data-index="${idx}"]`);
        if (!parcelEl) continue;
        const pRect = parcelEl.getBoundingClientRect();
        const overlayContainer = parcelEl.querySelector('.z-20');
        if (!overlayContainer) continue;

        const topLevelRows = Array.from(overlayContainer.children).filter((ch) => {
          const st = window.getComputedStyle(ch);
          return st.display !== 'none' && st.visibility !== 'hidden';
        });

        // Check vertical non-overlap of sibling badge rows on parcel 0 (and all inspected parcels)
        for (let i = 0; i < topLevelRows.length; i++) {
          const rRect = topLevelRows[i].getBoundingClientRect();
          if (rRect.top < pRect.top - 1 || rRect.bottom > pRect.bottom + 1) {
            failures.push(
              `Parcel[${idx}] row[${i}] ("${topLevelRows[i].textContent.trim()}") vertical overflow: row=[${rRect.top.toFixed(1)}, ${rRect.bottom.toFixed(1)}] outside parcel=[${pRect.top.toFixed(1)}, ${pRect.bottom.toFixed(1)}]`,
            );
          }
          if (rRect.left < pRect.left - 1 || rRect.right > pRect.right + 1) {
            failures.push(
              `Parcel[${idx}] row[${i}] ("${topLevelRows[i].textContent.trim()}") horizontal overflow: row=[${rRect.left.toFixed(1)}, ${rRect.right.toFixed(1)}] outside parcel=[${pRect.left.toFixed(1)}, ${pRect.right.toFixed(1)}]`,
            );
          }
          if (i > 0) {
            const prevRect = topLevelRows[i - 1].getBoundingClientRect();
            if (prevRect.bottom > rRect.top + 1) {
              failures.push(
                `Parcel[${idx}] badge overlap between row[${i - 1}] ("${topLevelRows[i - 1].textContent.trim()}", bottom=${prevRect.bottom.toFixed(1)}) and row[${i}] ("${topLevelRows[i].textContent.trim()}", top=${rRect.top.toFixed(1)})`,
              );
            }
          }
        }

        // Check scrollWidth <= clientWidth + 1 on all leaf badges inside parcel
        const leafBadges = Array.from(overlayContainer.querySelectorAll('div')).filter((d) => d.children.length === 0);
        for (const badge of leafBadges) {
          if (badge.scrollWidth > badge.clientWidth + 1) {
            failures.push(
              `Parcel[${idx}] badge "${badge.textContent.trim()}" truncated: scrollWidth=${badge.scrollWidth} > clientWidth=${badge.clientWidth} (${view})`,
            );
          }
        }
      }

      return failures;
    },
    { safeArea: device.safeArea, view: viewName },
  );
}

async function checkPlantingModalAssertions(page) {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: comprehensive 12-tile bounding box and truncation checks
  return page.evaluate(() => {
    const failures = [];
    const modal = document.querySelector('.planting-modal-container');
    if (!modal) {
      failures.push('Missing .planting-modal-container');
      return failures;
    }
    const mRect = modal.getBoundingClientRect();
    if (mRect.bottom > window.innerHeight + 1 || mRect.top < -1) {
      failures.push(
        `Planting modal container overflows viewport vertically: top=${mRect.top.toFixed(1)}, bottom=${mRect.bottom.toFixed(1)}, vh=${window.innerHeight}`,
      );
    }

    const tiles = Array.from(modal.querySelectorAll('.crop-tile'));
    if (tiles.length !== 12) {
      failures.push(`Expected 12 .crop-tile elements, found ${tiles.length}`);
    }

    const rects = tiles.map((t) => t.getBoundingClientRect());
    for (let i = 0; i < tiles.length; i++) {
      const r = rects[i];
      const nameBtn = tiles[i].querySelector('[data-testid^="crop-manual-trigger-"]');
      const label = nameBtn ? nameBtn.textContent.trim() : `tile-${i}`;
      if (r.width < 50 || r.height < 50) {
        failures.push(`Crop tile "${label}" too small: ${r.width.toFixed(1)}x${r.height.toFixed(1)} (< 50x50)`);
      }
      if (r.bottom > mRect.bottom + 1.5 || r.right > mRect.right + 1.5) {
        failures.push(
          `Crop tile "${label}" overflows modal container: tile=[${r.right.toFixed(1)}, ${r.bottom.toFixed(1)}] vs modal=[${mRect.right.toFixed(1)}, ${mRect.bottom.toFixed(1)}]`,
        );
      }
      if (nameBtn) {
        if (nameBtn.scrollWidth > nameBtn.clientWidth + 1) {
          failures.push(
            `Crop tile button "${label}" truncated: scrollWidth=${nameBtn.scrollWidth} > clientWidth=${nameBtn.clientWidth}`,
          );
        }
        const span = nameBtn.querySelector('span');
        if (span && span.scrollWidth > span.clientWidth + 1) {
          failures.push(
            `Crop tile span "${label}" truncated: scrollWidth=${span.scrollWidth} > clientWidth=${span.clientWidth}`,
          );
        }
      }

      for (let j = i + 1; j < tiles.length; j++) {
        const r2 = rects[j];
        const overlapX = Math.min(r.right, r2.right) - Math.max(r.left, r2.left);
        const overlapY = Math.min(r.bottom, r2.bottom) - Math.max(r.top, r2.top);
        if (overlapX > 1 && overlapY > 1) {
          failures.push(`Crop tile ${i} overlaps tile ${j} by ${overlapX.toFixed(1)}x${overlapY.toFixed(1)}px`);
        }
      }
    }

    return failures;
  });
}

async function checkContentPageSafeArea(page, device, routePath) {
  return page.evaluate(
    ({ safeArea, route }) => {
      const failures = [];
      const header = document.querySelector('main header');
      if (!header) {
        failures.push(`${route}: Missing <main> <header> card`);
      } else {
        const rect = header.getBoundingClientRect();
        if (rect.top < safeArea.top + 12 - 1) {
          failures.push(
            `${route}: <main> <header> top=${rect.top.toFixed(1)} < safeArea.top + 12 (${safeArea.top + 12}px)`,
          );
        }
      }
      return failures;
    },
    { safeArea: device.safeArea, route: routePath },
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: multi-device x 15-view orchestration loop
async function runAudit() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`Build directory ${DIST_DIR} does not exist. Run "npm run build" first.`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startStaticServer(4299);
  const baseUrl = 'http://127.0.0.1:4299';
  const pw = await loadPlaywright();

  const browsers = {
    chromium: await pw.chromium.launch(),
    webkit: await pw.webkit.launch(),
  };

  const seededState = buildSeededLocalGameState();
  const reportResults = [];
  let totalFailures = 0;

  try {
    for (const device of DEVICES) {
      activeSafeArea = device.safeArea;
      const deviceDir = path.join(OUT_DIR, device.id);
      fs.mkdirSync(deviceDir, { recursive: true });

      const browser = browsers[device.engine];
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: 2,
      });

      await context.addInitScript((state) => {
        const origFetch = window.fetch.bind(window);
        window.fetch = async (input, init) => {
          const url = typeof input === 'string' ? input : input?.url || '';
          if (url.includes(':5001/') || url.includes(':9099/')) {
            return new Response(
              JSON.stringify({
                users: [],
                result: { games: [], total: 0 },
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              },
            );
          }
          return origFetch(input, init);
        };

        window.__auditCls = 0;
        try {
          if (typeof PerformanceObserver !== 'undefined') {
            const po = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                  window.__auditCls = (window.__auditCls || 0) + (entry.value || 0);
                }
              }
            });
            po.observe({ type: 'layout-shift', buffered: true });
          }
        } catch {
          // ignore if unsupported
        }

        localStorage.setItem('soil_guest_uid', 'guest-audit-1');
        localStorage.setItem('soil_guest_name', 'Hof Sonnenschein');
        localStorage.setItem('soil_active_local_game', 'local-audit-1');
        localStorage.setItem('soil_local_games', JSON.stringify(['local-audit-1']));
        localStorage.setItem('soil_game_local-audit-1', JSON.stringify(state));
        localStorage.setItem('soil_welcome_seen_local-audit-1', 'true');
        localStorage.setItem('soil_tour_seen', 'true');
        localStorage.setItem('soil_tour_disabled', 'true');
      }, seededState);

      const page = await context.newPage();

      // Mock Firebase Emulator endpoints (Auth 9099 & Functions 5001) so offline pages have 0 errors
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      };
      await page.route(/localhost:(9099|5001)/, async (route) => {
        if (route.request().method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: corsHeaders });
          return;
        }
        await route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            users: [],
            result: {
              games: [],
              total: 0,
            },
          }),
        });
      });

      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(`Uncaught pageerror: ${err.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!text.includes('favicon')) {
            pageErrors.push(`Console error: ${text}`);
          }
        }
      });

      const recordView = async (viewId, extraFailures = []) => {
        await injectSafeAreaInDom(page, device.safeArea);
        await page.waitForTimeout(120);
        const screenshotPath = path.join(deviceDir, `${viewId}.png`);
        await page.screenshot({ path: screenshotPath });
        const perf = await collectPerfMetrics(page);
        const errs = [...pageErrors, ...extraFailures];
        pageErrors.length = 0;
        totalFailures += errs.length;
        reportResults.push({
          device: device.id,
          engine: device.engine,
          viewport: `${device.width}x${device.height}`,
          view: viewId,
          passed: errs.length === 0,
          failures: errs,
          perf,
          screenshot: screenshotPath,
        });
        const statusIcon = errs.length === 0 ? 'PASS' : 'FAIL';
        process.stdout.write(
          `[${statusIcon}] ${device.id} (${device.width}x${device.height}, ${device.engine}) -> ${viewId}${errs.length ? ` | ${errs.join(' ; ')}` : ''}\n`,
        );
      };

      // 01-landing
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
      await recordView('01-landing');

      // 02-board-default
      await page.goto(`${baseUrl}/game?gameId=local-audit-1`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.game-grid app-parcel[data-index="0"]', { timeout: 10000 });
      await injectSafeAreaInDom(page, device.safeArea);
      await page.waitForTimeout(150);
      const boardDefaultFailures = await checkBoardAssertions(page, device, '02-board-default');
      await recordView('02-board-default', boardDefaultFailures);

      // 03-board-all-overlays
      await page.evaluate(() => {
        const comp = window.ng?.getComponent?.(document.querySelector('app-board'));
        if (comp) {
          comp.showLabels = true;
          comp.showSoilOverlay = true;
          comp.showNutritionOverlay = true;
          comp.showHarvestOverlay = true;
          comp.cdr?.detectChanges?.();
        } else {
          // Click mobile or desktop overlay buttons for Soil, Nutrition, Harvest
          const isDesktop = window.innerWidth >= 1024;
          const container = document.querySelector(
            isDesktop ? '[data-tour="desktop-overlays"]' : '[data-tour="mobile-overlays"]',
          );
          if (container) {
            const btns = container.querySelectorAll('button');
            // 0: labels (already true), 1: soil, 2: nutrition, 3: harvest
            btns[1]?.click();
            btns[2]?.click();
            btns[3]?.click();
          }
        }
      });
      await page.waitForTimeout(150);
      const boardAllOverlaysFailures = await checkBoardAssertions(page, device, '03-board-all-overlays');
      await recordView('03-board-all-overlays', boardAllOverlaysFailures);

      // 04-planting-modal (select parcel 0 via keyboardActivate / Enter)
      await page.locator('app-parcel[data-index="0"] > div').focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('.planting-modal-container', { timeout: 5000 });
      await page.waitForTimeout(150);
      const plantingFailures = await checkPlantingModalAssertions(page);
      await recordView('04-planting-modal', plantingFailures);

      // 05-crop-manual-card
      const manualTrigger = page.locator(
        '[data-testid="crop-manual-trigger-sugarbeet"], [data-testid="crop-manual-trigger-beet"]',
      );
      await manualTrigger.first().click();
      await page.waitForSelector('[data-testid="planting-manual-crop-overlay"]', { timeout: 5000 });
      await recordView('05-crop-manual-card');

      // Close manual overlay & planting modal
      await page.locator('[data-testid="close-manual-crop-overlay-btn"]').click();
      await page.locator('[data-testid="close-planting-modal-btn"]').click();
      await page.waitForTimeout(100);

      // 06-round-settings-modal
      await page.evaluate(() => {
        const desktopBtn = document.querySelector('[data-testid="next-round-button"]');
        const mobileBtn = document.querySelector('[data-tour="mobile-overlays"] [data-tour="next-round"]');
        const target = window.innerWidth >= 1024 ? desktopBtn : mobileBtn;
        target?.click();
      });
      await page.waitForSelector('app-round-settings-modal [role="dialog"]', { timeout: 5000 });
      await recordView('06-round-settings-modal');

      // Close round-settings-modal
      await page.evaluate(() => {
        const cancelBtn = Array.from(document.querySelectorAll('app-round-settings-modal button')).find((b) =>
          b.textContent?.includes('Abbrechen'),
        );
        cancelBtn?.click();
      });
      await page.waitForTimeout(100);

      // 07-finance-view
      await page.evaluate(() => {
        const btns = Array.from(
          document.querySelectorAll('header[aria-label="Spiel-Kopfleiste"] button[aria-label="Analysen öffnen"]'),
        );
        const visibleBtn = btns.find((b) => b.getBoundingClientRect().width > 0);
        visibleBtn?.click();
      });
      await page.waitForSelector('app-finance', { timeout: 5000 });
      await recordView('07-finance-view');

      // Close finance view
      await page.evaluate(() => {
        const backBtn = Array.from(document.querySelectorAll('app-finance button')).find((b) =>
          b.textContent?.includes('Zurück zum Acker'),
        );
        backBtn?.click();
      });
      await page.waitForTimeout(100);

      // 08-team-modal
      await page.evaluate(() => {
        const desktopTeamBtn = document.querySelector('[data-testid="team-modal-btn"]');
        if (desktopTeamBtn && desktopTeamBtn.getBoundingClientRect().width > 0) {
          desktopTeamBtn.click();
          return;
        }
        const menuToggle = document.querySelector('[data-testid="mobile-menu-toggle"]');
        menuToggle?.click();
      });
      await page.waitForTimeout(100);
      await page.evaluate(() => {
        const mobileTeamBtn = document.querySelector('[data-testid="mobile-team-modal-btn"]');
        if (mobileTeamBtn) mobileTeamBtn.click();
      });
      await page.waitForSelector('[data-testid="sticker-album-modal"]', { timeout: 5000 });
      await recordView('08-team-modal');

      // Close team modal
      await page.locator('[data-testid="close-team-modal-btn"]').click();
      await page.waitForTimeout(80);

      // Content & Auth pages (09 to 15)
      const contentPages = [
        { id: '09-manual', route: '/manual', checkSafeArea: true },
        { id: '10-info', route: '/info', checkSafeArea: true },
        { id: '11-research', route: '/research', checkSafeArea: true },
        { id: '12-impressum', route: '/impressum', checkSafeArea: true },
        { id: '13-privacy', route: '/privacy', checkSafeArea: true },
        { id: '14-game-login', route: '/game-login', checkSafeArea: false },
        { id: '15-admin-login', route: '/admin/login', checkSafeArea: false },
      ];

      for (const cp of contentPages) {
        await page.goto(`${baseUrl}${cp.route}`, { waitUntil: 'networkidle' });
        await injectSafeAreaInDom(page, device.safeArea);
        await page.waitForTimeout(120);
        const failures = cp.checkSafeArea ? await checkContentPageSafeArea(page, device, cp.route) : [];
        await recordView(cp.id, failures);
      }

      await context.close();
    }
  } finally {
    await browsers.chromium.close();
    await browsers.webkit.close();
    server.close();
  }

  // Write Markdown & JSON report
  const passedCount = reportResults.filter((r) => r.passed).length;
  const totalCount = reportResults.length;

  const mdLines = [
    '# Multi-Device Visual, Layout, Geometry & Performance Audit Report',
    '',
    `- **Total Device × View Checks**: ${passedCount} / ${totalCount} passed (${totalFailures} failures)`,
    `- **Generated At**: ${new Date().toISOString()}`,
    '',
    '## Summary by Device Profile',
    '',
    '| Device | Engine | Viewport | Safe Area (T/R/B/L) | Passed | Avg DOM Nodes | Max CLS | JS Heap (MB) |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
  ];

  for (const dev of DEVICES) {
    const devRows = reportResults.filter((r) => r.device === dev.id);
    const devPassed = devRows.filter((r) => r.passed).length;
    const avgDom = Math.round(devRows.reduce((s, r) => s + r.perf.domNodes, 0) / devRows.length);
    const maxCls = Math.max(...devRows.map((r) => r.perf.cls));
    const heaps = devRows.map((r) => r.perf.jsHeapMb).filter((h) => h !== null);
    const avgHeap = heaps.length
      ? `${(heaps.reduce((a, b) => a + b, 0) / heaps.length).toFixed(1)} MB`
      : 'N/A (WebKit)';
    const sa = dev.safeArea;
    mdLines.push(
      `| \`${dev.id}\` | \`${dev.engine}\` | \`${dev.width}x${dev.height}\` | \`${sa.top}/${sa.right}/${sa.bottom}/${sa.left}\` | **${devPassed}/${devRows.length}** | \`${avgDom}\` | \`${maxCls}\` | \`${avgHeap}\` |`,
    );
  }

  if (totalFailures > 0) {
    mdLines.push('', '## Failures Detected', '');
    for (const r of reportResults.filter((x) => !x.passed)) {
      mdLines.push(`### \`${r.device}\` — \`${r.view}\``);
      for (const f of r.failures) {
        mdLines.push(`- ${f}`);
      }
      mdLines.push('');
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'report.md'), mdLines.join('\n'), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(reportResults, null, 2), 'utf8');

  process.stdout.write(
    `\nAudit complete: ${passedCount}/${totalCount} checks passed. Report saved to ${path.join(OUT_DIR, 'report.md')}\n`,
  );
  if (totalFailures > 0) {
    process.exitCode = 1;
  }
}

runAudit().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});

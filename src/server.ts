import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import compression from 'compression';
import express from 'express';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const UPSTREAM_ENDPOINTS = {
  researchApi: 'https://europe-west4-soil-602ea.cloudfunctions.net/researchApi',
  researchMcp: 'https://europe-west4-soil-602ea.cloudfunctions.net/researchMcp',
} as const;

const PROXY_RESPONSE_HEADERS = [
  'content-type',
  'cache-control',
  'content-disposition',
  'access-control-allow-origin',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
] as const;

function buildProxyRequestHeaders(req: express.Request): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof req.headers.accept === 'string') {
    headers.accept = req.headers.accept;
  }
  if (typeof req.headers['content-type'] === 'string') {
    headers['content-type'] = req.headers['content-type'];
  }
  const forwardedFor = req.headers['x-forwarded-for'];
  const clientIp = typeof forwardedFor === 'string' ? forwardedFor : req.ip || '';
  if (clientIp) {
    headers['x-forwarded-for'] = clientIp;
  }
  return headers;
}

function copyUpstreamHeaders(upstream: Response, res: express.Response): void {
  for (const header of PROXY_RESPONSE_HEADERS) {
    const value = upstream.headers.get(header);
    if (value) {
      res.setHeader(header, value);
    }
  }
}

function extractProxyRequestBody(req: express.Request): string | undefined {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return undefined;
  }
  if (Buffer.isBuffer(req.body)) {
    return req.body.length > 0 ? req.body.toString('utf-8') : undefined;
  }
  if (typeof req.body === 'string' && req.body.length > 0) {
    return req.body;
  }
  return undefined;
}

async function proxyToCloudFunction(
  req: express.Request,
  res: express.Response,
  functionName: keyof typeof UPSTREAM_ENDPOINTS,
): Promise<void> {
  try {
    const queryIndex = req.originalUrl.indexOf('?');
    const search = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
    const targetUrl = `${UPSTREAM_ENDPOINTS[functionName]}${search}`;

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: buildProxyRequestHeaders(req),
      body: extractProxyRequestBody(req),
    });

    copyUpstreamHeaders(upstream, res);
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).send(buffer);
  } catch (err) {
    console.error(`Error proxying ${req.originalUrl} to ${functionName}:`, err);
    res.status(502).json({ error: 'Upstream research service unavailable' });
  }
}

const INDEXNOW_KEY = '7f4c9e2a1b8d4f6e9c3a5b7d2e1f8a4c';
const CACHE_CONTROL_NO_STORE = 'no-cache, no-store, must-revalidate';
const CACHE_CONTROL_HTML = 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600, must-revalidate';
const CACHE_CONTROL_METADATA = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';
const CACHE_CONTROL_IMMUTABLE = 'public, max-age=31536000, immutable';
const CACHE_CONTROL_STATIC_ASSET = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';
const HASHED_ASSET_REGEX = /-[0-9a-zA-Z]{8}\.(?:js|mjs|css|woff2?)$/;

const app = express();
app.use(compression());

/**
 * Explicitly serve robots.txt, sitemap.xml, IndexNow key and assetlinks.json to avoid Angular router redirects.
 * Served as strings for maximum reliability in App Hosting environment.
 */
app.get('/robots.txt', (_req, res) => {
  res.setHeader('Cache-Control', CACHE_CONTROL_METADATA);
  res.type('text/plain');
  const robotsFile = join(browserDistFolder, 'robots.txt');
  if (existsSync(robotsFile)) {
    res.send(readFileSync(robotsFile, 'utf-8'));
    return;
  }
  res.send(`User-agent: *
# Disallow active gameplay and internal auth action routes
Disallow: /game
Disallow: /game-login
Disallow: /admin/super
Disallow: /auth/action

# Allow public content and noindex utility routes (so crawlers can read their <meta name="robots" content="noindex"> tags)
Allow: /
Allow: /manual
Allow: /info
Allow: /research
Allow: /admin

Sitemap: https://soil.app/sitemap.xml`);
});

app.get(`/${INDEXNOW_KEY}.txt`, (_req, res) => {
  res.setHeader('Cache-Control', CACHE_CONTROL_METADATA);
  res.type('text/plain; charset=utf-8');
  res.send(INDEXNOW_KEY);
});

app.get(['/llms.txt', '/llms.txt/'], (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', CACHE_CONTROL_METADATA);
  res.type('text/markdown; charset=utf-8');
  const llmsFile = join(browserDistFolder, 'llms.txt');
  if (existsSync(llmsFile)) {
    res.send(readFileSync(llmsFile, 'utf-8'));
    return;
  }
  res.send(`# SOIL – Online-Planspiel & Interaktive Landwirtschaftssimulation für BNE, Biologie, Geographie & Wirtschaft

> SOIL ist ein kostenloses, wissenschaftlich fundiertes und werbefreies Online-Planspiel und Simulationsspiel (Open Educational Resource, OER unter CC BY 4.0; Quellcode unter Apache 2.0) für Bildung für nachhaltige Entwicklung (BNE) über nachhaltige Landwirtschaft, Bodenfruchtbarkeit, Fruchtfolge und Agrarökonomie. Lernende der Klassen 5 bis 13 (Sekundarstufe I/II in allen 16 Bundesländern), Studierende und Selbstlernende bewirtschaften über 5 bis 20 Runden (Standard: 10 Runden = 10 Jahre) direkt online im Browser einen Betrieb mit 40 Ackerparzellen und 100.000 € Startkapital – allein gegen KI-Höfe oder DSGVO-konform ohne Schüler-Accounts per 4-stelliger Team-PIN im Klassenzimmer-Multiplayer.

## Hauptseiten & Dokumentation

- [Startseite & Sofort-Spielstart](https://soil.app/): Direkt im Browser ohne Registrierung ein lokales Einzelspieler-Spiel starten oder den 1-minütigen Trailer ansehen.
- [Spielhandbuch & Kulturdatenbank](https://soil.app/manual): Vollständige Anleitung zu Fruchtfolge, Bodenqualität (Humus), Nährstoffhaushalt, Witterungsrisiken, Schädlingen, EU-Bio-Siegel, Regionalverträgen sowie allen 12 Bewirtschaftungsoptionen (10 Ackerkulturen: Weizen, Gerste, Hafer, Roggen, Mais, Raps, Kartoffel, Zuckerrübe, Ackerbohne, Erbse; dazu Tiere/Weidehaltung und Brachland als Grünbrache/Blühstreifen).
- [Didaktischer & wissenschaftlicher Hintergrund](https://soil.app/info): Einsatz im Unterricht (BNE, Biologie, Geographie, Wirtschaft), Lehrplanbezug für alle 16 Bundesländer, wissenschaftliche Quellen (sources.json) und Spielmechanik.
- [Offene Forschungsdaten, REST/CSV-API & MCP-Server](https://soil.app/research): Anonymisierte Spielverläufe abgeschlossener Partien unter CC BY 4.0 für Wissenschaft, Lehre und KI-Agenten (inklusive öffentlicher REST/CSV-Schnittstelle unter https://soil.app/api/research und Model Context Protocol Server unter https://soil.app/mcp).
- [Spiele erstellen & verwalten (Lehrkräfte-Dashboard)](https://soil.app/admin): Lokale Spiele verwalten oder als Lehrkraft mehrteilige Klassenzimmer-Spiele mit PIN-Zugang und QR-Codes erstellen.
`);
});

app.get(
  [
    '/.well-known/ard.json',
    '/.well-known/ard.json/',
    '/.well-known/ai-catalog.json',
    '/.well-known/ai-catalog.json/',
    '/ard.json',
    '/ai-catalog.json',
  ],
  (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', CACHE_CONTROL_METADATA);
    res.type('application/json; charset=utf-8');
    const ardFile = join(browserDistFolder, '.well-known', 'ard.json');
    if (existsSync(ardFile)) {
      res.send(readFileSync(ardFile, 'utf-8'));
      return;
    }
    res.send(
      JSON.stringify(
        {
          specVersion: '1.0',
          entries: [
            {
              identifier: 'urn:air:soil.app:mcp:research-server',
              displayName: 'SOIL Research MCP Server',
              description:
                'Public read-only Model Context Protocol (MCP) server and open research dataset providing anonymized 10-round agricultural simulation games from SOIL (crop rotations, soil quality, nutrition, weather events, and economic outcomes).',
              type: 'application/mcp-server-card+json',
              data: {
                name: 'soil-research-mcp',
                version: '1.0.0',
                protocol: 'mcp',
                transport: 'streamable-http',
                endpoint: 'https://soil.app/mcp',
                documentationUrl: 'https://soil.app/research',
                restApiUrl: 'https://soil.app/api/research',
                tools: ['list_research_games', 'get_research_game', 'get_research_summary'],
              },
              representativeQueries: [
                'Anonymisierte Forschungsdaten aus dem Landwirtschafts-Planspiel SOIL abfragen',
                'Compare organic vs. conventional crop rotation yields and soil quality in SOIL simulation games',
                'Query anonymized agricultural simulation research games via MCP',
              ],
              capabilities: ['list_research_games', 'get_research_game', 'get_research_summary'],
              tags: ['agriculture', 'sustainability', 'soil-quality', 'crop-rotation', 'education', 'oer', 'open-data'],
            },
          ],
        },
        null,
        2,
      ),
    );
  },
);

app.get('/sitemap.xml', (_req, res) => {
  res.setHeader('Cache-Control', CACHE_CONTROL_METADATA);
  res.type('application/xml');
  const sitemapFile = join(browserDistFolder, 'sitemap.xml');
  if (existsSync(sitemapFile)) {
    res.send(readFileSync(sitemapFile, 'utf-8'));
    return;
  }
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>https://soil.app/</loc>
    <lastmod>2026-11-05</lastmod>
    <priority>1.0</priority>
    <video:video>
      <video:thumbnail_loc>https://soil.app/SOIL-screenshot.png</video:thumbnail_loc>
      <video:title>SOIL – Das interaktive Planspiel zu Landwirtschaft, Bodenfruchtbarkeit &amp; Nachhaltigkeit</video:title>
      <video:description>Vierzig Felder, 100.000 € Startkapital und zehn Jahre Zeit: Übernimm deinen eigenen Hof in der interaktiven Landwirtschaftssimulation SOIL für Unterricht (BNE, Biologie, Geographie, Wirtschaft), Studium und Selbstlernende.</video:description>
      <video:content_loc>https://soil.app/assets/video/soil-trailer.mp4</video:content_loc>
      <video:player_loc>https://www.youtube.com/embed/xCmZUGcyVLM</video:player_loc>
      <video:duration>65</video:duration>
      <video:publication_date>2026-10-30T14:00:00+01:00</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
    </video:video>
  </url>
  <url>
    <loc>https://soil.app/manual</loc>
    <lastmod>2026-11-05</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://soil.app/info</loc>
    <lastmod>2026-11-05</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://soil.app/research</loc>
    <lastmod>2026-11-05</lastmod>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://soil.app/admin</loc>
    <lastmod>2026-11-05</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>`);
});

app.get(['/.well-known/assetlinks.json', '/.well-known/assetlinks.json/'], (_req, res) => {
  res.setHeader('Cache-Control', CACHE_CONTROL_METADATA);
  res.type('application/json');
  res.send(`[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "app.soil.twa",
      "sha256_cert_fingerprints": ["CA:EF:E7:D1:58:CF:4C:E1:7A:A1:D0:2E:E7:80:29:E3:E5:21:56:A0:13:41:C8:21:F6:68:AE:69:82:63:B5:42"]
    }
  }
]`);
});

/**
 * Reverse-proxy public read-only Research REST/CSV API and MCP Server under soil.app.
 */
app.all(['/api/research', '/api/research/'], async (req, res) => {
  await proxyToCloudFunction(req, res, 'researchApi');
});

app.all(['/api/mcp', '/api/mcp/', '/mcp', '/mcp/'], express.raw({ type: '*/*', limit: '256kb' }), async (req, res) => {
  await proxyToCloudFunction(req, res, 'researchMcp');
});

/**
 * 301-redirect legacy localized URLs (/de, /en, /en-US) to canonical root paths.
 */
app.use((req, res, next) => {
  const match = /^\/(?:de|en|en-US)(?:\/(.*))?$/.exec(req.path);
  if (match) {
    const rest = match[1] || '';
    const queryIndex = req.originalUrl.indexOf('?');
    const search = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
    res.redirect(301, `/${rest}${search}`);
    return;
  }
  next();
});

/**
 * Security headers for Firebase Auth popups.
 */
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  next();
});

/**
 * Serve static files from the browser distribution folder with tiered Cache-Control headers:
 * - Service worker & webmanifest: no-store so PWA updates take effect immediately
 * - HTML documents: browser always revalidates (max-age=0, must-revalidate), CDN caches briefly (s-maxage=300)
 * - Fingerprinted JS/CSS/font bundles: 1 year immutable
 * - Non-fingerprinted assets (images, video, icons): 1 day browser, 7 days CDN with stale-while-revalidate
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    dotfiles: 'allow',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('/sw.js') || filePath.endsWith('\\sw.js') || filePath.endsWith('.webmanifest')) {
        res.setHeader('Cache-Control', CACHE_CONTROL_NO_STORE);
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', CACHE_CONTROL_HTML);
      } else if (HASHED_ASSET_REGEX.test(filePath)) {
        res.setHeader('Cache-Control', CACHE_CONTROL_IMMUTABLE);
      } else {
        res.setHeader('Cache-Control', CACHE_CONTROL_STATIC_ASSET);
      }
    },
  }),
);

/**
 * Return 404 for unknown .well-known probes instead of falling through to the Angular SPA root redirect.
 */
app.use('/.well-known', (_req, res) => {
  res.status(404).type('text/plain').send('Not Found');
});

/**
 * Handle all other requests by rendering the Angular application.
 */
let angularApp: AngularNodeAppEngine | undefined;

async function ensureAngularAppInitialized(): Promise<AngularNodeAppEngine> {
  if (angularApp) return angularApp;
  try {
    const { ɵsetAngularAppEngineManifest: setAngularAppEngineManifest, AngularAppEngine } = (await import(
      '@angular/ssr'
    )) as any;

    if (AngularAppEngine) {
      AngularAppEngine.ɵallowStaticRouteRender = true;
    }

    const manifestPath = pathToFileURL(join(serverDistFolder, 'angular-app-engine-manifest.mjs'));
    const localeManifestPath = pathToFileURL(join(serverDistFolder, 'angular-app-manifest.mjs'));

    let manifest: any;
    try {
      manifest = (await import(manifestPath.href)).default;
    } catch (_e) {
      try {
        manifest = (await import(localeManifestPath.href)).default;
      } catch (_e2) {
        // Ignore if no manifest is found
      }
    }

    if (manifest) {
      setAngularAppEngineManifest(manifest);
    }
  } catch (err) {
    console.error('Failed to initialize Angular app engine:', err);
  }
  angularApp = new AngularNodeAppEngine({
    allowedHosts: ['soil.app', '*.soil.app', '*.hosted.app', '*.a.run.app', 'localhost', '127.0.0.1'],
  });
  return angularApp;
}

app.use('*path', async (req, res, next) => {
  // Skip Firebase reserved paths
  if (req.originalUrl.startsWith('/__/')) {
    next();
    return;
  }

  // Return 404 for unknown .well-known probes instead of redirecting to the Angular SPA root
  if (req.originalUrl.startsWith('/.well-known/')) {
    res.status(404).type('text/plain').send('Not Found');
    return;
  }

  // Serve prerendered static route HTML (<route>/index.html) when available in browserDistFolder
  if (req.method === 'GET' || req.method === 'HEAD') {
    const pathname = new URL(req.originalUrl, 'http://localhost').pathname;
    const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
    const prerenderedHtml = cleanPath
      ? resolve(browserDistFolder, cleanPath, 'index.html')
      : resolve(browserDistFolder, 'index.html');
    if (prerenderedHtml.startsWith(browserDistFolder) && existsSync(prerenderedHtml)) {
      res.setHeader('Cache-Control', CACHE_CONTROL_HTML);
      res.type('text/html; charset=utf-8').send(readFileSync(prerenderedHtml, 'utf-8'));
      return;
    }
  }

  const engine = await ensureAngularAppInitialized();

  // biome-ignore lint/suspicious/noConsole: used for production logging
  console.log(`Handling request: ${req.method} ${req.originalUrl}`);

  engine
    .handle(req)
    .then((response) => {
      if (response) {
        res.setHeader('Cache-Control', CACHE_CONTROL_HTML);
        writeResponseToNodeResponse(response, res);
      } else {
        next();
      }
    })
    .catch((err) => {
      console.error(`Error handling request ${req.originalUrl}:`, err);
      next(err);
    });
});

/**
 * Start the server if this module is main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = Number(process.env.PORT || 4000);
  const server = app.listen(port, () => {
    // biome-ignore lint/suspicious/noConsole: used for production logging
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
  server.on('error', (err) => {
    console.error('Server error:', err);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

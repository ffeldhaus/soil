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
const defaultBrowserDistFolder = resolve(serverDistFolder, '../browser');
const vitestBrowserDistFolder = resolve(serverDistFolder, '../dist/soil/browser');
const browserDistFolder =
  process.env.VITEST && !existsSync(defaultBrowserDistFolder) && existsSync(vitestBrowserDistFolder)
    ? vitestBrowserDistFolder
    : defaultBrowserDistFolder;

const PRERENDERED_ROUTES = new Set([
  '',
  'trailer',
  'manual',
  'info',
  'research',
  'admin',
  'admin/login',
  'admin/register',
  'game-login',
  'delete-account',
  'impressum',
  'privacy',
]);

const NOINDEX_PRERENDERED_ROUTES = new Set([
  'admin/login',
  'admin/register',
  'game-login',
  'delete-account',
  'impressum',
  'privacy',
]);

const CSR_NOINDEX_ROUTES = new Set(['game', 'admin/super', 'auth/action', '_/auth/action', '__/auth/action']);

const KNOWN_APP_ROUTES = new Set([...PRERENDERED_ROUTES, ...CSR_NOINDEX_ROUTES]);
const UPSTREAM_ENDPOINTS = {
  researchApi: 'https://europe-west4-soil-602ea.cloudfunctions.net/researchApi',
  researchMcp: 'https://europe-west4-soil-602ea.cloudfunctions.net/researchMcp',
  recordTelemetry: 'https://europe-west4-soil-602ea.cloudfunctions.net/recordTelemetry',
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
  if (typeof req.headers['user-agent'] === 'string') {
    headers['user-agent'] = req.headers['user-agent'];
  }
  if (typeof req.headers.dnt === 'string') {
    headers.dnt = req.headers.dnt;
  }
  if (typeof req.headers['sec-gpc'] === 'string') {
    headers['sec-gpc'] = req.headers['sec-gpc'];
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
Allow: /trailer
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
- [Didaktischer & wissenschaftlicher Hintergrund](https://soil.app/info): Einsatz im Unterricht (BNE, Biologie, Geographie, Wirtschaft), Lehrplanbezug für alle 16 Bundesländer, wissenschaftliche Quellen (\`sources.json\`) und Spielmechanik.
- [Offene Forschungsdaten, REST/CSV-API & MCP-Server](https://soil.app/research): Anonymisierte Spielverläufe abgeschlossener Partien unter CC BY 4.0 für Wissenschaft, Lehre und KI-Agenten (inklusive öffentlicher REST/CSV-Schnittstelle unter \`https://soil.app/api/research\` und Model Context Protocol Server unter \`https://soil.app/mcp\`).
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
    <lastmod>2026-11-12</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://soil.app/trailer</loc>
    <lastmod>2026-11-12</lastmod>
    <priority>0.9</priority>
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
    <lastmod>2026-11-12</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://soil.app/info</loc>
    <lastmod>2026-11-12</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://soil.app/research</loc>
    <lastmod>2026-11-12</lastmod>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://soil.app/admin</loc>
    <lastmod>2026-11-12</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>`);
});

app.get(['/.well-known/assetlinks.json', '/.well-known/assetlinks.json/'], (_req, res) => {
  res.setHeader('Cache-Control', CACHE_CONTROL_METADATA);
  res.type('application/json; charset=utf-8');
  const assetLinksFile = join(browserDistFolder, '.well-known', 'assetlinks.json');
  if (existsSync(assetLinksFile)) {
    res.send(readFileSync(assetLinksFile, 'utf-8'));
    return;
  }
  res.send(`[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "app.soil.twa",
      "sha256_cert_fingerprints": [
        "CA:EF:E7:D1:58:CF:4C:E1:7A:A1:D0:2E:E7:80:29:E3:E5:21:56:A0:13:41:C8:21:F6:68:AE:69:82:63:B5:42",
        "A7:D5:AB:FE:C2:09:B5:BA:53:F1:71:8E:DC:C0:25:D2:53:66:7C:10:8A:0C:F2:AA:99:5C:BC:54:D4:BD:69:5E"
      ]
    }
  }
]`);
});

app.get(
  [
    '/.well-known/apple-app-site-association',
    '/.well-known/apple-app-site-association/',
    '/apple-app-site-association',
  ],
  (_req, res) => {
    res.setHeader('Cache-Control', CACHE_CONTROL_METADATA);
    res.type('application/json; charset=utf-8');
    const aasaFile = join(browserDistFolder, '.well-known', 'apple-app-site-association');
    if (existsSync(aasaFile)) {
      res.send(readFileSync(aasaFile, 'utf-8'));
      return;
    }
    res.send(`{
  "applinks": {
    "details": [
      {
        "appIDs": ["XUG7UA3678.app.soil"],
        "components": [
          {
            "/": "/game-login*",
            "comment": "Open classroom PIN login links directly in the SOIL app"
          },
          {
            "/": "/game*",
            "comment": "Open active game links directly in the SOIL app"
          },
          {
            "/": "/admin*",
            "comment": "Open teacher dashboard and auth action links in the SOIL app"
          }
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": ["XUG7UA3678.app.soil"]
  }
}`);
  },
);

/**
 * Reverse-proxy public read-only Research REST/CSV API and MCP Server under soil.app.
 */
app.all(['/api/research', '/api/research/'], async (req, res) => {
  await proxyToCloudFunction(req, res, 'researchApi');
});

app.all(['/api/mcp', '/api/mcp/', '/mcp', '/mcp/'], express.raw({ type: '*/*', limit: '256kb' }), async (req, res) => {
  await proxyToCloudFunction(req, res, 'researchMcp');
});

app.all(['/api/telemetry', '/api/telemetry/'], express.raw({ type: '*/*', limit: '16kb' }), async (req, res) => {
  await proxyToCloudFunction(req, res, 'recordTelemetry');
});

const NOT_FOUND_HTML = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Seite nicht gefunden (404) – SOIL Online-Planspiel</title>
  <meta name="description" content="Die angeforderte Seite wurde im Online-Planspiel SOIL nicht gefunden. Kehre zur Startseite zurück, um ein lokales oder Mehrspieler-Spiel zu starten." />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="icon" href="/favicon.ico" sizes="48x48" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="theme-color" content="#065f46" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100dvh;
      background-color: #111827;
      color: #f9fafb;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    body {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding-top: env(safe-area-inset-top, 0px);
    }
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem 1rem 4rem;
      max-width: 34rem;
      margin: 0 auto;
    }
    h1 {
      margin: 0;
      font-size: clamp(4.5rem, 16vw, 7.5rem);
      font-weight: 900;
      line-height: 1;
      letter-spacing: -0.05em;
      color: rgba(16, 185, 129, 0.24);
      user-select: none;
    }
    h2 {
      margin: 0.5rem 0 0.75rem;
      font-size: clamp(1.75rem, 5vw, 2.5rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #ffffff;
    }
    p {
      margin: 0;
      color: #9ca3af;
      font-size: 1.0625rem;
      line-height: 1.6;
    }
    .cta {
      margin-top: 2rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background-color: #059669;
      color: #ffffff;
      font-weight: 700;
      text-decoration: none;
      padding: 0.9rem 1.75rem;
      border-radius: 0.875rem;
      border: 1px solid #10b981;
      transition: background-color 150ms ease-out;
    }
    .cta:hover { background-color: #10b981; }
    footer {
      background-color: rgba(3, 7, 18, 0.92);
      border-top: 1px solid #1f2937;
      padding: 0.5rem 1rem calc(0.5rem + env(safe-area-inset-bottom, 0px));
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.75rem;
    }
    footer nav {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.5rem 0.75rem;
    }
    footer a {
      color: #d1d5db;
      text-decoration: none;
    }
    footer a:hover {
      color: #ffffff;
      text-decoration: underline;
    }
    .sep { color: #4b5563; }
  </style>
</head>
<body>
  <main>
    <h1>404</h1>
    <h2>Seite nicht gefunden</h2>
    <p>Es sieht so aus, als hätten wir den Pfad zu diesem Acker verloren. Kehre zur Startseite zurück, um deinen Hof zu bewirtschaften.</p>
    <a class="cta" href="/">Zurück zum Hof</a>
  </main>
  <footer aria-label="Rechtliches und Dokumentation">
    <nav aria-label="Fußzeilen-Navigation">
      <a href="/manual">Handbuch</a>
      <span class="sep" aria-hidden="true">|</span>
      <a href="/info">Hintergrund</a>
      <span class="sep" aria-hidden="true">|</span>
      <a href="/research">Forschungsdaten</a>
      <span class="sep" aria-hidden="true">|</span>
      <a href="/impressum">Impressum</a>
      <span class="sep" aria-hidden="true">|</span>
      <a href="/privacy">Datenschutz</a>
    </nav>
  </footer>
</body>
</html>`;

function getRequestPathname(req: express.Request): string {
  try {
    return new URL(req.originalUrl, 'http://localhost').pathname;
  } catch {
    return req.path;
  }
}

function extractQuerySearch(originalUrl: string): string {
  const queryIndex = originalUrl.indexOf('?');
  return queryIndex >= 0 ? originalUrl.slice(queryIndex) : '';
}

function getCanonicalRedirectOrigin(req: express.Request): string {
  const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || req.get('host') || '';
  return host === 'soil.app' ? 'https://soil.app' : '';
}

function sendNotFoundResponse(req: express.Request, res: express.Response): void {
  res.setHeader('Cache-Control', CACHE_CONTROL_NO_STORE);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const pathname = getRequestPathname(req);
  const lastSegment = pathname.split('/').pop() || '';
  if (lastSegment.includes('.') && !lastSegment.endsWith('.html')) {
    res.status(404).type('text/plain; charset=utf-8').send('Not Found');
    return;
  }
  res.status(404).type('text/html; charset=utf-8').send(NOT_FOUND_HTML);
}

function transformCsrNoindexHtml(rawHtml: string): string {
  return rawHtml
    .replace(
      /<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/gi,
      '<meta name="robots" content="noindex, nofollow">',
    )
    .replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>\s*/gi, '')
    .replace(/<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>\s*/gi, '');
}

/**
 * Security headers for Firebase Auth popups.
 */
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  next();
});

/**
 * Handle legacy localized URLs:
 * - /en, /en/*, /en-US, /en-US/* immediately return HTTP 404 in 0 hops (no English version exists).
 * - /de and /de/<known-route> single-hop 301-redirect to canonical root paths; unknown /de/* return HTTP 404 directly.
 */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/__/')) {
    next();
    return;
  }

  const pathname = getRequestPathname(req);

  if (/^\/(?:en|en-US)(?:\/|$)/.test(pathname)) {
    sendNotFoundResponse(req, res);
    return;
  }

  const deMatch = /^\/de(?:\/(.*))?$/.exec(pathname);
  if (deMatch) {
    const rawRest = (deMatch[1] || '').replace(/^\/+|\/+$/g, '');
    const targetClean = rawRest.replace(/(?:^|\/)index\.html$/, '').replace(/^\/+|\/+$/g, '');
    if (KNOWN_APP_ROUTES.has(targetClean)) {
      const origin = getCanonicalRedirectOrigin(req);
      const targetPath = targetClean ? `/${targetClean}` : '/';
      const search = extractQuerySearch(req.originalUrl);
      res.redirect(301, `${origin}${targetPath}${search}`);
      return;
    }
    sendNotFoundResponse(req, res);
    return;
  }

  next();
});

/**
 * Canonical URL normalization for /index.html, /<known-route>/index.html, and /<known-route>/ trailing slashes.
 * Placed before express.static so /index.html and /<known-route>/index.html redirect cleanly instead of serving duplicate URLs.
 */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/__/') || (req.method !== 'GET' && req.method !== 'HEAD')) {
    next();
    return;
  }

  const pathname = getRequestPathname(req);
  const origin = getCanonicalRedirectOrigin(req);
  const search = extractQuerySearch(req.originalUrl);

  if (pathname === '/index.html') {
    res.redirect(301, `${origin}/${search}`);
    return;
  }

  const nestedIndexMatch = /^\/(.+)\/index\.html$/.exec(pathname);
  if (nestedIndexMatch && KNOWN_APP_ROUTES.has(nestedIndexMatch[1])) {
    res.redirect(301, `${origin}/${nestedIndexMatch[1]}${search}`);
    return;
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
    if (KNOWN_APP_ROUTES.has(cleanPath)) {
      const targetPath = cleanPath ? `/${cleanPath}` : '/';
      res.redirect(301, `${origin}${targetPath}${search}`);
      return;
    }
  }

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
    allowedHosts: [
      'soil.app',
      '*.soil.app',
      '*.hosted.app',
      '*.run.app',
      '*.europe-west4.run.app',
      '*.a.run.app',
      'localhost',
      '127.0.0.1',
    ],
  });
  return angularApp;
}

function servePrerenderedRouteIfAvailable(cleanPath: string, res: express.Response): boolean {
  if (NOINDEX_PRERENDERED_ROUTES.has(cleanPath)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  const prerenderedHtml = cleanPath
    ? resolve(browserDistFolder, cleanPath, 'index.html')
    : resolve(browserDistFolder, 'index.html');
  if (prerenderedHtml.startsWith(browserDistFolder) && existsSync(prerenderedHtml)) {
    res.setHeader('Cache-Control', CACHE_CONTROL_HTML);
    res.type('text/html; charset=utf-8').send(readFileSync(prerenderedHtml, 'utf-8'));
    return true;
  }
  return false;
}

function serveCsrNoindexRouteIfAvailable(res: express.Response): boolean {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const csrHtml = resolve(browserDistFolder, 'index.csr.html');
  if (existsSync(csrHtml)) {
    res.setHeader('Cache-Control', CACHE_CONTROL_HTML);
    const transformedHtml = transformCsrNoindexHtml(readFileSync(csrHtml, 'utf-8'));
    res.type('text/html; charset=utf-8').send(transformedHtml);
    return true;
  }
  return false;
}

function tryServeStaticAppRoute(req: express.Request, res: express.Response): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }
  const cleanPath = getRequestPathname(req).replace(/^\/+|\/+$/g, '');
  if (PRERENDERED_ROUTES.has(cleanPath)) {
    return servePrerenderedRouteIfAvailable(cleanPath, res);
  }
  if (CSR_NOINDEX_ROUTES.has(cleanPath)) {
    return serveCsrNoindexRouteIfAvailable(res);
  }
  sendNotFoundResponse(req, res);
  return true;
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

  if (tryServeStaticAppRoute(req, res)) {
    return;
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
export { app };
export const reqHandler = createNodeRequestHandler(app);

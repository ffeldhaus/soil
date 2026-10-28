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

const app = express();
app.use(compression());

/**
 * Explicitly serve robots.txt, sitemap.xml and assetlinks.json to avoid Angular router redirects.
 * Served as strings for maximum reliability in App Hosting environment.
 */
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
# Disallow administrative and private routes
Disallow: /game
Disallow: /game-login

# Disallow Impressum to protect contact data from indexing
Disallow: /impressum

# Allow public content
Allow: /

Sitemap: https://soil.app/sitemap.xml`);
});

app.get('/sitemap.xml', (_req, res) => {
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://soil.app/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://soil.app/manual</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://soil.app/info</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://soil.app/research</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://soil.app/admin</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://soil.app/impressum</loc>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://soil.app/privacy</loc>
    <priority>0.5</priority>
  </url>
</urlset>`);
});

app.get(['/.well-known/assetlinks.json', '/.well-known/assetlinks.json/'], (_req, res) => {
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
 * Security headers for Firebase Auth popups.
 */
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  next();
});

/**
 * Serve static files from the browser distribution folder.
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    dotfiles: 'allow',
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
let angularApp: AngularNodeAppEngine | undefined;

app.use('*path', async (req, res, next) => {
  // Skip Firebase reserved paths
  if (req.originalUrl.startsWith('/__/')) {
    next();
    return;
  }

  if (!angularApp) {
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
    angularApp = new AngularNodeAppEngine();
  }

  // biome-ignore lint/suspicious/noConsole: used for production logging
  console.log(`Handling request: ${req.method} ${req.originalUrl}`);

  angularApp
    .handle(req)
    .then((response) => {
      if (response) {
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

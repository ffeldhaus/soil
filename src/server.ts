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
const browserDistFolder = resolve(
  serverDistFolder,
  serverDistFolder.endsWith('de') || serverDistFolder.endsWith('en') ? '../../browser' : '../browser',
);

const app = express();
app.use(compression());

/**
 * Add hreflang Link headers
 */
app.use((req, res, next) => {
  const host = req.get('host') || 'soil.app';
  const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const baseUrl = `${protocol}://${host}`;
  const path = req.path;

  // Strip locale from path if it exists to find the base page path
  let basePagePath = path;
  if (path.startsWith('/de/') || path === '/de') {
    basePagePath = path.substring(3) || '/';
  } else if (path.startsWith('/en/') || path === '/en') {
    basePagePath = path.substring(3) || '/';
  }

  if (!basePagePath.startsWith('/')) {
    basePagePath = `/${basePagePath}`;
  }

  const deUrl = `${baseUrl}/de${basePagePath}`;
  const enUrl = `${baseUrl}/en${basePagePath}`;

  const langLinks = [
    `<${deUrl}>; rel="alternate"; hreflang="de"`,
    `<${enUrl}>; rel="alternate"; hreflang="en"`,
    `<${deUrl}>; rel="alternate"; hreflang="x-default"`,
  ];

  res.setHeader('Link', langLinks.join(', '));
  next();
});

/**
 * Serve static files from the root (robots.txt, sitemap.xml, etc.)
 */
const rootStaticFiles = [
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/site.webmanifest',
  '/favicon-96x96.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
];

app.use((req, res, next) => {
  if (rootStaticFiles.includes(req.path)) {
    // Try to serve from 'de' folder as default for root static files
    res.sendFile(join(browserDistFolder, 'de', req.path));
    return;
  }
  next();
});

/**
 * Detect language and redirect to localized path
 */
app.use((req, res, next) => {
  // Skip redirect during local development with ng serve
  if (req.headers.host?.includes('localhost:4200')) {
    next();
    return;
  }

  const path = req.path;

  // Skip Firebase reserved paths
  if (path.startsWith('/__')) {
    next();
    return;
  }

  // Check if it already has a locale prefix
  if (path.startsWith('/de/') || path === '/de' || path.startsWith('/en/') || path === '/en') {
    next();
    return;
  }

  // Detect language and redirect
  const lang = req.acceptsLanguages('de', 'en') || 'de';
  const url = req.originalUrl || req.url;

  // Construct new URL with locale
  const localizedUrl = `/${lang}${url.startsWith('/') ? '' : '/'}${url}`;
  res.redirect(301, localizedUrl);
});

/**
 * Serve static files for each locale
 */
app.use(
  '/de',
  express.static(join(browserDistFolder, 'de'), {
    maxAge: '1y',
    index: 'index.html',
    redirect: false,
  }),
);

app.use(
  '/en',
  express.static(join(browserDistFolder, 'en'), {
    maxAge: '1y',
    index: 'index.html',
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
let angularApp: AngularNodeAppEngine | undefined;

app.use('*path', async (req, res, next) => {
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

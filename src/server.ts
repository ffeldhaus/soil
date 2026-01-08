import { join } from 'node:path';

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import compression from 'compression';
import express from 'express';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(compression());
const angularApp = new AngularNodeAppEngine();

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

  // Skip if it's a root static file
  if (rootStaticFiles.includes(path)) {
    next();
    return;
  }

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
  res.redirect(302, localizedUrl);
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
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

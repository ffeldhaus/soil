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

const app = express();
app.use(compression());

/**
 * Explicitly serve robots.txt and sitemap.xml to avoid Angular router redirects.
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
    <loc>https://soil.app/admin</loc>
    <priority>0.8</priority>
  </url>
</urlset>`);
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

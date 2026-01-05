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
 * Detect language and redirect from root
 */
app.get('/', (req, res, next) => {
  // If request is exactly root, redirect to best language
  if (req.path === '/') {
    const lang = req.acceptsLanguages('de', 'en') || 'de';
    res.redirect(302, `/${lang}/`);
    return;
  }
  next();
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

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

import { APP_BASE_HREF } from '@angular/common';
// Ensure CommonEngine is the correct one for your Universal setup.
// If using @nguniversal/express-engine, it would be ngExpressEngine.
// If this is a custom setup with @angular/compiler's CommonEngine, ensure its API matches.
import { CommonEngine } from '@angular/compiler'; 
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './main.server'; // Your bootstrap from src/main.server.ts

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        // Call the bootstrap function from main.server.ts, passing the current Express req object.
        // Our main.server.ts bootstrap function will then use this req to determine the language
        // and set up the REQUEST_LANGUAGE provider for the Angular app.
        bootstrap: () => bootstrap(req), 
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
          // Other providers that might be request-specific can be added here.
        ],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });}

// Webpack will replace 'require.main === module' with 'module.hot === undefined' when bundling the server entry point.
// Restrict execution to server-side environments by ensuring window is undefined.
if (typeof window === 'undefined') {
  run();
}

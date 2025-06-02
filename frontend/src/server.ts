import { APP_BASE_HREF } from '@angular/common';
// Ensure CommonEngine is the correct one for your Universal setup.
// If using @nguniversal/express-engine, it would be ngExpressEngine.
// If this is a custom setup with @angular/compiler's CommonEngine, ensure its API matches.
import { CommonEngine } from '@angular/ssr'; // Changed from @angular/compiler
import express from 'express';
// import { fileURLToPath } from 'node:url'; // No longer needed with __dirname
import { dirname, join, resolve } from 'node:path';
import bootstrap from './main.server'; // Your bootstrap from src/main.server.ts

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  // Assuming this server.ts file is compiled into a directory (e.g., dist/server)
  // __dirname will then refer to that directory.
  const serverDistFolder = __dirname;
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  // const commonEngine = new CommonEngine(); // CommonEngine is often provided by @angular/ssr or ngExpressEngine
  // For @angular/ssr, the engine is typically created and used within the route handler.
  // However, if a CommonEngine instance is needed explicitly and it's from @angular/ssr, this is how it would be.
  // Let's assume for now the existing structure wants an instance.
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
  // server.get('*', (req, res, next) => { // Original implementation
  //   const { protocol, originalUrl, baseUrl, headers } = req;

  //   commonEngine
  //     .render({
  //       bootstrap: () => bootstrap(req),
  //       documentFilePath: indexHtml,
  //       url: `${protocol}://${headers.host}${originalUrl}`,
  //       publicPath: browserDistFolder,
  //       providers: [
  //         { provide: APP_BASE_HREF, useValue: baseUrl },
  //       ],
  //     })
  //     .then((html) => res.send(html))
  //     .catch((err) => next(err));
  // });

  // SSR route handler using the commonEngine instance from @angular/ssr
  // This is a more typical pattern for @angular/ssr
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;
    commonEngine.render({
      bootstrap: () => bootstrap(req), // Pass req to bootstrap
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    }).then(html => res.send(html)).catch(err => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    // console.log(`Node Express server listening on http://localhost:${port}`);
  });}

// Webpack will replace 'require.main === module' with 'module.hot === undefined' when bundling the server entry point.
// Restrict execution to server-side environments by ensuring window is undefined.
if (typeof window === 'undefined') {
  run();
}

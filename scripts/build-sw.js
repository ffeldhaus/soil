const { injectManifest } = require('workbox-build');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Change this to match your build directory
const swDest = 'dist/soil/browser/sw.js';

const browserDir = 'dist/soil/browser';
const rootIndexHtml = path.join(browserDir, 'index.html');
const rootIndexCsrHtml = path.join(browserDir, 'index.csr.html');

if (!fs.existsSync(rootIndexHtml) && fs.existsSync(rootIndexCsrHtml)) {
  // biome-ignore lint/suspicious/noConsole: used for build logging
  console.log('Copying index.csr.html to index.html in browser root...');
  fs.copyFileSync(rootIndexCsrHtml, rootIndexHtml);
}

// Bundle the service worker using esbuild to handle ES module imports
const tempSwSrc = 'src/sw.bundled.js';
try {
  // biome-ignore lint/suspicious/noConsole: used for build logging
  console.log('Bundling service worker with esbuild...');
  execSync(
    `node_modules/.bin/esbuild src/sw.js --bundle --platform=browser --format=iife --target=es2020 --minify --outfile=${tempSwSrc}`,
    { stdio: 'inherit' },
  );
} catch (err) {
  console.error('Service worker bundling failed:', err);
  process.exit(1);
}

injectManifest({
  swSrc: tempSwSrc,
  swDest: swDest,
  globDirectory: browserDir,
  globPatterns: ['**/*.{js,css,html,png,svg,jpg,webp,ico,webmanifest}'],
})
  .then(({ count, size }) => {
    // biome-ignore lint/suspicious/noConsole: used for build logging
    console.log(`Service worker generated with ${count} symbols, total size ${size} bytes`);
  })
  .catch((err) => {
    console.error('Service worker generation failed:', err);
  })
  .finally(() => {
    // Clean up temporary bundled file
    if (fs.existsSync(tempSwSrc)) {
      fs.unlinkSync(tempSwSrc);
    }
  });

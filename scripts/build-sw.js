const { injectManifest } = require('workbox-build');
const fs = require('node:fs');
const path = require('node:path');

// Change this to match your build directory
const swDest = 'dist/soil/browser/sw.js';

// Preparation for App Hosting (handling localized build structure)
const browserDir = 'dist/soil/browser';
const serverDir = 'dist/soil/server';
const defaultLocale = 'de';

const indexHtml = path.join(browserDir, defaultLocale, 'index.html');
const indexCsrHtml = path.join(browserDir, defaultLocale, 'index.csr.html');

if (fs.existsSync(indexHtml)) {
  // biome-ignore lint/suspicious/noConsole: used for build logging
  console.log(`Copying ${defaultLocale} index.html to browser root for App Hosting compatibility...`);
  fs.copyFileSync(indexHtml, path.join(browserDir, 'index.html'));
} else if (fs.existsSync(indexCsrHtml)) {
  // biome-ignore lint/suspicious/noConsole: used for build logging
  console.log(`Copying ${defaultLocale} index.csr.html to browser root as index.html for App Hosting compatibility...`);
  fs.copyFileSync(indexCsrHtml, path.join(browserDir, 'index.html'));
}

if (fs.existsSync(path.join(serverDir, defaultLocale))) {
  // biome-ignore lint/suspicious/noConsole: used for build logging
  console.log(`Copying ${defaultLocale} server files to server root for App Hosting compatibility...`);
  const files = fs.readdirSync(path.join(serverDir, defaultLocale));
  for (const file of files) {
    const srcPath = path.join(serverDir, defaultLocale, file);
    const destPath = path.join(serverDir, file);
    if (fs.lstatSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

injectManifest({
  swSrc: 'src/sw.js',
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
  });

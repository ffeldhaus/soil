const { injectManifest } = require('workbox-build');
const fs = require('fs');
const path = require('path');

// Change this to match your build directory
const swDest = 'dist/soil/browser/service-worker.js';

// Preparation for App Hosting (handling localized build structure)
const browserDir = 'dist/soil/browser';
const serverDir = 'dist/soil/server';
const defaultLocale = 'de';

if (fs.existsSync(path.join(browserDir, defaultLocale, 'index.html'))) {
  console.log(`Copying ${defaultLocale} index.html to browser root for App Hosting compatibility...`);
  fs.copyFileSync(
    path.join(browserDir, defaultLocale, 'index.html'),
    path.join(browserDir, 'index.html')
  );
}

if (fs.existsSync(path.join(serverDir, defaultLocale))) {
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
  swSrc: 'src/service-worker.js',
  swDest: swDest,
  globDirectory: browserDir,
  globPatterns: ['**/*.{js,css,html,png,svg,jpg,webp,ico,webmanifest}'],
})
  .then(({ count, size }) => {
    console.log(`Service worker generated with ${count} symbols, total size ${size} bytes`);
  })
  .catch((err) => {
    console.error('Service worker generation failed:', err);
  });

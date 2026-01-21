const { injectManifest } = require('workbox-build');

// Change this to match your build directory
const swDest = 'dist/soil/browser/service-worker.js';

injectManifest({
  swSrc: 'src/service-worker.js',
  swDest: swDest,
  globDirectory: 'dist/soil/browser',
  globPatterns: [
    '**/*.{js,css,html,png,svg,jpg,webp,ico,webmanifest}'
  ],
}).then(({ count, size }) => {
  console.log(`Generated ${swDest}, which will precache ${count} files, totaling ${size} bytes.`);
}).catch((err) => {
  console.error('Service worker generation failed:', err);
});

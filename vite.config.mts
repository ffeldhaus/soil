/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const getVersion = () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
  const pkgVersion = pkg.version;
  try {
    const gitVersion = execSync('git describe --tags --always').toString().trim().replace(/^v/, '');
    const buildId = process.env['CD_BUILD_ID'] || process.env['BUILD_NUMBER'] || process.env['BUILD_ID'] || '';
    return buildId ? `${gitVersion}+${buildId}` : gitVersion;
  } catch {
    return pkgVersion.replace(/^v/, '');
  }
};

const appVersion = getVersion();

export default defineConfig(({ mode }) => ({
  plugins: [angular()],
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(appVersion),
  },
  test: {
    define: {
      'import.meta.env.APP_VERSION': JSON.stringify(appVersion),
    },
    server: {
      deps: {
        inline: ['rxfire', '@angular/fire'],
      },
    },
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
}));

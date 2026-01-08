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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/main.server.ts',
        'src/test-setup.ts',
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'src/app/types.ts',
        'src/server.ts',
        'src/env.d.ts',
        'src/app/app.config.ts',
        'src/app/app.config.server.ts',
        'src/app/app.routes.ts',
        'src/app/app.routes.server.ts',
        'src/app/game-constants.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
}));

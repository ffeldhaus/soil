/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'path';
import { execSync } from 'child_process';

const getVersion = () => {
  try {
    const gitVersion = execSync('git describe --tags --always').toString().trim();
    const buildId = process.env['CD_BUILD_ID'] || process.env['BUILD_NUMBER'] || '';
    return buildId ? `${gitVersion}+${buildId}` : gitVersion;
  } catch {
    return '1.1.0';
  }
};

const appVersion = getVersion();

export default defineConfig(({ mode }) => ({
  plugins: [angular()],
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(appVersion),
  },
  test: {
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

window.global = window;

// @ts-expect-error - polyfill for import.meta in tests
globalThis.importMeta = {
  env: {
    APP_VERSION: 'test-version',
  },
};

import 'zone.js';

import 'zone.js/testing';

import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

// Polyfill ReadableStream for undici/firebase in jsdom
if (typeof ReadableStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.ReadableStream = require('node:stream/web').ReadableStream;
}

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

// Global console filtering to suppress expected Angular warnings and verbose logs in JSDOM
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args[0]?.toString() || '';
  if (
    message.includes('NG0500') ||
    message.includes('NG0502') ||
    message.includes('NG0505') ||
    message.includes('NG0508')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const message = args[0]?.toString() || '';
  if (
    message.includes('NG0500') ||
    message.includes('NG0502') ||
    message.includes('NG0505') ||
    message.includes('NG0508') ||
    message.includes('Draft saved') ||
    message.includes('Soil Version') ||
    message.includes('Successfully migrated') ||
    message.includes('Mock:') ||
    message.includes('SuperAdmin:')
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

const originalConsoleLog = console.log;
console.log = (...args) => {
  const message = args[0]?.toString() || '';
  if (message.includes('Soil Version') || message.includes('Mock:') || message.includes('SuperAdmin:')) {
    return;
  }
  originalConsoleLog.apply(console, args);
};

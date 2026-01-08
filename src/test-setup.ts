window.global = window;

// @ts-expect-error - polyfill for import.meta in tests
globalThis.importMeta = {
  env: {
    APP_VERSION: 'test-version',
  },
};

import 'zone.js';
import 'zone.js/testing';
import '@angular/localize/init';

import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

// Polyfill ReadableStream for undici/firebase in jsdom
if (typeof ReadableStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.ReadableStream = require('node:stream/web').ReadableStream;
}

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

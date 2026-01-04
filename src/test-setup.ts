window.global = window;

// @ts-ignore
globalThis.importMeta = {
  env: {
    APP_VERSION: 'test-version'
  }
};

import "zone.js";
import "zone.js/testing";
import { getTestBed } from "@angular/core/testing";

import {
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// Polyfill ReadableStream for undici/firebase in jsdom
if (typeof ReadableStream === 'undefined') {
    globalThis.ReadableStream = require('stream/web').ReadableStream;
}

getTestBed().initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
);

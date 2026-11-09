import { Capacitor } from '@capacitor/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CANONICAL_WEB_ORIGIN,
  getShareableWebOrigin,
  isLocalBrowserDevServer,
  isNativeCapacitorApp,
} from './capacitor-env';

describe('capacitor-env helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects web browser dev server correctly when not running in Capacitor', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    expect(isNativeCapacitorApp()).toBe(false);
    expect(isLocalBrowserDevServer()).toBe(true);
    expect(getShareableWebOrigin()).toBe(window.location.origin);
  });

  it('distinguishes native Capacitor apps from local browser dev servers and returns https://soil.app for shareable links', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    expect(isNativeCapacitorApp()).toBe(true);
    expect(isLocalBrowserDevServer()).toBe(false);
    expect(getShareableWebOrigin()).toBe(CANONICAL_WEB_ORIGIN);
  });
});

import { Capacitor } from '@capacitor/core';

export const CANONICAL_WEB_ORIGIN = 'https://soil.app';

/**
 * Returns true when running inside a native iOS or Android Capacitor container.
 */
export function isNativeCapacitorApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (window.location?.protocol === 'capacitor:') {
    return true;
  }
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Returns the active Capacitor platform ('ios', 'android', or 'web').
 */
export function getCapacitorPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') {
    return 'web';
  }
  if (window.location?.protocol === 'capacitor:') {
    return 'ios';
  }
  try {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios' || platform === 'android') {
      return platform;
    }
    return 'web';
  } catch {
    return 'web';
  }
}

/**
 * Returns true only when running on a local browser dev/emulator server (http://localhost or 127.0.0.1),
 * never inside a packaged iOS/Android Capacitor app (which also uses hostname 'localhost').
 */
export function isLocalBrowserDevServer(): boolean {
  if (typeof window === 'undefined' || isNativeCapacitorApp()) {
    return false;
  }
  const hostname = window.location?.hostname || '';
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Returns the public web origin to use for shareable links, QR codes, and auth redirect URLs.
 * Inside Capacitor native apps (where window.location.origin is capacitor://localhost or https://localhost),
 * this returns 'https://soil.app' so QR codes and email links work on any device.
 */
export function getShareableWebOrigin(): string {
  if (typeof window === 'undefined' || isNativeCapacitorApp()) {
    return CANONICAL_WEB_ORIGIN;
  }
  return window.location?.origin || CANONICAL_WEB_ORIGIN;
}

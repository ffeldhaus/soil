import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { CANONICAL_WEB_ORIGIN, isLocalBrowserDevServer, isNativeCapacitorApp } from './capacitor-env';

export type QuickGameRoundEventName =
  | 'quick_game_round_1'
  | 'quick_game_round_2'
  | 'quick_game_round_3'
  | 'quick_game_round_4'
  | 'quick_game_round_5'
  | 'quick_game_round_6'
  | 'quick_game_round_7'
  | 'quick_game_round_8'
  | 'quick_game_round_9'
  | 'quick_game_round_10'
  | 'quick_game_round_11'
  | 'quick_game_round_12'
  | 'quick_game_round_13'
  | 'quick_game_round_14'
  | 'quick_game_round_15'
  | 'quick_game_round_16'
  | 'quick_game_round_17'
  | 'quick_game_round_18'
  | 'quick_game_round_19'
  | 'quick_game_round_20';

export type TelemetryEventName =
  | 'quick_game_started'
  | 'quick_game_first_plant'
  | QuickGameRoundEventName
  | 'quick_game_finished'
  | 'trailer_opened'
  | 'research_export';

export const QUICK_GAME_ROUND_EVENTS: readonly QuickGameRoundEventName[] = Array.from(
  { length: 20 },
  (_, i) => `quick_game_round_${i + 1}` as QuickGameRoundEventName,
);

const ALLOWED_EVENTS = new Set<string>([
  'quick_game_started',
  'quick_game_first_plant',
  ...QUICK_GAME_ROUND_EVENTS,
  'quick_game_finished',
  'trailer_opened',
  'research_export',
]);

export function getQuickGameRoundEventName(roundNumber: number): QuickGameRoundEventName | null {
  if (!Number.isInteger(roundNumber) || roundNumber < 1 || roundNumber > 20) {
    return null;
  }
  return `quick_game_round_${roundNumber}` as QuickGameRoundEventName;
}

const ALLOWED_ROUTES = new Set<string>([
  '/',
  '/manual',
  '/info',
  '/research',
  '/trailer',
  '/game',
  '/game-login',
  '/admin',
  '/impressum',
  '/privacy',
]);

const SELF_REFERRER_HOSTS = new Set<string>(['soil.app', 'www.soil.app', 'localhost', '127.0.0.1']);
const MAX_PENDING_PER_KEY = 20;

@Injectable({
  providedIn: 'root',
})
export class TelemetryService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc = inject(DOCUMENT);

  private pendingViews: Record<string, number> = {};
  private pendingEvents: Record<string, number> = {};
  private pendingReferrers: Record<string, number> = {};
  private initialReferrerRecorded = false;
  private lastTrackedRoute: string | null = null;
  private isFlushing = false;

  /**
   * Used only by unit tests to bypass localhost / headless browser suppression.
   */
  enableInTests = false;

  constructor() {
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flush();
      });
    }
  }

  normalizeRoute(rawUrl: string): string | null {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const withoutQuery = rawUrl.split(/[?#]/)[0] || '/';
    const withSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
    const normalized = withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : '/';
    return ALLOWED_ROUTES.has(normalized) ? normalized : null;
  }

  detectDisplayMode(): 'pwa' | 'web' {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      return 'web';
    }
    if (isNativeCapacitorApp()) {
      return 'pwa';
    }
    const standaloneMedia = window.matchMedia?.('(display-mode: standalone)')?.matches === true;
    const iosStandalone = (navigator as unknown as { standalone?: boolean })?.standalone === true;
    return standaloneMedia || iosStandalone ? 'pwa' : 'web';
  }

  extractReferrerBucket(rawReferrer: string, mode: 'pwa' | 'web'): string | null {
    const trimmed = (rawReferrer || '').trim().toLowerCase();
    if (!trimmed) {
      return mode === 'pwa' ? 'pwa_launch' : 'direct';
    }
    if (trimmed.startsWith('android-app://')) {
      return 'pwa_launch';
    }

    let hostname = '';
    try {
      hostname = new URL(trimmed).hostname
        .toLowerCase()
        .replace(/^www\./, '')
        .replace(/\.$/, '');
    } catch {
      return null;
    }

    if (
      !hostname ||
      SELF_REFERRER_HOSTS.has(hostname) ||
      hostname.endsWith('.soil.app') ||
      hostname.endsWith('.hosted.app') ||
      hostname.endsWith('.run.app')
    ) {
      return null;
    }

    if (hostname.length > 64 || !/^[a-z0-9.-]+\.[a-z]{2,24}$/.test(hostname)) {
      return null;
    }

    return hostname;
  }

  isDoNotTrackEnabled(): boolean {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      return false;
    }
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : undefined;
    const win = window as any;
    const dnt = String(nav?.doNotTrack ?? win?.doNotTrack ?? nav?.msDoNotTrack ?? '')
      .trim()
      .toLowerCase();
    if (dnt === '1' || dnt === 'yes') {
      return true;
    }
    return nav?.globalPrivacyControl === true || nav?.globalPrivacyControl === '1';
  }

  private shouldSuppressTelemetry(): boolean {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      return true;
    }
    if (this.isDoNotTrackEnabled()) {
      return true;
    }
    if (this.enableInTests) {
      return false;
    }
    if (isLocalBrowserDevServer()) {
      return true;
    }
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.webdriver) {
      return true;
    }
    const ua = nav?.userAgent || '';
    return /HeadlessChrome|Cypress|Playwright|Puppeteer|Lighthouse|bot|crawler|spider/i.test(ua);
  }

  private recordInitialReferrer(): void {
    if (this.initialReferrerRecorded) return;
    const navEntry =
      typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function'
        ? (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)
        : undefined;
    if (navEntry && (navEntry.type === 'reload' || navEntry.type === 'back_forward')) {
      this.initialReferrerRecorded = true;
      return;
    }

    this.initialReferrerRecorded = true;

    const mode = this.detectDisplayMode();
    const refBucket = this.extractReferrerBucket(this.doc?.referrer || '', mode);
    if (refBucket) {
      this.pendingReferrers[refBucket] = Math.min(MAX_PENDING_PER_KEY, (this.pendingReferrers[refBucket] || 0) + 1);
    }
  }

  trackPageView(rawUrl: string): void {
    if (this.shouldSuppressTelemetry()) return;

    const route = this.normalizeRoute(rawUrl);
    if (!route || route === this.lastTrackedRoute) {
      return;
    }
    this.lastTrackedRoute = route;
    this.pendingViews[route] = Math.min(MAX_PENDING_PER_KEY, (this.pendingViews[route] || 0) + 1);
    this.recordInitialReferrer();

    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      this.flush();
    }
  }

  trackEvent(eventName: TelemetryEventName): void {
    if (this.shouldSuppressTelemetry() || !ALLOWED_EVENTS.has(eventName)) return;

    this.pendingEvents[eventName] = Math.min(MAX_PENDING_PER_KEY, (this.pendingEvents[eventName] || 0) + 1);

    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.shouldSuppressTelemetry() || this.isFlushing) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    const hasViews = Object.keys(this.pendingViews).length > 0;
    const hasEvents = Object.keys(this.pendingEvents).length > 0;
    const hasReferrers = Object.keys(this.pendingReferrers).length > 0;
    if (!hasViews && !hasEvents && !hasReferrers) {
      return;
    }

    const viewsSnapshot = { ...this.pendingViews };
    const eventsSnapshot = { ...this.pendingEvents };
    const referrersSnapshot = { ...this.pendingReferrers };

    this.pendingViews = {};
    this.pendingEvents = {};
    this.pendingReferrers = {};
    this.isFlushing = true;

    const payload: Record<string, unknown> = {
      mode: this.detectDisplayMode(),
    };
    if (hasViews) payload.views = viewsSnapshot;
    if (hasEvents) payload.events = eventsSnapshot;
    if (hasReferrers) payload.referrers = referrersSnapshot;

    const telemetryEndpoint = isNativeCapacitorApp() ? `${CANONICAL_WEB_ORIGIN}/api/telemetry` : '/api/telemetry';
    try {
      const response = await fetch(telemetryEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (!response.ok && response.status >= 500) {
        this.restoreSnapshot(viewsSnapshot, eventsSnapshot, referrersSnapshot);
      }
    } catch {
      this.restoreSnapshot(viewsSnapshot, eventsSnapshot, referrersSnapshot);
    } finally {
      this.isFlushing = false;
    }
  }

  private restoreSnapshot(
    views: Record<string, number>,
    events: Record<string, number>,
    referrers: Record<string, number>,
  ): void {
    for (const [k, v] of Object.entries(views)) {
      this.pendingViews[k] = Math.min(MAX_PENDING_PER_KEY, (this.pendingViews[k] || 0) + v);
    }
    for (const [k, v] of Object.entries(events)) {
      this.pendingEvents[k] = Math.min(MAX_PENDING_PER_KEY, (this.pendingEvents[k] || 0) + v);
    }
    for (const [k, v] of Object.entries(referrers)) {
      this.pendingReferrers[k] = Math.min(MAX_PENDING_PER_KEY, (this.pendingReferrers[k] || 0) + v);
    }
  }
}

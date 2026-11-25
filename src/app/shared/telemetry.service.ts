import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import type { TelemetryLocalSessionUpdate } from '../types';
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
  | 'quick_game_deleted'
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
  'quick_game_deleted',
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
const MAX_PENDING_SESSIONS = 10;
const SESSION_SLOT_REGEX = /^[a-f0-9]{12,32}$/;
const ALLOWED_SESSION_STATUSES = new Set<TelemetryLocalSessionUpdate['status']>(['in_progress', 'finished', 'deleted']);
const FLUSH_DEBOUNCE_MS = 2_500;
const RETRY_BASE_DELAY_MS = 3_000;
const MAX_RETRY_DELAY_MS = 30_000;
const MAX_CONSECUTIVE_RETRIES = 4;

@Injectable({
  providedIn: 'root',
})
export class TelemetryService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc = inject(DOCUMENT);

  private pendingViews: Record<string, number> = {};
  private pendingEvents: Record<string, number> = {};
  private pendingReferrers: Record<string, number> = {};
  private pendingSessions = new Map<string, TelemetryLocalSessionUpdate>();
  private initialReferrerRecorded = false;
  private lastTrackedRoute: string | null = null;
  private isFlushing = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;

  /**
   * Used only by unit tests to bypass localhost / headless browser suppression.
   */
  enableInTests = false;

  /**
   * Debounce window (ms) for coalescing rapid pageView/event bursts into one POST.
   */
  flushDebounceMs = FLUSH_DEBOUNCE_MS;

  constructor() {
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.retryCount = 0;
        this.flush();
      });
      window.addEventListener('pagehide', () => {
        this.flushOnPageHide();
      });
      if (this.doc && typeof this.doc.addEventListener === 'function') {
        this.doc.addEventListener('visibilitychange', () => {
          if (this.doc.visibilityState === 'hidden') {
            this.flushOnPageHide();
          }
        });
      }
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

  private hasPendingData(): boolean {
    return (
      Object.keys(this.pendingViews).length > 0 ||
      Object.keys(this.pendingEvents).length > 0 ||
      Object.keys(this.pendingReferrers).length > 0 ||
      this.pendingSessions.size > 0
    );
  }

  private clearTimers(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private scheduleFlush(): void {
    if (this.shouldSuppressTelemetry()) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (!this.hasPendingData()) return;
    if (this.retryTimer !== null) return;

    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.flushDebounceMs <= 0) {
      this.flush();
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, this.flushDebounceMs);
  }

  private scheduleRetry(): void {
    if (this.retryCount >= MAX_CONSECUTIVE_RETRIES) {
      return;
    }
    this.retryCount += 1;
    const delayMs = Math.min(MAX_RETRY_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** (this.retryCount - 1));
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.flush();
    }, delayMs);
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

    this.scheduleFlush();
  }

  trackEvent(eventName: TelemetryEventName): void {
    if (this.shouldSuppressTelemetry() || !ALLOWED_EVENTS.has(eventName)) return;

    this.pendingEvents[eventName] = Math.min(MAX_PENDING_PER_KEY, (this.pendingEvents[eventName] || 0) + 1);

    this.scheduleFlush();
  }

  trackLocalSession(update: TelemetryLocalSessionUpdate): void {
    if (this.shouldSuppressTelemetry() || !update || typeof update !== 'object') return;
    const slot = typeof update.slot === 'string' ? update.slot.trim().toLowerCase() : '';
    if (!SESSION_SLOT_REGEX.test(slot)) return;

    const roundLimit = Math.round(Number(update.roundLimit));
    const currentRound = Math.round(Number(update.currentRound));
    if (
      !Number.isFinite(roundLimit) ||
      roundLimit < 3 ||
      roundLimit > 100 ||
      !Number.isFinite(currentRound) ||
      currentRound < 1 ||
      currentRound > roundLimit
    ) {
      return;
    }
    if (!ALLOWED_SESSION_STATUSES.has(update.status)) return;

    if (!this.pendingSessions.has(slot) && this.pendingSessions.size >= MAX_PENDING_SESSIONS) {
      const oldestKey = this.pendingSessions.keys().next().value;
      if (oldestKey !== undefined) {
        this.pendingSessions.delete(oldestKey);
      }
    }

    this.pendingSessions.set(slot, {
      slot,
      currentRound,
      roundLimit,
      status: update.status,
    });

    this.scheduleFlush();
  }

  flushOnPageHide(): void {
    this.clearTimers();
    this.flush();
  }

  private takePendingSnapshot(): {
    views: Record<string, number>;
    events: Record<string, number>;
    referrers: Record<string, number>;
    sessions: TelemetryLocalSessionUpdate[];
    payload: Record<string, unknown>;
  } | null {
    const hasViews = Object.keys(this.pendingViews).length > 0;
    const hasEvents = Object.keys(this.pendingEvents).length > 0;
    const hasReferrers = Object.keys(this.pendingReferrers).length > 0;
    const hasSessions = this.pendingSessions.size > 0;
    if (!hasViews && !hasEvents && !hasReferrers && !hasSessions) {
      return null;
    }

    const views = { ...this.pendingViews };
    const events = { ...this.pendingEvents };
    const referrers = { ...this.pendingReferrers };
    const sessions = Array.from(this.pendingSessions.values());

    this.pendingViews = {};
    this.pendingEvents = {};
    this.pendingReferrers = {};
    this.pendingSessions.clear();

    const payload: Record<string, unknown> = { mode: this.detectDisplayMode() };
    if (hasViews) payload.views = views;
    if (hasEvents) payload.events = events;
    if (hasReferrers) payload.referrers = referrers;
    if (hasSessions) payload.sessions = sessions;

    return { views, events, referrers, sessions, payload };
  }

  private async postTelemetryPayload(payload: Record<string, unknown>): Promise<'ok' | 'retry' | 'drop'> {
    const telemetryEndpoint = isNativeCapacitorApp() ? `${CANONICAL_WEB_ORIGIN}/api/telemetry` : '/api/telemetry';
    try {
      const response = await fetch(telemetryEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (response.ok) return 'ok';
      return response.status === 429 || response.status >= 500 ? 'retry' : 'drop';
    } catch {
      return 'retry';
    }
  }

  async flush(): Promise<void> {
    if (this.shouldSuppressTelemetry() || this.isFlushing) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    this.clearTimers();
    const snapshot = this.takePendingSnapshot();
    if (!snapshot) return;

    this.isFlushing = true;
    let outcome: 'ok' | 'retry' | 'drop' = 'retry';
    try {
      outcome = await this.postTelemetryPayload(snapshot.payload);
      if (outcome === 'retry') {
        this.restoreSnapshot(snapshot.views, snapshot.events, snapshot.referrers, snapshot.sessions);
      } else {
        this.retryCount = 0;
      }
    } finally {
      this.isFlushing = false;
    }

    if (outcome === 'retry') {
      this.scheduleRetry();
    } else if (this.hasPendingData() && this.flushTimer === null) {
      this.scheduleFlush();
    }
  }

  private restoreSnapshot(
    views: Record<string, number>,
    events: Record<string, number>,
    referrers: Record<string, number>,
    sessions: TelemetryLocalSessionUpdate[],
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
    for (const session of sessions) {
      if (!this.pendingSessions.has(session.slot)) {
        this.pendingSessions.set(session.slot, session);
      }
    }
  }
}

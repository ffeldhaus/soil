import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TelemetryService } from './telemetry.service';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let mockDoc: { referrer: string };
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    mockDoc = { referrer: 'https://www.bpb.de/lernen/spiele?ref=1' };
    fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchSpy);

    TestBed.configureTestingModule({
      providers: [
        TelemetryService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: DOCUMENT, useValue: mockDoc },
      ],
    });

    service = TestBed.inject(TelemetryService);
    service.enableInTests = true;
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('normalizes canonical routes including /trailer and rejects unknown paths', () => {
    expect(service.normalizeRoute('/')).toBe('/');
    expect(service.normalizeRoute('/manual/?topic=wheat#section')).toBe('/manual');
    expect(service.normalizeRoute('/trailer?autoplay=1')).toBe('/trailer');
    expect(service.normalizeRoute('/game?gameId=local-123')).toBe('/game');
    expect(service.normalizeRoute('/admin/super')).toBeNull();
    expect(service.normalizeRoute('/unknown')).toBeNull();
  });

  it('extracts sanitized external referrer domains and filters self-referrals', () => {
    expect(service.extractReferrerBucket('', 'web')).toBe('direct');
    expect(service.extractReferrerBucket('', 'pwa')).toBe('pwa_launch');
    expect(service.extractReferrerBucket('android-app://com.google.android.gm/', 'web')).toBe('pwa_launch');
    expect(service.extractReferrerBucket('https://www.bpb.de/themen/umwelt', 'web')).toBe('bpb.de');
    expect(service.extractReferrerBucket('https://soil.app/manual', 'web')).toBeNull();
    expect(service.extractReferrerBucket('https://soil--soil-602ea.europe-west4.hosted.app/', 'web')).toBeNull();
  });

  it('flushes page views, deduplicates in-tab navigations, and never reads or writes localStorage or sessionStorage', async () => {
    const localSetSpy = vi.spyOn(window.localStorage, 'setItem');
    const localGetSpy = vi.spyOn(window.localStorage, 'getItem');
    const sessionSetSpy = vi.spyOn(window.sessionStorage, 'setItem');
    const sessionGetSpy = vi.spyOn(window.sessionStorage, 'getItem');
    Object.defineProperty(performance, 'getEntriesByType', {
      value: vi.fn().mockReturnValue([{ type: 'navigate' } as PerformanceNavigationTiming]),
      configurable: true,
      writable: true,
    });

    service.trackPageView('/trailer?from=share');
    await service.flush();

    expect(localSetSpy).not.toHaveBeenCalled();
    expect(localGetSpy).not.toHaveBeenCalled();
    expect(sessionSetSpy).not.toHaveBeenCalled();
    expect(sessionGetSpy).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/telemetry');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.views).toEqual({ '/trailer': 1 });
    expect(body.referrers).toEqual({ 'bpb.de': 1 });

    // Consecutive identical route with different query params is deduplicated
    service.trackPageView('/trailer?from=reload');
    await service.flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Navigating to a second route within the SPA does not re-record the initial referrer
    service.trackPageView('/manual');
    await service.flush();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(secondBody.views).toEqual({ '/manual': 1 });
    expect(secondBody.referrers).toBeUndefined();
  });

  it('coalesces rapid pageView and event bursts into a single debounced POST and supports immediate flushOnPageHide', async () => {
    vi.useFakeTimers();

    service.trackPageView('/');
    service.trackEvent('quick_game_started');
    service.trackEvent('quick_game_first_plant');
    expect(fetchSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2400);
    expect(fetchSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(150);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.views).toEqual({ '/': 1 });
    expect(body.events).toEqual({ quick_game_started: 1, quick_game_first_plant: 1 });

    // pagehide flushes immediately without waiting for debounce window
    service.trackEvent('quick_game_finished');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    service.flushOnPageHide();
    await Promise.resolve();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const hideBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(hideBody.events).toEqual({ quick_game_finished: 1 });
  });

  it('restores snapshot and retries with exponential backoff on HTTP 429 without losing events', async () => {
    vi.useFakeTimers();
    fetchSpy
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: true, status: 204 });

    service.trackEvent('quick_game_finished');
    await service.flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // First retry fires after 3000ms
    await vi.advanceTimersByTimeAsync(2900);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(150);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Second retry fires after 6000ms and succeeds with the preserved event
    await vi.advanceTimersByTimeAsync(5900);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(150);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    const body = JSON.parse(fetchSpy.mock.calls[2][1].body);
    expect(body.events).toEqual({ quick_game_finished: 1 });
  });

  it('caps consecutive retry attempts at 4 on sustained 429 responses', async () => {
    vi.useFakeTimers();
    fetchSpy.mockResolvedValue({ ok: false, status: 429 });

    service.trackEvent('quick_game_round_1');
    await service.flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Advance through all 4 exponential backoff delays (3s + 6s + 12s + 24s = 45s) + extra buffer
    await vi.advanceTimersByTimeAsync(120_000);
    // 1 initial attempt + 4 retries = 5 total calls
    expect(fetchSpy).toHaveBeenCalledTimes(5);
  });

  it('skips duplicate referrer recording on reload and back_forward navigations via PerformanceNavigationTiming', async () => {
    const sessionSetSpy = vi.spyOn(window.sessionStorage, 'setItem');
    const localSetSpy = vi.spyOn(window.localStorage, 'setItem');

    for (const navType of ['reload', 'back_forward'] as const) {
      fetchSpy.mockClear();
      Object.defineProperty(performance, 'getEntriesByType', {
        value: vi.fn().mockReturnValue([{ type: navType } as PerformanceNavigationTiming]),
        configurable: true,
        writable: true,
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          TelemetryService,
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: DOCUMENT, useValue: { referrer: 'https://m.facebook.com/' } },
        ],
      });
      const reloadedService = TestBed.inject(TelemetryService);
      reloadedService.enableInTests = true;
      reloadedService.trackPageView('/');
      await reloadedService.flush();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const reloadBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(reloadBody.views).toEqual({ '/': 1 });
      expect(reloadBody.referrers).toBeUndefined();
    }

    Object.defineProperty(performance, 'getEntriesByType', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    expect(sessionSetSpy).not.toHaveBeenCalled();
    expect(localSetSpy).not.toHaveBeenCalled();
  });

  it('buffers page views and events in RAM while offline and flushes when online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    service.trackPageView('/');
    service.trackPageView('/game');
    service.trackEvent('quick_game_started');
    expect(fetchSpy).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    await service.flush();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.views).toEqual({ '/': 1, '/game': 1 });
    expect(body.events).toEqual({ quick_game_started: 1 });
    expect(body.referrers).toEqual({ 'bpb.de': 1 });
  });

  it('restores snapshot into RAM if fetch fails transiently', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network offline'));

    service.trackEvent('trailer_opened');
    await service.flush();

    fetchSpy.mockResolvedValueOnce({ ok: true, status: 204 });
    await service.flush();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const body = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(body.events).toEqual({ trailer_opened: 1 });
  });

  it('respects browser Do Not Track (DNT) and Global Privacy Control (GPC) signals', async () => {
    Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true });
    service.trackPageView('/');
    service.trackEvent('quick_game_started');
    await service.flush();
    expect(fetchSpy).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'doNotTrack', { value: null, configurable: true });
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
    service.trackPageView('/manual');
    await service.flush();
    expect(fetchSpy).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'globalPrivacyControl', { value: false, configurable: true });
  });

  it('tracks anonymous quick play funnel events and rejects unknown or out-of-range round events', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    service.trackEvent('quick_game_first_plant');
    service.trackEvent('quick_game_round_1');
    service.trackEvent('quick_game_round_20');
    service.trackEvent('quick_game_finished');
    service.trackEvent('quick_game_deleted');
    service.trackEvent('quick_game_round_21' as any);
    service.trackEvent('unknown_event' as any);

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    await service.flush();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.events).toEqual({
      quick_game_first_plant: 1,
      quick_game_round_1: 1,
      quick_game_round_20: 1,
      quick_game_finished: 1,
      quick_game_deleted: 1,
    });
  });

  it('coalesces rapid local session updates per slot within debounce window, sends session-only payloads, and restores on 429 retry', async () => {
    vi.useFakeTimers();

    // Invalid updates must be ignored
    service.trackLocalSession({ slot: 'invalid', currentRound: 1, roundLimit: 10, status: 'in_progress' });
    service.trackLocalSession({ slot: 'abcdef0123456789', currentRound: 0, roundLimit: 10, status: 'in_progress' });
    service.trackLocalSession({ slot: 'abcdef0123456789', currentRound: 1, roundLimit: 2, status: 'in_progress' });
    await service.flush();
    expect(fetchSpy).not.toHaveBeenCalled();

    // Multiple rounds for same slot coalesce to latest state in one debounced POST
    service.trackLocalSession({ slot: 'abcdef0123456789', currentRound: 1, roundLimit: 10, status: 'in_progress' });
    service.trackLocalSession({ slot: 'abcdef0123456789', currentRound: 2, roundLimit: 10, status: 'in_progress' });
    service.trackLocalSession({ slot: 'abcdef0123456789', currentRound: 3, roundLimit: 10, status: 'in_progress' });
    expect(fetchSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2550);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.views).toBeUndefined();
    expect(body.events).toBeUndefined();
    expect(body.sessions).toEqual([
      { slot: 'abcdef0123456789', currentRound: 3, roundLimit: 10, status: 'in_progress' },
    ]);

    // 429 restores pending sessions and retries with backoff
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 429 }).mockResolvedValueOnce({ ok: true, status: 204 });
    service.trackLocalSession({ slot: 'fedcba9876543210', currentRound: 4, roundLimit: 20, status: 'in_progress' });
    await service.flush();
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(3100);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    const retryBody = JSON.parse(fetchSpy.mock.calls[2][1].body);
    expect(retryBody.sessions).toEqual([
      { slot: 'fedcba9876543210', currentRound: 4, roundLimit: 20, status: 'in_progress' },
    ]);
  });
});

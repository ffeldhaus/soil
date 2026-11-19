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
    await Promise.resolve();

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
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Navigating to a second route within the SPA does not re-record the initial referrer
    service.trackPageView('/manual');
    await Promise.resolve();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(secondBody.views).toEqual({ '/manual': 1 });
    expect(secondBody.referrers).toBeUndefined();
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
      await Promise.resolve();

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
    await new Promise((resolve) => setTimeout(resolve, 0));

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
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'doNotTrack', { value: null, configurable: true });
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
    service.trackPageView('/manual');
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'globalPrivacyControl', { value: false, configurable: true });
  });

  it('tracks anonymous quick play funnel events and rejects unknown or out-of-range round events', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    service.trackEvent('quick_game_first_plant');
    service.trackEvent('quick_game_round_1');
    service.trackEvent('quick_game_round_20');
    service.trackEvent('quick_game_finished');
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
    });
  });
});

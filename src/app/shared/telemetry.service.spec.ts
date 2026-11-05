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
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('normalizes canonical routes and rejects unknown paths', () => {
    expect(service.normalizeRoute('/')).toBe('/');
    expect(service.normalizeRoute('/manual/?topic=wheat#section')).toBe('/manual');
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

  it('flushes page views and initial referrer without touching localStorage or sessionStorage', async () => {
    const localSetSpy = vi.spyOn(Storage.prototype, 'setItem');

    service.trackPageView('/manual?tab=crops');
    await Promise.resolve();

    expect(localSetSpy).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/telemetry');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.views).toEqual({ '/manual': 1 });
    expect(body.referrers).toEqual({ 'bpb.de': 1 });

    // Consecutive identical route with different query params is deduplicated
    service.trackPageView('/manual?tab=soil');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
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
});

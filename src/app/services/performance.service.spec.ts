import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PerformanceService } from './performance.service';

describe('PerformanceService', () => {
  let service: PerformanceService;

  beforeEach(() => {
    // Clear localStorage and body classes before each test
    localStorage.clear();
    document.body.classList.remove('perf-tier-1', 'perf-tier-2', 'perf-tier-3');

    TestBed.configureTestingModule({
      providers: [PerformanceService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should initialize with default Tier 3', () => {
    service = TestBed.inject(PerformanceService);
    expect(service.getTier()).toBe(3);
    expect(document.body.classList.contains('perf-tier-3')).toBe(true);
  });

  it('should initialize with persisted tier from localStorage', () => {
    localStorage.setItem('soil_perf_tier', '2');
    service = TestBed.inject(PerformanceService);
    expect(service.getTier()).toBe(2);
    expect(document.body.classList.contains('perf-tier-2')).toBe(true);
  });

  it('should downgrade when low FPS is detected', () => {
    service = TestBed.inject(PerformanceService);
    expect(service.getTier()).toBe(3);

    // Manually trigger a downgrade to verify state change
    (service as any).downgrade();
    expect(service.getTier()).toBe(2);
    expect(localStorage.getItem('soil_perf_tier')).toBe('2');
    expect(document.body.classList.contains('perf-tier-2')).toBe(true);
  });

  it('should not downgrade below Tier 1', () => {
    localStorage.setItem('soil_perf_tier', '1');
    service = TestBed.inject(PerformanceService);

    expect(service.getTier()).toBe(1);
    (service as any).downgrade();
    expect(service.getTier()).toBe(1);
  });

  it('should reset to Tier 3', () => {
    localStorage.setItem('soil_perf_tier', '1');
    service = TestBed.inject(PerformanceService);
    expect(service.getTier()).toBe(1);

    service.reset();
    expect(service.getTier()).toBe(3);
    expect(localStorage.getItem('soil_perf_tier')).toBe('3');
    expect(document.body.classList.contains('perf-tier-3')).toBe(true);
  });
});

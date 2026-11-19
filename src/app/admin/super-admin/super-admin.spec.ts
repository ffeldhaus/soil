import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../auth/auth.service';
import { GameService } from '../../game/game.service';
import type { SystemStats } from '../../types';
import { SuperAdminStatsComponent } from './components/super-admin-stats';
import { SuperAdminComponent } from './super-admin';

const SAMPLE_STATS_WITH_SERIES: SystemStats = {
  games: { total: 42, active: 18, deleted: 4 },
  users: { total: 29, admins: 24, banned: 1 },
  telemetry: {
    viewsToday: 19,
    viewsLast24h: 27,
    viewsLast7d: 94,
    viewsLast30d: 182,
    viewsTotal: 420,
    webViewsTotal: 360,
    pwaViewsTotal: 60,
    routes: { '/': 210, '/game': 110, '/manual': 55, '/trailer': 25, '/research': 20 },
    events: { quick_game_started: 64, trailer_opened: 28, research_export: 7 },
    referrers: { direct: 240, 'bpb.de': 95, pwa_launch: 60, 'facebook.com': 25 },
    firstRecordedDate: '2026-11-05',
    firstRecordedHour: '2026-11-15T14',
    hourlySeries: [
      {
        // Outside 24h window when referenceHour = '2026-11-16T11' (start is '2026-11-15T12')
        hour: '2026-11-15T10',
        totalViews: 50,
        webViews: 50,
        pwaViews: 0,
        routes: { '/': 50 },
        events: { quick_game_started: 12 },
        referrers: { direct: 50 },
      },
      {
        hour: '2026-11-15T14',
        totalViews: 11,
        webViews: 9,
        pwaViews: 2,
        routes: { '/': 6, '/manual': 3, '/trailer': 2 },
        events: { quick_game_started: 3, trailer_opened: 1 },
        referrers: { 'bildungsserver.de': 5, direct: 6 },
      },
      {
        hour: '2026-11-16T08',
        totalViews: 10,
        webViews: 8,
        pwaViews: 2,
        routes: { '/': 5, '/game': 4, '/research': 1 },
        events: { quick_game_started: 2, research_export: 1 },
        referrers: { 'bpb.de': 4, direct: 6 },
      },
      {
        hour: '2026-11-16T11',
        totalViews: 6,
        webViews: 5,
        pwaViews: 1,
        routes: { '/': 3, '/trailer': 3 },
        events: { trailer_opened: 2 },
        referrers: { 'bpb.de': 3, pwa_launch: 1, direct: 2 },
      },
    ],
    dailySeries: [
      {
        date: '2026-11-05',
        totalViews: 48,
        webViews: 42,
        pwaViews: 6,
        routes: { '/': 30, '/manual': 12, '/trailer': 6 },
        events: { quick_game_started: 10, trailer_opened: 4 },
        referrers: { 'bpb.de': 22, direct: 26 },
      },
      {
        date: '2026-11-12',
        totalViews: 32,
        webViews: 28,
        pwaViews: 4,
        routes: { '/': 18, '/game': 10, '/trailer': 4 },
        events: { quick_game_started: 8, trailer_opened: 3 },
        referrers: { 'facebook.com': 12, direct: 20 },
      },
      {
        date: '2026-11-16',
        totalViews: 19,
        webViews: 15,
        pwaViews: 4,
        routes: { '/': 9, '/game': 6, '/trailer': 4 },
        events: { quick_game_started: 5, trailer_opened: 2 },
        referrers: { 'bpb.de': 7, direct: 12 },
      },
    ],
  },
};

describe('SuperAdminComponent', () => {
  let component: SuperAdminComponent;
  let fixture: ComponentFixture<SuperAdminComponent>;
  let authServiceMock: { user$: any; authStateReady$?: any; logout: any };
  let gameServiceMock: {
    getAllAdmins: any;
    getSystemStats: any;
    getAllFeedback: any;
    getResearchGames?: any;
    getSystemInsights?: any;
    checkBacklinkStatus?: any;
    manageAdmin?: any;
    deleteGames?: any;
    getAdminGames?: any;
    manageFeedback?: any;
  };

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    authServiceMock = {
      user$: of({ uid: 'admin', displayName: 'Florian Feldhaus', photoURL: null }),
      logout: vi.fn().mockResolvedValue(undefined),
    };
    gameServiceMock = {
      getAllAdmins: vi.fn().mockResolvedValue([]),
      getSystemStats: vi
        .fn()
        .mockResolvedValue({ games: { total: 0, active: 0, deleted: 0 }, users: { total: 0, admins: 0, banned: 0 } }),
      getAllFeedback: vi.fn().mockResolvedValue([]),
      getResearchGames: vi.fn().mockResolvedValue({ games: [], total: 0 }),
      getSystemInsights: vi.fn().mockResolvedValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [SuperAdminComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: GameService, useValue: gameServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render initials badge when user.photoURL is null', () => {
    expect(component).toBeTruthy();
    const initialsEl = fixture.nativeElement.querySelector('[data-testid="hud-avatar-initials"]') as HTMLElement;
    expect(initialsEl).toBeTruthy();
    expect(initialsEl.textContent?.trim()).toBe('FF');
    expect(fixture.nativeElement.querySelector('header img')).toBeNull();
  });

  it('should load data on init', async () => {
    await component.ngOnInit();
    expect(gameServiceMock.getAllAdmins).toHaveBeenCalled();
    expect(gameServiceMock.getSystemStats).toHaveBeenCalled();
  });

  it('should wait for authStateReady$ before redirecting unauthenticated sessions and show skeleton while loading', async () => {
    const userSubj = new BehaviorSubject<any>(null);
    const readySubj = new BehaviorSubject<boolean>(false);
    let resolveStats!: (val: SystemStats) => void;
    const delayedStats = new Promise<SystemStats>((res) => {
      resolveStats = res;
    });

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SuperAdminComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            user$: userSubj.asObservable(),
            authStateReady$: readySubj.asObservable(),
            logout: vi.fn(),
          },
        },
        {
          provide: GameService,
          useValue: {
            ...gameServiceMock,
            getSystemStats: vi.fn().mockReturnValue(delayedStats),
          },
        },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const coldFixture = TestBed.createComponent(SuperAdminComponent);
    coldFixture.detectChanges();

    // Before authStateReady$ emits true: must NOT redirect and MUST render accessible skeleton + spinner
    expect(navSpy).not.toHaveBeenCalled();
    expect(coldFixture.nativeElement.querySelector('[data-testid="superadmin-loading-skeleton"]')).toBeTruthy();
    expect(coldFixture.nativeElement.querySelector('progress.soil-spinner')).toBeTruthy();

    // Hydrate authenticated user: triggers loadData(), keeps skeleton until stats resolve
    userSubj.next({ uid: 'sa-1', email: 'florian@soil.app', photoURL: null });
    readySubj.next(true);
    coldFixture.detectChanges();
    expect(navSpy).not.toHaveBeenCalled();
    expect(coldFixture.nativeElement.querySelector('[data-testid="superadmin-loading-skeleton"]')).toBeTruthy();

    resolveStats(SAMPLE_STATS_WITH_SERIES);
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    coldFixture.detectChanges();

    expect(coldFixture.nativeElement.querySelector('[data-testid="superadmin-loading-skeleton"]')).toBeNull();
    expect(coldFixture.nativeElement.querySelector('[data-testid="telemetry-svg-chart"]')).toBeTruthy();

    // If user logs out after authStateReady$ is true: redirects to /admin/login
    userSubj.next(null);
    expect(navSpy).toHaveBeenCalledWith(['/admin/login']);
  });

  it('should switch tabs cleanly and preserve hidden="until-found" on inactive tabpanels', async () => {
    await component.loadData();
    fixture.detectChanges();

    const analyticsPanel = fixture.nativeElement.querySelector('#superadmin-panel-analytics') as HTMLElement;
    const usersPanel = fixture.nativeElement.querySelector('#superadmin-panel-users') as HTMLElement;

    expect(component.activeTab).toBe('analytics');
    expect(analyticsPanel.getAttribute('hidden')).toBeNull();
    expect(usersPanel.getAttribute('hidden')).toBe('until-found');

    component.selectTab('users');
    fixture.detectChanges();

    expect(component.activeTab).toBe('users');
    expect(analyticsPanel.getAttribute('hidden')).toBe('until-found');
    expect(usersPanel.getAttribute('hidden')).toBeNull();
  });

  it('should call deleteGames when confirming delete', async () => {
    const mockGame = { id: 'game123', status: 'active' } as any;
    gameServiceMock.deleteGames = vi.fn().mockResolvedValue({});
    component.selectedAdmin = { uid: 'admin123' } as any;
    gameServiceMock.getAdminGames = vi.fn().mockResolvedValue({ games: [], total: 0 });

    await component.deleteGame(mockGame);
    await component.confirmDelete();

    expect(gameServiceMock.deleteGames).toHaveBeenCalledWith(['game123'], false);
  });

  it('should handle feedback management', async () => {
    gameServiceMock.manageFeedback = vi.fn().mockResolvedValue({});
    const mockFeedback = { id: 'fb1' };
    component.initiateFeedbackAction(mockFeedback as any, 'resolve');
    await component.confirmFeedbackAction();
    expect(gameServiceMock.manageFeedback).toHaveBeenCalledWith('fb1', 'resolve', { externalReference: '' });
  });

  it('should handle quota update', async () => {
    gameServiceMock.manageAdmin = vi.fn().mockResolvedValue({});
    const mockUser = { uid: 'a1', email: 'a@ex.com', quota: 10 };

    component.setQuota(mockUser as any);
    component.newQuotaValue = 50;

    await component.saveQuota();

    expect(gameServiceMock.manageAdmin).toHaveBeenCalledWith('a1', 'setQuota', 50);
  });

  it('should sort admins newest-first by createdAt and render registration dates', async () => {
    gameServiceMock.getAllAdmins.mockResolvedValue([
      {
        uid: 'older-admin',
        email: 'older@example.com',
        role: 'admin',
        status: 'active',
        gameCount: 1,
        quota: 10,
        createdAt: { _seconds: 1700000000, _nanoseconds: 0 },
      },
      {
        uid: 'newest-admin',
        email: 'newest@example.com',
        displayName: 'Neuer Admin',
        role: 'admin',
        status: 'active',
        gameCount: 2,
        quota: 10,
        createdAt: '2026-04-01T10:30:00.000Z',
      },
      {
        uid: 'missing-date-admin',
        email: 'nodate@example.com',
        role: 'admin',
        status: 'active',
        gameCount: 0,
        quota: 10,
        createdAt: {},
      },
    ]);

    await component.loadData();
    fixture.detectChanges();

    expect(component.admins.map((a) => a.uid)).toEqual(['newest-admin', 'older-admin', 'missing-date-admin']);

    const dateCells = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="admin-registered-date"]'),
    ) as HTMLElement[];
    expect(dateCells.length).toBe(3);
    expect(dateCells[0].textContent?.trim()).toContain('01.04.2026');
    expect(dateCells[1].textContent?.trim()).toContain('14.11.2023');
    expect(dateCells[2].textContent?.trim()).toBe('–');
  });

  it('should distinguish local vs cloud research games even when id is prefixed with research_local-', () => {
    expect(component.isCloudResearchGame({ id: 'research_local-n23w0wzpw' } as any)).toBe(false);
    expect(component.isCloudResearchGame({ id: 'local-abc' } as any)).toBe(false);
    expect(component.isCloudResearchGame({ id: 'research_EAn8r0Hme5qpawaYT2GQ' } as any)).toBe(true);
  });

  it('filters GSC chart series, custom date ranges, integer Y-axis ticks, and breakdown tables including /trailer', async () => {
    gameServiceMock.getSystemStats.mockResolvedValue(SAMPLE_STATS_WITH_SERIES);
    await component.loadData();
    fixture.detectChanges();

    const statsDebug = fixture.debugElement.query(By.directive(SuperAdminStatsComponent));
    const statsComp = statsDebug.componentInstance as SuperAdminStatsComponent;
    statsComp.referenceDate = '2026-11-16';
    fixture.detectChanges(false);

    // Default 28d preset (20.10.2026 – 16.11.2026): sums all 3 daily docs (48 + 32 + 19 = 99)
    expect(statsComp.selectedRange).toBe('28d');
    expect(statsComp.chartDays.length).toBe(28);
    expect(statsComp.formattedFirstDateNote).toBe('05.11.2026');
    expect(statsComp.metricTiles.find((t) => t.key === 'total')?.count).toBe(99);
    expect(statsComp.yTicks.every((t) => Number.isInteger(t.value))).toBe(true);

    // Click 7d preset button (10.11.2026 – 16.11.2026): includes 2026-11-12 (32) + 2026-11-16 (19) = 51
    const btn7d = fixture.nativeElement.querySelector('[data-testid="range-preset-7d"]') as HTMLButtonElement;
    btn7d.click();
    fixture.detectChanges();
    expect(statsComp.chartDays.length).toBe(7);
    expect(statsComp.metricTiles.find((t) => t.key === 'total')?.count).toBe(51);
    expect(statsComp.routeRows.find((r) => r.key === '/trailer')?.count).toBe(8);
    expect(statsComp.referrerRows.find((r) => r.key === 'facebook.com')?.count).toBe(12);

    // Hover last day column to verify dark tooltip rendering
    const hitRects = fixture.nativeElement.querySelectorAll('[data-testid="chart-day-hit"]');
    expect(hitRects.length).toBe(7);
    hitRects[6].dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    const tooltip = fixture.nativeElement.querySelector('[data-testid="chart-tooltip"]') as HTMLElement;
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain('Mo., 16.11.2026');

    // Click custom preset button and set custom range (2026-11-05 .. 2026-11-06)
    const btnCustom = fixture.nativeElement.querySelector('[data-testid="range-preset-custom"]') as HTMLButtonElement;
    btnCustom.click();
    fixture.detectChanges();
    const startInput = fixture.nativeElement.querySelector('[data-testid="custom-range-start"]') as HTMLInputElement;
    const endInput = fixture.nativeElement.querySelector('[data-testid="custom-range-end"]') as HTMLInputElement;
    startInput.value = '2026-11-05';
    startInput.dispatchEvent(new Event('input'));
    endInput.value = '2026-11-06';
    endInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(statsComp.chartDays.length).toBe(2);
    expect(statsComp.metricTiles.find((t) => t.key === 'total')?.count).toBe(48);
    expect(statsComp.routeRows.find((r) => r.key === '/trailer')?.count).toBe(6);

    // Click 'all' preset button: reads global totals from stats.telemetry (420 views, /trailer = 25)
    const btnAll = fixture.nativeElement.querySelector('[data-testid="range-preset-all"]') as HTMLButtonElement;
    btnAll.click();
    fixture.detectChanges();
    expect(statsComp.metricTiles.find((t) => t.key === 'total')?.count).toBe(420);
    expect(statsComp.routeRows.find((r) => r.key === '/trailer')?.count).toBe(25);

    // Toggle series visibility via clickable GSC metric tiles and ensure at least 1 series stays active
    expect(statsComp.isSeriesActive('pwa')).toBe(true);
    (fixture.nativeElement.querySelector('[data-testid="metric-tile-pwa"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(statsComp.isSeriesActive('pwa')).toBe(false);
    (fixture.nativeElement.querySelector('[data-testid="metric-tile-web"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[data-testid="metric-tile-interactions"]') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('[data-testid="metric-tile-total"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(statsComp.isSeriesActive('total')).toBe(true);
  });

  it('renders 24-hour hourly chart points, 24h metric sums, breakdown tables, and empty-series note when selecting 24 Std.', async () => {
    gameServiceMock.getSystemStats.mockResolvedValue(SAMPLE_STATS_WITH_SERIES);
    await component.loadData();
    fixture.detectChanges();

    const statsDebug = fixture.debugElement.query(By.directive(SuperAdminStatsComponent));
    const statsComp = statsDebug.componentInstance as SuperAdminStatsComponent;
    statsComp.referenceDate = '2026-11-16';
    statsComp.referenceHour = '2026-11-16T11';
    fixture.detectChanges(false);

    expect(statsComp.rangePresets[0]).toEqual({ id: '24h', label: '24 Std.' });
    const kpi24h = fixture.nativeElement.querySelector('[data-testid="telemetry-kpi-24h"]') as HTMLElement;
    expect(kpi24h.textContent).toContain('Letzte 24h: 27');

    // Click '24h' preset button ("24 Std.")
    const btn24h = fixture.nativeElement.querySelector('[data-testid="range-preset-24h"]') as HTMLButtonElement;
    expect(btn24h.textContent?.trim()).toBe('24 Std.');
    btn24h.click();
    fixture.detectChanges();

    expect(statsComp.selectedRange).toBe('24h');
    expect(statsComp.chartDays.length).toBe(24);
    expect(statsComp.chartDays[0].date).toBe('2026-11-15T12');
    expect(statsComp.chartDays[23].date).toBe('2026-11-16T11');
    // Missing hours are zero-filled
    expect(statsComp.chartDays[0].total).toBe(0);
    expect(statsComp.chartDays[2].total).toBe(11);
    expect(statsComp.chartDays[20].total).toBe(10);
    expect(statsComp.chartDays[23].total).toBe(6);

    // X-axis ticks at 4-hour intervals + final hour, formatted as HH:00
    expect(statsComp.xTicks.length).toBe(7);
    expect(statsComp.xTicks.every((t) => /^\d{2}:\d{2}$/.test(t.label))).toBe(true);

    // Metric tiles sum only the 24 hourly buckets in window (11 + 10 + 6 = 27; excludes 2026-11-15T10)
    expect(statsComp.metricTiles.find((t) => t.key === 'total')?.count).toBe(27);
    expect(statsComp.metricTiles.find((t) => t.key === 'web')?.count).toBe(22);
    expect(statsComp.metricTiles.find((t) => t.key === 'pwa')?.count).toBe(5);
    expect(statsComp.metricTiles.find((t) => t.key === 'interactions')?.count).toBe(8);

    // Breakdown tables are synchronized to the 24h window
    expect(statsComp.routeRows.find((r) => r.key === '/')?.count).toBe(14);
    expect(statsComp.routeRows.find((r) => r.key === '/trailer')?.count).toBe(5);
    expect(statsComp.eventRows.find((e) => e.key === 'quick_game_started')?.count).toBe(5);
    expect(statsComp.eventRows.find((e) => e.key === 'research_export')?.count).toBe(1);
    expect(statsComp.referrerRows.find((r) => r.key === 'bildungsserver.de')?.count).toBe(5);
    expect(statsComp.referrerRows.find((r) => r.key === 'bpb.de')?.count).toBe(7);

    // Subtitle & resolution caption reflect local hourly values
    expect(statsComp.formattedDateRange).toContain('Letzte 24 Stunden');
    const caption = fixture.nativeElement.querySelector('[data-testid="telemetry-resolution-caption"]') as HTMLElement;
    expect(caption.textContent).toContain('Stundenwerte (lokale Uhrzeit)');

    // Hover last hour column to verify hourly tooltip range label ("Uhr")
    const hitRects = fixture.nativeElement.querySelectorAll('[data-testid="chart-day-hit"]');
    expect(hitRects.length).toBe(24);
    hitRects[23].dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    const tooltip = fixture.nativeElement.querySelector('[data-testid="chart-tooltip"]') as HTMLElement;
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain('Uhr');

    // Graceful zero-state when hourlySeries has not recorded its first hour yet
    gameServiceMock.getSystemStats.mockResolvedValue({
      ...SAMPLE_STATS_WITH_SERIES,
      telemetry: {
        ...SAMPLE_STATS_WITH_SERIES.telemetry!,
        viewsLast24h: 0,
        hourlySeries: [],
        firstRecordedHour: null,
      },
    });
    await component.loadData();
    fixture.detectChanges();
    expect(statsComp.chartDays.length).toBe(24);
    expect(statsComp.metricTiles.find((t) => t.key === 'total')?.count).toBe(0);
    expect(statsComp.referrerRows.length).toBe(0);
    const statusNote = fixture.nativeElement.querySelector(
      '[data-testid="telemetry-hourly-status-note"]',
    ) as HTMLElement;
    expect(statusNote?.textContent).toContain('Stundenreihe aktiv ab erstem Aufruf');
  });

  it('renders known backlinks table, noreferrer hints, and live verification results via Live-Status prüfen', async () => {
    gameServiceMock.getSystemStats.mockResolvedValue({
      ...SAMPLE_STATS_WITH_SERIES,
      telemetry: {
        ...SAMPLE_STATS_WITH_SERIES.telemetry!,
        referrers: { direct: 240, 'hubbs.schule': 14, 'github.com': 8 },
      },
    });
    gameServiceMock.checkBacklinkStatus = vi.fn().mockResolvedValue({
      checkedAt: '2026-11-16T18:30:00.000Z',
      results: [
        { id: 'bpb', ok: true, httpStatus: 200, linksToSoil: true, checkedAt: '2026-11-16T18:30:00.000Z' },
        { id: 'globaleslernen', ok: true, httpStatus: 200, linksToSoil: true, checkedAt: '2026-11-16T18:30:00.000Z' },
        { id: 'hubbs', ok: true, httpStatus: 200, linksToSoil: true, checkedAt: '2026-11-16T18:30:00.000Z' },
        { id: 'mundo', ok: true, httpStatus: 200, linksToSoil: true, checkedAt: '2026-11-16T18:30:00.000Z' },
        { id: 'github', ok: false, httpStatus: 404, linksToSoil: false, checkedAt: '2026-11-16T18:30:00.000Z' },
        { id: 'youtube', ok: false, httpStatus: 200, linksToSoil: false, checkedAt: '2026-11-16T18:30:00.000Z' },
      ],
    });

    await component.loadData();
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('[data-testid="superadmin-backlinks-card"]') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Bekannte Verlinkungen & Bildungsportale');
    expect(card.textContent).toContain('bpb.de');
    expect(card.textContent).toContain('globaleslernen.de');
    expect(card.textContent).toContain('hubbs.schule');
    expect(card.textContent).toContain('mundo.schule');
    expect(card.textContent).toContain('bne-portal.de');
    expect(card.textContent).toContain('Unterdrückt (noreferrer → Direktaufruf)');

    const bpbCount = fixture.nativeElement.querySelector('[data-testid="backlink-referrer-count-bpb"]') as HTMLElement;
    expect(bpbCount.textContent?.trim()).toBe('0 (via Direktaufruf)');

    const hubbsCount = fixture.nativeElement.querySelector(
      '[data-testid="backlink-referrer-count-hubbs"]',
    ) as HTMLElement;
    expect(hubbsCount.textContent?.trim()).toBe('14');

    expect(
      (fixture.nativeElement.querySelector('[data-testid="backlink-live-status-bpb"]') as HTMLElement).textContent,
    ).toContain('Live gelistet');
    expect(
      (fixture.nativeElement.querySelector('[data-testid="backlink-live-status-bne-portal"]') as HTMLElement)
        .textContent,
    ).toContain('Redaktionsprüfung');

    const checkBtn = fixture.nativeElement.querySelector('[data-testid="backlinks-check-btn"]') as HTMLButtonElement;
    checkBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(gameServiceMock.checkBacklinkStatus).toHaveBeenCalledTimes(1);
    expect(
      (fixture.nativeElement.querySelector('[data-testid="backlink-live-status-bpb"]') as HTMLElement).textContent,
    ).toContain('HTTP 200 · Link aktiv');
    expect(
      (fixture.nativeElement.querySelector('[data-testid="backlink-live-status-mundo"]') as HTMLElement).textContent,
    ).toContain('HTTP 200 · Link aktiv');
    expect(
      (fixture.nativeElement.querySelector('[data-testid="backlink-live-status-youtube"]') as HTMLElement).textContent,
    ).toContain('HTTP 200 · Link nicht im HTML');
    expect(
      (fixture.nativeElement.querySelector('[data-testid="backlink-live-status-github"]') as HTMLElement).textContent,
    ).toContain('Fehler / HTTP 404');
    expect(
      (fixture.nativeElement.querySelector('[data-testid="backlinks-checked-timestamp"]') as HTMLElement).textContent,
    ).toContain('Geprüft:');
  });

  it('renders the Sofort-Spiel-Funnel with conversion percentages and keeps eventRows clean', async () => {
    gameServiceMock.getSystemStats.mockResolvedValue({
      ...SAMPLE_STATS_WITH_SERIES,
      telemetry: {
        ...SAMPLE_STATS_WITH_SERIES.telemetry!,
        events: {
          quick_game_started: 100,
          quick_game_first_plant: 80,
          quick_game_round_1: 65,
          quick_game_round_5: 40,
          quick_game_round_10: 25,
          quick_game_round_15: 12,
          quick_game_round_20: 0,
          quick_game_finished: 10,
          trailer_opened: 28,
          research_export: 7,
        },
      },
    });

    const fixture = TestBed.createComponent(SuperAdminComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const statsDebug = fixture.debugElement.query(By.directive(SuperAdminStatsComponent));
    const statsComp = statsDebug.componentInstance as SuperAdminStatsComponent;
    statsComp.selectRange('all');
    fixture.detectChanges();

    expect(statsComp.eventRows.map((e) => e.key)).toEqual(['quick_game_started', 'trailer_opened', 'research_export']);

    const funnel = statsComp.quickPlayFunnelRows;
    expect(funnel.find((r) => r.key === 'quick_game_started')?.conversionPercent).toBe(100);
    expect(funnel.find((r) => r.key === 'quick_game_started')?.shortLabel).toBe('Start');
    expect(funnel.find((r) => r.key === 'quick_game_first_plant')?.conversionPercent).toBe(80);
    expect(funnel.find((r) => r.key === 'quick_game_first_plant')?.shortLabel).toBe('Aussaat');
    expect(funnel.find((r) => r.key === 'quick_game_first_plant')?.dropOffPercent).toBe(20);
    expect(funnel.find((r) => r.key === 'quick_game_round_1')?.conversionPercent).toBe(65);
    expect(funnel.find((r) => r.key === 'quick_game_round_1')?.shortLabel).toBe('R1');
    expect(funnel.find((r) => r.key === 'quick_game_round_10')?.conversionPercent).toBe(25);
    expect(funnel.find((r) => r.key === 'quick_game_round_15')?.count).toBe(12);
    expect(funnel.find((r) => r.key === 'quick_game_round_20')).toBeUndefined();
    expect(funnel.find((r) => r.key === 'quick_game_finished')?.conversionPercent).toBe(10);
    expect(funnel.find((r) => r.key === 'quick_game_finished')?.shortLabel).toBe('Fertig');
    expect(statsComp.quickPlayFirstPlantRate).toBe(80);
    expect(statsComp.quickPlayCompletionRate).toBe(10);

    const funnelEl = fixture.nativeElement.querySelector('[data-testid="superadmin-quick-play-funnel"]') as HTMLElement;
    expect(funnelEl).toBeTruthy();
    expect(funnelEl.textContent).toContain('Sofort-Spiel-Funnel');
    expect(funnelEl.textContent).toContain('Erste Aussaat: 80%');
    expect(funnelEl.textContent).toContain('Abschlussrate: 10%');
    expect(funnelEl.textContent).toContain('Abgeschlossen');
    expect(funnelEl.querySelector('[data-testid="funnel-row-quick_game_started"]')?.textContent).toContain('Start');
    expect(funnelEl.querySelector('[data-testid="funnel-row-quick_game_finished"]')?.textContent).toContain('Fertig');

    statsComp.setHoveredFunnelStep(1);
    fixture.detectChanges();
    expect(funnelEl.textContent).toContain('−20% zum Vorschritt');
  });

  it('shows Unbekannt instead of 0% for historical periods with quick_game_started > 0 and no post-start funnel events', async () => {
    gameServiceMock.getSystemStats.mockResolvedValue({
      ...SAMPLE_STATS_WITH_SERIES,
      telemetry: {
        ...SAMPLE_STATS_WITH_SERIES.telemetry!,
        events: {
          quick_game_started: 17,
          trailer_opened: 4,
        },
      },
    });

    const fixture = TestBed.createComponent(SuperAdminComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const statsDebug = fixture.debugElement.query(By.directive(SuperAdminStatsComponent));
    const statsComp = statsDebug.componentInstance as SuperAdminStatsComponent;
    statsComp.selectRange('all');
    fixture.detectChanges();

    expect(statsComp.hasQuickPlayFunnelData).toBe(false);
    expect(statsComp.quickPlayFirstPlantRate).toBeNull();
    expect(statsComp.quickPlayCompletionRate).toBeNull();

    const funnel = statsComp.quickPlayFunnelRows;
    expect(funnel.find((r) => r.key === 'quick_game_started')?.isUnknown).toBe(false);
    expect(funnel.find((r) => r.key === 'quick_game_first_plant')?.isUnknown).toBe(true);
    expect(funnel.find((r) => r.key === 'quick_game_first_plant')?.dropOffPercent).toBeNull();
    expect(funnel.find((r) => r.key === 'quick_game_round_1')?.isUnknown).toBe(true);
    expect(funnel.find((r) => r.key === 'quick_game_finished')?.isUnknown).toBe(true);

    const funnelEl = fixture.nativeElement.querySelector('[data-testid="superadmin-quick-play-funnel"]') as HTMLElement;
    expect(funnelEl.textContent).toContain('Erste Aussaat:');
    expect(funnelEl.textContent).toContain('Unbekannt');
    expect(funnelEl.textContent).toContain('Fortschritt für ältere Zeiträume unbekannt (Runden-Funnel ab v3.5.3).');
    expect(funnelEl.textContent).not.toContain('Erste Aussaat: 0%');
    expect(funnelEl.textContent).not.toContain('Abschlussrate: 0%');
    expect(funnelEl.querySelector('[data-testid="funnel-row-quick_game_started"]')?.textContent).toContain('17');
    expect(funnelEl.querySelector('[data-testid="funnel-row-quick_game_started"]')?.textContent).toContain('100%');
    expect(funnelEl.querySelector('[data-testid="funnel-row-quick_game_first_plant"]')?.textContent).toContain('—');
    expect(funnelEl.querySelector('[data-testid="funnel-row-quick_game_finished"]')?.textContent).toContain('—');
  });

  it('shows active funnel rates normally when post-start events are present', async () => {
    gameServiceMock.getSystemStats.mockResolvedValue({
      ...SAMPLE_STATS_WITH_SERIES,
      telemetry: {
        ...SAMPLE_STATS_WITH_SERIES.telemetry!,
        events: {
          quick_game_started: 10,
          quick_game_first_plant: 7,
          quick_game_round_1: 5,
          quick_game_finished: 2,
        },
      },
    });

    const fixture = TestBed.createComponent(SuperAdminComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const statsDebug = fixture.debugElement.query(By.directive(SuperAdminStatsComponent));
    const statsComp = statsDebug.componentInstance as SuperAdminStatsComponent;
    statsComp.selectRange('all');
    fixture.detectChanges();

    expect(statsComp.hasQuickPlayFunnelData).toBe(true);
    expect(statsComp.quickPlayFirstPlantRate).toBe(70);
    expect(statsComp.quickPlayCompletionRate).toBe(20);
    expect(statsComp.quickPlayFunnelRows.every((r) => !r.isUnknown)).toBe(true);

    const funnelEl = fixture.nativeElement.querySelector('[data-testid="superadmin-quick-play-funnel"]') as HTMLElement;
    expect(funnelEl.textContent).toContain('Erste Aussaat: 70%');
    expect(funnelEl.textContent).toContain('Abschlussrate: 20%');
    expect(funnelEl.textContent).not.toContain('Fortschritt für ältere Zeiträume unbekannt');
  });
});

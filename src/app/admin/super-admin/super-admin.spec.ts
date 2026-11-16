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
    viewsLast7d: 94,
    viewsLast30d: 182,
    viewsTotal: 420,
    webViewsTotal: 360,
    pwaViewsTotal: 60,
    routes: { '/': 210, '/game': 110, '/manual': 55, '/trailer': 25, '/research': 20 },
    events: { quick_game_started: 64, trailer_opened: 28, research_export: 7 },
    referrers: { direct: 240, 'bpb.de': 95, pwa_launch: 60, 'facebook.com': 25 },
    firstRecordedDate: '2026-11-05',
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
    fixture.detectChanges();

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
});

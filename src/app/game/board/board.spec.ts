import { ChangeDetectorRef } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../auth/auth.service';
import { FIREBASE_FUNCTIONS } from '../../firebase.config';
import { GameService } from '../game.service';
import { Board } from './board';

describe('Board', () => {
  let component: Board;
  let fixture: ComponentFixture<Board>;

  beforeEach(async () => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    });

    const authSpy = {
      user$: of({
        uid: 'test-user',
        displayName: 'Test User',
        getIdTokenResult: () => Promise.resolve({ claims: { role: 'player' } }),
      }),
      logout: () => Promise.resolve(),
      updateDisplayName: vi.fn().mockResolvedValue(undefined),
    };
    const gameSpy = {
      state$: of({
        game: {
          id: 'test-game',
          name: 'Test Game',
          currentRoundNumber: 0,
          status: 'in_progress',
          roundDeadlines: {},
        },
        playerState: {
          uid: 'test-user',
          isAi: false,
          history: [],
          submittedRound: -1,
        },
      }),
      getParcels: () =>
        of(
          Array(40)
            .fill(null)
            .map((_, i) => ({
              index: i,
              crop: 'Fallow',
              soil: 100,
              nutrition: 100,
              yield: 0,
            })),
        ),
      getParcelsValue: () =>
        Array(40)
          .fill(null)
          .map((_, i) => ({
            index: i,
            crop: 'Fallow',
            soil: 100,
            nutrition: 100,
            yield: 0,
          })),
      updateParcelDecision: () => {},
      submitDecision: (_gameId: string, _decision: any) => Promise.resolve({ status: 'calculated' }),
      submitRound: (_gameId: string) => Promise.resolve(),
      loadGame: (_gameId: string) =>
        Promise.resolve({
          game: { currentRoundNumber: 0 },
          playerState: { history: [], submittedRound: -1 },
        }),
    };
    const functionsSpy = { httpsCallable: () => () => Promise.resolve({ data: {} }) };
    const routerSpy = { navigate: () => Promise.resolve(true) };
    const cdrSpy = { detectChanges: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Board],
      providers: [
        provideRouter([]),
        provideClientHydration(withIncrementalHydration()),
        { provide: AuthService, useValue: authSpy },
        { provide: GameService, useValue: gameSpy },
        { provide: FIREBASE_FUNCTIONS, useValue: functionsSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: ChangeDetectorRef, useValue: cdrSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Board);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle overlays', () => {
    expect(component.showNutritionOverlay).toBe(true);
    expect(component.showSoilOverlay).toBe(true);
    component.toggleNutrition();
    expect(component.showNutritionOverlay).toBe(false);
    component.toggleHarvest();
    expect(component.showHarvestOverlay).toBe(true);
    component.toggleSoil();
    expect(component.showSoilOverlay).toBe(false);
  });

  it('should handle round navigation', () => {
    component.maxRoundNumber = 5;
    component.goToRound(2);
    expect(component.viewingRound).toBe(2);
    expect(component.isReadOnly).toBe(true);
  });

  it('should open planting modal if parcels selected', () => {
    component.selectedIndices.add(0);
    component.openPlantingModal();
    expect(component.showPlantingModal).toBe(true);
  });

  it('should handle crop selection', () => {
    const gameService = TestBed.inject(GameService);
    vi.spyOn(gameService, 'updateParcelDecision');

    component.selectedIndices.add(0);
    component.selectedIndices.add(1);
    component.onCropSelected('Wheat');

    expect(gameService.updateParcelDecision).toHaveBeenCalledTimes(2);
    expect(component.selectedIndices.size).toBe(0);
    expect(component.showPlantingModal).toBe(false);
  });

  it('should handle round settings', () => {
    const settings = { machines: 1, organic: true, fertilizer: false, pesticide: false, organisms: false };
    component.onRoundSettingsSaved(settings);
    expect(component.currentRoundSettings).toEqual(settings);
    expect(component.showRoundSettingsModal).toBe(false);
  });

  it('should handle round submission', async () => {
    const gameService = TestBed.inject(GameService);
    vi.spyOn(gameService, 'submitDecision').mockResolvedValue({ status: 'calculated' } as any);

    component.gameId = 'test-game';
    component.currentRoundSettings = {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
    };

    await component.executeNextRound();

    expect(gameService.submitDecision).toHaveBeenCalled();
    expect(component.showRoundResultModal).toBe(true);
  });

  it('should toggle labels', () => {
    component.showLabels = false;
    component.toggleLabels();
    expect(component.showLabels).toBe(true);
  });

  it('should clear selection on background click', () => {
    component.selectedIndices.add(1);
    component.onBackgroundClick(new MouseEvent('click'));
    expect(component.selectedIndices.size).toBe(0);
  });

  it('should identify player correctly', async () => {
    await fixture.whenStable();
    expect(component.isPlayer).toBe(true);
  });

  it('should open settings and populate name', async () => {
    await component.startEditName();
    expect(component.isEditingName).toBe(true);
    expect(component.tempName).toBe('Test User');
  });

  it('should save settings and close modal', async () => {
    component.isEditingName = true;
    component.tempName = 'New Name';
    await component.saveName();
    expect(TestBed.inject(AuthService).updateDisplayName).toHaveBeenCalledWith('New Name');
    expect(component.isEditingName).toBe(false);
  });

  it('should open planting modal on selection', async () => {
    await fixture.whenStable();

    // Ensure parcels are populated for selection logic
    if (component.parcels.length === 0) {
      component.parcels = Array(40)
        .fill(null)
        .map((_, i) => ({
          index: i,
          crop: 'Fallow',
          soil: 100,
          nutrition: 100,
          yield: 0,
        })) as any;
    }

    component.isReadOnly = false;
    component.isSubmitted = false;
    component.viewingRound = 0;
    component.maxRoundNumber = 0;
    component.cols = 8;
    component.rows = 5;

    // Simulate selection
    const mockEvent = new MouseEvent('mousedown');
    component.onMouseDown(0, mockEvent); // Select index 0
    component.onMouseUp(); // Trigger mouseup logic

    await fixture.whenStable(); // Wait for async update in onMouseUp
    // fixture.detectChanges(); // Check if this is needed, or if accessing property triggers check

    expect(component.selectedIndices.size).toBeGreaterThan(0);
    expect(component.showPlantingModal).toBe(true);
  });

  it('should open round settings on nextRound (confirmation flow)', async () => {
    component.showRoundSettingsModal = false;
    await component.nextRound();
    expect(component.showRoundSettingsModal).toBe(true);
  });

  it('should fetch round data when switching to historical round without snapshots', async () => {
    const mockFullRound = {
      number: 1,
      parcelsSnapshot: Array(40).fill({ index: 0, crop: 'Corn', soil: 100, nutrition: 100 }),
    };
    const gameService = TestBed.inject(GameService);
    const getRoundDataSpy = vi.fn().mockResolvedValue(mockFullRound);
    gameService.getRoundData = getRoundDataSpy;

    component.gameId = 'test-game';
    component.maxRoundNumber = 2;
    component.history = [
      { number: 0, decision: {} as any, parcelsSnapshot: [] },
      { number: 1, decision: {} as any, parcelsSnapshot: [] }, // Missing snapshots
    ];

    component.goToRound(1);

    expect(component.viewingRound).toBe(1);
    // Use promise to wait for getRoundData
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getRoundDataSpy).toHaveBeenCalledWith('test-game', 1, undefined);
    expect(component.parcels[0].crop).toBe('Corn');
  });

  it('should use history directly when switching to historical round with snapshots', async () => {
    const mockParcels = Array(40).fill({ index: 0, crop: 'Potato', soil: 100, nutrition: 100 });
    component.maxRoundNumber = 2;
    component.history = [
      { number: 0, decision: {} as any, parcelsSnapshot: [] },
      { number: 1, decision: {} as any, parcelsSnapshot: mockParcels },
    ];

    component.goToRound(1);

    expect(component.viewingRound).toBe(1);
    expect(component.parcels[0].crop).toBe('Potato');
    const gameService = TestBed.inject(GameService);
    // Should NOT have called getRoundData
    expect(gameService.getRoundData).toBeUndefined();
  });

  it('should return correct backgroundImage based on weather and orientation', () => {
    component.cols = 8; // Landscape
    component.showFinance = false;
    component.history = [
      {
        number: 0,
        result: { events: { weather: 'Normal' } },
      } as any,
    ];
    component.viewingRound = 0;

    expect(component.backgroundImage).toBe('assets/images/bauernhof-landscape-hd.webp');

    // Drought weather
    component.history[0].result.events.weather = 'Drought';
    expect(component.backgroundImage).toBe('assets/images/bauernhof-landscape-trockenheit-hd.webp');

    // Portrait
    component.cols = 5;
    component.history[0].result.events.weather = 'Normal';
    expect(component.backgroundImage).toBe('assets/images/bauernhof-portrait-hd.webp');

    // Flood weather (should NOT be dunkel anymore)
    component.history[0].result.events.weather = 'Flood';
    expect(component.backgroundImage).toBe('assets/images/bauernhof-portrait-hochwasser-hd.webp');
  });

  it('should update cols/rows based on aspect ratio in checkOrientation', () => {
    component.parcels = Array(40).fill({});

    const setViewport = (width: number, height: number) => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
    };

    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;

    try {
      // Very tall (AR < 0.42)
      setViewport(300, 1000);
      component.checkOrientation();
      expect(component.cols).toBe(4);
      expect(component.rows).toBe(10);

      // Portrait phone & tablet (0.42 <= AR < 1.0)
      setViewport(393, 852);
      component.checkOrientation();
      expect(component.cols).toBe(5);
      expect(component.rows).toBe(8);

      setViewport(600, 1000);
      component.checkOrientation();
      expect(component.cols).toBe(5);
      expect(component.rows).toBe(8);

      // Short landscape phone (innerHeight < 500 && AR >= 1.8) -> 10x4
      setViewport(852, 393);
      component.checkOrientation();
      expect(component.cols).toBe(10);
      expect(component.rows).toBe(4);

      // Landscape (1.0 <= AR < 2.4) without enough side space
      setViewport(1200, 1000);
      component.checkOrientation();
      expect(component.cols).toBe(8);
      expect(component.rows).toBe(5);
      expect(component.showSideCards).toBe(false);

      // Landscape 16:9 Viewports (1440x812 and 1920x1080) with enough side space
      setViewport(1440, 812);
      component.checkOrientation();
      expect(component.cols).toBe(8);
      expect(component.rows).toBe(5);
      expect(component.showSideCards).toBe(true);

      setViewport(1920, 1080);
      component.checkOrientation();
      expect(component.cols).toBe(8);
      expect(component.rows).toBe(5);
      expect(component.showSideCards).toBe(true);

      // Very wide (AR >= 2.4)
      setViewport(2500, 1000);
      component.checkOrientation();
      expect(component.cols).toBe(10);
      expect(component.rows).toBe(4);
    } finally {
      setViewport(originalWidth, originalHeight);
    }
  });

  it('should prevent toggling overlays when showFinance is true', () => {
    component.showFinance = true;
    component.showLabels = true;
    component.showNutritionOverlay = false;
    component.showHarvestOverlay = false;
    component.showSoilOverlay = false;

    component.toggleLabels();
    component.toggleNutrition();
    component.toggleHarvest();
    component.toggleSoil();

    expect(component.showLabels).toBe(true);
    expect(component.showNutritionOverlay).toBe(false);
    expect(component.showHarvestOverlay).toBe(false);
    expect(component.showSoilOverlay).toBe(false);
  });

  it('should compute overallWinner, financialWinner, and soilWinner in calculateWinners', () => {
    const mockGame: any = {
      currentRoundNumber: 5,
      players: {
        'player-1': {
          uid: 'player-1',
          displayName: 'Hof Balance',
          capital: 135000,
          avgSoil: 106,
          history: [],
        },
        'player-2': {
          uid: 'player-2',
          displayName: 'Hof Raubbau',
          capital: 150000,
          avgSoil: 70,
          history: [],
        },
      },
    };

    component.calculateWinners(mockGame);
    expect(component.overallWinner?.name).toBe('Hof Balance');
    expect(component.financialWinner?.name).toBe('Hof Raubbau');
    expect(component.soilWinner?.name).toBe('Hof Balance');
  });

  it('should return baseline parcels for selected indices and scope unlocked stickers strictly to the current game', () => {
    window.localStorage.setItem('soil_collected_stickers', JSON.stringify(['krisenfest', 'bio-leuchtturm']));
    component.history = [
      {
        number: 1,
        decision: { parcels: {} } as any,
        parcelsSnapshot: [{ index: 0, crop: 'Fieldbean', soil: 102, nutrition: 110 }],
      },
    ];
    component.selectedIndices = new Set([0]);
    const baseline = component.getSelectedBaselineParcels();
    expect(baseline.length).toBe(1);
    expect(baseline[0].crop).toBe('Fieldbean');

    component.syncCollectedStickers(['humus-pionier']);
    expect(component.isStickerCollected('humus-pionier')).toBe(true);
    expect(component.isStickerCollected('krisenfest')).toBe(false);
    expect(window.localStorage.getItem('soil_collected_stickers')).toBeNull();

    // Starting a new game with empty history and no extra stickers resets collected stickers to 0
    component.history = [];
    component.syncCollectedStickers();
    expect(component.collectedStickerIds).toEqual([]);
  });

  it('should format weather forecast text to show "Ruhige Wetterlage erwartet." for calm/normal weather', () => {
    expect(component.getFormattedWeatherForecastText()).toBe('Ruhige Wetterlage erwartet.');
    expect(
      component.getFormattedWeatherForecastText(
        'Stabiles Einführungswetter: Ruhige Wetterlage (Normal) ohne Extremereignisse erwartet.',
      ),
    ).toBe('Ruhige Wetterlage erwartet.');
    expect(
      component.getFormattedWeatherForecastText(
        'Wetterbericht: Normale Witterung erwartet – ideale Bedingungen für alle Kulturen.',
      ),
    ).toBe('Ruhige Wetterlage erwartet.');
    expect(
      component.getFormattedWeatherForecastText(
        'Wetterdienst-Tendenz: Für das kommende Jahr deutet sich Normal oder Trockenheit an.',
      ),
    ).toBe('Ruhige Wetterlage oder Trockenheit möglich.');
  });

  it('should open unified team and achievements modal, display leaderboard, and save team name from modal', async () => {
    (TestBed.inject(GameService) as any).state = {
      game: {
        id: 'test-game',
        currentRoundNumber: 1,
        players: {
          'test-user': {
            uid: 'test-user',
            displayName: 'Test User',
            isAi: false,
            capital: 112000,
            avgSoil: 102,
            history: [],
          },
          'ai-1': {
            uid: 'ai-1',
            displayName: 'Hof Nord',
            isAi: true,
            capital: 98000,
            avgSoil: 96,
            history: [],
          },
        },
      },
      playerState: {
        uid: 'test-user',
        displayName: 'Test User',
        isAi: false,
        history: [],
      },
    };

    component.openTeamAndAchievementsModal();
    fixture.changeDetectorRef.detectChanges();
    expect(component.showStickerAlbumModal).toBe(true);
    expect(component.tempName).toBe('Test User');
    expect(fixture.nativeElement.querySelector('[data-testid="team-modal-leaderboard"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="team-leaderboard-row-test-user"]')).toBeTruthy();

    component.tempName = 'Hof Zukunft';
    component.saveTeamNameFromModal();
    expect(TestBed.inject(AuthService).updateDisplayName).toHaveBeenCalledWith('Hof Zukunft');
  });

  it('should allow starting multi-selection outside the parcel grid and dragging into parcels', () => {
    component.parcels = Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: 100,
        nutrition: 100,
        yield: 0,
      })) as any;
    component.isReadOnly = false;
    component.showFinance = false;
    component.cols = 8;
    component.rows = 5;

    const bgEvent = new MouseEvent('mousedown', { button: 0 });
    component.onBoardAreaMouseDown(bgEvent);
    expect(component.isDragging).toBe(true);

    component.onMouseEnter(0);
    component.onMouseEnter(1);
    expect(component.selectedIndices.has(0)).toBe(true);
    expect(component.selectedIndices.has(1)).toBe(true);
  });

  it('should hide pest and challenge side cards when there are no active pests or challenges', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="side-card-weather"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="side-card-pests"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="side-card-contract"]')).toBeNull();
    expect(component.selectedRoundPestsData.length).toBe(0);
    expect(component.currentActiveContract).toBeNull();

    // Now simulate Round 1 (planning for Round 2 -> legume-initiative active) and active pests
    component.viewingRound = 1;
    component.maxRoundNumber = 1;
    component.history = [
      {
        number: 0,
        decision: { parcels: {} } as any,
        parcelsSnapshot: [],
      },
      {
        number: 1,
        decision: { parcels: {} } as any,
        parcelsSnapshot: [],
        result: { events: { weather: 'Normal', vermin: ['potato-beetle'] } } as any,
      },
    ];

    expect(component.selectedRoundPestsData.length).toBe(1);
    expect(component.currentActiveContract?.id).toBe('legume-initiative');
  });

  it('should allow unauthenticated read-only replay for research games without redirecting', async () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate');
    const authService = TestBed.inject(AuthService) as any;
    const route = TestBed.inject(ActivatedRoute) as any;

    authService.user$ = of(null);
    route.queryParams = of({
      gameId: 'research_local-1',
      playerUid: 'player-research_local-1-1',
      viewOnly: 'true',
    });

    component.ngOnInit();
    await fixture.whenStable();

    expect(component.isResearchReplay).toBe(true);
    expect(component.isReadOnly).toBe(true);
    expect(component.showReadOnlyBanner).toBe(true);
    expect(component.isPlayer).toBe(false);
    expect(navSpy).not.toHaveBeenCalledWith(['/']);
    expect(navSpy).not.toHaveBeenCalledWith(['/admin']);
  });

  it('should not preventDefault or reopen planting modal when touching inside an open overlay modal on mobile', async () => {
    component.isReadOnly = false;
    component.showPlantingModal = true;
    component.selectedIndices = new Set([0]);

    const preventDefaultSpy = vi.fn();
    const touchEvent = {
      cancelable: true,
      preventDefault: preventDefaultSpy,
      touches: [{ clientX: 50, clientY: 50 }],
      target: document.createElement('button'),
    } as unknown as TouchEvent;

    component.onTouchStart(touchEvent);
    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(component.isDragging).toBe(false);

    // Simulate closing the modal and touchend firing afterwards
    component.onPlantingCancel();
    component.onTouchEnd(touchEvent);
    await fixture.whenStable();

    expect(component.showPlantingModal).toBe(false);
  });

  it('should show empty-round confirmation modal when all parcels are Fallow', async () => {
    component.parcels = Array.from({ length: 40 }, (_, index) => ({
      index,
      name: `Feld ${index + 1}`,
      crop: 'Fallow',
      soil: 100,
      nutrition: 100,
      harvest: 0,
      history: [],
    })) as any;

    await component.nextRound();
    expect(component.showEmptyRoundConfirmModal).toBe(true);
    expect(component.showRoundSettingsModal).toBe(false);
    expect(component.pendingNextRound).toBe(false);

    component.cancelEmptyRoundConfirm();
    expect(component.showEmptyRoundConfirmModal).toBe(false);
    expect(component.showRoundSettingsModal).toBe(false);

    await component.nextRound();
    component.confirmEmptyRoundProceed();
    expect(component.showEmptyRoundConfirmModal).toBe(false);
    expect(component.showRoundSettingsModal).toBe(true);
    expect(component.pendingNextRound).toBe(true);
  });

  it('should stagger contextual snackbar hints (max 1 per round) and dismiss permanently on action', () => {
    const store = new Map<string, string>();
    vi.spyOn(window.localStorage, 'getItem').mockImplementation((key: string) => store.get(key) ?? null);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation((key: string, value: string) => {
      store.set(key, value);
    });

    // Round 0: plant hint shown
    component.viewingRound = 0;
    component.isReadOnly = false;
    component.showWelcomeModal = true;
    component.closeWelcomeModal();

    expect(component.activeHint).toBe('plant');
    expect(store.get('soil_hint_plant_count')).toBe('1');

    // Planting non-fallow permanently dismisses 'plant' and does NOT show 'overlays' in the same round
    component.selectedIndices.add(0);
    component.onCropSelected('Wheat');
    expect(store.get('soil_hint_plant_seen')).toBe('true');
    expect(component.activeHint).toBeNull();

    // Round 1: overlays hint shown after closing round result modal
    component.viewingRound = 1;
    component.showRoundResultModal = true;
    component.closeRoundResultModal();

    expect(component.activeHint).toBe('overlays');
    expect(store.get('soil_hint_overlays_count')).toBe('1');

    component.toggleSoil();
    expect(store.get('soil_hint_overlays_seen')).toBe('true');
    expect(component.activeHint).toBeNull();

    // Round 2: analytics hint shown after closing round result modal
    component.viewingRound = 2;
    component.showRoundResultModal = true;
    component.closeRoundResultModal();

    expect(component.activeHint).toBe('analytics');
    expect(store.get('soil_hint_analytics_count')).toBe('1');

    component.toggleHarvest();
    expect(store.get('soil_hint_analytics_seen')).toBe('true');
    expect(component.activeHint).toBeNull();
  });

  it('should auto-hide hints after timeout without marking seen and cap impressions at 2', () => {
    vi.useFakeTimers();
    try {
      const store = new Map<string, string>();
      vi.spyOn(window.localStorage, 'getItem').mockImplementation((key: string) => store.get(key) ?? null);
      vi.spyOn(window.localStorage, 'setItem').mockImplementation((key: string, value: string) => {
        store.set(key, value);
      });

      // Round 0: plant hint auto-hides after 10_000ms
      component.viewingRound = 0;
      component.isReadOnly = false;
      component.showWelcomeModal = true;
      component.closeWelcomeModal();

      expect(component.activeHint).toBe('plant');
      expect(store.get('soil_hint_plant_count')).toBe('1');

      vi.advanceTimersByTime(9_999);
      expect(component.activeHint).toBe('plant');

      vi.advanceTimersByTime(1);
      expect(component.activeHint).toBeNull();
      expect(store.get('soil_hint_plant_seen')).toBeUndefined();

      // Round 1: overlays hint auto-hides after 7_000ms
      component.viewingRound = 1;
      component.closeRoundResultModal();
      expect(component.activeHint).toBe('overlays');
      expect(store.get('soil_hint_overlays_count')).toBe('1');

      vi.advanceTimersByTime(7_000);
      expect(component.activeHint).toBeNull();
      expect(store.get('soil_hint_overlays_seen')).toBeUndefined();

      // Round 2: overlays was shown once (count=1 < 2), so overlays shows a 2nd time before analytics
      component.viewingRound = 2;
      component.closeRoundResultModal();
      expect(component.activeHint).toBe('overlays');
      expect(store.get('soil_hint_overlays_count')).toBe('2');

      vi.advanceTimersByTime(7_000);
      expect(component.activeHint).toBeNull();

      // Round 3: overlays hit 2-impression cap, so analytics is now shown
      component.viewingRound = 3;
      component.closeRoundResultModal();
      expect(component.activeHint).toBe('analytics');
      expect(store.get('soil_hint_analytics_count')).toBe('1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('should close round result modal and open finance analytics via openAnalyticsFromResult', () => {
    component.showRoundResultModal = true;
    component.showFinance = false;

    component.openAnalyticsFromResult();

    expect(component.showRoundResultModal).toBe(false);
    expect(component.showFinance).toBe(true);
  });

  it('should pass advisorEnabled=false to result and settings modals on hard difficulty', async () => {
    await fixture.whenStable();
    vi.spyOn(component, 'gameDifficulty', 'get').mockReturnValue('hard');
    component.roundResultRound = {
      number: 1,
      decision: { machines: 0, organic: false, fertilizer: false, pesticide: false, organisms: false, parcels: {} },
      result: {
        profit: 500,
        capital: 100500,
        bioSiegel: false,
        events: { weather: 'Normal', vermin: [] },
        harvestSummary: {} as any,
        expenses: { seeds: 0, labor: 0, running: 0, investments: 0, total: 0 },
        income: 500,
        machineRealLevel: 0,
      },
      parcelsSnapshot: [{ index: 0, crop: 'Wheat', soil: 50, nutrition: 20, yield: 10 }],
    };
    component.showRoundResultModal = true;
    fixture.changeDetectorRef.detectChanges();

    const advisorEl = fixture.nativeElement.querySelector('app-round-result-modal app-game-advisor');
    expect(advisorEl?.textContent?.trim()).toBe('');
  });
});

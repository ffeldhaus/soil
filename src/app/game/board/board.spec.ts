import { ChangeDetectorRef } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Functions } from '@angular/fire/functions';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../auth/auth.service';
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
        provideClientHydration(withIncrementalHydration()),
        { provide: AuthService, useValue: authSpy },
        { provide: GameService, useValue: gameSpy },
        { provide: Functions, useValue: functionsSpy },
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
    component.toggleNutrition();
    expect(component.showNutritionOverlay).toBe(true);
    component.toggleHarvest();
    expect(component.showHarvestOverlay).toBe(true);
    component.toggleSoil();
    expect(component.showSoilOverlay).toBe(true);
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
      // Very tall (AR < 0.5)
      setViewport(300, 1000);
      component.checkOrientation();
      expect(component.cols).toBe(4);
      expect(component.rows).toBe(10);

      // Portrait (0.5 <= AR < 1.0)
      setViewport(600, 1000);
      component.checkOrientation();
      expect(component.cols).toBe(5);
      expect(component.rows).toBe(8);

      // Landscape (1.0 <= AR < 2.0)
      setViewport(1200, 1000);
      component.checkOrientation();
      expect(component.cols).toBe(8);
      expect(component.rows).toBe(5);

      // Very wide (AR >= 2.0)
      setViewport(2500, 1000);
      component.checkOrientation();
      expect(component.cols).toBe(10);
      expect(component.rows).toBe(4);
    } finally {
      setViewport(originalWidth, originalHeight);
    }
  });
});

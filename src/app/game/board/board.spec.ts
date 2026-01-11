import { ChangeDetectorRef } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Functions } from '@angular/fire/functions';
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
              soil: 80,
              nutrition: 80,
              yield: 0,
            })),
        ),
      getParcelsValue: () =>
        Array(40)
          .fill(null)
          .map((_, i) => ({
            index: i,
            crop: 'Fallow',
            soil: 80,
            nutrition: 80,
            yield: 0,
          })),
      updateParcelDecision: () => {},
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
          soil: 80,
          nutrition: 80,
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
      parcelsSnapshot: Array(40).fill({ index: 0, crop: 'Corn', soil: 80, nutrition: 80 }),
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

    expect(getRoundDataSpy).toHaveBeenCalledWith('test-game', 1);
    expect(component.parcels[0].crop).toBe('Corn');
  });

  it('should use history directly when switching to historical round with snapshots', async () => {
    const mockParcels = Array(40).fill({ index: 0, crop: 'Potato', soil: 80, nutrition: 80 });
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
});

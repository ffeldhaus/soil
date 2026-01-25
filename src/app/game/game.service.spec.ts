import { TestBed } from '@angular/core/testing';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { LocalGameService } from './engine/local-game.service';
import { GameService } from './game.service';

// Mock @angular/fire/functions
vi.mock('@angular/fire/functions', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
  };
});

describe('GameService', () => {
  let service: GameService;
  let functionsInstance: any;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockLocalStorage = {};
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => mockLocalStorage[key] || null,
        setItem: (key: string, val: string) => {
          mockLocalStorage[key] = val;
        },
        removeItem: (key: string) => {
          delete mockLocalStorage[key];
        },
        clear: () => {
          mockLocalStorage = {};
        },
      },
      writable: true,
    });

    // Mock navigator badge methods
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'setAppBadge', {
        value: vi.fn().mockResolvedValue(undefined),
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, 'clearAppBadge', {
        value: vi.fn().mockResolvedValue(undefined),
        configurable: true,
        writable: true,
      });
    }

    TestBed.configureTestingModule({
      providers: [
        GameService,
        { provide: Functions, useValue: {} },
        { provide: AuthService, useValue: { isAnonymous: false } },
      ],
    });
    service = TestBed.inject(GameService);
  });

  it('should perform optimistic update when parcel decision is updated', async () => {
    service.updateParcelDecision(0, 'Wheat');
    const parcels = service.getParcelsValue();
    expect(parcels[0].crop).toBe('Wheat');
  });

  it('should create initial parcels with 40 items', () => {
    const parcels = service.getParcelsValue();
    expect(parcels).toHaveLength(40);
    expect(parcels[0].crop).toBe('Fallow');
  });

  it('should call saveDraft when updating parcel decision if gameId is provided', async () => {
    vi.useFakeTimers();
    const mockCallable = vi.fn(() => Promise.resolve({ data: {} }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    service.updateParcelDecision(0, 'Corn', 'test-game-id');

    // Fast-forward debounce time
    vi.advanceTimersByTime(2000);

    // Give microtasks a chance to run
    await Promise.resolve();

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'saveDraft');
    expect(mockCallable).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should load game data correctly', async () => {
    const mockData = {
      game: { currentRoundNumber: 1 },
      playerState: { capital: 1200 },
      lastRound: { parcelsSnapshot: service.getParcelsValue() },
    };
    const mockCallable = vi.fn(() => Promise.resolve({ data: mockData }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    const result = await service.loadGame('test-game-id');

    expect(result).toEqual(mockData);
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'getGameState');
  });

  it('should fetch round data and cache it', async () => {
    const mockRound = { number: 1, parcelsSnapshot: [{ index: 0, crop: 'Wheat' }] };
    const mockCallable = vi.fn(() => Promise.resolve({ data: mockRound }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    const result = await service.getRoundData('test-game-id', 1);

    expect(result).toEqual(mockRound);
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'getRoundData');
    expect(mockCallable).toHaveBeenCalledWith({ gameId: 'test-game-id', roundNumber: 1 });
  });

  it('should submit round correctly', async () => {
    const mockRound = { parcelsSnapshot: service.getParcelsValue() };
    const mockCallable = vi.fn(() => Promise.resolve({ data: { status: 'calculated', nextRound: mockRound } }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    // Mock loadGame which is called inside submitDecision
    vi.spyOn(service, 'loadGame').mockResolvedValue({} as any);

    const result = await service.submitDecision('test-game-id', {
      machines: 1,
      organic: true,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: {},
      priceFixing: {},
    });

    expect(result).toEqual(mockRound);
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'submitDecision');
  });

  it('should create game correctly', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: { gameId: 'new-game-id' } }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    const result = await service.createGame('New Game', {
      numRounds: 10,
      numPlayers: 5,
      numAi: 0,
      playerLabel: 'Team',
    });

    expect(result.gameId).toBe('new-game-id');
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'createGame');
  });

  it('should delete games', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: {} }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    await service.deleteGames(['game1', 'game2'], true);

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'deleteGames');
    expect(mockCallable).toHaveBeenCalledWith({ gameIds: ['game1', 'game2'], force: true });
  });

  it('should fetch admin games', async () => {
    const mockGames = { games: [{ id: '1' }], total: 1 };
    const mockCallable = vi.fn(() => Promise.resolve({ data: mockGames }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    const result = await service.getAdminGames(1, 10, false);

    expect(result).toEqual(mockGames);
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'getAdminGames');
  });

  it('should undelete games', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: {} }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    await service.undeleteGames(['game1']);

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'undeleteGames');
    expect(mockCallable).toHaveBeenCalledWith({ gameIds: ['game1'] });
  });

  it('should manage admin', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: { success: true } }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    await service.manageAdmin('user1', 'ban');

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'manageAdmin');
    expect(mockCallable).toHaveBeenCalledWith({ targetUid: 'user1', action: 'ban', value: undefined });
  });

  it('should load local game if gameId starts with local-', async () => {
    const mockLocalState = {
      game: { id: 'local-123', currentRoundNumber: 0 },
      playerState: { uid: 'p1' },
      allRounds: { p1: [] },
    };
    const localGameMock = TestBed.inject(LocalGameService);
    vi.spyOn(localGameMock, 'loadGame').mockResolvedValue(mockLocalState as any);

    const result = await service.loadGame('local-123');

    expect(result?.game.id).toBe('local-123');
    expect(localGameMock.loadGame).toHaveBeenCalledWith('local-123');
  });

  it('should submit local decision if gameId starts with local-', async () => {
    const localGameMock = TestBed.inject(LocalGameService);
    vi.spyOn(localGameMock, 'submitDecision').mockResolvedValue(undefined);
    vi.spyOn(localGameMock, 'loadGame').mockResolvedValue({
      game: { id: 'local-123' },
      playerState: {},
      lastRound: { parcelsSnapshot: [] },
    } as any);

    const decision: any = { parcels: {} };
    await service.submitDecision('local-123', decision);

    expect(localGameMock.submitDecision).toHaveBeenCalledWith('local-123', decision);
  });

  it('should update player type', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: {} }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    await service.updatePlayerType('game1', 1, 'ai', 'high');

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'updatePlayerType');
    expect(mockCallable).toHaveBeenCalledWith({ gameId: 'game1', playerNumber: 1, type: 'ai', aiLevel: 'high' });
  });

  it('should update round deadline', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: {} }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    await service.updateRoundDeadline('game1', 2, '2026-01-01');

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'updateRoundDeadline');
    expect(mockCallable).toHaveBeenCalledWith({ gameId: 'game1', roundNumber: 2, deadline: '2026-01-01' });
  });

  it('should submit feedback', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: { success: true } }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    const feedback = { category: 'interface', rating: 5, comment: 'Good' };
    await service.submitFeedback(feedback);

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'submitFeedback');
    expect(mockCallable).toHaveBeenCalledWith(feedback);
  });

  it('should get all feedback', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: [] }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    await service.getAllFeedback();

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'getAllFeedback');
  });

  it('should manage feedback', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: {} }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    await service.manageFeedback('fb1', 'resolve');

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'manageFeedback');
    expect(mockCallable).toHaveBeenCalledWith({ feedbackId: 'fb1', action: 'resolve', value: undefined });
  });

  it('should export full game state', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: {} }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    // Mock stateSubject value
    (service as any).stateSubject.next({ game: { id: 'test', players: { p1: { uid: 'p1', history: [] } } } });

    await service.exportFullGameState('test');

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'getRoundData');
  });

  it('should handle submit onboarding', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: {} }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    const onboardingData = { firstName: 'F', lastName: 'L', explanation: 'E', institution: 'I' };
    await service.submitOnboarding(onboardingData);

    expect(mockCallable).toHaveBeenCalledWith(onboardingData);
  });

  it('should handle errors in loadGame', async () => {
    const mockCallable = vi.fn(() => Promise.reject(new Error('Load failed')));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    await expect(service.loadGame('fail-id')).rejects.toThrow('Load failed');
  });

  it('should handle errors in submitDecision', async () => {
    const mockCallable = vi.fn(() => Promise.reject(new Error('Submit failed')));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    const decision: any = { parcels: {} };
    await expect(service.submitDecision('game1', decision)).rejects.toThrow('Submit failed');
  });

  it('should update badge based on game state', () => {
    const state: any = {
      game: { currentRoundNumber: 1, status: 'in_progress' },
      playerState: { submittedRound: 0 },
    };
    const setAppBadgeSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'setAppBadge', { value: setAppBadgeSpy, configurable: true });

    (service as any).stateSubject.next(state);
    expect(setAppBadgeSpy).toHaveBeenCalledWith(1);
  });

  it('should clear badge if already submitted', () => {
    const state: any = {
      game: { currentRoundNumber: 1, status: 'in_progress' },
      playerState: { submittedRound: 1 },
    };
    const clearAppBadgeSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clearAppBadge', { value: clearAppBadgeSpy, configurable: true });

    (service as any).stateSubject.next(state);
    expect(clearAppBadgeSpy).toHaveBeenCalled();
  });
});

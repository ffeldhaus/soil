import { TestBed } from '@angular/core/testing';
import { Functions } from '@angular/fire/functions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GameService } from './game.service';

// Mock @angular/fire/functions
vi.mock('@angular/fire/functions', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
  };
});

import { httpsCallable } from '@angular/fire/functions';

describe('GameService', () => {
  let service: GameService;
  let functionsInstance: any;

  beforeEach(() => {
    functionsInstance = {};

    TestBed.configureTestingModule({
      providers: [GameService, { provide: Functions, useValue: functionsInstance }],
    });
    service = TestBed.inject(GameService);
    vi.clearAllMocks();
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
    const mockCallable = vi.fn(() => Promise.resolve({ data: {} }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    service.updateParcelDecision(0, 'Corn', 'test-game-id');

    // Wait for async saveDraft
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'saveDraft');
    expect(mockCallable).toHaveBeenCalled();
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

  it('should submit round correctly', async () => {
    const mockRound = { parcelsSnapshot: service.getParcelsValue() };
    const mockCallable = vi.fn(() => Promise.resolve({ data: { status: 'calculated', nextRound: mockRound } }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    // Mock loadGame which is called inside submitRound
    vi.spyOn(service, 'loadGame').mockResolvedValue({} as any);

    const result = await service.submitRound('test-game-id', {
      machines: 1,
      organic: true,
      fertilizer: false,
      pesticide: false,
      organisms: false,
    });

    expect(result).toEqual(mockRound);
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'submitDecision');
  });

  it('should create game correctly', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: { gameId: 'new-game-id' } }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    const result = await service.createGame('New Game', { numRounds: 10 });

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

    await service.manageAdmin('user1', 'approve');

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'manageAdmin');
    expect(mockCallable).toHaveBeenCalledWith({ targetUid: 'user1', action: 'approve', value: undefined });
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

  it('should submit onboarding', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: { success: true } }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    const data = { firstName: 'John', lastName: 'Doe', explanation: 'Test', institution: 'School' };
    await service.submitOnboarding(data);

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'submitOnboarding');
    expect(mockCallable).toHaveBeenCalledWith(data);
  });
});

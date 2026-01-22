import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalGameService } from './local-game.service';

describe('LocalGameService', () => {
  let service: LocalGameService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocalGameService],
    });
    service = TestBed.inject(LocalGameService);
    localStorage.clear();
  });

  it('should create a local game', async () => {
    const config = { numPlayers: 1, numAi: 0, numRounds: 20, playerLabel: 'Farmer' };
    const response = await service.createGame('Test Local', config);
    const gameId = response.gameId;

    expect(gameId).toContain('local-');
    expect(response.password).toBeDefined();
    const state = await service.loadGame(gameId);
    expect(state).toBeDefined();
    expect(state?.game.name).toBe('Test Local');
    expect(state?.playerState.capital).toBe(1000);
  });

  it('should submit a decision and calculate next round in single player', async () => {
    const config = { numPlayers: 1, numAi: 0, numRounds: 20, playerLabel: 'Farmer' };
    const response = await service.createGame('Test Local', config);
    const gameId = response.gameId;

    const decision = {
      parcels: { 0: 'Wheat' as any },
      machines: 0,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      organic: false,
    };

    await service.submitDecision(gameId, decision);

    const state = await service.loadGame(gameId);
    expect(state?.game.currentRoundNumber).toBe(1);
    expect(state?.playerState.history.length).toBe(2); // Round 0 and Round 1
  });

  it('should list local games', async () => {
    await service.createGame('Game 1', { numPlayers: 1 });
    await service.createGame('Game 2', { numPlayers: 1 });

    const games = await service.getLocalGames();
    expect(games.length).toBe(2);
    expect(games.map((g) => g.name)).toContain('Game 1');
    expect(games.map((g) => g.name)).toContain('Game 2');
  });
});

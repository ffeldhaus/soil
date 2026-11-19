import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TelemetryService } from '../../shared/telemetry.service';
import { LocalGameService } from './local-game.service';

describe('LocalGameService', () => {
  let service: LocalGameService;
  let telemetry: TelemetryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocalGameService],
    });
    service = TestBed.inject(LocalGameService);
    telemetry = TestBed.inject(TelemetryService);
    localStorage.clear();
  });

  it('should create a local game and emit quick_game_started once', async () => {
    const trackSpy = vi.spyOn(telemetry, 'trackEvent');
    const config = { numPlayers: 1, numAi: 0, numRounds: 20, playerLabel: 'Farmer' };
    const response = await service.createGame('Test Local', config);
    const gameId = response.gameId;

    expect(gameId).toContain('local-');
    expect(response.password).toBeDefined();
    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith('quick_game_started');
    const state = await service.loadGame(gameId);
    expect(state).toBeDefined();
    expect(state?.game.name).toBe('Test Local');
    expect(state?.playerState.capital).toBe(100000);
  });

  it('should emit quick_game_deleted only once when deleting an in-progress game with >= 1 completed round', async () => {
    const trackSpy = vi.spyOn(telemetry, 'trackEvent');

    // R0 delete -> should NOT emit quick_game_deleted
    const r0 = await service.createGame('R0 Game', { numPlayers: 1, numRounds: 5 });
    trackSpy.mockClear();
    await service.deleteGame(r0.gameId);
    expect(trackSpy).not.toHaveBeenCalledWith('quick_game_deleted');

    // In-progress R1 soft delete followed by hard delete -> emits quick_game_deleted exactly once
    const r1 = await service.createGame('R1 Game', { numPlayers: 1, numRounds: 5 });
    await service.submitDecision(r1.gameId, { parcels: {} } as any);
    trackSpy.mockClear();
    await service.deleteGame(r1.gameId, false);
    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith('quick_game_deleted');

    await service.deleteGame(r1.gameId, true);
    expect(trackSpy).toHaveBeenCalledTimes(1);

    // Finished game delete -> should NOT emit quick_game_deleted
    const fin = await service.createGame('Finished Game', { numPlayers: 1, numRounds: 1 });
    await service.submitDecision(fin.gameId, { parcels: {} } as any);
    trackSpy.mockClear();
    await service.deleteGame(fin.gameId, true);
    expect(trackSpy).not.toHaveBeenCalledWith('quick_game_deleted');
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

  it('should get local games list', async () => {
    await service.createGame('Game 1', { numPlayers: 1 });
    await service.createGame('Game 2', { numPlayers: 1 });

    const games = await service.getLocalGames();
    expect(games.length).toBe(2);
    expect(games.map((g) => g.name)).toContain('Game 1');
    expect(games.map((g) => g.name)).toContain('Game 2');
  });

  it('should soft delete local game', async () => {
    const response = await service.createGame('To Delete', { numPlayers: 1 });
    await service.deleteGame(response.gameId);

    const games = await service.getLocalGames();
    const deletedGame = games.find((g) => g.id === response.gameId);
    expect(deletedGame).toBeDefined();
    expect(deletedGame?.status).toBe('deleted');
    expect(deletedGame?.deletedAt).toBeDefined();
  });

  it('should hard delete local game', async () => {
    const response = await service.createGame('To Hard Delete', { numPlayers: 1 });
    await service.deleteGame(response.gameId, true);

    const games = await service.getLocalGames();
    expect(games.find((g) => g.id === response.gameId)).toBeUndefined();
    expect(localStorage.getItem(`soil_game_${response.gameId}`)).toBeNull();
  });

  it('should undelete local game', async () => {
    const response = await service.createGame('To Undelete', { numPlayers: 1, numRounds: 10 });
    await service.deleteGame(response.gameId);
    await service.undeleteGame(response.gameId);

    const games = await service.getLocalGames();
    const restoredGame = games.find((g) => g.id === response.gameId);
    expect(restoredGame?.status).toBe('in_progress');
    expect(restoredGame?.deletedAt).toBeNull();
  });

  it('should finish the game after reaching the round limit', async () => {
    const config = { numPlayers: 1, numAi: 0, numRounds: 2, playerLabel: 'Farmer' };
    const { gameId } = await service.createGame('Quick Game', config);

    // Round 0 -> 1
    await service.submitDecision(gameId, { parcels: {} } as any);
    let state = await service.loadGame(gameId);
    expect(state?.game.currentRoundNumber).toBe(1);
    expect(state?.game.status).toBe('in_progress');

    // Round 1 -> 2
    await service.submitDecision(gameId, { parcels: {} } as any);
    state = await service.loadGame(gameId);
    expect(state?.game.currentRoundNumber).toBe(2);
    expect(state?.game.status).toBe('finished');

    // Should not allow further submissions
    await service.submitDecision(gameId, { parcels: {} } as any);
    const stateAfterExtra = await service.loadGame(gameId);
    expect(stateAfterExtra?.game.currentRoundNumber).toBe(2);
  });

  it('should save draft for local game', async () => {
    const response = await service.createGame('Draft Test', { numPlayers: 1 });
    const gameId = response.gameId;

    const draftDecision = {
      parcels: { 0: 'Corn' as any },
      machines: 1,
      fertilizer: true,
      pesticide: false,
      organisms: false,
      organic: false,
    };

    await service.saveDraft(gameId, draftDecision);

    const state = await service.loadGame(gameId);
    expect(state?.game.players[state.playerState.uid].pendingDecisions).toEqual(draftDecision);
    expect(state?.playerState.pendingDecisions).toEqual(draftDecision);
  });
});

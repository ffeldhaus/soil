import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, take } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { GAME_CONSTANTS } from '../../game-constants';
import type { Game, PlayerState, Round, RoundDecision } from '../../types';
import { AiAgent } from './ai-agent';
import { GameEngine } from './game-engine';

export interface LocalGameState {
  game: Game;
  playerState: PlayerState;
  lastRound?: Round;
  allRounds: Record<string, Round[]>; // playerUid -> Round[]
}

export interface LocalCreateResponse {
  gameId: string;
  password?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LocalGameService {
  private stateSubject = new BehaviorSubject<LocalGameState | null>(null);
  private auth = inject(AuthService);
  state$ = this.stateSubject.asObservable();

  async createGame(name: string, config: any): Promise<LocalCreateResponse> {
    const gameId = `local-${Math.random().toString(36).substring(2, 11)}`;
    const numPlayers = parseInt(config.numPlayers, 10) || 1;
    const numAi = parseInt(config.numAi, 10) || 0;
    const numRounds = parseInt(config.numRounds, 10) || GAME_CONSTANTS.DEFAULT_ROUNDS;

    // Get current user UID for hosting
    let currentUserUid = 'local-host';
    this.auth.user$.pipe(take(1)).subscribe((u) => {
      if (u) currentUserUid = u.uid;
    });

    const players: Record<string, PlayerState> = {};
    const allRounds: Record<string, Round[]> = {};
    const playerSecrets: Record<string, { password: string }> = {};

    for (let i = 1; i <= numPlayers; i++) {
      const pUid = `player-${gameId}-${i}`;
      const isAi = i > numPlayers - numAi;
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      playerSecrets[String(i)] = { password: pin };

      const initialParcels = GameEngine.createInitialParcels();
      const startSoil = Math.round(initialParcels.reduce((sum, p) => sum + p.soil, 0) / initialParcels.length);
      const startNutrition = Math.round(
        initialParcels.reduce((sum, p) => sum + p.nutrition, 0) / initialParcels.length,
      );

      const round0: Round = {
        number: 0,
        parcelsSnapshot: initialParcels,
        avgSoil: startSoil,
        avgNutrition: startNutrition,
        decision: { parcels: {} } as any,
        result: {
          profit: 0,
          capital: 1000,
          harvestSummary: {} as any,
          expenses: { seeds: 0, labor: 0, running: 0, investments: 0, total: 0 },
          income: 0,
          subsidies: 0,
          marketPrices: {},
          events: { weather: 'Normal', vermin: [] },
          bioSiegel: false,
          machineRealLevel: 0,
        },
      };

      players[pUid] = {
        uid: pUid,
        displayName: `${config.playerLabel || 'Team'} ${i}`,
        isAi: isAi,
        aiLevel: isAi ? config.aiLevel || 'middle' : undefined,
        playerNumber: i,
        capital: 1000,
        currentRound: 0,
        history: [{ ...round0, parcelsSnapshot: [] }], // Lightweight history
        avgSoil: startSoil,
        avgNutrition: startNutrition,
      };

      allRounds[pUid] = [round0];
    }

    const game: Game = {
      id: gameId,
      name: name,
      hostUid: currentUserUid,
      status: 'in_progress',
      currentRoundNumber: 0,
      settings: {
        length: numRounds,
        difficulty: 'normal',
        playerLabel: config.playerLabel || 'Team',
      },
      config: config,
      players: players,
      playerSecrets: playerSecrets,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const state: LocalGameState = {
      game,
      playerState: players[`player-${gameId}-1`],
      lastRound: allRounds[`player-${gameId}-1`][0],
      allRounds,
    };

    this.saveToStorage(state);
    this.stateSubject.next(state);
    return { gameId, password: playerSecrets['1'].password };
  }

  async loadGame(gameId: string): Promise<LocalGameState | null> {
    const data = localStorage.getItem(`soil_game_${gameId}`);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  }

  async saveDraft(gameId: string, decision: RoundDecision): Promise<void> {
    const state = this.stateSubject.value;
    if (!state || state.game.id !== gameId || state.game.status === 'finished') return;

    const playerUid = state.playerState.uid;
    state.game.players[playerUid].pendingDecisions = decision;
    state.playerState = state.game.players[playerUid];

    this.saveToStorage(state);
    this.stateSubject.next({ ...state });
  }

  async submitDecision(gameId: string, decision: RoundDecision): Promise<void> {
    const state = this.stateSubject.value;
    if (!state || state.game.id !== gameId || state.game.status === 'finished') return;

    const currentRound = state.game.currentRoundNumber;
    const playerUid = state.playerState.uid;

    // 1. Store player decision
    state.game.players[playerUid].pendingDecisions = decision;
    state.game.players[playerUid].submittedRound = currentRound;
    state.playerState = state.game.players[playerUid];

    // 2. Process AI Decisions
    for (const uid in state.game.players) {
      const p = state.game.players[uid];
      if (p.isAi && (p.submittedRound === undefined || p.submittedRound < currentRound)) {
        // Use player's own history for decision context
        const lastRound =
          state.allRounds[uid] && state.allRounds[uid].length > 0
            ? state.allRounds[uid][state.allRounds[uid].length - 1]
            : undefined;
        const aiLevel = p.aiLevel || 'middle';
        const decision = AiAgent.makeDecision(aiLevel as any, lastRound, uid);
        p.pendingDecisions = decision;
        p.submittedRound = currentRound;
      }
    }

    // 3. Check if all human players submitted (in local mode usually only 1)
    const allSubmitted = Object.values(state.game.players).every((p) => p.submittedRound === currentRound);

    if (allSubmitted) {
      this.calculateNextRound(state);
    }

    this.saveToStorage(state);
    this.stateSubject.next({ ...state });
  }

  private calculateNextRound(state: LocalGameState) {
    const nextRoundNum = state.game.currentRoundNumber + 1;

    // Weather Generation
    const weatherRoll = Math.random();
    const weather =
      weatherRoll > 0.9
        ? 'SummerDrought'
        : weatherRoll > 0.8
          ? 'Drought'
          : weatherRoll > 0.7
            ? 'LateFrost'
            : weatherRoll < 0.1
              ? 'Flood'
              : weatherRoll < 0.2
                ? 'Storm'
                : 'Normal';

    // Pest Generation
    const vermin: string[] = [];
    const pestRoll = Math.random();
    if (pestRoll > 0.8) {
      const availablePests = [
        'aphid-black',
        'aphid-cereal',
        'potato-beetle',
        'corn-borer',
        'pollen-beetle',
        'pea-moth',
        'oat-rust',
        'nematode',
        'swine-fever',
      ];
      const numPests = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < numPests; i++) {
        const p = availablePests[Math.floor(Math.random() * availablePests.length)];
        if (!vermin.includes(p)) vermin.push(p);
      }
    }

    const events = { weather, vermin };

    for (const uid in state.game.players) {
      const p = state.game.players[uid];
      const prevRound = state.allRounds[uid][state.game.currentRoundNumber];

      const newRound = GameEngine.calculateRound(
        nextRoundNum,
        prevRound,
        p.pendingDecisions!,
        events,
        p.capital,
        state.game.settings?.length,
      );

      state.allRounds[uid].push(newRound);

      // Update player state
      p.capital = newRound.result!.capital;
      p.currentRound = nextRoundNum;
      p.avgSoil = newRound.avgSoil || 0;
      p.avgNutrition = newRound.avgNutrition || 0;
      p.history.push({ ...newRound, parcelsSnapshot: [] });
      p.pendingDecisions = undefined;
    }

    state.game.currentRoundNumber = nextRoundNum;
    const roundLimit = state.game.settings?.length || GAME_CONSTANTS.DEFAULT_ROUNDS;
    if (nextRoundNum >= roundLimit) {
      state.game.status = 'finished';
    }
    state.game.updatedAt = new Date();
    state.playerState = state.game.players[state.playerState.uid];
    state.lastRound = state.allRounds[state.playerState.uid][nextRoundNum];
  }

  private saveToStorage(state: LocalGameState) {
    localStorage.setItem(`soil_game_${state.game.id}`, JSON.stringify(state));
    // Also update games list
    const listData = localStorage.getItem('soil_local_games') || '[]';
    const list = JSON.parse(listData);
    if (!list.includes(state.game.id)) {
      list.push(state.game.id);
      localStorage.setItem('soil_local_games', JSON.stringify(list));
    }
  }

  async getLocalGames(): Promise<Game[]> {
    const listData = localStorage.getItem('soil_local_games') || '[]';
    const ids = JSON.parse(listData);
    const games: Game[] = [];
    for (const id of ids) {
      const data = localStorage.getItem(`soil_game_${id}`);
      if (data) {
        games.push(JSON.parse(data).game);
      }
    }
    return games;
  }

  async deleteGame(gameId: string, force = false): Promise<void> {
    if (force) {
      localStorage.removeItem(`soil_game_${gameId}`);
      const listData = localStorage.getItem('soil_local_games') || '[]';
      const list = JSON.parse(listData).filter((id: string) => id !== gameId);
      localStorage.setItem('soil_local_games', JSON.stringify(list));
    } else {
      const data = localStorage.getItem(`soil_game_${gameId}`);
      if (data) {
        const state: LocalGameState = JSON.parse(data);
        state.game.status = 'deleted';
        state.game.deletedAt = new Date();
        this.saveToStorage(state);
      }
    }
  }

  async undeleteGame(gameId: string): Promise<void> {
    const data = localStorage.getItem(`soil_game_${gameId}`);
    if (data) {
      const state: LocalGameState = JSON.parse(data);
      state.game.status = 'finished'; // Or in_progress, but finished is safer if we don't know
      // Check if it was in_progress or finished
      // Actually, let's look at rounds to decide
      const isFinished =
        state.game.currentRoundNumber >= (state.game.config?.numRounds || GAME_CONSTANTS.DEFAULT_ROUNDS);
      state.game.status = isFinished ? 'finished' : 'in_progress';
      state.game.deletedAt = null;
      this.saveToStorage(state);
    }
  }
}

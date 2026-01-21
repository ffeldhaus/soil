import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GameEngine } from './game-engine';
import { AiAgent } from './ai-agent';
import { GAME_CONSTANTS } from '../../game-constants';
import type { Game, PlayerState, Round, Parcel, RoundDecision } from '../../types';

export interface LocalGameState {
  game: Game;
  playerState: PlayerState;
  lastRound?: Round;
  allRounds: Record<string, Round[]>; // playerUid -> Round[]
}

@Injectable({
  providedIn: 'root',
})
export class LocalGameService {
  private stateSubject = new BehaviorSubject<LocalGameState | null>(null);
  state$ = this.stateSubject.asObservable();

  async createGame(name: string, config: any): Promise<string> {
    const gameId = `local-${Math.random().toString(36).substring(2, 11)}`;
    const numPlayers = config.numPlayers || 1;
    const numAi = config.numAi || 0;
    
    const players: Record<string, PlayerState> = {};
    const allRounds: Record<string, Round[]> = {};

    for (let i = 1; i <= numPlayers; i++) {
      const pUid = `player-${gameId}-${i}`;
      const isAi = i > (numPlayers - numAi);
      
      const initialParcels = GameEngine.createInitialParcels();
      const startSoil = Math.round(initialParcels.reduce((sum, p) => sum + p.soil, 0) / initialParcels.length);
      const startNutrition = Math.round(initialParcels.reduce((sum, p) => sum + p.nutrition, 0) / initialParcels.length);

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
            machineRealLevel: 0
        }
      };

      players[pUid] = {
        uid: pUid,
        displayName: `${config.playerLabel || 'Team'} ${i}`,
        isAi: isAi,
        capital: 1000,
        currentRound: 0,
        history: [{ ...round0, parcelsSnapshot: [] }], // Lightweight history
        avgSoil: startSoil,
        avgNutrition: startNutrition
      };

      allRounds[pUid] = [round0];
    }

    const game: Game = {
      id: gameId,
      name: name,
      hostUid: 'local-host',
      status: 'in_progress',
      currentRoundNumber: 0,
      settings: {
        length: config.numRounds || 20,
        difficulty: 'normal',
        playerLabel: config.playerLabel || 'Team',
      },
      config: config,
      players: players,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const state: LocalGameState = {
      game,
      playerState: players[`player-${gameId}-1`],
      lastRound: allRounds[`player-${gameId}-1`][0],
      allRounds
    };

    this.saveToStorage(state);
    this.stateSubject.next(state);
    return gameId;
  }

  async loadGame(gameId: string): Promise<LocalGameState | null> {
    const data = localStorage.getItem(`soil_game_${gameId}`);
    if (data) {
      const state = JSON.parse(data);
      this.stateSubject.next(state);
      return state;
    }
    return null;
  }

  async submitDecision(gameId: string, decision: RoundDecision): Promise<void> {
    const state = this.stateSubject.value;
    if (!state || state.game.id !== gameId) return;

    const currentRound = state.game.currentRoundNumber;
    const playerUid = state.playerState.uid;

    // 1. Store player decision
    state.game.players[playerUid].pendingDecisions = decision;
    state.game.players[playerUid].submittedRound = currentRound;

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
        const decision = AiAgent.makeDecision(aiLevel as any, lastRound);
        p.pendingDecisions = decision;
        p.submittedRound = currentRound;
      }
    }

    // 3. Check if all human players submitted (in local mode usually only 1)
    const allSubmitted = Object.values(state.game.players).every(p => p.submittedRound === currentRound);

    if (allSubmitted) {
        this.calculateNextRound(state);
    }

    this.saveToStorage(state);
    this.stateSubject.next({ ...state });
  }

  private calculateNextRound(state: LocalGameState) {
    const nextRoundNum = state.game.currentRoundNumber + 1;
    const weatherConditions = ['Normal', 'Drought', 'Flood', 'Cold', 'Optimal'];
    const weather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const events = { weather, vermin: [] };

    for (const uid in state.game.players) {
        const p = state.game.players[uid];
        const prevRound = state.allRounds[uid][state.game.currentRoundNumber];
        
        const newRound = GameEngine.calculateRound(
            nextRoundNum,
            prevRound,
            p.pendingDecisions!,
            events,
            p.capital,
            state.game.settings?.length
        );

        state.allRounds[uid].push(newRound);

        // Update player state
        p.capital = newRound.result!.capital;
        p.currentRound = nextRoundNum;
        p.avgSoil = newRound.avgSoil || 0;
        p.avgNutrition = newRound.avgNutrition || 0;
        p.history.push({ ...newRound, parcelsSnapshot: [] });
        delete p.pendingDecisions;
      }

      state.game.currentRoundNumber = nextRoundNum;
      state.game.updatedAt = new Date();
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
}

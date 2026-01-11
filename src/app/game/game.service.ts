import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { BehaviorSubject, debounceTime, type Observable, Subject } from 'rxjs';

import type {
  CropType,
  Feedback,
  Game,
  Parcel,
  PlayerState,
  Round,
  RoundDecision,
  SystemStats,
  UserStatus,
} from '../types';

export interface GameState {
  game: Game;
  playerState: PlayerState;
  lastRound?: Round;
}

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private functions = inject(Functions);

  private parcelsSubject = new BehaviorSubject<Parcel[]>(this.createInitialParcels());
  parcels$ = this.parcelsSubject.asObservable();

  private stateSubject = new BehaviorSubject<GameState | null>(null);
  state$ = this.stateSubject.asObservable();
  private pendingDecisions: Record<number, CropType> = {};
  private draftSaveSubject = new Subject<string>();
  currentRound: Round | null = null;
  private parcelCache: Record<number, Parcel[]> = {};

  constructor() {
    // Initialize debounced draft saving
    this.draftSaveSubject.pipe(debounceTime(2000)).subscribe((gameId) => {
      this.saveDraft(gameId);
    });
  }

  getParcelsValue() {
    return this.parcelsSubject.value;
  }

  async getRoundData(gameId: string, roundNumber: number): Promise<Round> {
    const getRoundDataFn = httpsCallable<{ gameId: string; roundNumber: number }, Round>(
      this.functions,
      'getRoundData',
    );
    const result = await getRoundDataFn({ gameId, roundNumber });
    const round = result.data;
    if (round.parcelsSnapshot) {
      this.parcelCache[roundNumber] = round.parcelsSnapshot;
    }
    return round;
  }

  async loadGame(gameId: string): Promise<GameState | null> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      const mockState = this.getMockGameState();
      this.currentRound = mockState.lastRound || null;
      this.parcelsSubject.next(mockState.lastRound?.parcelsSnapshot || this.createInitialParcels());
      this.stateSubject.next(mockState);
      return mockState;
    }

    const getGameStateFn = httpsCallable<{ gameId: string }, GameState>(this.functions, 'getGameState');
    try {
      const result = await getGameStateFn({ gameId });
      const data = result.data;

      if (data.lastRound) {
        this.currentRound = data.lastRound;
        // Initialize parcels from last round
        let parcels = data.lastRound.parcelsSnapshot || this.createInitialParcels();

        // Apply Pending Decisions (Drafts) if current round not submitted
        const currentRoundNum = data.game.currentRoundNumber;
        const isSubmitted = data.playerState?.submittedRound === currentRoundNum;

        if (!isSubmitted && data.playerState?.pendingDecisions?.parcels) {
          const drafts = data.playerState.pendingDecisions.parcels;
          this.pendingDecisions = drafts;

          parcels = parcels.map((p: Parcel) => ({
            ...p,
            crop: drafts[p.index] || p.crop,
          }));
        }

        this.parcelsSubject.next(parcels);
      }
      this.stateSubject.next(data);
      return data;
    } catch (error: unknown) {
      if (window.console) console.error('Failed to load game:', error);
      throw error;
    }
  }

  updateParcelDecision(index: number, crop: CropType, gameId?: string) {
    this.pendingDecisions[index] = crop;

    // Optimistic Update
    const currentParcels = this.parcelsSubject.value;
    const updatedParcels = [...currentParcels];
    if (updatedParcels[index]) {
      updatedParcels[index] = { ...updatedParcels[index], crop };
    }
    this.parcelsSubject.next(updatedParcels);

    // Auto-Save with debounce
    if (gameId) {
      this.draftSaveSubject.next(gameId);
    }
  }

  async saveDraft(gameId: string) {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      if (window.console) console.warn('Mock: Draft saved locally');
      return;
    }

    const saveDraftFn = httpsCallable<{ gameId: string; decision: RoundDecision }, { success: boolean }>(
      this.functions,
      'saveDraft',
    );

    // Construct full decision for draft to ensure no undefined values
    const fullParcels: Record<number, CropType> = {};
    const currentParcels = this.parcelsSubject.value;
    for (let i = 0; i < 40; i++) {
      fullParcels[i] = this.pendingDecisions[i] || currentParcels[i].crop || 'Fallow';
    }

    const decision: RoundDecision = {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: fullParcels,
      priceFixing: {},
    };

    try {
      await saveDraftFn({ gameId, decision });
      if (window.console) console.warn('Draft saved');
    } catch (error: unknown) {
      if (window.console) console.error('Failed to save draft:', error);
    }
  }

  async submitRound(
    gameId: string,
    settings?: {
      machines: number;
      organic: boolean;
      fertilizer: boolean;
      pesticide: boolean;
      organisms: boolean;
      priceFixing?: Record<string, boolean>;
    },
  ): Promise<Round | { status: string }> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      const currentParcels = this.parcelsSubject.value;
      const nextRoundNum = (this.currentRound?.number || 0) + 1;
      const mockRound: Round = {
        number: nextRoundNum,
        decision: {
          machines: settings?.machines ?? 0,
          organic: settings?.organic ?? false,
          fertilizer: settings?.fertilizer ?? false,
          pesticide: settings?.pesticide ?? false,
          organisms: settings?.organisms ?? false,
          parcels: { ...this.pendingDecisions },
        },
        parcelsSnapshot: currentParcels.map((p) => ({ ...p, yield: Math.random() * 100 })),
        result: {
          profit: 500,
          capital: 5500,
          income: 1000,
          expenses: { seeds: 100, labor: 200, running: 100, investments: 100, total: 500 },
          harvestSummary: {} as any,
          events: { weather: 'Normal', vermin: 'None' },
        },
      };
      this.currentRound = mockRound;
      this.parcelsSubject.next(mockRound.parcelsSnapshot);
      const state = this.stateSubject.value;
      if (state) {
        state.game.currentRoundNumber = nextRoundNum;
        state.lastRound = mockRound;
        state.playerState.history.push(mockRound);
        this.stateSubject.next({ ...state });
      }
      return mockRound;
    }

    const submitDecisionFn = httpsCallable<
      { gameId: string; decision: RoundDecision },
      { status: string; nextRound?: Round }
    >(this.functions, 'submitDecision');

    const decision: RoundDecision = {
      machines: settings?.machines ?? 0,
      organic: settings?.organic ?? false,
      fertilizer: settings?.fertilizer ?? false,
      pesticide: settings?.pesticide ?? false,
      organisms: settings?.organisms ?? false,
      priceFixing: settings?.priceFixing ?? {},
      parcels: {},
    };

    const currentParcels = this.parcelsSubject.value;
    for (let i = 0; i < 40; i++) {
      decision.parcels[i] = this.pendingDecisions[i] || currentParcels[i].crop || 'Fallow';
    }

    try {
      const result = await submitDecisionFn({
        gameId,
        decision,
      });
      const data = result.data;

      if (data.status === 'calculated' && data.nextRound) {
        const round = data.nextRound;
        this.currentRound = round;
        // Refresh full game state to ensure status='finished' is picked up
        await this.loadGame(gameId);
        this.pendingDecisions = {};
        this.parcelsSubject.next(round.parcelsSnapshot);
        return round;
      } else {
        // Just submitted, wait for others.
        return { status: 'submitted' };
      }
    } catch (error: unknown) {
      if (window.console) console.error('Failed to submit round:', error);
      throw error;
    }
  }

  /**
   * Returns an observable of the current parcels.
   */
  getParcels(): Observable<Parcel[]> {
    return this.parcels$;
  }

  async createGame(
    name: string,
    config: {
      numPlayers: number;
      numRounds: number;
      numAi: number;
      playerLabel: string;
      subsidiesEnabled?: boolean;
      advancedPricingEnabled?: boolean;
    },
  ): Promise<{ gameId: string; password?: string }> {
    const createGameFn = httpsCallable<
      {
        name: string;
        config: {
          numPlayers: number;
          numRounds: number;
          numAi: number;
          playerLabel: string;
          subsidiesEnabled?: boolean;
          advancedPricingEnabled?: boolean;
        };
        settings: { length: number; difficulty: string; playerLabel: string };
      },
      { gameId: string; password?: string }
    >(this.functions, 'createGame');
    try {
      const settings = {
        length: config.numRounds || 20,
        difficulty: 'normal',
        playerLabel: config.playerLabel || 'Player',
      };
      const result = await createGameFn({ name, config, settings });
      return result.data;
    } catch (error: unknown) {
      if (window.console) console.error('Failed to create game:', error);
      throw error;
    }
  }

  async getAdminGames(
    page: number,
    pageSize: number,
    showTrash = false,
    adminUid?: string,
  ): Promise<{ games: Game[]; total: number }> {
    const getAdminGamesFn = httpsCallable<
      { page: number; pageSize: number; showTrash: boolean; adminUid?: string },
      { games: Game[]; total: number }
    >(this.functions, 'getAdminGames');
    try {
      const result = await getAdminGamesFn({ page, pageSize, showTrash, adminUid });
      return result.data;
    } catch (error: unknown) {
      if (window.console) console.error('Failed to fetch games:', error);
      throw error;
    }
  }

  async getPendingUsers(): Promise<UserStatus[]> {
    const fn = httpsCallable<void, UserStatus[]>(this.functions, 'getPendingUsers');
    return (await fn()).data;
  }

  async getUserStatus(): Promise<UserStatus | null> {
    const fn = httpsCallable<void, UserStatus | null>(this.functions, 'getUserStatus');
    return (await fn()).data;
  }

  async getAllAdmins(): Promise<(UserStatus & { gameCount: number; quota: number })[]> {
    const fn = httpsCallable<void, (UserStatus & { gameCount: number; quota: number })[]>(
      this.functions,
      'getAllAdmins',
    );
    return (await fn()).data;
  }

  async getSystemStats(): Promise<SystemStats> {
    const fn = httpsCallable<void, SystemStats>(this.functions, 'getSystemStats');
    return (await fn()).data;
  }

  async submitOnboarding(data: {
    firstName: string;
    lastName: string;
    explanation: string;
    institution: string;
    institutionLink?: string;
    lang?: string;
  }): Promise<void> {
    const fn = httpsCallable<
      {
        firstName: string;
        lastName: string;
        explanation: string;
        institution: string;
        institutionLink?: string;
        lang?: string;
      },
      void
    >(this.functions, 'submitOnboarding');
    await fn(data);
  }

  async manageAdmin(
    targetUid: string,
    action: 'approve' | 'reject' | 'setQuota' | 'ban' | 'delete',
    value?: { rejectionReasons?: string[]; customMessage?: string; banEmail?: boolean } | number,
    lang?: string,
    origin?: string,
  ): Promise<void> {
    const fn = httpsCallable<
      {
        targetUid: string;
        action: 'approve' | 'reject' | 'setQuota' | 'ban' | 'delete';
        value?: { rejectionReasons?: string[]; customMessage?: string; banEmail?: boolean } | number;
        lang?: string;
        origin?: string;
      },
      void
    >(this.functions, 'manageAdmin');
    await fn({ targetUid, action, value, lang, origin });
  }

  async sendPlayerInvite(
    gameId: string,
    playerNumber: number,
    email: string,
    origin: string,
    lang?: string,
  ): Promise<void> {
    const fn = httpsCallable<
      { gameId: string; playerNumber: number; email: string; origin: string; lang?: string },
      void
    >(this.functions, 'sendPlayerInvite');
    try {
      await fn({ gameId, playerNumber, email, origin, lang });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to send player invite', error);
      throw error;
    }
  }

  async sendGameInvite(gameId: string, email: string, lang?: string): Promise<void> {
    const fn = httpsCallable<{ gameId: string; email: string; lang?: string }, void>(this.functions, 'sendGameInvite');
    try {
      await fn({ gameId, email, lang });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to send game invite', error);
      throw error;
    }
  }

  async deleteGames(gameIds: string[], force = false): Promise<void> {
    const deleteGamesFn = httpsCallable<{ gameIds: string[]; force: boolean }, void>(this.functions, 'deleteGames');
    try {
      await deleteGamesFn({ gameIds, force });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to delete games:', error);
      throw error;
    }
  }

  async undeleteGames(gameIds: string[]): Promise<void> {
    const undeleteGamesFn = httpsCallable<{ gameIds: string[] }, void>(this.functions, 'undeleteGames');
    try {
      await undeleteGamesFn({ gameIds });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to undelete games:', error);
      throw error;
    }
  }

  async updatePlayerType(gameId: string, playerNumber: number, type: 'human' | 'ai', aiLevel?: string): Promise<void> {
    const updatePlayerTypeFn = httpsCallable<
      { gameId: string; playerNumber: number; type: 'human' | 'ai'; aiLevel?: string },
      void
    >(this.functions, 'updatePlayerType');
    try {
      await updatePlayerTypeFn({ gameId, playerNumber, type, aiLevel });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to update player type', error);
      throw error;
    }
  }

  async updateRoundDeadline(gameId: string, roundNumber: number, deadline: string): Promise<void> {
    const fn = httpsCallable<{ gameId: string; roundNumber: number; deadline: string }, void>(
      this.functions,
      'updateRoundDeadline',
    );
    try {
      await fn({ gameId, roundNumber, deadline });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to update deadline', error);
      throw error;
    }
  }

  async submitFeedback(feedback: { category: string; rating: number; comment: string }): Promise<void> {
    const fn = httpsCallable<{ category: string; rating: number; comment: string }, void>(
      this.functions,
      'submitFeedback',
    );
    try {
      await fn(feedback);
    } catch (error: unknown) {
      if (window.console) console.error('Failed to submit feedback', error);
      throw error;
    }
  }

  async getAllFeedback(): Promise<Feedback[]> {
    const fn = httpsCallable<void, Feedback[]>(this.functions, 'getAllFeedback');
    try {
      return (await fn()).data;
    } catch (error: unknown) {
      if (window.console) console.error('Failed to fetch all feedback', error);
      throw error;
    }
  }

  async manageFeedback(
    feedbackId: string,
    action: 'reply' | 'resolve' | 'reject',
    value?: { response?: string; externalReference?: string },
  ): Promise<void> {
    const fn = httpsCallable<
      { feedbackId: string; action: string; value?: { response?: string; externalReference?: string } },
      void
    >(this.functions, 'manageFeedback');
    try {
      await fn({ feedbackId, action, value });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to manage feedback:', error);
      throw error;
    }
  }

  private createInitialParcels(): Parcel[] {
    return Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: 80,
        nutrition: 80,
        yield: 0,
      }));
  }

  private getMockGameState(): GameState {
    const parcels = this.createInitialParcels();
    return {
      game: {
        id: 'test-game-id',
        name: 'Mock Test Game',
        hostUid: 'mock-admin',
        status: 'in_progress',
        currentRoundNumber: 1,
        config: { numPlayers: 1, numRounds: 20, numAi: 0 },
        settings: { length: 20, difficulty: 'normal', playerLabel: 'Player' },
        players: {},
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
      },
      playerState: {
        uid: 'player-test-game-id-1',
        displayName: 'Test User',
        isAi: false,
        capital: 5000,
        currentRound: 1,
        history: [
          {
            number: 0,
            decision: {
              machines: 0,
              organic: false,
              fertilizer: false,
              pesticide: false,
              organisms: false,
              parcels: {},
            },
            parcelsSnapshot: parcels,
          },
        ],
        playerNumber: 1,
      },
      lastRound: {
        number: 0,
        decision: {
          machines: 0,
          organic: false,
          fertilizer: false,
          pesticide: false,
          organisms: false,
          parcels: {},
        },
        parcelsSnapshot: parcels,
      },
    };
  }
}

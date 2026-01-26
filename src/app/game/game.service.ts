import { computed, Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { BehaviorSubject, debounceTime, type Observable, Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { GAME_CONSTANTS } from '../game-constants';
import { OfflineService } from '../shared/offline.service';
import type {
  CropType,
  Feedback,
  Game,
  GameEvaluation,
  Parcel,
  PlayerState,
  Round,
  RoundDecision,
  SystemStats,
  UserStatus,
} from '../types';
import { LocalGameService } from './engine/local-game.service';

export interface GameState {
  game: Game;
  playerState: PlayerState;
  lastRound?: Round;
}

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private functions = inject(Functions, { optional: true });
  private localGame = inject(LocalGameService);
  private authService = inject(AuthService);
  private offlineService = inject(OfflineService);

  // Lazy getters for Firebase Functions to avoid SSR issues with mock objects
  private get getRoundDataFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ gameId: string; roundNumber: number; targetUid?: string }, Round>(
      this.functions,
      'getRoundData',
    );
  }
  private get getGameStateFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ gameId: string }, GameState>(this.functions, 'getGameState');
  }
  private get saveDraftFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ gameId: string; decision: RoundDecision }, { success: boolean }>(
      this.functions,
      'saveDraft',
    );
  }
  private get submitDecisionFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ gameId: string; decision: RoundDecision }, { status: string; nextRound?: Round }>(
      this.functions,
      'submitDecision',
    );
  }
  private get createGameFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ name: string; config: any; settings: any }, { gameId: string; password?: string }>(
      this.functions,
      'createGame',
    );
  }
  private get getAdminGamesFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<
      { page: number; pageSize: number; showDeleted: boolean; adminUid?: string },
      { games: Game[]; total: number }
    >(this.functions, 'getAdminGames');
  }
  private get getUserStatusFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<void, UserStatus | null>(this.functions, 'getUserStatus');
  }
  private get getAllAdminsFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<void, (UserStatus & { gameCount: number; quota: number })[]>(this.functions, 'getAllAdmins');
  }
  private get getSystemStatsFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<void, SystemStats>(this.functions, 'getSystemStats');
  }
  private get submitOnboardingFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<
      { firstName: string; lastName: string; explanation: string; institution: string; institutionLink?: string },
      void
    >(this.functions, 'submitOnboarding');
  }
  private get manageAdminFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<
      {
        targetUid: string;
        action: 'setQuota' | 'ban' | 'delete';
        value?: { rejectionReasons?: string[]; customMessage?: string; banEmail?: boolean } | number;
        origin?: string;
      },
      void
    >(this.functions, 'manageAdmin');
  }
  private get sendPlayerInviteFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ gameId: string; playerNumber: number; email: string; origin: string }, void>(
      this.functions,
      'sendPlayerInvite',
    );
  }
  private get uploadFinishedGameFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ gameData: any }, { success: boolean }>(this.functions, 'uploadFinishedGame');
  }
  private get evaluateGameFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ gameId: string; targetUid: string }, GameEvaluation>(this.functions, 'evaluateGame');
  }
  private get sendGameInviteFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ gameId: string; email: string }, void>(this.functions, 'sendGameInvite');
  }
  private get deleteGamesFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ gameIds: string[]; force: boolean }, void>(this.functions, 'deleteGames');
  }
  private get undeleteGamesFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ gameIds: string[] }, void>(this.functions, 'undeleteGames');
  }
  private get updatePlayerTypeFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ gameId: string; playerNumber: number; type: 'human' | 'ai'; aiLevel?: string }, void>(
      this.functions,
      'updatePlayerType',
    );
  }
  private get updateRoundDeadlineFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ gameId: string; roundNumber: number; deadline: string }, void>(
      this.functions,
      'updateRoundDeadline',
    );
  }
  private get submitFeedbackFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ category: string; rating: number; comment: string }, void>(this.functions, 'submitFeedback');
  }
  private get getAllFeedbackFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<void, Feedback[]>(this.functions, 'getAllFeedback');
  }
  private get manageFeedbackFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<
      { feedbackId: string; action: string; value?: { response?: string; externalReference?: string } },
      void
    >(this.functions, 'manageFeedback');
  }

  private parcelsSubject = new BehaviorSubject<Parcel[]>(this.createInitialParcels());
  parcels$ = this.parcelsSubject.asObservable();

  private stateSubject = new BehaviorSubject<GameState | null>(null);
  state$ = this.stateSubject.asObservable();
  private stateSignal = toSignal(this.state$);

  isCloudGame = computed(() => {
    const state = this.stateSignal();
    if (!state || !state.game) return false;
    // Local games start with 'local-'
    if (state.game.id.startsWith('local-')) return false;

    // Check for more than 1 human player
    const numPlayers = state.game.config.numPlayers || 0;
    const numAi = state.game.config.numAi || 0;
    return numPlayers - numAi > 1;
  });

  private pendingDecisions: Record<number, CropType> = {};
  private draftSaveSubject = new Subject<string>();
  currentRound: Round | null = null;
  private parcelCache: Record<number, Parcel[]> = {};

  constructor() {
    // Initialize debounced draft saving
    this.draftSaveSubject.pipe(debounceTime(2000)).subscribe((gameId) => {
      this.saveDraft(gameId);
    });

    // Handle PWA Badging
    this.state$.subscribe((state) => {
      this.updateBadge(state);
    });
  }

  private updateBadge(state: GameState | null) {
    if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;

    if (!state) {
      (navigator as any).clearAppBadge();
      return;
    }

    const currentRoundNum = state.game.currentRoundNumber;
    const isSubmitted = state.playerState?.submittedRound === currentRoundNum;
    const isFinished = state.game.status === 'finished';

    if (!isSubmitted && !isFinished && currentRoundNum > 0) {
      // Show badge if action is needed (new round ready)
      (navigator as any).setAppBadge(1).catch((err: any) => {
        console.error('Failed to set app badge:', err);
      });
    } else {
      (navigator as any).clearAppBadge().catch((err: any) => {
        console.error('Failed to clear app badge:', err);
      });
    }
  }

  getParcelsValue() {
    return this.parcelsSubject.value;
  }

  async getRoundData(gameId: string, roundNumber: number): Promise<Round> {
    if (gameId.startsWith('local-')) {
      const state = await this.localGame.loadGame(gameId);
      if (!state) throw new Error('Local game not found');
      // For local games, all rounds for player 1 are in state.allRounds
      const playerUid = state.playerState.uid;
      const round = state.allRounds[playerUid][roundNumber];
      if (!round) throw new Error('Round not found');
      if (round.parcelsSnapshot) {
        this.parcelCache[roundNumber] = round.parcelsSnapshot;
      }
      return round;
    }

    const fn = this.getRoundDataFn;
    if (!fn) {
      if (typeof window === 'undefined') return { number: roundNumber, parcelsSnapshot: [], result: undefined } as any;
      throw new Error('Functions not available');
    }
    const result = await fn({ gameId, roundNumber });
    const round = result.data;
    if (round.parcelsSnapshot) {
      this.parcelCache[roundNumber] = round.parcelsSnapshot;
    }
    return round;
  }

  async loadGame(gameId: string): Promise<GameState | null> {
    if (gameId.startsWith('local-')) {
      const localState = await this.localGame.loadGame(gameId);
      if (localState && localState.game.status !== 'deleted') {
        this.currentRound = localState.lastRound || null;
        this.parcelsSubject.next(localState.lastRound?.parcelsSnapshot || this.createInitialParcels());
        this.stateSubject.next({
          game: localState.game,
          playerState: localState.playerState,
          lastRound: localState.lastRound,
        });
        return this.stateSubject.value;
      }
      return null;
    }

    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      const mockState = this.getMockGameState();
      this.currentRound = mockState.lastRound || null;
      this.parcelsSubject.next(mockState.lastRound?.parcelsSnapshot || this.createInitialParcels());
      this.stateSubject.next(mockState);
      return mockState;
    }

    try {
      const fn = this.getGameStateFn;
      if (!fn) {
        if (typeof window === 'undefined') return null;
        throw new Error('Functions not available');
      }
      const result = await fn({ gameId });
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
    if (gameId.startsWith('local-')) {
      // For local games, save the draft to LocalGameService
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

      await this.localGame.saveDraft(gameId, decision);
      return;
    }

    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      if (window.console) console.warn('Mock: Draft saved locally');
      return;
    }

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
      const fn = this.saveDraftFn;
      if (!fn) throw new Error('Functions not available');
      await fn({ gameId, decision });
      if (window.console) console.warn('Draft saved');
    } catch (error: unknown) {
      if (!this.offlineService.isOnline()) {
        if (window.console) console.warn('Offline: Draft queued for background sync');
        return;
      }
      if (window.console) console.error('Failed to save draft:', error);
    }
  }

  async submitDecision(gameId: string, decision: RoundDecision): Promise<any> {
    if (gameId.startsWith('local-')) {
      await this.localGame.submitDecision(gameId, decision);
      // LocalGameService updates its own stateSubject, but we need to refresh our local state$
      const localState = await this.localGame.loadGame(gameId);
      if (localState) {
        this.currentRound = localState.lastRound || null;
        this.parcelsSubject.next(localState.lastRound?.parcelsSnapshot || this.createInitialParcels());
        this.stateSubject.next({
          game: localState.game,
          playerState: localState.playerState,
          lastRound: localState.lastRound,
        });

        // Trigger upload if finished
        if (localState.game.status === 'finished') {
          this.uploadFinishedGame(gameId).catch((err) =>
            console.error('Background upload of finished game failed:', err),
          );
        }

        return localState.lastRound;
      }
      return { status: 'submitted' };
    }

    try {
      const fn = this.submitDecisionFn;
      if (!fn) throw new Error('Functions not available');
      const result = await fn({
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
    } catch (error: any) {
      if (!this.offlineService.isOnline()) {
        if (window.console) console.warn('Offline: Decision queued for background sync');
        // We return a "pseudo-submitted" state so the UI can progress
        return { status: 'submitted', offline: true };
      }
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
      aiLevel?: string;
      playerLabel: string;
      advancedPricingEnabled?: boolean;
      analyticsEnabled?: boolean;
    },
  ): Promise<{ gameId: string; password?: string }> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      return { gameId: `test-game-${Math.random().toString(36).substr(2, 9)}`, password: '1234' };
    }
    const numHumanPlayers = config.numPlayers - (config.numAi || 0);
    if (numHumanPlayers === 1) {
      // Create local game
      config.numRounds = config.numRounds || GAME_CONSTANTS.DEFAULT_ROUNDS;
      const result = await this.localGame.createGame(name, config);
      return result;
    }

    try {
      const settings = {
        length: config.numRounds || GAME_CONSTANTS.DEFAULT_ROUNDS,
        difficulty: 'normal',
        playerLabel: config.playerLabel || 'Player',
      };
      const fn = this.createGameFn;
      if (!fn) throw new Error('Functions not available');
      const result = await fn({ name, config, settings });
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
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      const mockGame = this.getMockGameState().game;
      return {
        games: [
          { ...mockGame, id: 'test-game-1', name: 'Test Game 1', status: showTrash ? 'deleted' : 'in_progress' },
          { ...mockGame, id: 'test-game-2', name: 'Test Game 2', status: showTrash ? 'deleted' : 'in_progress' },
        ],
        total: 2,
      };
    }

    // 1. Fetch Cloud Games (Skip for guests)
    let cloudResponse = { games: [] as Game[], total: 0 };
    if (!this.authService.isAnonymous) {
      try {
        const fn = this.getAdminGamesFn;
        if (!fn) {
          if (typeof window === 'undefined') {
            cloudResponse = { games: [], total: 0 };
          } else {
            throw new Error('Functions not available');
          }
        } else {
          const result = await fn({ page, pageSize, showDeleted: showTrash, adminUid });
          cloudResponse = result.data;
        }
      } catch (e) {
        console.error('Error fetching cloud games:', e);
      }
    }

    // 2. Fetch Local Games
    const allLocalGames = await this.localGame.getLocalGames();
    const localGames = allLocalGames.filter((g) => (showTrash ? g.status === 'deleted' : g.status !== 'deleted'));

    // 3. Merge and Paginate
    const allGames = [...localGames, ...cloudResponse.games].sort((a, b) => {
      const dateA = this.formatDate(a.createdAt);
      const dateB = this.formatDate(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
    // Simple client-side pagination for merged list
    const startIndex = (page - 1) * pageSize;
    const paginatedGames = allGames.slice(startIndex, startIndex + pageSize);

    return {
      games: paginatedGames,
      total: allGames.length,
    };
  }

  private formatDate(d: any): Date {
    if (!d) return new Date(0);
    if (d instanceof Date) return d;
    if (typeof d === 'string') return new Date(d);
    if (d.seconds) return new Date(d.seconds * 1000);
    return new Date(0);
  }

  async getUserStatus(): Promise<UserStatus | null> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      const fullRole = window.localStorage.getItem('soil_test_role') || 'admin';
      const role = fullRole.startsWith('player') ? 'player' : fullRole;
      return { uid: 'mock-uid', email: `mock-${role}@example.com`, role, status: 'active' } as any;
    }
    const fn = this.getUserStatusFn;
    if (!fn) throw new Error('Functions not available');
    return (await fn()).data;
  }

  async getAllAdmins(): Promise<(UserStatus & { gameCount: number; quota: number })[]> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      return [
        { uid: 'admin-1', email: 'admin@example.com', role: 'admin', status: 'active', gameCount: 5, quota: 10 } as any,
      ];
    }
    const fn = this.getAllAdminsFn;
    if (!fn) throw new Error('Functions not available');
    return (await fn()).data;
  }

  async getSystemStats(): Promise<SystemStats> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      return {
        games: { total: 100, active: 80, deleted: 20 },
        users: { total: 50, admins: 40, banned: 2 },
      };
    }
    const fn = this.getSystemStatsFn;
    if (!fn) throw new Error('Functions not available');
    return (await fn()).data;
  }

  async submitOnboarding(data: {
    firstName: string;
    lastName: string;
    explanation: string;
    institution: string;
    institutionLink?: string;
  }): Promise<void> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      if (window.console) console.warn('Mock: Onboarding submitted', data);
      return;
    }
    const fn = this.submitOnboardingFn;
    if (!fn) throw new Error('Functions not available');
    await fn(data);
  }

  async manageAdmin(
    targetUid: string,
    action: 'setQuota' | 'ban' | 'delete',
    value?: { rejectionReasons?: string[]; customMessage?: string; banEmail?: boolean } | number,
    origin?: string,
  ): Promise<void> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      if (window.console) console.warn('Mock: Manage admin', { targetUid, action, value });
      return;
    }
    const fn = this.manageAdminFn;
    if (!fn) throw new Error('Functions not available');
    await fn({ targetUid, action, value, origin });
  }

  async sendPlayerInvite(gameId: string, playerNumber: number, email: string, origin: string): Promise<void> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      if (window.console) console.warn('Mock: Player invite sent', { gameId, playerNumber, email });
      return;
    }
    try {
      const fn = this.sendPlayerInviteFn;
      if (!fn) throw new Error('Functions not available');
      await fn({ gameId, playerNumber, email, origin });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to send player invite', error);
      throw error;
    }
  }

  async uploadFinishedGame(gameId: string): Promise<void> {
    if (!gameId.startsWith('local-')) return;

    const localState = await this.localGame.loadGame(gameId);
    if (!localState) return;

    const isFinished =
      localState.game.status === 'finished' ||
      localState.game.currentRoundNumber >= (localState.game.settings?.length || GAME_CONSTANTS.DEFAULT_ROUNDS);

    if (!isFinished) return;

    try {
      const fn = this.uploadFinishedGameFn;
      if (!fn) throw new Error('Functions not available');
      const _result = await fn({
        gameData: {
          game: localState.game,
          allRounds: localState.allRounds,
        },
      });
      if (window.console) {
      }
    } catch (error) {
      if (window.console) console.error('Failed to upload finished local game:', error);
    }
  }

  async evaluateGame(gameId: string, targetUid: string): Promise<GameEvaluation> {
    const fn = this.evaluateGameFn;
    if (!fn) throw new Error('Functions not available');
    return (await fn({ gameId, targetUid })).data;
  }

  async sendGameInvite(gameId: string, email: string): Promise<void> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      if (window.console) console.warn('Mock: Game invite sent', { gameId, email });
      return;
    }
    try {
      const fn = this.sendGameInviteFn;
      if (!fn) throw new Error('Functions not available');
      await fn({ gameId, email });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to send game invite', error);
      throw error;
    }
  }

  async deleteGames(gameIds: string[], force = false): Promise<void> {
    const localIds = gameIds.filter((id) => id.startsWith('local-'));
    const cloudIds = gameIds.filter((id) => !id.startsWith('local-'));

    if (localIds.length > 0) {
      for (const id of localIds) {
        await this.localGame.deleteGame(id, force);
      }
    }

    if (cloudIds.length === 0) return;

    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      if (window.console) console.warn('Mock: Games deleted', { gameIds, force });
      return;
    }
    try {
      const fn = this.deleteGamesFn;
      if (!fn) throw new Error('Functions not available');
      await fn({ gameIds, force });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to delete games:', error);
      throw error;
    }
  }

  async undeleteGames(gameIds: string[]): Promise<void> {
    const localIds = gameIds.filter((id) => id.startsWith('local-'));
    const cloudIds = gameIds.filter((id) => !id.startsWith('local-'));

    if (localIds.length > 0) {
      for (const id of localIds) {
        await this.localGame.undeleteGame(id);
      }
    }

    if (cloudIds.length === 0) return;

    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      if (window.console) console.warn('Mock: Games undeleted', { gameIds });
      return;
    }
    try {
      const fn = this.undeleteGamesFn;
      if (!fn) throw new Error('Functions not available');
      await fn({ gameIds });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to undelete games:', error);
      throw error;
    }
  }

  async updatePlayerType(gameId: string, playerNumber: number, type: 'human' | 'ai', aiLevel?: string): Promise<void> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      if (window.console) console.warn('Mock: Player type updated', { gameId, playerNumber, type, aiLevel });
      return;
    }
    try {
      const fn = this.updatePlayerTypeFn;
      if (!fn) throw new Error('Functions not available');
      await fn({ gameId, playerNumber, type, aiLevel });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to update player type', error);
      throw error;
    }
  }

  async updateRoundDeadline(gameId: string, roundNumber: number, deadline: string): Promise<void> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      if (window.console) console.warn('Mock: Round deadline updated', { gameId, roundNumber, deadline });
      return;
    }
    try {
      const fn = this.updateRoundDeadlineFn;
      if (!fn) throw new Error('Functions not available');
      await fn({ gameId, roundNumber, deadline });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to update deadline', error);
      throw error;
    }
  }

  async submitFeedback(feedback: { category: string; rating: number; comment: string }): Promise<void> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      if (window.console) console.warn('Mock: Feedback submitted', feedback);
      return;
    }
    try {
      const fn = this.submitFeedbackFn;
      if (!fn) throw new Error('Functions not available');
      await fn(feedback);
    } catch (error: unknown) {
      if (window.console) console.error('Failed to submit feedback', error);
      throw error;
    }
  }

  async getAllFeedback(): Promise<Feedback[]> {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      return [
        {
          id: 'fb-1',
          category: 'interface',
          rating: 5,
          comment: 'Great job!',
          status: 'new',
          userEmail: 'user@example.com',
          createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
        } as any,
      ];
    }
    try {
      const fn = this.getAllFeedbackFn;
      if (!fn) throw new Error('Functions not available');
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
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress) {
      if (window.console) console.warn('Mock: Manage feedback', { feedbackId, action, value });
      return;
    }
    try {
      const fn = this.manageFeedbackFn;
      if (!fn) throw new Error('Functions not available');
      await fn({ feedbackId, action, value });
    } catch (error: unknown) {
      if (window.console) console.error('Failed to manage feedback:', error);
      throw error;
    }
  }

  async exportFullGameState(gameId: string): Promise<any> {
    if (gameId.startsWith('local-')) {
      const localState = await this.localGame.loadGame(gameId);
      if (!localState) return null;

      const game = JSON.parse(JSON.stringify(localState.game));
      for (const playerUid in game.players) {
        game.players[playerUid].history = localState.allRounds[playerUid];
      }
      return game;
    }

    const state = this.stateSubject.value;
    if (!state) return null;

    const game = JSON.parse(JSON.stringify(state.game));
    const players = Object.values(game.players) as PlayerState[];

    // Fetch all rounds for all players
    for (const player of players) {
      const fullHistory: Round[] = [];
      for (let r = 0; r <= game.currentRoundNumber; r++) {
        try {
          const fn = this.getRoundDataFn;
          if (!fn) throw new Error('Functions not available');
          const result = await fn({ gameId, roundNumber: r, targetUid: player.uid });
          fullHistory.push(result.data);
        } catch (error) {
          if (window.console) console.error(`Failed to fetch round ${r} for player ${player.uid}`, error);
          // If it fails, we keep what we have (lightweight or nothing)
          const existing = player.history.find((h) => h.number === r);
          if (existing) fullHistory.push(existing);
        }
      }
      player.history = fullHistory;
      game.players[player.uid] = player;
    }

    return game;
  }

  private createInitialParcels(playerIndex = 0): Parcel[] {
    return Array(40)
      .fill(null)
      .map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: 75 + (playerIndex % 10) + Math.random() * 5,
        nutrition: 70 + (playerIndex % 15) + Math.random() * 10,
        yield: 0,
      }));
  }

  private createMockHistory(count: number, playerIndex = 0): Round[] {
    const history: Round[] = [];
    const parcels = this.createInitialParcels(playerIndex);
    const weatherConditions = Object.keys(GAME_CONSTANTS.WEATHER_EFFECTS);
    const possiblePests = Object.keys(GAME_CONSTANTS.VERMIN_EFFECTS);
    const availableCrops: CropType[] = [
      'Wheat',
      'Corn',
      'Potato',
      'Beet',
      'Barley',
      'Oat',
      'Rye',
      'Fieldbean',
      'Rapeseed',
      'Pea',
      'Grass',
      'Fallow',
    ];

    for (let i = 0; i <= count; i++) {
      const pests = [];
      if (i > 0 && (i + playerIndex) % 3 === 0) {
        pests.push(possiblePests[(i + playerIndex) % possiblePests.length]);
        if ((i + playerIndex) % 6 === 0) {
          pests.push(possiblePests[(i + playerIndex + 1) % possiblePests.length]);
        }
      }

      const profit = 400 + (playerIndex % 5) * 50 + Math.random() * 100;

      // Update parcels for history to show variation and cover all crops
      const roundParcels = parcels.map((p, idx) => ({
        ...p,
        crop: availableCrops[(idx + i + playerIndex) % availableCrops.length],
        soil: Math.max(0, Math.min(100, p.soil + (Math.random() - 0.5) * 2 * i)),
        nutrition: Math.max(0, Math.min(150, p.nutrition + (Math.random() - 0.5) * 5 * i)),
        yield: i > 0 ? Math.random() * 100 : 0,
      }));

      history.push({
        number: i,
        decision: {
          machines: playerIndex % 5,
          organic: playerIndex % 2 === 0,
          fertilizer: playerIndex % 3 === 0,
          pesticide: playerIndex % 4 === 0,
          organisms: playerIndex % 5 === 0,
          parcels: {},
        },
        parcelsSnapshot: roundParcels,
        result:
          i > 0
            ? {
                profit: Math.round(profit),
                capital: Math.round(5000 + i * profit),
                income: Math.round(profit + 500),
                expenses: { seeds: 100, labor: 200, running: 100, investments: 100, total: 500 },
                harvestSummary: {} as any,
                events: {
                  weather: weatherConditions[(i + playerIndex) % weatherConditions.length],
                  vermin: pests,
                },
              }
            : undefined,
      });
    }
    return history;
  }

  private getMockGameState(): GameState {
    const role = (typeof window !== 'undefined' && window.localStorage.getItem('soil_test_role')) || 'player';
    const isRound6 = role === 'player_round_6';
    const isEnd = role === 'player_end';

    const numRounds = isRound6 ? 12 : GAME_CONSTANTS.DEFAULT_ROUNDS / 2;
    const currentRound = isEnd ? 11 : isRound6 ? 6 : 1;
    const historyCount = isEnd ? 10 : isRound6 ? 5 : 0;
    const numPlayers = isRound6 ? 10 : isEnd ? 4 : 1;

    const players: Record<string, PlayerState> = {};
    const playerSecrets: Record<string, { password: string }> = {};
    for (let i = 1; i <= numPlayers; i++) {
      const uid = `player-test-game-id-${i}`;
      playerSecrets[String(i)] = { password: '1234' };
      const playerHistory = this.createMockHistory(historyCount, i);
      const lastRound = playerHistory[playerHistory.length - 1];

      const avgSoil = lastRound?.parcelsSnapshot.reduce((acc, p) => acc + p.soil, 0) / 40;
      const avgNutrition = lastRound?.parcelsSnapshot.reduce((acc, p) => acc + p.nutrition, 0) / 40;

      players[uid] = {
        uid,
        displayName: `Player ${i}`,
        isAi: false,
        capital: lastRound?.result?.capital || 5000,
        currentRound: currentRound,
        submittedRound: isEnd ? 10 : historyCount,
        history: playerHistory,
        playerNumber: i,
        avgSoil,
        avgNutrition,
      };
    }

    const firstPlayerUid = `player-test-game-id-1`;
    const playerState = players[firstPlayerUid];
    const lastRound = playerState.history[playerState.history.length - 1];

    return {
      game: {
        id: 'test-game-id',
        name: isEnd ? 'Finished Mock Game' : isRound6 ? 'Mid-Game Mock' : 'Mock Test Game',
        hostUid: 'mock-admin',
        status: isEnd ? 'finished' : 'in_progress',
        currentRoundNumber: isEnd ? 10 : currentRound,
        config: { numPlayers: numPlayers, numRounds, numAi: 0 },
        settings: { length: numRounds, difficulty: 'normal', playerLabel: 'Player' },
        players: players,
        playerSecrets: playerSecrets,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
      },
      playerState: playerState,
      lastRound: lastRound,
    };
  }
}

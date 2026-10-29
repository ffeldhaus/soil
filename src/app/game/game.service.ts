import { computed, Injectable, inject, isDevMode } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { httpsCallable } from 'firebase/functions';
import { BehaviorSubject, debounceTime, type Observable, Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { FIREBASE_FUNCTIONS } from '../firebase.config';
import { GAME_CONSTANTS } from '../game-constants';
import { OfflineService } from '../shared/offline.service';
import type {
  CropType,
  Feedback,
  Game,
  GameEvaluation,
  Parcel,
  PlayerState,
  PublicResearchDatasetResponse,
  PublicResearchInsight,
  PublicResearchSummary,
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
  private functions = inject(FIREBASE_FUNCTIONS, { optional: true });
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
    return httpsCallable<{ gameId: string; targetUid?: string }, GameState>(this.functions, 'getGameState');
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
      { page: number; pageSize: number; showDeleted: boolean; adminUid?: string; targetUid?: string },
      { games: Game[]; total: number }
    >(this.functions, 'getAdminGames');
  }
  private get getResearchGamesFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<
      { page: number; pageSize: number; difficulty?: string; sourceType?: string; organicOnly?: boolean },
      PublicResearchDatasetResponse
    >(this.functions, 'getResearchGames');
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
    return httpsCallable<{ category: string; rating: number; comment: string; email?: string }, void>(
      this.functions,
      'submitFeedback',
    );
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
  private get analyzeSystemBalanceFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<void, { success: boolean; insightId: string; analysis: any }>(
      this.functions,
      'analyzeSystemBalance',
    );
  }
  private get getSystemInsightsFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<void, any[]>(this.functions, 'getSystemInsights');
  }

  private parcelsSubject = new BehaviorSubject<Parcel[]>(this.createInitialParcels());
  parcels$ = this.parcelsSubject.asObservable();

  private stateSubject = new BehaviorSubject<GameState | null>(null);
  state$ = this.stateSubject.asObservable();
  private stateSignal = toSignal(this.state$);

  get state(): GameState | null {
    return this.stateSubject.value;
  }

  private isTestMode(): boolean {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return false;
    const isAllowedEnv =
      isDevMode() || window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1';
    return isAllowedEnv && window.localStorage.getItem('soil_test_mode') === 'true' && !(window as any).Cypress;
  }

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

  private cacheRoundParcels(roundNumber: number, round?: Round): void {
    if (round?.parcelsSnapshot) {
      this.parcelCache[roundNumber] = round.parcelsSnapshot;
    }
  }

  private async getLocalRoundData(gameId: string, roundNumber: number, targetUid?: string): Promise<Round> {
    const state = await this.localGame.loadGame(gameId);
    if (!state) throw new Error('Local game not found');
    const playerUid = targetUid || state.playerState.uid;
    const round = state.allRounds[playerUid][roundNumber];
    if (!round) throw new Error('Round not found');
    this.cacheRoundParcels(roundNumber, round);
    return round;
  }

  async getRoundData(gameId: string, roundNumber: number, targetUid?: string): Promise<Round> {
    if (gameId.startsWith('local-')) {
      return this.getLocalRoundData(gameId, roundNumber, targetUid);
    }

    if (this.isTestMode()) {
      const history = this.createMockHistory(Math.max(10, roundNumber), 1);
      const round = history[roundNumber] || history[history.length - 1];
      this.cacheRoundParcels(roundNumber, round);
      return round;
    }

    const fn = this.getRoundDataFn;
    if (!fn) {
      if (typeof window === 'undefined') return { number: roundNumber, parcelsSnapshot: [], result: undefined } as any;
      throw new Error('Functions not available');
    }
    const result = await fn({ gameId, roundNumber, targetUid });
    const round = result.data;
    this.cacheRoundParcels(roundNumber, round);
    return round;
  }

  private async loadLocalGameState(gameId: string, targetUid?: string): Promise<GameState | null> {
    const localState = await this.localGame.loadGame(gameId);
    if (!localState || localState.game.status === 'deleted') return null;

    const playerState = targetUid ? localState.game.players[targetUid] : localState.playerState;
    const targetRounds = targetUid ? localState.allRounds[targetUid] : undefined;
    const lastRound = targetRounds ? targetRounds[targetRounds.length - 1] : localState.lastRound;

    this.currentRound = lastRound || null;
    this.parcelsSubject.next(lastRound?.parcelsSnapshot || this.createInitialParcels());
    this.stateSubject.next({
      game: localState.game,
      playerState,
      lastRound,
    });
    return this.stateSubject.value;
  }

  private applyRemoteLastRoundState(data: GameState): void {
    if (!data.lastRound) return;
    this.currentRound = data.lastRound;
    let parcels = data.lastRound.parcelsSnapshot || this.createInitialParcels();

    const currentRoundNum = data.game.currentRoundNumber;
    const isSubmitted = data.playerState?.submittedRound === currentRoundNum;
    const drafts = data.playerState?.pendingDecisions?.parcels;

    if (!isSubmitted && drafts) {
      this.pendingDecisions = drafts;
      parcels = parcels.map((p: Parcel) => ({
        ...p,
        crop: drafts[p.index] || p.crop,
      }));
    }
    this.parcelsSubject.next(parcels);
  }

  async loadGame(gameId: string, targetUid?: string): Promise<GameState | null> {
    if (gameId.startsWith('local-')) {
      return this.loadLocalGameState(gameId, targetUid);
    }

    if (this.isTestMode()) {
      const mockState = gameId.startsWith('research')
        ? this.getMockResearchGameState(gameId, targetUid)
        : this.getMockGameState();
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
      const result = await fn({ gameId, targetUid });
      const data = result.data;
      this.applyRemoteLastRoundState(data);
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

  private buildDraftDecision(): RoundDecision {
    const fullParcels: Record<number, CropType> = {};
    const currentParcels = this.parcelsSubject.value;
    for (let i = 0; i < 40; i++) {
      fullParcels[i] = this.pendingDecisions[i] || currentParcels[i]?.crop || 'Fallow';
    }
    return {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: fullParcels,
      priceFixing: {},
    };
  }

  async saveDraft(gameId: string) {
    const decision = this.buildDraftDecision();
    if (gameId.startsWith('local-')) {
      await this.localGame.saveDraft(gameId, decision);
      return;
    }

    if (this.isTestMode()) {
      if (window.console) console.warn('Mock: Draft saved locally');
      return;
    }

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

  private async submitLocalDecision(gameId: string, decision: RoundDecision): Promise<any> {
    await this.localGame.submitDecision(gameId, decision);
    const localState = await this.localGame.loadGame(gameId);
    if (!localState) return { status: 'submitted' };

    this.currentRound = localState.lastRound || null;
    this.parcelsSubject.next(localState.lastRound?.parcelsSnapshot || this.createInitialParcels());
    this.stateSubject.next({
      game: localState.game,
      playerState: localState.playerState,
      lastRound: localState.lastRound,
    });
    return localState.lastRound;
  }

  async submitDecision(gameId: string, decision: RoundDecision): Promise<any> {
    if (gameId.startsWith('local-')) {
      return this.submitLocalDecision(gameId, decision);
    }

    try {
      const fn = this.submitDecisionFn;
      if (!fn) throw new Error('Functions not available');
      const result = await fn({ gameId, decision });
      const data = result.data;

      if (data.status === 'calculated' && data.nextRound) {
        const round = data.nextRound;
        this.currentRound = round;
        await this.loadGame(gameId);
        this.pendingDecisions = {};
        this.parcelsSubject.next(round.parcelsSnapshot);
        return round;
      }
      return { status: 'submitted' };
    } catch (error: any) {
      if (!this.offlineService.isOnline()) {
        if (window.console) console.warn('Offline: Decision queued for background sync');
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

  hasPendingParcelDecisions(): boolean {
    return Object.keys(this.pendingDecisions).length > 0;
  }

  async createGame(
    name: string,
    config: {
      numPlayers: number;
      numRounds: number;
      numAi: number;
      aiLevel?: string;
      difficulty?: 'easy' | 'normal' | 'hard';
      playerLabel: string;
      advancedPricingEnabled?: boolean;
      analyticsEnabled?: boolean;
      advisorEnabled?: boolean;
    },
  ): Promise<{ gameId: string; password?: string }> {
    if (this.isTestMode()) {
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
        difficulty: config.difficulty || 'normal',
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
    if (this.isTestMode()) {
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
          const result = await fn({ page, pageSize, showDeleted: showTrash, adminUid, targetUid: adminUid });
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

  async getResearchGames(
    page: number,
    pageSize: number,
    filters?: { difficulty?: string; sourceType?: string; organicOnly?: boolean },
  ): Promise<PublicResearchDatasetResponse> {
    if (this.isTestMode()) {
      return this.getMockResearchDataset(filters);
    }

    try {
      const fn = this.getResearchGamesFn;
      if (!fn) {
        if (typeof window === 'undefined') return { games: [], total: 0 };
        throw new Error('Functions not available');
      }
      const payload: {
        page: number;
        pageSize: number;
        difficulty?: string;
        sourceType?: string;
        organicOnly?: boolean;
      } = { page, pageSize };
      if (filters?.difficulty) payload.difficulty = filters.difficulty;
      if (filters?.sourceType) payload.sourceType = filters.sourceType;
      if (filters?.organicOnly) payload.organicOnly = true;
      const result = await fn(payload);
      return result.data;
    } catch (error: unknown) {
      if (window.console) console.error('Failed to fetch research games:', error);
      throw error;
    }
  }

  private formatDate(d: any): Date {
    if (!d) return new Date(0);
    if (d instanceof Date) return d;
    if (typeof d === 'string') return new Date(d);
    if (d.seconds) return new Date(d.seconds * 1000);
    return new Date(0);
  }

  async getUserStatus(): Promise<UserStatus | null> {
    if (this.isTestMode()) {
      const fullRole = window.localStorage.getItem('soil_test_role') || 'admin';
      const role = fullRole.startsWith('player') ? 'player' : fullRole;
      return { uid: 'mock-uid', email: `mock-${role}@example.com`, role, status: 'active' } as any;
    }
    const fn = this.getUserStatusFn;
    if (!fn) throw new Error('Functions not available');
    return (await fn()).data;
  }

  async getAllAdmins(): Promise<(UserStatus & { gameCount: number; quota: number })[]> {
    if (this.isTestMode()) {
      return [
        { uid: 'admin-1', email: 'admin@example.com', role: 'admin', status: 'active', gameCount: 5, quota: 10 } as any,
      ];
    }
    const fn = this.getAllAdminsFn;
    if (!fn) throw new Error('Functions not available');
    return (await fn()).data;
  }

  async getSystemStats(): Promise<SystemStats> {
    if (this.isTestMode()) {
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
    if (this.isTestMode()) {
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
    if (this.isTestMode()) {
      if (window.console) console.warn('Mock: Manage admin', { targetUid, action, value });
      return;
    }
    const fn = this.manageAdminFn;
    if (!fn) throw new Error('Functions not available');
    await fn({ targetUid, action, value, origin });
  }

  async sendPlayerInvite(gameId: string, playerNumber: number, email: string, origin: string): Promise<void> {
    if (this.isTestMode()) {
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

  async evaluateGame(gameId: string, targetUid: string): Promise<GameEvaluation> {
    const fn = this.evaluateGameFn;
    if (!fn) throw new Error('Functions not available');
    return (await fn({ gameId, targetUid })).data;
  }

  async sendGameInvite(gameId: string, email: string): Promise<void> {
    if (this.isTestMode()) {
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

    if (this.isTestMode()) {
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

    if (this.isTestMode()) {
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
    if (this.isTestMode()) {
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
    if (this.isTestMode()) {
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

  async submitFeedback(feedback: { category: string; rating: number; comment: string; email?: string }): Promise<void> {
    if (this.isTestMode()) {
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
    if (this.isTestMode()) {
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
    if (this.isTestMode()) {
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

  async analyzeSystemBalance(): Promise<any> {
    const fn = this.analyzeSystemBalanceFn;
    if (!fn) throw new Error('Functions not available');
    return (await fn()).data;
  }

  async getSystemInsights(): Promise<any[]> {
    if (this.isTestMode()) {
      return [
        {
          createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
          strategies: [
            { name: 'Integrated Farming', description: 'Sustainable balanced approach.' },
            { name: 'Organic Right', description: 'Profitable organic rotation.' },
          ],
          balancingReport: {
            summary: 'System is stable.',
            issues: [
              { severity: 'low', description: 'Potatoes slightly too strong.', suggestion: 'Increase seed cost.' },
            ],
            cropAnalysis: [],
          },
        },
      ];
    }
    const fn = this.getSystemInsightsFn;
    if (!fn) throw new Error('Functions not available');
    return (await fn()).data;
  }

  private async fetchPlayerRoundHistory(gameId: string, player: PlayerState, maxRound: number): Promise<Round[]> {
    const fullHistory: Round[] = [];
    for (let r = 0; r <= maxRound; r++) {
      try {
        const fn = this.getRoundDataFn;
        if (!fn) throw new Error('Functions not available');
        const result = await fn({ gameId, roundNumber: r, targetUid: player.uid });
        fullHistory.push(result.data);
      } catch (error) {
        if (window.console) console.error(`Failed to fetch round ${r} for player ${player.uid}`, error);
        const existing = player.history.find((h) => h.number === r);
        if (existing) fullHistory.push(existing);
      }
    }
    return fullHistory;
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

    for (const player of players) {
      player.history = await this.fetchPlayerRoundHistory(gameId, player, game.currentRoundNumber);
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
        soil: GAME_CONSTANTS.SOIL.START - 5 + (playerIndex % 10) + Math.random() * 5,
        nutrition: GAME_CONSTANTS.NUTRITION.START - 10 + (playerIndex % 15) + Math.random() * 10,
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

      const roundParcelMap: Record<number, CropType> = {};
      roundParcels.forEach((p) => {
        roundParcelMap[p.index] = p.crop;
      });
      const avgSoil = Math.round((roundParcels.reduce((acc, p) => acc + p.soil, 0) / 40) * 10) / 10;
      const avgNutrition = Math.round((roundParcels.reduce((acc, p) => acc + p.nutrition, 0) / 40) * 10) / 10;

      history.push({
        number: i,
        avgSoil,
        avgNutrition,
        decision: {
          machines: playerIndex % 5,
          organic: playerIndex % 2 === 0,
          fertilizer: playerIndex % 3 === 0,
          pesticide: playerIndex % 4 === 0,
          organisms: playerIndex % 5 === 0,
          parcels: roundParcelMap,
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

  private resolveMockRoleParameters(): {
    isEnd: boolean;
    numRounds: number;
    currentRound: number;
    historyCount: number;
    numPlayers: number;
    gameName: string;
  } {
    const role = (typeof window !== 'undefined' && window.localStorage.getItem('soil_test_role')) || 'player';
    const isRound6 = role === 'player_round_6';
    const isEnd = role === 'player_end';

    let gameName = 'Mock Test Game';
    if (isEnd) gameName = 'Finished Mock Game';
    else if (isRound6) gameName = 'Mid-Game Mock';

    return {
      isEnd,
      numRounds: isRound6 ? 12 : GAME_CONSTANTS.DEFAULT_ROUNDS / 2,
      currentRound: isEnd ? 11 : isRound6 ? 6 : 1,
      historyCount: isEnd ? 10 : isRound6 ? 5 : 0,
      numPlayers: isRound6 ? 10 : isEnd ? 4 : 1,
      gameName,
    };
  }

  private getMockGameState(): GameState {
    const { isEnd, numRounds, currentRound, historyCount, numPlayers, gameName } = this.resolveMockRoleParameters();

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
        currentRound,
        submittedRound: isEnd ? 10 : historyCount,
        history: playerHistory,
        playerNumber: i,
        avgSoil,
        avgNutrition,
      };
    }

    const firstPlayerUid = 'player-test-game-id-1';
    const playerState = players[firstPlayerUid];
    const lastRound = playerState.history[playerState.history.length - 1];

    return {
      game: {
        id: 'test-game-id',
        name: gameName,
        hostUid: 'mock-admin',
        status: isEnd ? 'finished' : 'in_progress',
        currentRoundNumber: isEnd ? 10 : currentRound,
        config: { numPlayers, numRounds, numAi: 0 },
        settings: { length: numRounds, difficulty: 'normal', playerLabel: 'Player' },
        players,
        playerSecrets,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
      },
      playerState,
      lastRound,
    };
  }

  private getMockResearchDataset(filters?: {
    difficulty?: string;
    sourceType?: string;
    organicOnly?: boolean;
  }): PublicResearchDatasetResponse {
    const localHistory = this.createMockHistory(8, 2); // playerIndex=2 -> organic=true
    const cloudHistory1 = this.createMockHistory(10, 1); // playerIndex=1 -> organic=false
    const cloudHistory2 = this.createMockHistory(10, 2); // playerIndex=2 -> organic=true

    const game1: Game = {
      id: 'research_local-1',
      name: 'Anonymized Game',
      hostUid: 'anonymized',
      status: 'finished',
      sourceType: 'local',
      currentRoundNumber: 8,
      config: { numPlayers: 2, numRounds: 8, numAi: 1, advancedPricingEnabled: false },
      settings: { length: 8, difficulty: 'normal', playerLabel: 'Team' },
      createdAt: new Date('2026-03-10T10:00:00Z'),
      players: {
        'player-research_local-1-1': {
          uid: 'player-research_local-1-1',
          displayName: 'Team 1',
          isAi: false,
          playerNumber: 1,
          capital: 124500,
          currentRound: 8,
          avgSoil: 103.4,
          avgNutrition: 101.2,
          sustainabilityScore: 86.5,
          history: localHistory,
        },
        'player-research_local-1-2': {
          uid: 'player-research_local-1-2',
          displayName: 'Team 2',
          isAi: true,
          aiLevel: 'middle',
          playerNumber: 2,
          capital: 112000,
          currentRound: 8,
          avgSoil: 98.5,
          avgNutrition: 96.0,
          sustainabilityScore: 78.2,
          history: localHistory,
        },
      },
    };

    const game2: Game = {
      id: 'research_cloud-2',
      name: 'Anonymized Game',
      hostUid: 'anonymized',
      status: 'finished',
      sourceType: 'cloud',
      currentRoundNumber: 10,
      config: { numPlayers: 2, numRounds: 10, numAi: 0, advancedPricingEnabled: true },
      settings: { length: 10, difficulty: 'hard', playerLabel: 'Team' },
      createdAt: new Date('2026-03-12T14:30:00Z'),
      players: {
        'player-research_cloud-2-1': {
          uid: 'player-research_cloud-2-1',
          displayName: 'Team 1',
          isAi: false,
          playerNumber: 1,
          capital: 138200,
          currentRound: 10,
          avgSoil: 94.8,
          avgNutrition: 99.1,
          sustainabilityScore: 81.0,
          history: cloudHistory1,
        },
        'player-research_cloud-2-2': {
          uid: 'player-research_cloud-2-2',
          displayName: 'Team 2',
          isAi: false,
          playerNumber: 2,
          capital: 129800,
          currentRound: 10,
          avgSoil: 105.6,
          avgNutrition: 104.0,
          sustainabilityScore: 89.4,
          history: cloudHistory2,
        },
      },
    };

    const allGames = [game1, game2].filter((g) => {
      if (filters?.difficulty && g.settings.difficulty !== filters.difficulty) return false;
      if (filters?.sourceType && g.sourceType !== filters.sourceType) return false;
      if (filters?.organicOnly && g.id !== 'research_local-1') return false;
      return true;
    });

    const summary: PublicResearchSummary = {
      totalGames: allGames.length,
      totalHumanPlayers: allGames.reduce((acc, g) => acc + Object.values(g.players).filter((p) => !p.isAi).length, 0),
      totalAiPlayers: allGames.reduce((acc, g) => acc + Object.values(g.players).filter((p) => p.isAi).length, 0),
      totalRoundsPlayed: allGames.reduce((acc, g) => acc + g.currentRoundNumber, 0),
      avgFinalCapital: 130833,
      avgFinalSoil: 101.3,
      avgFinalNutrition: 101.4,
      avgSustainabilityScore: 85.6,
      organicDecisionShare: 64.3,
      fertilizerDecisionShare: 35.7,
      pesticideDecisionShare: 21.4,
      organismsDecisionShare: 57.1,
      cropShares: {
        Wheat: 16.5,
        Fieldbean: 12.8,
        Pea: 11.4,
        Potato: 10.6,
        Barley: 9.8,
        Oat: 8.5,
        Rye: 7.9,
        Rapeseed: 7.2,
        Beet: 6.4,
        Grass: 4.5,
        Corn: 2.8,
        Fallow: 1.6,
      },
      difficultyBreakdown: { easy: 0, normal: 1, hard: 1 },
      sourceBreakdown: { local: 1, cloud: 1 },
    };

    const latestInsight: PublicResearchInsight = {
      strategies: [
        {
          name: 'Regenerative Fruchtfolge (Bio + Leguminosen)',
          description:
            'Kombiniert mehrgliedrige Fruchtfolgen mit Ackerbohnen/Erbsen, Nützlingseinsatz und Öko-Regelungen für stabiles Boden- und Kapitalwachstum.',
          typicalMetrics: { capital: 129800, soil: 104.5, nutrition: 102.6 },
          keyDecisions: 'Bio-Landbau aktiv, >= 15 % Leguminosen, Nützlinge statt synthetischer Pestizide',
        },
        {
          name: 'Integrierter Marktfruchtbau',
          description:
            'Ausgewogene Fruchtfolge mit gezieltem Mineraldüngereinsatz bei zehrenden Kulturen (Kartoffel, Raps, Weizen) und moderater Mechanisierung.',
          typicalMetrics: { capital: 138200, soil: 96.2, nutrition: 99.8 },
          keyDecisions: 'Gezielte mineralische Nachdüngung, strikte Einhaltung der Anbaupausen',
        },
      ],
      balancingReport: {
        summary: 'Hohe Stabilität zwischen ökologischer Bodenpflege und betriebswirtschaftlicher Rentabilität.',
        issues: [],
        cropAnalysis: [
          {
            crop: 'Wheat',
            usageFrequency: '16.5%',
            performanceAssessment: 'Solide Leitkultur in mehrgliedrigen Getreide-Leguminosen-Rotationen.',
          },
          {
            crop: 'Fieldbean',
            usageFrequency: '12.8%',
            performanceAssessment: 'Schlüsselkultur für natürliche Stickstofffixierung und Regionalverträge.',
          },
        ],
      },
      gameCount: allGames.length,
      createdAt: '2026-03-15T12:00:00Z',
    };

    return {
      games: allGames,
      total: allGames.length,
      summary,
      latestInsight,
    };
  }

  private getMockResearchGameState(gameId: string, targetUid?: string): GameState {
    const dataset = this.getMockResearchDataset();
    const found = dataset.games.find((g) => g.id === gameId) || dataset.games[0];
    const game: Game = { ...found, id: gameId };
    const playerKeys = Object.keys(game.players);
    const chosenUid = targetUid && game.players[targetUid] ? targetUid : playerKeys[0];
    const playerState = game.players[chosenUid] || Object.values(game.players)[0];
    const lastRound = playerState.history[playerState.history.length - 1];
    return {
      game,
      playerState,
      lastRound,
    };
  }
}

import { inject, Injectable } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { BehaviorSubject, Observable } from 'rxjs';

import { CropType, Parcel, Round, RoundDecision } from '../types';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private functions = inject(Functions);

  private parcelsSubject = new BehaviorSubject<Parcel[]>(this.createInitialParcels());
  parcels$ = this.parcelsSubject.asObservable();

  private stateSubject = new BehaviorSubject<any>(null);
  state$ = this.stateSubject.asObservable();

  private currentRound: Round | null = null;
  private pendingDecisions: Record<number, CropType> = {};

  getParcelsValue() {
    return this.parcelsSubject.value;
  }

  async loadGame(gameId: string) {
    const getGameStateFn = httpsCallable(this.functions, 'getGameState');
    try {
      const result = await getGameStateFn({ gameId });
      const data = result.data as any; // { game, playerState, lastRound }

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
        this.stateSubject.next({
          currentRound: currentRoundNum,
          capital: data.playerState?.capital ?? 1000,
        });
      }
      this.stateSubject.next(data);
      return data;
    } catch (error) {
      console.error('Failed to load game:', error);
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

    // Auto-Save Immediately
    if (gameId) {
      this.saveDraft(gameId);
    }
  }

  async saveDraft(gameId: string) {
    const saveDraftFn = httpsCallable(this.functions, 'saveDraft');

    // Construct partial decision for draft
    const decision: RoundDecision = {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: { ...this.pendingDecisions },
    };

    try {
      await saveDraftFn({ gameId, decision });
      console.log('Draft saved');
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }

  async submitRound(
    gameId: string,
    settings?: { machines: number; organic: boolean; fertilizer: boolean; pesticide: boolean; organisms: boolean },
  ) {
    const submitDecisionFn = httpsCallable(this.functions, 'submitDecision');

    const decision: RoundDecision = {
      machines: settings?.machines ?? 0,
      organic: settings?.organic ?? false,
      fertilizer: settings?.fertilizer ?? false,
      pesticide: settings?.pesticide ?? false,
      organisms: settings?.organisms ?? false,
      parcels: {},
    };

    const currentParcels = this.parcelsSubject.value;
    for (let i = 0; i < 40; i++) {
      decision.parcels[i] = this.pendingDecisions[i] || currentParcels[i].crop;
    }

    try {
      const result = await submitDecisionFn({
        gameId,
        decision,
      });
      const data = result.data as { status: string; nextRound?: Round };

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
    } catch (error) {
      console.error('Failed to submit round:', error);
      throw error;
    }
  }

  /**
   * Returns an observable of the current parcels.
   */
  getParcels(): Observable<Parcel[]> {
    return this.parcels$;
  }

  async createGame(name: string, config: any) {
    const createGameFn = httpsCallable(this.functions, 'createGame');
    try {
      const settings = {
        length: config.numRounds || 20,
        difficulty: 'normal',
        playerLabel: config.playerLabel || 'Player',
      };
      const result = await createGameFn({ name, config, settings });
      return result.data as { gameId: string; password?: string };
    } catch (error) {
      console.error('Failed to create game:', error);
      throw error;
    }
  }

  async getAdminGames(
    page: number,
    pageSize: number,
    showDeleted = false,
    targetUid?: string,
  ): Promise<{ games: any[]; total: number }> {
    const getAdminGamesFn = httpsCallable(this.functions, 'getAdminGames');
    try {
      const result = await getAdminGamesFn({ page, pageSize, showDeleted, targetUid });
      return result.data as { games: any[]; total: number };
    } catch (error) {
      console.error('Failed to fetch games:', error);
      throw error;
    }
  }

  async getPendingUsers() {
    const fn = httpsCallable(this.functions, 'getPendingUsers');
    return (await fn()).data as any[];
  }

  async getUserStatus() {
    const fn = httpsCallable(this.functions, 'getUserStatus');
    return (await fn()).data as any;
  }

  async getAllAdmins() {
    const fn = httpsCallable(this.functions, 'getAllAdmins');
    return (await fn()).data as any[];
  }

  async getSystemStats() {
    const fn = httpsCallable(this.functions, 'getSystemStats');
    return (await fn()).data as any;
  }

  async submitOnboarding(data: {
    firstName: string;
    lastName: string;
    explanation: string;
    institution: string;
    institutionLink?: string;
  }) {
    const fn = httpsCallable(this.functions, 'submitOnboarding');
    return (await fn(data)).data;
  }

  async manageAdmin(
    targetUid: string,
    action: 'approve' | 'reject' | 'setQuota' | 'ban' | 'delete',
    value?: any,
    lang?: string,
  ) {
    const fn = httpsCallable(this.functions, 'manageAdmin');
    return (await fn({ targetUid, action, value, lang })).data;
  }

  async sendPlayerInvite(gameId: string, playerNumber: number, email: string, origin: string, lang?: string) {
    const fn = httpsCallable(this.functions, 'sendPlayerInvite');
    try {
      await fn({ gameId, playerNumber, email, origin, lang });
    } catch (error) {
      console.error('Failed to send player invite', error);
      throw error;
    }
  }

  async sendGameInvite(gameId: string, email: string, lang?: string) {
    const fn = httpsCallable(this.functions, 'sendGameInvite');
    try {
      await fn({ gameId, email, lang });
    } catch (error) {
      console.error('Failed to send game invite', error);
      throw error;
    }
  }

  async deleteGames(gameIds: string[], force = false): Promise<void> {
    const deleteGamesFn = httpsCallable(this.functions, 'deleteGames');
    try {
      await deleteGamesFn({ gameIds, force });
    } catch (error) {
      console.error('Failed to delete games:', error);
      throw error;
    }
  }

  async undeleteGames(gameIds: string[]): Promise<void> {
    const undeleteGamesFn = httpsCallable(this.functions, 'undeleteGames');
    try {
      await undeleteGamesFn({ gameIds });
    } catch (error) {
      console.error('Failed to undelete games:', error);
      throw error;
    }
  }

  async updatePlayerType(gameId: string, playerNumber: number, type: 'human' | 'ai', aiLevel?: string) {
    const updatePlayerTypeFn = httpsCallable(this.functions, 'updatePlayerType');
    try {
      await updatePlayerTypeFn({ gameId, playerNumber, type, aiLevel });
    } catch (error) {
      console.error('Failed to update player type', error);
      throw error;
    }
  }

  async updateRoundDeadline(gameId: string, roundNumber: number, deadline: string) {
    const fn = httpsCallable(this.functions, 'updateRoundDeadline');
    try {
      await fn({ gameId, roundNumber, deadline });
    } catch (error) {
      console.error('Failed to update deadline', error);
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
}

// File: frontend/src/app/core/services/player-game.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs'; // Removed of
// Removed delay, map from rxjs/operators
import { ApiService } from './api.service';
// Removed Parcel, PlantationType, FieldState, CropSequenceEffect, HarvestOutcome
import { GamePublic } from '../models/game.model'; // Changed from GameDetailsView
import { RoundWithFieldPublic, PlayerRoundSubmission, RoundPublic } from '../models/round.model'; // Used PlayerRoundSubmission, RoundPublic
import { ResultPublic } from '../models/result.model';
import { IPlayerGameService } from './player-game.service.interface';
import { MockPlayerGameService } from './player-game.service.mock'; // For mock mode
import { environment } from '../../../environments/environment'; // For mock mode check

@Injectable({
  providedIn: 'root' // Standard to provide in root
})
export class PlayerGameService implements IPlayerGameService {
  private apiService = inject(ApiService);
  private mockService: MockPlayerGameService | null = null; // For mock mode

  constructor() {
    if (environment.useMocks) {
      this.mockService = new MockPlayerGameService();
      // console.log('PlayerGameService: Using MOCK data via MockPlayerGameService');
    }
  }

  getCurrentRoundWithField(gameId: string): Observable<RoundWithFieldPublic> {
    if (this.mockService) return this.mockService.getCurrentRoundWithField(gameId);
    return this.apiService.get<RoundWithFieldPublic>(`/games/${gameId}/rounds/my-current-round`);
  }

  getGameDetails(gameId: string): Observable<GamePublic> { 
    if (this.mockService) return this.mockService.getGameDetails(gameId);
    return this.apiService.get<GamePublic>(`/games/${gameId}`); 
  }

  submitPlayerDecisions(
    gameId: string,
    roundNumber: number, 
    payload: PlayerRoundSubmission 
  ): Observable<RoundPublic> { 
    if (this.mockService) {
        return this.mockService.submitPlayerDecisions(gameId, roundNumber, payload);
    }
    return this.apiService.put<RoundPublic>(`/games/${gameId}/rounds/${roundNumber}/my-decisions`, payload);
  }

  getPlayerResults(gameId: string, playerId: string): Observable<ResultPublic[]> {
    if (this.mockService) {
        return this.mockService.getPlayerResults(gameId, playerId);
    }
    // Backend should scope to the authenticated player if "my-results" is used.
    // If an admin needs to fetch for a specific player, a different endpoint or query param might be used.
    // For a player fetching their own, playerId in the path might be redundant if backend uses token.
    // However, if the API *requires* playerId even for self-fetch, it should be included.
    // Assuming `/games/${gameId}/players/${playerId}/results` or similar if playerId is mandatory in URL.
    // For now, using a more generic "my-results" which implies token-based auth.
    // If your API specifically needs /games/{gameId}/results/by-player/{playerId} then adjust.
    return this.apiService.get<ResultPublic[]>(`/games/${gameId}/results/my-results`); // Or `/games/${gameId}/players/${playerId}/results`
  }
}

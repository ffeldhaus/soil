// File: frontend/src/app/core/services/player-game.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { ApiService } from './api.service'; // Corrected relative path
import {
  Parcel, PlantationType, FieldState, CropSequenceEffect, HarvestOutcome
} from '../models/parcel.model'; // Corrected path
import { GameDetailsView } from '../models/game.model'; // Corrected path
import { RoundWithFieldPublic, RoundDecisionBase } from '../models/round.model'; // Corrected path
import { ResultPublic } from '../models/result.model'; // Corrected path
import { IPlayerGameService } from './player-game.service.interface'; // Import the interface

@Injectable() // Removed providedIn: 'root'
export class PlayerGameService implements IPlayerGameService { // Implement the interface
  private apiService = inject(ApiService);

  // NOTE: Internal mock generation is no longer used when useMocks=false
  // but can be kept for reference or potential internal use.
  private createMockParcels(count: number = 40): Parcel[] {
    const parcels: Parcel[] = [];
    const plantationTypes = Object.values(PlantationType);
    for (let i = 1; i <= count; i++) {
      parcels.push({
        id: `parcel_${i}`,
        parcel_number: i,
        soil_quality: 70 + Math.floor(Math.random() * 20),
        nutrient_level: 60 + Math.floor(Math.random() * 30),
        current_plantation: plantationTypes[i % plantationTypes.length],
        previous_plantation: plantationTypes[(i + 1) % plantationTypes.length],
        pre_previous_plantation: plantationTypes[(i + 2) % plantationTypes.length],
        crop_sequence_effect: CropSequenceEffect.OK,
        last_harvest_yield_dt: Math.floor(Math.random() * 100),
        last_harvest_outcome_category: HarvestOutcome.MODERATE,
      });
    }
    return parcels;
  }

  // Real implementation (uses ApiService)
  getCurrentRoundWithField(gameId: string): Observable<RoundWithFieldPublic> {
    // Use the actual apiService call now
    return this.apiService.get<RoundWithFieldPublic>(`/games/${gameId}/current-round`);
  }

  // Real implementation
  getGameDetails(gameId: string): Observable<GameDetailsView> {
    // Use the actual apiService call now
    return this.apiService.get<GameDetailsView>(`/games/${gameId}`); // Player-specific endpoint might differ, adjust if needed
  }

  // Real implementation
  submitPlayerDecisions(
    gameId: string,
    payload: {
      round_decisions: RoundDecisionBase;
      parcel_plantation_choices: Record<number, PlantationType>;
    }
  ): Observable<RoundWithFieldPublic> {
    // Use the actual apiService call now
    return this.apiService.put<RoundWithFieldPublic>(`/games/${gameId}/current-round/submit`, payload);
  }

  // Real implementation
  getPlayerResults(gameId: string): Observable<ResultPublic[]> {
     // Use the actual apiService call now
    return this.apiService.get<ResultPublic[]>(`/games/${gameId}/my-results`);
  }

}
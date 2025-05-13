// File: frontend/src/app/core/services/player-game.service.mock.ts
import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  Parcel, PlantationType, FieldState, CropSequenceEffect, HarvestOutcome
} from '../models/parcel.model';
import { GameDetailsView } from '../models/game.model'; // Corrected: Removed PlayerPublic from here
import { PlayerPublic } from '../models/player.model'; // Corrected: Added PlayerPublic import from player.model
import { UserRole } from '../models/user.model'; 
import { RoundWithFieldPublic, RoundDecisionBase } from '../models/round.model';
import { ResultPublic } from '../models/result.model';
import { IPlayerGameService } from './player-game.service.interface';
import { TotalIncome, TotalExpenses } from '../models/financials.model';

@Injectable()
export class MockPlayerGameService implements IPlayerGameService {

  private createMockParcels(count: number = 40): Parcel[] {
    const parcels: Parcel[] = [];
    const plantationTypes = Object.values(PlantationType);
    for (let i = 1; i <= count; i++) {
      parcels.push({
        id: `mock_parcel_${i}`,
        parcel_number: i,
        soil_quality: 75 + Math.floor(Math.random() * 10),
        nutrient_level: 65 + Math.floor(Math.random() * 15),
        current_plantation: plantationTypes[i % plantationTypes.length],
        previous_plantation: plantationTypes[(i + 1) % plantationTypes.length],
        pre_previous_plantation: plantationTypes[(i + 2) % plantationTypes.length],
        crop_sequence_effect: CropSequenceEffect.OK,
        last_harvest_yield_dt: Math.floor(Math.random() * 50) + 50,
        last_harvest_outcome_category: HarvestOutcome.HIGH, 
      });
    }
    return parcels;
  }

  getCurrentRoundWithField(gameId: string): Observable<RoundWithFieldPublic> {
    console.log(`MockPlayerGameService: getCurrentRoundWithField called for game ${gameId}`);
    const mockRoundNumber = 2; 
    const mockPlayerId = 'mockPlayerABC';
    const mockParcels = this.createMockParcels();

    const mockRoundData: RoundWithFieldPublic = {
      id: `${gameId}_${mockPlayerId}_round_${mockRoundNumber}`,
      game_id: gameId,
      player_id: mockPlayerId,
      round_number: mockRoundNumber,
      is_submitted: false,
      decisions: { 
        fertilize: true, 
        pesticide: false,
        biological_control: true,
        attempt_organic_certification: false,
        machine_investment_level: 1
      },
      field_state: { parcels: mockParcels },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return of(mockRoundData).pipe(delay(150));
  }

  getGameDetails(gameId: string): Observable<GameDetailsView> {
    console.log(`MockPlayerGameService: getGameDetails called for game ${gameId}`);
    const mockPlayers: PlayerPublic[] = [
      { uid: 'player1', email: 'player1@example.com', username: 'Human Player Mock 1', game_id: gameId, player_number: 1, is_ai: false, user_type: UserRole.PLAYER },
      { uid: 'player2', email: 'ai_player2@example.com', username: 'AI Player Mock Omega', game_id: gameId, player_number: 2, is_ai: true, user_type: UserRole.PLAYER },
    ];
    
    const mockGame: GameDetailsView = {
      id: gameId,
      name: 'Mock Player Game Detailed',
      game_status: 'in_progress',
      current_round_number: 2,
      max_players: 3,
      number_of_rounds: 10,
      admin_id: 'adminMockUser123',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      updated_at: new Date().toISOString(),
      weather_sequence: Array(10).fill('SUNNY'),
      vermin_sequence: Array(10).fill('NONE'),
      player_uids: mockPlayers.map(p => p.uid),
      players: mockPlayers, 
      ai_player_strategies: { 'player2': 'BALANCED'}
    };
    return of(mockGame).pipe(delay(100));
  }

  submitPlayerDecisions(
    gameId: string,
    payload: {
      round_decisions: RoundDecisionBase;
      parcel_plantation_choices: Record<number, PlantationType>;
    }
  ): Observable<RoundWithFieldPublic> {
    console.log(`MockPlayerGameService: submitPlayerDecisions called for game ${gameId} with payload:`, payload);
    const mockRoundNumber = 2;
    const mockPlayerId = 'mockPlayerABC';
    const mockResponse: RoundWithFieldPublic = {
      id: `${gameId}_${mockPlayerId}_round_${mockRoundNumber}`,
      game_id: gameId,
      player_id: mockPlayerId,
      round_number: mockRoundNumber,
      is_submitted: true, 
      decisions: payload.round_decisions,
      field_state: { parcels: this.createMockParcels().map((p, index) => ({ 
          ...p, 
          id: `mock_parcel_${index + 1}`,
          current_plantation: payload.parcel_plantation_choices[index + 1] || p.current_plantation 
      })) },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return of(mockResponse).pipe(delay(200));
  }

  getPlayerResults(gameId: string): Observable<ResultPublic[]> {
    console.log(`MockPlayerGameService: getPlayerResults called for game ${gameId}`);
    const mockIncome1: TotalIncome = { total: 6000, crop_sales: 6000 };
    const mockExpenses1: TotalExpenses = { total: 2500, seeds: 2500 };
    const mockIncome2: TotalIncome = { total: 7500, crop_sales: 7500 };
    const mockExpenses2: TotalExpenses = { total: 4000, seeds: 3000, fertilizer: 1000 };

    const mockResults: ResultPublic[] = [
      {
        id: 'mockRes1', 
        calculated_at: new Date().toISOString(),
        game_id: gameId, 
        player_id: 'mockPlayerABC', 
        round_number: 0, 
        income_details: mockIncome1,
        expense_details: mockExpenses1,
        profit_or_loss: mockIncome1.total - mockExpenses1.total, 
        starting_capital: 10000,
        closing_capital: 10000 + (mockIncome1.total - mockExpenses1.total),
        achieved_organic_certification: false,
      },
      {
        id: 'mockRes2', 
        calculated_at: new Date().toISOString(),
        game_id: gameId, 
        player_id: 'mockPlayerABC', 
        round_number: 1, 
        income_details: mockIncome2,
        expense_details: mockExpenses2,
        profit_or_loss: mockIncome2.total - mockExpenses2.total,
        starting_capital: 13500, 
        closing_capital: 13500 + (mockIncome2.total - mockExpenses2.total),
        achieved_organic_certification: false,
      }
    ];
    return of(mockResults).pipe(delay(100));
  }
}

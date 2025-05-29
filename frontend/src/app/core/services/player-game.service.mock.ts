// File: frontend/src/app/core/services/player-game.service.mock.ts
import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  Parcel, PlantationType, FieldState, CropSequenceEffect, HarvestOutcome
} from '../models/parcel.model';
import { GamePublic } from '../models/game.model';
import { PlayerPublic } from '../models/player.model';
import { UserRole } from '../models/user.model'; 
import { RoundWithFieldPublic, RoundDecisionBase, PlayerRoundSubmission, RoundPublic } from '../models/round.model'; // Added RoundPublic
import { ResultPublic } from '../models/result.model';
import { IPlayerGameService } from './player-game.service.interface';
import { HarvestIncome, TotalExpensesBreakdown, SeedCosts, InvestmentCosts, RunningCosts } from '../models/financials.model';

@Injectable()
export class MockPlayerGameService implements IPlayerGameService {

  private mockRoundStore: Record<string, RoundWithFieldPublic> = {}; // For storing round states
  private mockGameStore: Record<string, GamePublic> = {}; // For storing game states

  private createMockParcels(count: number = 40): Parcel[] {
    const parcels: Parcel[] = [];
    const plantationTypes = Object.values(PlantationType);
    for (let i = 1; i <= count; i++) {
      parcels.push({
        id: `mock_parcel_${i}`,
        parcelNumber: i, 
        soilQuality: 75 + Math.floor(Math.random() * 10),
        nutrientLevel: 65 + Math.floor(Math.random() * 15),
        currentPlantation: plantationTypes[i % plantationTypes.length],
        previousPlantation: plantationTypes[(i + 1) % plantationTypes.length],
        prePreviousPlantation: plantationTypes[(i + 2) % plantationTypes.length],
        cropSequenceEffect: CropSequenceEffect.OK,
        lastHarvestYieldDt: Math.floor(Math.random() * 50) + 50,
        lastHarvestOutcomeCategory: HarvestOutcome.HIGH, 
      });
    }
    return parcels;
  }

  getCurrentRoundWithField(gameId: string): Observable<RoundWithFieldPublic> {
    console.log(`MockPlayerGameService: getCurrentRoundWithField called for game ${gameId}`);
    const gameDetails = this.mockGameStore[gameId];
    const currentRoundNumberFromGame = gameDetails ? gameDetails.currentRoundNumber : 2;
    
    // Using a static mockPlayerId for simplicity in this mock service
    const mockPlayerId = 'mockPlayerABC'; 

    const roundKey = `${gameId}_${mockPlayerId}_round_${currentRoundNumberFromGame}`;

    if (!this.mockRoundStore[roundKey]) {
        // Ensure 40 parcels are created for a new round state
        const mockParcels = this.createMockParcels(40);
        const newRound: RoundWithFieldPublic = {
          id: roundKey,
          gameId: gameId, 
          playerId: mockPlayerId, 
          roundNumber: currentRoundNumberFromGame, 
          isSubmitted: false, 
          decisions: { 
            fertilize: true, 
            pesticide: false,
            biologicalControl: true,
            attemptOrganicCertification: false,
            machineInvestmentLevel: 1
          },
          fieldState: { parcels: mockParcels }, 
          createdAt: new Date().toISOString(), 
          updatedAt: new Date().toISOString(), 
          weatherEvent: 'Normal',
          verminEvent: 'Keine',
        };
        this.mockRoundStore[roundKey] = newRound;
        if (this.mockGameStore[gameId]) {
            this.mockGameStore[gameId].currentRoundNumber = currentRoundNumberFromGame;
        } else {
            // Create a basic mock game if it doesn't exist
            this.mockGameStore[gameId] = {
                id: gameId,
                name: 'Mock Player Game (Implicitly Created)',
                gameStatus: 'active',
                currentRoundNumber: currentRoundNumberFromGame,
                numberOfRounds: 10,
                adminId: 'adminMockUser123',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                playerUids: [mockPlayerId],
            } as GamePublic;
        }
    }
    return of(this.mockRoundStore[roundKey]).pipe(delay(150));
  }

  getGameDetails(gameId: string): Observable<GamePublic> { 
    console.log(`MockPlayerGameService: getGameDetails called for game ${gameId}`);
    
    if (!this.mockGameStore[gameId]) {
        const mockPlayers: PlayerPublic[] = [
          // Add a mock player matching the user's reported email
          { uid: 'player-playe', email: 'player-playe@example.mock', username: 'Mock Player User', gameId: gameId, playerNumber: 1, isAi: false, userType: UserRole.PLAYER },
          { uid: 'player1', email: 'player1@example.com', username: 'Human Player Mock 1', gameId: gameId, playerNumber: 2, isAi: false, userType: UserRole.PLAYER }, 
          { uid: 'player2', email: 'ai_player2@example.com', username: 'AI Player Mock Omega', gameId: gameId, playerNumber: 3, isAi: true, userType: UserRole.PLAYER }, 
        ];
        const initialRoundNumber = 1; 
        this.mockGameStore[gameId] = { 
          id: gameId,
          name: 'Mock Player Game Detailed',
          gameStatus: 'active',
          currentRoundNumber: initialRoundNumber, 
          numberOfRounds: 10, 
          adminId: 'adminMockUser123', 
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), 
          updatedAt: new Date().toISOString(), 
          weatherSequence: Array(10).fill('SUNNY'), 
          verminSequence: Array(10).fill('NONE'), 
          playerUids: mockPlayers.map(p => p.uid), 
          players: mockPlayers, 
          aiPlayerStrategies: { 'player2': 'BALANCED'}
        };
    }
    return of(this.mockGameStore[gameId]).pipe(delay(100));
  }

  submitPlayerDecisions(
    gameId: string,
    roundNumber: number, 
    payload: PlayerRoundSubmission 
  ): Observable<RoundPublic> { 
    console.log(`MockPlayerGameService: submitPlayerDecisions for round ${roundNumber} in game ${gameId} with payload:`, payload);
    // Using a static mockPlayerId for simplicity in this mock service
    const mockPlayerId = 'mockPlayerABC'; 
    
    const roundKey = `${gameId}_${mockPlayerId}_round_${roundNumber}`;
    if (this.mockRoundStore[roundKey]) {
        this.mockRoundStore[roundKey].isSubmitted = true;
        this.mockRoundStore[roundKey].decisions = payload.roundDecisions;
        // Ensure that when updating, we still have 40 parcels, mapping choices by parcelNumber
        const currentParcels = this.mockRoundStore[roundKey].fieldState.parcels;
        const updatedParcels = currentParcels.map(p => ({
            ...p,
            currentPlantation: payload.parcelPlantationChoices[p.parcelNumber] || p.currentPlantation
        }));
         // If somehow the number of parcels changed (shouldn't happen with map, but as a safeguard)
        if (updatedParcels.length !== 40) {
             console.warn(`MockPlayerGameService: Parcel count mismatch during submission update. Expected 40, got ${updatedParcels.length}. Regenerating 40 parcels.`);
             this.mockRoundStore[roundKey].fieldState.parcels = this.createMockParcels(40);
        } else {
             this.mockRoundStore[roundKey].fieldState.parcels = updatedParcels;
        }

        this.mockRoundStore[roundKey].updatedAt = new Date().toISOString();
        if (this.mockGameStore[gameId] && this.mockGameStore[gameId].currentRoundNumber === roundNumber) {
            this.mockGameStore[gameId].currentRoundNumber++;
        }

    } else {
        console.warn(`MockPlayerGameService: Round ${roundNumber} not found for submission. Creating a new entry with 40 parcels.`);
        const mockParcels = this.createMockParcels(40); 
        const newRoundForSubmission: RoundWithFieldPublic = {
            id: roundKey,
            gameId: gameId,
            playerId: mockPlayerId,
            roundNumber: roundNumber,
            isSubmitted: true,
            decisions: payload.roundDecisions,
            fieldState: { parcels: mockParcels.map(p => ({ 
                ...p,
                currentPlantation: payload.parcelPlantationChoices[p.parcelNumber] || p.currentPlantation
            })) },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            weatherEvent: 'Normal', 
            verminEvent: 'Keine',  
        };
        this.mockRoundStore[roundKey] = newRoundForSubmission;
        if (this.mockGameStore[gameId]) {
            if (this.mockGameStore[gameId].currentRoundNumber <= roundNumber) {
                 this.mockGameStore[gameId].currentRoundNumber = roundNumber + 1;
            }
        } else {
             this.mockGameStore[gameId] = {
                id: gameId,
                name: 'Mock Player Game (Implicitly Updated)',
                gameStatus: 'active',
                currentRoundNumber: roundNumber + 1,
                maxPlayers: 3,
                numberOfRounds: 10,
                adminId: 'adminMockUser123',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                playerUids: [mockPlayerId],
            } as GamePublic;
        }
    }
    
    const { fieldState, ...roundPublicData } = this.mockRoundStore[roundKey];
    return of(roundPublicData as RoundPublic).pipe(delay(200));
  }

  getPlayerResults(gameId: string, playerId: string): Observable<ResultPublic[]> {
    console.log(`MockPlayerGameService: getPlayerResults called for game ${gameId}, player ${playerId}`);
    const mockIncome1: HarvestIncome = { total: 6000, fieldBean: 6000 }; 
    const mockExpenses1: TotalExpensesBreakdown = { 
        seedCosts: { fieldBean: 2500, total: 2500 } as SeedCosts,
        investmentCosts: { total: 0 } as InvestmentCosts,
        runningCosts: { total: 0 } as RunningCosts,
        grandTotal: 2500
    };
    const mockIncome2: HarvestIncome = { total: 7500, corn: 7500 }; // Corrected maize to corn
    const mockExpenses2: TotalExpensesBreakdown = {
        seedCosts: { corn: 3000, total: 3000 } as SeedCosts, // Corrected maize to corn
        investmentCosts: { total: 500 } as InvestmentCosts, 
        runningCosts: { total: 200 } as RunningCosts,     
        grandTotal: 3700
    };

    const mockResults: ResultPublic[] = [
      {
        id: 'mockRes1', 
        calculatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), 
        gameId: gameId, 
        playerId: playerId, 
        roundNumber: 0, 
        incomeDetails: mockIncome1, 
        expenseDetails: mockExpenses1, 
        profitOrLoss: mockIncome1.total - mockExpenses1.grandTotal, 
        startingCapital: 10000, 
        closingCapital: 10000 + (mockIncome1.total - mockExpenses1.grandTotal), 
        achievedOrganicCertification: false,
        weatherEvent: 'SUNNY',
        verminEvent: 'NONE',
        explanations: { general: 'A good start to the game.'}
      },
      {
        id: 'mockRes2',
        calculatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        gameId: gameId,
        playerId: playerId,
        roundNumber: 1, 
        incomeDetails: mockIncome2,
        expenseDetails: mockExpenses2,
        profitOrLoss: mockIncome2.total - mockExpenses2.grandTotal,
        startingCapital: 10000 + (mockIncome1.total - mockExpenses1.grandTotal), 
        closingCapital: (10000 + (mockIncome1.total - mockExpenses1.grandTotal)) + (mockIncome2.total - mockExpenses2.grandTotal),
        achievedOrganicCertification: false,
        weatherEvent: 'RAINY_MILD',
        verminEvent: 'APHIDS_LOW',
        explanations: { yield: 'Rain helped the corn grow well.', costs: 'Slight increase in running costs due to wet conditions.'}
      }
    ];
    // Filter by player ID if necessary, but the mock results currently assume a single player context
    return of(mockResults).pipe(delay(100));
  }
}

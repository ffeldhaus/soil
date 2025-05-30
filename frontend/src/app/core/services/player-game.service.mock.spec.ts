import { TestBed } from '@angular/core/testing';
import { MockPlayerGameService } from './player-game.service.mock';
import { PlantationType } from '../models/parcel.model';
import { PlayerRoundSubmission, RoundDecisionBase, RoundWithFieldPublic } from '../models/round.model'; // Added PlayerRoundSubmission and RoundWithFieldPublic
import { ResultPublic } from '../models/result.model';
import { firstValueFrom } from 'rxjs';

describe('MockPlayerGameService', () => {
  let service: MockPlayerGameService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockPlayerGameService]
    });
    service = TestBed.inject(MockPlayerGameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getCurrentRoundWithField should return mock round data', async () => {
    const gameId = 'mock-game-1';
    const roundData = await firstValueFrom(service.getCurrentRoundWithField(gameId));

    expect(roundData).toBeTruthy();
    expect(roundData.gameId).toBe(gameId);
    expect(roundData.roundNumber).toBe(2);
    expect(roundData.playerId).toBe('mockPlayerABC');
    expect(roundData.fieldState).toBeTruthy();
    expect(roundData.fieldState.parcels.length).toBeGreaterThan(0);
    expect(roundData.decisions?.fertilize).toBe(true);
  });

  it('getGameDetails should return mock game details', async () => {
    const gameId = 'mock-game-2';
    const gameDetails = await firstValueFrom(service.getGameDetails(gameId));

    expect(gameDetails).toBeTruthy();
    expect(gameDetails.id).toBe(gameId);
    expect(gameDetails.name).toBe('Mock Player Game Detailed'); // Corrected expected name
    expect(gameDetails.gameStatus).toBe('active'); // Corrected expected status
  });

  it('submitPlayerDecisions should return mock updated round data', async () => {
    const gameId = 'mock-game-3';
    const roundNumber = 1;
    const fullRoundDecisions: RoundDecisionBase = {
      fertilize: false,
      pesticide: true, // Set one decision for testing
      biological_control: false,
      attempt_organic_certification: false,
      machine_investment_level: 0
    };
    const payload: PlayerRoundSubmission = {
      roundDecisions: fullRoundDecisions,
      parcelPlantationChoices: { '1': PlantationType.WHEAT, '10': PlantationType.FALLOW }
    };
    // submitPlayerDecisions returns RoundPublic, which does not have fieldState
    const response = await firstValueFrom(service.submitPlayerDecisions(gameId, roundNumber, payload));

    expect(response).toBeTruthy();
    expect(response.gameId).toBe(gameId);
    expect(response.isSubmitted).toBe(true);
    expect(response.decisions?.pesticide).toBe(true);
    // Cannot assert on fieldState directly from submitPlayerDecisions response as it returns RoundPublic
    // To test fieldState changes, one would typically call getCurrentRoundWithField after this.
  });

  it('getPlayerResults should return mock results array with correct profit_or_loss', async () => {
    const gameId = 'mock-game-4';
    const playerId = 'mockPlayerXYZ'; // Added mock playerId
    const results: ResultPublic[] = await firstValueFrom(service.getPlayerResults(gameId, playerId));

    expect(results).toBeTruthy();
    expect(results.length).toBe(2);
    expect(results[0].gameId).toBe(gameId);
    expect(results[0].profitOrLoss).toBe(3500);
  });

});

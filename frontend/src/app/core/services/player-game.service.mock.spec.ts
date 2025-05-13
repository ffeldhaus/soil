import { TestBed } from '@angular/core/testing';
import { MockPlayerGameService } from './player-game.service.mock';
import { PlantationType } from '../models/parcel.model';
import { RoundDecisionBase } from '../models/round.model';
import { ResultPublic } from '../models/result.model'; // Import ResultPublic
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
    expect(roundData.game_id).toBe(gameId);
    expect(roundData.round_number).toBe(2);
    expect(roundData.player_id).toBe('mockPlayerABC');
    expect(roundData.field_state).toBeTruthy();
    expect(roundData.field_state.parcels.length).toBeGreaterThan(0);
    expect(roundData.decisions?.fertilize).toBe(true);
  });

  it('getGameDetails should return mock game details', async () => {
    const gameId = 'mock-game-2';
    const gameDetails = await firstValueFrom(service.getGameDetails(gameId));

    expect(gameDetails).toBeTruthy();
    expect(gameDetails.id).toBe(gameId);
    expect(gameDetails.name).toBe('Mock Player Game');
    expect(gameDetails.game_status).toBe('in_progress');
  });

  it('submitPlayerDecisions should return mock updated round data', async () => {
    const gameId = 'mock-game-3';
    const payload = {
      round_decisions: { pesticide: true } as RoundDecisionBase,
      parcel_plantation_choices: { 1: PlantationType.WHEAT, 10: PlantationType.FALLOW } // Corrected to FALLOW
    };
    const response = await firstValueFrom(service.submitPlayerDecisions(gameId, payload));

    expect(response).toBeTruthy();
    expect(response.game_id).toBe(gameId);
    expect(response.is_submitted).toBe(true);
    expect(response.decisions?.pesticide).toBe(true);
    const parcel1 = response.field_state.parcels.find(p => p.parcel_number === 1);
    expect(parcel1?.current_plantation).toBe(PlantationType.WHEAT);
    const parcel10 = response.field_state.parcels.find(p => p.parcel_number === 10);
    expect(parcel10?.current_plantation).toBe(PlantationType.FALLOW); // Corrected to FALLOW
  });

  it('getPlayerResults should return mock results array with correct profit_or_loss', async () => {
    const gameId = 'mock-game-4';
    const results: ResultPublic[] = await firstValueFrom(service.getPlayerResults(gameId));

    expect(results).toBeTruthy();
    expect(results.length).toBe(2);
    expect(results[0].game_id).toBe(gameId);
    expect(results[0].profit_or_loss).toBe(3500); // Corrected to profit_or_loss
  });

});

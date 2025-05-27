import { TestBed } from '@angular/core/testing';
import { PlayerGameService } from './player-game.service';
import { ApiService } from './api.service';
import { GamePublic } from '../models/game.model'; // Changed from GameDetailsView
import { RoundWithFieldPublic, PlayerRoundSubmission, RoundDecisionBase, RoundPublic } from '../models/round.model'; // Added RoundPublic
import { ResultPublic } from '../models/result.model';
import { PlantationType } from '../models/parcel.model';
import { of } from 'rxjs';

// Create a Jest mock for ApiService
const mockApiService = {
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(), 
  delete: jest.fn()
};

describe('PlayerGameService (Real Implementation with Jest)', () => {
  let service: PlayerGameService;
  let apiServiceSpy: jest.Mocked<ApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PlayerGameService,
        { provide: ApiService, useValue: mockApiService }
      ]
    });

    service = TestBed.inject(PlayerGameService);
    apiServiceSpy = TestBed.inject(ApiService) as jest.Mocked<ApiService>;

    apiServiceSpy.get.mockReset();
    apiServiceSpy.put.mockReset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getCurrentRoundWithField should call ApiService.get with correct URL', () => {
    const gameId = 'testGame123';
    const expectedUrl = `/games/${gameId}/rounds/my-current-round`; // Updated URL
    const mockResponse: RoundWithFieldPublic = {} as RoundWithFieldPublic;
    apiServiceSpy.get.mockReturnValue(of(mockResponse));

    service.getCurrentRoundWithField(gameId).subscribe();

    expect(apiServiceSpy.get).toHaveBeenCalledTimes(1);
    expect(apiServiceSpy.get).toHaveBeenCalledWith(expectedUrl);
  });

  it('getGameDetails should call ApiService.get with correct URL', () => {
    const gameId = 'testGame456';
    const expectedUrl = `/games/${gameId}`;
    const mockResponse: GamePublic = {} as GamePublic; // Changed from GameDetailsView
    apiServiceSpy.get.mockReturnValue(of(mockResponse));

    service.getGameDetails(gameId).subscribe();

    expect(apiServiceSpy.get).toHaveBeenCalledTimes(1);
    expect(apiServiceSpy.get).toHaveBeenCalledWith(expectedUrl);
  });

  it('submitPlayerDecisions should call ApiService.put with correct URL and payload', () => {
    const gameId = 'testGame789';
    const roundNumber = 1; // Added mock roundNumber
    const payload: PlayerRoundSubmission = { // Ensured type and corrected property names
      roundDecisions: { fertilize: true } as RoundDecisionBase, // Corrected property name
      parcelPlantationChoices: { '1': PlantationType.CORN, '5': PlantationType.POTATO } // Corrected property name
    };
    const expectedUrl = `/games/${gameId}/rounds/${roundNumber}/my-decisions`; // Updated URL
    const mockResponse: RoundPublic = {} as RoundPublic; // Changed to RoundPublic
    apiServiceSpy.put.mockReturnValue(of(mockResponse));

    service.submitPlayerDecisions(gameId, roundNumber, payload).subscribe(); // Added roundNumber

    expect(apiServiceSpy.put).toHaveBeenCalledTimes(1);
    expect(apiServiceSpy.put).toHaveBeenCalledWith(expectedUrl, payload);
  });

  it('getPlayerResults should call ApiService.get with correct URL', () => {
    const gameId = 'testGameABC';
    const playerId = 'playerXYZ'; // Added mock playerId
    const expectedUrl = `/games/${gameId}/results/my-results`; // Updated URL
    const mockResponse: ResultPublic[] = [];
    apiServiceSpy.get.mockReturnValue(of(mockResponse));

    service.getPlayerResults(gameId, playerId).subscribe(); // Added playerId

    expect(apiServiceSpy.get).toHaveBeenCalledTimes(1);
    expect(apiServiceSpy.get).toHaveBeenCalledWith(expectedUrl);
  });

});

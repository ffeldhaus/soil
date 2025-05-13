import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing'; // Keep for ApiService potentially
import { PlayerGameService } from './player-game.service';
import { ApiService } from './api.service';
import { GameDetailsView } from '../models/game.model';
import { RoundWithFieldPublic, RoundDecisionBase } from '../models/round.model';
import { ResultPublic } from '../models/result.model';
import { PlantationType } from '../models/parcel.model';
import { of } from 'rxjs';

// Create a Jest mock for ApiService
const mockApiService = {
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(), // Add other methods if ApiService has them
  delete: jest.fn()
};

describe('PlayerGameService (Real Implementation with Jest)', () => {
  let service: PlayerGameService;
  let apiServiceSpy: jest.Mocked<ApiService>; // Use Jest's mocked type

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule], // May still be needed if ApiService has dependencies
      providers: [
        PlayerGameService,
        // Provide the Jest mock
        { provide: ApiService, useValue: mockApiService }
      ]
    });

    service = TestBed.inject(PlayerGameService);
    // Get the injected mock instance
    apiServiceSpy = TestBed.inject(ApiService) as jest.Mocked<ApiService>;

    // Reset mocks before each test using Jest's reset functions
    apiServiceSpy.get.mockReset();
    apiServiceSpy.put.mockReset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getCurrentRoundWithField should call ApiService.get with correct URL', () => {
    const gameId = 'testGame123';
    const expectedUrl = `/games/${gameId}/current-round`;
    const mockResponse: RoundWithFieldPublic = {} as RoundWithFieldPublic;
    apiServiceSpy.get.mockReturnValue(of(mockResponse)); // Mock return value with Jest

    service.getCurrentRoundWithField(gameId).subscribe();

    // Use Jest matchers
    expect(apiServiceSpy.get).toHaveBeenCalledTimes(1);
    expect(apiServiceSpy.get).toHaveBeenCalledWith(expectedUrl);
  });

  it('getGameDetails should call ApiService.get with correct URL', () => {
    const gameId = 'testGame456';
    const expectedUrl = `/games/${gameId}`; // Adjust if endpoint differs
    const mockResponse: GameDetailsView = {} as GameDetailsView;
    apiServiceSpy.get.mockReturnValue(of(mockResponse));

    service.getGameDetails(gameId).subscribe();

    expect(apiServiceSpy.get).toHaveBeenCalledTimes(1);
    expect(apiServiceSpy.get).toHaveBeenCalledWith(expectedUrl);
  });

  it('submitPlayerDecisions should call ApiService.put with correct URL and payload', () => {
    const gameId = 'testGame789';
    const payload = {
      round_decisions: { fertilize: true } as RoundDecisionBase,
      parcel_plantation_choices: { '1': PlantationType.CORN, '5': PlantationType.POTATO }
    };
    const expectedUrl = `/games/${gameId}/current-round/submit`;
    const mockResponse: RoundWithFieldPublic = {} as RoundWithFieldPublic;
    apiServiceSpy.put.mockReturnValue(of(mockResponse));

    service.submitPlayerDecisions(gameId, payload).subscribe();

    expect(apiServiceSpy.put).toHaveBeenCalledTimes(1);
    expect(apiServiceSpy.put).toHaveBeenCalledWith(expectedUrl, payload);
  });

  it('getPlayerResults should call ApiService.get with correct URL', () => {
    const gameId = 'testGameABC';
    const expectedUrl = `/games/${gameId}/my-results`;
    const mockResponse: ResultPublic[] = [];
    apiServiceSpy.get.mockReturnValue(of(mockResponse));

    service.getPlayerResults(gameId).subscribe();

    expect(apiServiceSpy.get).toHaveBeenCalledTimes(1);
    expect(apiServiceSpy.get).toHaveBeenCalledWith(expectedUrl);
  });

});

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing'; // Added import
import { PlayerGameService } from './player-game.service';
import { ApiService } from './api.service';
import { GamePublic } from '../models/game.model';
import { RoundWithFieldPublic, PlayerRoundSubmission, RoundDecisionBase, RoundPublic } from '../models/round.model';
import { ResultPublic } from '../models/result.model';
import { PlantationType } from '../models/parcel.model';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment'; // Import environment
import { MockPlayerGameService } from './player-game.service.mock'; // Import mock service

// Create a Jest mock for ApiService for the 'useMocks = false' scenario
const mockRealApiService = {
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
  delete: jest.fn()
};

describe('PlayerGameService', () => {
  let service: PlayerGameService;
  let originalUseMocks: boolean;

  const setupTestBed = (useMocks: boolean) => {
    originalUseMocks = environment.useMocks; // Store original value
    environment.useMocks = useMocks;

    const providers: any[] = [PlayerGameService];
    if (useMocks) {
      providers.push(MockPlayerGameService); // Provide MockPlayerGameService
    } else {
      providers.push({ provide: ApiService, useValue: mockRealApiService });
    }

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule], // HttpClientTestingModule is needed for ApiService
      providers: providers
    });

    service = TestBed.inject(PlayerGameService);
  };

  // afterEach(() => { // Original afterEach for resetting mocks is moved/changed
  //   environment.useMocks = originalUseMocks;
  //   if (!environment.useMocks) {
  //       mockRealApiService.get.mockReset();
  //       mockRealApiService.put.mockReset();
  //       mockRealApiService.post.mockReset();
  //       mockRealApiService.delete.mockReset();
  //   }
  // });
  // Simpler global afterEach for environment restoration
  afterEach(() => {
    environment.useMocks = originalUseMocks;
  });


  describe('PlayerGameService (when useMocks is true)', () => {
    let getCurrentRoundWithFieldSpy: jest.SpyInstance;
    let getGameDetailsSpy: jest.SpyInstance;
    let submitPlayerDecisionsSpy: jest.SpyInstance;
    let getPlayerResultsSpy: jest.SpyInstance;

    beforeEach(() => {
      // Spy on prototype methods BEFORE PlayerGameService is instantiated (and thus its internal mockService)
      getCurrentRoundWithFieldSpy = jest.spyOn(MockPlayerGameService.prototype, 'getCurrentRoundWithField');
      getGameDetailsSpy = jest.spyOn(MockPlayerGameService.prototype, 'getGameDetails');
      submitPlayerDecisionsSpy = jest.spyOn(MockPlayerGameService.prototype, 'submitPlayerDecisions');
      getPlayerResultsSpy = jest.spyOn(MockPlayerGameService.prototype, 'getPlayerResults');

      setupTestBed(true);
    });

    afterEach(() => {
      // Restore all prototype spies
      getCurrentRoundWithFieldSpy.mockRestore();
      getGameDetailsSpy.mockRestore();
      submitPlayerDecisionsSpy.mockRestore();
      getPlayerResultsSpy.mockRestore();
    });

    it('should be created and use MockPlayerGameService', () => {
      expect(service).toBeTruthy();
      expect((service as any).mockService).toBeInstanceOf(MockPlayerGameService);
    });

    it('getCurrentRoundWithField should call mockService.getCurrentRoundWithField', () => {
      const gameId = 'mockGame1';
      service.getCurrentRoundWithField(gameId);
      expect(getCurrentRoundWithFieldSpy).toHaveBeenCalledWith(gameId);
    });

    it('getGameDetails should call mockService.getGameDetails', () => {
      const gameId = 'mockGame2';
      service.getGameDetails(gameId);
      expect(getGameDetailsSpy).toHaveBeenCalledWith(gameId);
    });

    it('submitPlayerDecisions should call mockService.submitPlayerDecisions', () => {
      const gameId = 'mockGame3';
      const roundNumber = 1;
      const mockRoundDecisions: RoundDecisionBase = { // Create a full RoundDecisionBase object
        fertilize: false,
        pesticide: false,
        biological_control: false,
        attempt_organic_certification: false,
        machine_investment_level: 0
      };
      const payload: PlayerRoundSubmission = { roundDecisions: mockRoundDecisions, parcelPlantationChoices: {} };
      service.submitPlayerDecisions(gameId, roundNumber, payload);
      expect(submitPlayerDecisionsSpy).toHaveBeenCalledWith(gameId, roundNumber, payload);
    });

    it('getPlayerResults should call mockService.getPlayerResults', () => {
      const gameId = 'mockGame4';
      const playerId = 'mockPlayer1';
      service.getPlayerResults(gameId, playerId);
      expect(getPlayerResultsSpy).toHaveBeenCalledWith(gameId, playerId);
    });
  });

  describe('PlayerGameService (when useMocks is false)', () => {
    let apiServiceSpy: jest.Mocked<ApiService>;

    beforeEach(() => {
      setupTestBed(false);
      apiServiceSpy = mockRealApiService as unknown as jest.Mocked<ApiService>;
      // Reset mocks before each test in this block
      apiServiceSpy.get.mockReset();
      apiServiceSpy.put.mockReset();
      apiServiceSpy.post.mockReset();
      apiServiceSpy.delete.mockReset();
    });

    it('should be created and not use MockPlayerGameService', () => {
      expect(service).toBeTruthy();
      expect((service as any).mockService).toBeNull(); // mockService should be null when useMocks is false
    });

    it('getCurrentRoundWithField should call ApiService.get with correct URL and return its response', (done) => {
      const gameId = 'testGame123';
      const expectedUrl = `/games/${gameId}/rounds/my-current-round`;
      // Expanded mockResponse to be a valid RoundWithFieldPublic
      const mockResponse: RoundWithFieldPublic = {
        id: 'round1', gameId: gameId, playerId: 'player1', roundNumber: 1, isSubmitted: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        fieldState: { parcels: [] },
        decisions: { fertilize: false, pesticide: false, biological_control: false, attempt_organic_certification: false, machine_investment_level: 0 }
      };
      apiServiceSpy.get.mockReturnValue(of(mockResponse));

      service.getCurrentRoundWithField(gameId).subscribe(response => {
        expect(response).toBe(mockResponse);
        expect(apiServiceSpy.get).toHaveBeenCalledTimes(1);
        expect(apiServiceSpy.get).toHaveBeenCalledWith(expectedUrl);
        done();
      });
    });

    it('getGameDetails should call ApiService.get with correct URL and return its response', (done) => {
      const gameId = 'testGame456';
      const expectedUrl = `/games/${gameId}`;
      // Expanded mockResponse to be a valid GamePublic
      const mockResponse: GamePublic = {
        id: gameId, name: 'Test Game', numberOfRounds: 10, currentRoundNumber: 1,
        gameStatus: 'active', adminId: 'admin1', createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), playerUids: ['player1']
      };
      apiServiceSpy.get.mockReturnValue(of(mockResponse));

      service.getGameDetails(gameId).subscribe(response => {
        expect(response).toBe(mockResponse);
        expect(apiServiceSpy.get).toHaveBeenCalledTimes(1);
        expect(apiServiceSpy.get).toHaveBeenCalledWith(expectedUrl);
        done();
      });
    });

    it('submitPlayerDecisions should call ApiService.put with correct URL/payload and return its response', (done) => {
      const gameId = 'testGame789';
      const roundNumber = 1;
      const payload: PlayerRoundSubmission = {
        roundDecisions: { fertilize: true, pesticide: false, biological_control: false, attempt_organic_certification: false, machine_investment_level: 1 } as RoundDecisionBase,
        parcelPlantationChoices: { '1': PlantationType.CORN }
      };
      const expectedUrl = `/games/${gameId}/rounds/${roundNumber}/my-decisions`;
      // Expanded mockResponse to be a valid RoundPublic
      const mockResponse: RoundPublic = {
        id: 'roundSubmit1', gameId: gameId, playerId: 'player1', roundNumber: roundNumber, isSubmitted: true,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        decisions: payload.roundDecisions
      };
      apiServiceSpy.put.mockReturnValue(of(mockResponse));

      service.submitPlayerDecisions(gameId, roundNumber, payload).subscribe(response => {
        expect(response).toBe(mockResponse);
        expect(apiServiceSpy.put).toHaveBeenCalledTimes(1);
        expect(apiServiceSpy.put).toHaveBeenCalledWith(expectedUrl, payload);
        done();
      });
    });

    it('getPlayerResults should call ApiService.get with correct URL and return its response', (done) => {
      const gameId = 'testGameABC';
      const playerId = 'playerXYZ';
      const expectedUrl = `/games/${gameId}/results/my-results`;
      // Expanded mockResponse to be a valid ResultPublic[]
      const mockResponse: ResultPublic[] = [{
        id: 'r1', gameId: gameId, playerId: playerId, roundNumber: 0, profitOrLoss: 1000, closingCapital: 11000,
        startingCapital: 10000, achievedOrganicCertification: false, calculatedAt: new Date().toISOString(),
        incomeDetails: { total: 2000 } as any, // Cast to any for brevity, should be full HarvestIncome
        expenseDetails: { grandTotal: 1000 } as any // Cast to any for brevity, should be full TotalExpensesBreakdown
      }];
      apiServiceSpy.get.mockReturnValue(of(mockResponse));

      service.getPlayerResults(gameId, playerId).subscribe(response => {
        expect(response).toBe(mockResponse);
        expect(apiServiceSpy.get).toHaveBeenCalledTimes(1);
        expect(apiServiceSpy.get).toHaveBeenCalledWith(expectedUrl);
        done();
      });
    });
  });
});

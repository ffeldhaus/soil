import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RoundService } from './round.service';
import { environment } from '../../../environments/environment';
// Removed DecisionType, FieldType, FieldValueType, GamePhase. GameStatus might be needed if used.
import { RoundPublic, RoundWithFieldPublic, PlayerRoundSubmission, FieldPublic, PlantationType } from '../models';

// Mock Data
const mockRoundPublic: RoundPublic = {
  id: 'round1', // Changed to string
  gameId: 'game1',
  playerId: 'player1',
  roundNumber: 1,
  // gameStatus: 'active', // Removed: gameStatus is not a property of RoundInDB/RoundPublic
  isSubmitted: false,
  decisions: { fertilize: false, pesticide: false, biological_control: false, attempt_organic_certification: false, machine_investment_level: 0 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// The FieldPublic model is just { parcels: Parcel[] }. The mock below is entirely different.
// Commenting out for now to avoid compilation errors. Tests using this will fail or need skipping.
/*
const mockFieldPublic: FieldPublic = {
  id: 'field1',
  name: 'Test Field',
  description: 'A test field',
  fieldType: FieldType.TEXT, // FieldType removed
  valueType: FieldValueType.STRING, // FieldValueType removed
  value: 'Test Value',
  roundId: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
*/
const mockActualFieldPublic: FieldPublic = { parcels: [] };


const mockRoundWithFieldPublic: RoundWithFieldPublic = {
  ...mockRoundPublic,
  // field: mockFieldPublic, // mockFieldPublic is commented out
  fieldState: mockActualFieldPublic, // Use actual FieldPublic structure
};

const mockPlayerRoundSubmission: PlayerRoundSubmission = {
  roundDecisions: { // Changed to match RoundDecisionBase
    fertilize: true,
    pesticide: false,
    biological_control: true,
    attempt_organic_certification: false,
    machine_investment_level: 1
  },
  parcelPlantationChoices: { '1': PlantationType.WHEAT } // Assuming PlantationType is available
};

describe('RoundService', () => {
  let service: RoundService;
  let httpMock: HttpTestingController;
  const apiBaseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RoundService],
    });
    service = TestBed.inject(RoundService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding requests
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getPlayerRounds', () => {
    it('should make a GET request to retrieve player rounds', (done) => {
      const gameId = 'game1';
      const mockResponse: RoundPublic[] = [mockRoundPublic];

      service.getPlayerRounds(gameId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/games/${gameId}/rounds/my-rounds`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  it('should make a GET request to retrieve current player round details', (done) => { // Unskipped test
    const gameId = 'game1';
    const mockResponse: RoundWithFieldPublic = mockRoundWithFieldPublic;

    service.getPlayerCurrentRoundDetails(gameId).subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });

    const req = httpMock.expectOne(`${apiBaseUrl}/games/${gameId}/rounds/my-current-round`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  describe('submitPlayerRoundDecisions', () => {
    it('should make a PUT request to submit player round decisions', (done) => {
      const gameId = 'game1';
      const roundNumber = 2;
      const submission: PlayerRoundSubmission = mockPlayerRoundSubmission;
      const mockResponse: RoundPublic = { ...mockRoundPublic, roundNumber: 2, id: 'round2' };

      service.submitPlayerRoundDecisions(gameId, roundNumber, submission).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/games/${gameId}/rounds/${roundNumber}/my-decisions`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(submission);
      req.flush(mockResponse);
    });
  });

  it('should make a GET request to retrieve specific player round details', (done) => { // Unskipped test
    const gameId = 'game1';
    const roundNumber = 3;
    const mockResponse: RoundWithFieldPublic = { ...mockRoundWithFieldPublic, roundNumber: 3, id: 'round3' };

    service.getPlayerRoundDetails(gameId, roundNumber).subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });

    const req = httpMock.expectOne(`${apiBaseUrl}/games/${gameId}/rounds/${roundNumber}/my-details`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
  // });
});

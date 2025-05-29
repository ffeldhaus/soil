import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RoundService } from './round.service';
import { environment } from '../../../environments/environment';
import { RoundPublic, RoundWithFieldPublic, PlayerRoundSubmission, DecisionType, FieldPublic, FieldType, FieldValueType, GamePhase } from '../models'; // Assuming models are barrelled in core/models

// Mock Data (adjust as per actual model definitions if necessary)
const mockRoundPublic: RoundPublic = {
  id: 1,
  gameId: 'game1',
  roundNumber: 1,
  phase: GamePhase.ACTIVE, // Or any appropriate GamePhase
  isCurrentRound: true,
  playerDecisions: {},
  roundResult: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockFieldPublic: FieldPublic = {
  id: 'field1',
  name: 'Test Field',
  description: 'A test field',
  fieldType: FieldType.TEXT,
  valueType: FieldValueType.STRING,
  value: 'Test Value',
  roundId: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockRoundWithFieldPublic: RoundWithFieldPublic = {
  ...mockRoundPublic,
  field: mockFieldPublic,
};

const mockPlayerRoundSubmission: PlayerRoundSubmission = {
  decisions: [
    {
      fieldId: 'field1',
      decisionType: DecisionType.KEEP,
      value: null,
    }
  ]
};

describe('RoundService', () => {
  let service: RoundService;
  let httpMock: HttpTestingController;
  const apiBaseUrl = environment.apiUrl; // Use apiUrl as per previous services

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

  describe('getPlayerCurrentRoundDetails', () => {
    it('should make a GET request to retrieve current player round details', (done) => {
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
  });

  describe('submitPlayerRoundDecisions', () => {
    it('should make a PUT request to submit player round decisions', (done) => {
      const gameId = 'game1';
      const roundNumber = 2;
      const submission: PlayerRoundSubmission = mockPlayerRoundSubmission;
      const mockResponse: RoundPublic = { ...mockRoundPublic, roundNumber: 2 };

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

  describe('getPlayerRoundDetails', () => {
    it('should make a GET request to retrieve specific player round details', (done) => {
      const gameId = 'game1';
      const roundNumber = 3;
      const mockResponse: RoundWithFieldPublic = { ...mockRoundWithFieldPublic, roundNumber: 3 };

      service.getPlayerRoundDetails(gameId, roundNumber).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/games/${gameId}/rounds/${roundNumber}/my-details`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { GameService } from './game.service';
import { GamePublic, GameStatus } from '../models'; // Changed to use barrel import
import { ApiService } from './api.service';

class MockApiService {}

describe('GameService', () => {
  let service: GameService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GameService,
        { provide: ApiService, useClass: MockApiService }
      ],
    });
    service = TestBed.inject(GameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getGameById (current placeholder behavior)', () => {
    it('should return an Observable of GamePublic with placeholder data', (done) => {
      const testGameId = 'test-game-123';
      // Aligning expectedPlaceholderGame with the actual placeholder data in GameService
      const expectedPlaceholderGame: GamePublic = {
        id: testGameId,
        name: 'Placeholder Game Name',
        adminId: 'admin123', // Matched to service placeholder
        gameStatus: 'active',  // Matched to service placeholder
        numberOfRounds: 15,    // Matched to service placeholder
        currentRoundNumber: 1, // Matched to service placeholder
        playerUids: [],       // Matched to service placeholder
        players: [],          // Matched to service placeholder (service actually returns this too)
        createdAt: new Date().toISOString(), // This will be compared by structure, not exact value
        updatedAt: new Date().toISOString(), // This will be compared by structure, not exact value
      };

      service.getGameById(testGameId).subscribe(game => {
        expect(game).toBeTruthy();
        expect(game.id).toBe(expectedPlaceholderGame.id); // Use expectedPlaceholderGame for id too
        expect(game.name).toBe(expectedPlaceholderGame.name);
        expect(game.adminId).toBe(expectedPlaceholderGame.adminId);
        expect(game.gameStatus).toBe(expectedPlaceholderGame.gameStatus);
        expect(game.numberOfRounds).toBe(expectedPlaceholderGame.numberOfRounds);
        expect(game.currentRoundNumber).toBe(expectedPlaceholderGame.currentRoundNumber);
        expect(game.playerUids).toEqual(expectedPlaceholderGame.playerUids);
        expect(game.players).toEqual(expectedPlaceholderGame.players); // Added check for players array
        // For dates, only check if they are valid ISO strings
        expect(Date.parse(game.createdAt as string)).not.toBeNaN();
        expect(Date.parse(game.updatedAt as string)).not.toBeNaN();
        done();
      });
    });

    it('should return a different id if a different id is passed', (done) => {
      const testGameId = 'another-test-id-456';
      service.getGameById(testGameId).subscribe(game => {
        expect(game).toBeTruthy();
        expect(game.id).toBe(testGameId);
        // Check against the known placeholder values from the service
        expect(game.name).toBe('Placeholder Game Name');
        expect(game.adminId).toBe('admin123');
        expect(game.numberOfRounds).toBe(15);
        expect(game.currentRoundNumber).toBe(1);
        expect(game.gameStatus).toBe('active');
        expect(game.playerUids).toEqual([]);
        expect(game.players).toEqual([]);
        done();
      });
    });
  });
});

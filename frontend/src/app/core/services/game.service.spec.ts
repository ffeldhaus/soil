import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing'; // Included for future adaptation
import { GameService } from './game.service';
import { GamePublic, GamePhase, GameVisibility } from '../models/game.model';
import { ApiService } from './api.service';

// Mock ApiService for now, as GameService depends on it but its methods are not used by getGameById's current implementation
class MockApiService {}

describe('GameService', () => {
  let service: GameService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule], // Included for future adaptation
      providers: [
        GameService,
        { provide: ApiService, useClass: MockApiService } // Provide mock ApiService
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
      const expectedPlaceholderGame: GamePublic = {
        id: testGameId,
        name: 'Placeholder Game Name',
        hostId: 'host-placeholder-id',
        phase: GamePhase.LOBBY,
        visibility: GameVisibility.PUBLIC,
        playerCount: 0,
        maxPlayers: 8,
        gameSettings: {
          totalRounds: 3,
          roundTimer: 60,
          intermissionTimer: 15,
        },
        createdAt: new Date().toISOString(), // Placeholder: actual value is dynamic
        updatedAt: new Date().toISOString(), // Placeholder: actual value is dynamic
      };

      service.getGameById(testGameId).subscribe(game => {
        expect(game).toBeTruthy();
        expect(game.id).toBe(testGameId);
        expect(game.name).toBe(expectedPlaceholderGame.name);
        expect(game.hostId).toBe(expectedPlaceholderGame.hostId);
        expect(game.phase).toBe(expectedPlaceholderGame.phase);
        expect(game.visibility).toBe(expectedPlaceholderGame.visibility);
        expect(game.playerCount).toBe(expectedPlaceholderGame.playerCount);
        expect(game.maxPlayers).toBe(expectedPlaceholderGame.maxPlayers);
        expect(game.gameSettings).toEqual(expectedPlaceholderGame.gameSettings);
        // For dates, we can check if they are valid ISO strings since exact match is hard
        expect(new Date(game.createdAt).toISOString()).toBe(game.createdAt);
        expect(new Date(game.updatedAt).toISOString()).toBe(game.updatedAt);
        done();
      });
    });

    it('should return a different id if a different id is passed', (done) => {
      const testGameId = 'another-test-id-456';
      service.getGameById(testGameId).subscribe(game => {
        expect(game).toBeTruthy();
        expect(game.id).toBe(testGameId);
        // Other properties would be the same placeholder values
        expect(game.name).toBe('Placeholder Game Name');
        done();
      });
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminGameService } from './admin-game.service';
import { MockAdminGameService } from './admin-game.service.mock';
import { environment } from '../../../environments/environment';
import { GameAdminListItem, GameCreateAdminPayload, GamePublic, GameStatus, UserRole } from '../models'; // Added UserRole
describe('AdminGameService', () => {
  let service: AdminGameService;
  let httpMock: HttpTestingController;
  let mockAdminGameServiceInstance: MockAdminGameService | null = null; // Initialize to null

  // Helper to spy on the internal mockService instance
  const spyOnInternalMock = () => {
    // Access the privately instantiated mockService for spying.
    mockAdminGameServiceInstance = (service as any).mockService; // Changed to (service as any)
    if (mockAdminGameServiceInstance) {
      // Use jest.spyOn
      jest.spyOn(mockAdminGameServiceInstance, 'getAdminGames');
      jest.spyOn(mockAdminGameServiceInstance, 'createGame');
      jest.spyOn(mockAdminGameServiceInstance, 'getGameDetails'); // Added spy
      jest.spyOn(mockAdminGameServiceInstance, 'advanceGameRound');
      jest.spyOn(mockAdminGameServiceInstance, 'deleteGame');
    }
  };

  const setupTestBed = (useMocks: boolean) => {
    // A better way to handle environment might be needed, but for now:
    const originalEnvironment = { ...environment }; // Shallow copy
    environment.useMocks = useMocks;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AdminGameService,
      ]
    });

    service = TestBed.inject(AdminGameService);
    httpMock = TestBed.inject(HttpTestingController);

    if (useMocks) {
      spyOnInternalMock();
    }

    // Return a cleanup function to restore the environment
    return () => {
      environment.useMocks = originalEnvironment.useMocks;
    };
  };

  let cleanupEnvironment: () => void;

  afterEach(() => {
    httpMock.verify();
    if (cleanupEnvironment) {
      cleanupEnvironment(); // Restore environment
    }
    // Reset Jest spies if mock instance exists
    if (mockAdminGameServiceInstance) {
       (mockAdminGameServiceInstance.getAdminGames as jest.Mock).mockRestore();
       (mockAdminGameServiceInstance.createGame as jest.Mock).mockRestore();
       if (mockAdminGameServiceInstance.getGameDetails) { // Check if spy exists before restoring
        (mockAdminGameServiceInstance.getGameDetails as jest.Mock).mockRestore();
       }
       (mockAdminGameServiceInstance.advanceGameRound as jest.Mock).mockRestore();
       (mockAdminGameServiceInstance.deleteGame as jest.Mock).mockRestore();
       mockAdminGameServiceInstance = null; // Clear reference
    }
  });

  describe('when useMocks is true', () => {
    beforeEach(() => {
      cleanupEnvironment = setupTestBed(true);
    });

    it('should be created and use MockAdminGameService', () => {
      expect(service).toBeTruthy();
      expect((service as any).mockService).toBeInstanceOf(MockAdminGameService); // Changed to (service as any)
      expect(mockAdminGameServiceInstance).not.toBeNull();
    });

    it('getAdminGames should call mockService.getAdminGames', () => {
      service.getAdminGames();
      expect(mockAdminGameServiceInstance!.getAdminGames).toHaveBeenCalled();
    });

    it('createGame should call mockService.createGame', () => {
      // Corrected payload to match GameCreateAdminPayload interface
      const payload: GameCreateAdminPayload = { name: 'Test', numberOfRounds: 10, requestedPlayerSlots: 2, aiPlayerCount: 0 };
      service.createGame(payload);
      expect(mockAdminGameServiceInstance!.createGame).toHaveBeenCalledWith(payload);
    });

    it('advanceGameRound should call mockService.advanceGameRound', () => {
      const gameId = 'mockGame1';
      service.advanceGameRound(gameId);
      expect(mockAdminGameServiceInstance!.advanceGameRound).toHaveBeenCalledWith(gameId);
    });

    it('getGameDetails should call mockService.getGameDetails', () => {
      const gameId = 'mockGameId';
      service.getGameDetails(gameId);
      expect(mockAdminGameServiceInstance!.getGameDetails).toHaveBeenCalledWith(gameId);
    });

    it('deleteGame should call mockService.deleteGame', () => {
      const gameId = 'mockGame1';
      service.deleteGame(gameId);
      expect(mockAdminGameServiceInstance!.deleteGame).toHaveBeenCalledWith(gameId);
    });
  });

  describe('when useMocks is false', () => {
    beforeEach(() => {
      cleanupEnvironment = setupTestBed(false);
    });

    it('should be created and not use MockAdminGameService', () => {
      expect(service).toBeTruthy();
      expect((service as any).mockService).toBeNull(); // Changed to (service as any)
      expect(mockAdminGameServiceInstance).toBeNull();
    });

    it('getAdminGames should make an HTTP GET request', () => {
      // Corrected dummyGames to match GameAdminListItem interface
      const dummyGames: GameAdminListItem[] = [{
        id: 'g1',
        name: 'Real Game',
        gameStatus: GameStatus.PENDING,
        currentRoundNumber: 0,
        adminId: 'adminUser1',
        createdAt: new Date().toISOString(),
        playerCount: 1
      }];
      service.getAdminGames().subscribe(games => {
        expect(games.length).toBe(1);
        expect(games).toEqual(dummyGames);
      });
      const req = httpMock.expectOne(`${environment.apiUrl}/admin/games`);
      expect(req.request.method).toBe('GET');
      req.flush(dummyGames);
    });

    it('createGame should make an HTTP POST request', () => {
      // Corrected payload and dummyResponse to match interfaces
      const payload: GameCreateAdminPayload = { name: 'New Game', numberOfRounds: 5, requestedPlayerSlots: 2 };
      const dummyResponse: GamePublic = {
        id: 'g2', 
        name: 'New Game', 
        gameStatus: GameStatus.PENDING,
        currentRoundNumber: 0, 
        numberOfRounds: 5,
        adminId: 'adminUser1',
        playerUids: [],
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString()  
      };
      service.createGame(payload).subscribe(response => {
        expect(response).toEqual(dummyResponse);
      });
      const req = httpMock.expectOne(`${environment.apiUrl}/admin/games`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(dummyResponse);
    });

    it('advanceGameRound should make an HTTP POST request', () => {
      const gameId = 'game123';
      const dummyResponse: GamePublic = {
        id: gameId, 
        name: 'Advanced Game', 
        gameStatus: GameStatus.ACTIVE,
        currentRoundNumber: 1, 
        numberOfRounds: 5,
        adminId: 'adminUser1',
        playerUids: [],
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString()  
      };
      service.advanceGameRound(gameId).subscribe(response => {
        expect(response).toEqual(dummyResponse);
      });
      const req = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameId}/advance-to-next-round`);
      expect(req.request.method).toBe('POST');
      req.flush(dummyResponse);
    });

    describe('getGameDetails', () => {
      const mockGameDetails: GamePublic = {
        id: 'game1',
        name: 'Test Game 1',
        gameStatus: GameStatus.PENDING,
        currentRoundNumber: 0,
        numberOfRounds: 10,
        adminId: 'adminTest1',
        playerUids: ['p1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        players: [
          // Removed 'role: null' as it does not exist on PlayerPublic
          { uid: 'p1', username: 'Player 1', email: 'p1@example.com', playerNumber: 1, gameId: 'game1', isAi: false, userType: UserRole.PLAYER }
        ]
      };

      it('should make a GET request and return game details with players array', () => {
        const gameId = 'game1';
        service.getGameDetails(gameId).subscribe(response => {
          expect(response).toEqual(mockGameDetails);
          expect(response.players?.length).toBe(1);
        });
        const req = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameId}`);
        expect(req.request.method).toBe('GET');
        req.flush(mockGameDetails);
      });

      it('should make a GET request and return game details with empty players array if players is undefined', () => {
        const gameId = 'game2';
        const mockGameWithoutPlayers: GamePublic = { ...mockGameDetails, id: gameId, players: undefined, playerUids: [] };
        service.getGameDetails(gameId).subscribe(response => {
          expect(response.id).toBe(gameId);
          expect(response.players).toEqual([]);
        });
        const req = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameId}`);
        expect(req.request.method).toBe('GET');
        req.flush(mockGameWithoutPlayers);
      });

      it('should make a GET request and return game details with empty players array if players is null', () => {
        const gameId = 'game3';
        const mockGameWithNullPlayers: GamePublic = { ...mockGameDetails, id: gameId, players: null as any, playerUids: [] };
        service.getGameDetails(gameId).subscribe(response => {
          expect(response.id).toBe(gameId);
          expect(response.players).toEqual([]);
        });
        const req = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameId}`);
        expect(req.request.method).toBe('GET');
        req.flush(mockGameWithNullPlayers);
      });
    });

    it('deleteGame should make an HTTP DELETE request', () => {
      const gameId = 'game123';
      service.deleteGame(gameId).subscribe(response => {
        expect(response).toBeUndefined(); // Service method returns Observable<void>
      });
      const req = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameId}`); // Use correct base URL
      expect(req.request.method).toBe('DELETE');
      // Flush with null or an empty object for void response, depending on backend
      // Assuming backend returns 204 No Content, flush(null) is appropriate.
      req.flush(null, { status: 204, statusText: 'No Content' }); 
    });
  });
});

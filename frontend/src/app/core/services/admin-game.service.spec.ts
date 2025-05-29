import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminGameService } from './admin-game.service';
import { MockAdminGameService } from './admin-game.service.mock';
import { environment } from '../../../environments/environment';
import { GameAdminListItem, GameCreateAdminPayload, GameDetailsView } from '../models/game.model';

describe('AdminGameService', () => {
  let service: AdminGameService;
  let httpMock: HttpTestingController;
  let mockAdminGameServiceInstance: MockAdminGameService | null = null; // Initialize to null

  // Helper to spy on the internal mockService instance
  const spyOnInternalMock = () => {
    // Access the privately instantiated mockService for spying.
    mockAdminGameServiceInstance = (service as any).mockService;
    if (mockAdminGameServiceInstance) {
      // Use jest.spyOn
      jest.spyOn(mockAdminGameServiceInstance, 'getAdminGames');
      jest.spyOn(mockAdminGameServiceInstance, 'createGame');
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
      expect((service as any).mockService).toBeInstanceOf(MockAdminGameService);
      expect(mockAdminGameServiceInstance).not.toBeNull(); // Ensure the spy helper found the mock
    });

    it('getAdminGames should call mockService.getAdminGames', () => {
      service.getAdminGames();
      expect(mockAdminGameServiceInstance!.getAdminGames).toHaveBeenCalled();
    });

    it('createGame should call mockService.createGame', () => {
      const payload: GameCreateAdminPayload = { name: 'Test', numberOfPlayers: 2 };
      service.createGame(payload);
      expect(mockAdminGameServiceInstance!.createGame).toHaveBeenCalledWith(payload);
    });

    it('advanceGameRound should call mockService.advanceGameRound', () => {
      const gameId = 'mockGame1';
      service.advanceGameRound(gameId);
      expect(mockAdminGameServiceInstance!.advanceGameRound).toHaveBeenCalledWith(gameId);
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
      expect((service as any).mockService).toBeNull();
      expect(mockAdminGameServiceInstance).toBeNull();
    });

    it('getAdminGames should make an HTTP GET request', () => {
      const dummyGames: GameAdminListItem[] = [{id: 'g1', name: 'Real Game', gameStatus: 'pending', currentRoundNumber: 0, maxPlayers: 1}];
      service.getAdminGames().subscribe(games => {
        expect(games.length).toBe(1);
        expect(games).toEqual(dummyGames);
      });
      const req = httpMock.expectOne(`${environment.apiUrl}/admin/games`); // Use correct base URL
      expect(req.request.method).toBe('GET');
      req.flush(dummyGames);
    });

    it('createGame should make an HTTP POST request', () => {
      const payload: GameCreateAdminPayload = { name: 'New Game', numberOfPlayers: 2 };
      const dummyResponse: GameDetailsView = { 
        id: 'g2', 
        name: 'New Game', 
        gameStatus: 'pending', 
        currentRoundNumber: 0, 
        maxPlayers: 2, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString()  
      };
      service.createGame(payload).subscribe(response => {
        expect(response).toEqual(dummyResponse);
      });
      const req = httpMock.expectOne(`${environment.apiUrl}/admin/games`); // Use correct base URL
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(dummyResponse);
    });

    it('advanceGameRound should make an HTTP POST request', () => {
      const gameId = 'game123';
      const dummyResponse: GameDetailsView = { 
        id: gameId, 
        name: 'Advanced Game', 
        gameStatus: 'in_progress', 
        currentRoundNumber: 1, 
        maxPlayers: 2,
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString()  
      };
      service.advanceGameRound(gameId).subscribe(response => {
        expect(response).toEqual(dummyResponse);
      });
      const req = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameId}/advance`); // Use correct base URL
      expect(req.request.method).toBe('POST');
      req.flush(dummyResponse);
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

// File: frontend/src/app/core/services/admin-game.service.mock.ts
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { GameAdminListItem, GamePublic, GameCreateAdminPayload, GameStatus } from '../models/game.model';
// import { PlayerPublic } from '../models/player.model'; // Not directly used as a type
import { UserRole } from '../models/user.model';
import { IAdminGameService } from './admin-game.service.interface';

export class MockAdminGameService implements IAdminGameService {
  private mockGamesStore: GamePublic[] = [
    {
      id: 'mockGame1',
      name: 'Mock Game Alpha',
      gameStatus: GameStatus.PENDING,
      currentRoundNumber: 0,
      adminId: 'adminUser123',
      numberOfRounds: 10,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      updatedAt: new Date().toISOString(),
      weatherSequence: Array(10).fill('SUNNY'),
      verminSequence: Array(10).fill('NONE'),
      playerUids: ['player1', 'player2'],
      players: [
        { uid: 'player1', email: 'player1@example.com', username: 'Human Player 1', gameId: 'mockGame1', playerNumber: 1, isAi: false, userType: UserRole.PLAYER },
        { uid: 'player2', email: 'ai_player2@example.com', username: 'AI Player Omega', gameId: 'mockGame1', playerNumber: 2, isAi: true, userType: UserRole.PLAYER },
      ]
    },
    {
      id: 'mockGame2',
      name: 'Mock Game Beta',
      gameStatus: GameStatus.ACTIVE,
      currentRoundNumber: 2,
      adminId: 'adminUser123',
      numberOfRounds: 5,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      updatedAt: new Date().toISOString(),
      weatherSequence: Array(5).fill('CLOUDY'),
      verminSequence: Array(5).fill('RATS'),
      playerUids: ['player3'],
      players: [
        { uid: 'player3', email: 'player3@example.com', username: 'Solo Player Gamma', gameId: 'mockGame2', playerNumber: 1, isAi: false, userType: UserRole.PLAYER },
      ]
    }
  ];

  getAdminGames(): Observable<GameAdminListItem[]> {
    // console.log('MockAdminGameService: getAdminGames called');
    const listItems: GameAdminListItem[] = this.mockGamesStore.map(game => ({
      id: game.id,
      name: game.name,
      gameStatus: game.gameStatus,
      currentRoundNumber: game.currentRoundNumber,
      adminId: game.adminId,
      createdAt: game.createdAt,
      playerCount: game.playerUids.length
    }));
    return of(listItems).pipe(delay(300));
  }

  getGameDetails(gameId: string): Observable<GamePublic> {
    // console.log(`MockAdminGameService: getGameDetails called for game ${gameId}`);
    const game = this.mockGamesStore.find(g => g.id === gameId);
    if (game) {
      return of({...game}).pipe(delay(300));
    }
    // Fallback or throwError - for now, returning first if not found (adjust as needed)
    const fallbackGame = this.mockGamesStore.length > 0 ? this.mockGamesStore[0] : {} as GamePublic;
    return of(fallbackGame).pipe(delay(300)); 
  }

  createGame(payload: GameCreateAdminPayload): Observable<GamePublic> {
    // console.log('MockAdminGameService: createGame called with', payload);
    const newMockGame: GamePublic = {
      id: `mockNew-${Math.random().toString(36).substring(7)}`,
      name: payload.name,
      gameStatus: GameStatus.PENDING,
      currentRoundNumber: 0,
      numberOfRounds: payload.numberOfRounds,
      adminId: 'currentAdminUserMock',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      weatherSequence: Array(payload.numberOfRounds).fill('SUNNY'),
      verminSequence: Array(payload.numberOfRounds).fill('NONE'),
      playerUids: [], // Player UIDs will be added when players join/are added
      players: [], // Player details will be added when players join/are added
      aiPlayerStrategies: {}
    };
    this.mockGamesStore.push(newMockGame);
    return of(newMockGame).pipe(delay(300));
  }

  advanceGameRound(gameId: string): Observable<GamePublic> {
    // console.log(`MockAdminGameService: advanceGameRound called for game ${gameId}`);
    const game = this.mockGamesStore.find(g => g.id === gameId);
    if (game) {
      if (game.gameStatus === GameStatus.PENDING) game.gameStatus = GameStatus.ACTIVE;
      if (game.currentRoundNumber < game.numberOfRounds) {
        game.currentRoundNumber += 1;
      }
      if (game.currentRoundNumber === game.numberOfRounds && game.gameStatus !== GameStatus.FINISHED) {
        game.gameStatus = GameStatus.FINISHED;
      }
      game.updatedAt = new Date().toISOString();
      return of({...game}).pipe(delay(300));
    }
    const fallbackGame = this.mockGamesStore.length > 0 ? this.mockGamesStore[0] : {} as GamePublic;
    return of(fallbackGame).pipe(delay(300)); 
  }

  deleteGame(gameId: string): Observable<void> {
    // console.log(`MockAdminGameService: deleteGame called for game ${gameId}`);
    this.mockGamesStore = this.mockGamesStore.filter(g => g.id !== gameId);
    return of(undefined).pipe(delay(300));
  }
}

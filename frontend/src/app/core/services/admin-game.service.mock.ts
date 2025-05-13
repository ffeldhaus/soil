// File: frontend/src/app/core/services/admin-game.service.mock.ts
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { GameAdminListItem, GameDetailsView, GameCreateAdminPayload } from '../models/game.model'; // Removed PlayerPublic from here
import { PlayerPublic } from '../models/player.model'; // Added PlayerPublic import from correct path
import { UserRole } from '../models/user.model';
import { IAdminGameService } from './admin-game.service.interface';

export class MockAdminGameService implements IAdminGameService {
  private mockGamesStore: GameDetailsView[] = [
    {
      id: 'mockGame1',
      name: 'Mock Game Alpha',
      game_status: 'pending',
      current_round_number: 0,
      max_players: 4,
      admin_id: 'adminUser123',
      number_of_rounds: 10,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Yesterday
      updated_at: new Date().toISOString(),
      weather_sequence: Array(10).fill('SUNNY'),
      vermin_sequence: Array(10).fill('NONE'),
      player_uids: ['player1', 'player2'],
      players: [
        { uid: 'player1', email: 'player1@example.com', username: 'Human Player 1', game_id: 'mockGame1', player_number: 1, is_ai: false, user_type: UserRole.PLAYER },
        { uid: 'player2', email: 'ai_player2@example.com', username: 'AI Player Omega', game_id: 'mockGame1', player_number: 2, is_ai: true, user_type: UserRole.PLAYER },
      ]
    },
    {
      id: 'mockGame2',
      name: 'Mock Game Beta',
      game_status: 'in_progress',
      current_round_number: 2,
      max_players: 3,
      admin_id: 'adminUser123',
      number_of_rounds: 5,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // Two days ago
      updated_at: new Date().toISOString(),
      weather_sequence: Array(5).fill('CLOUDY'),
      vermin_sequence: Array(5).fill('RATS'),
      player_uids: ['player3'],
      players: [
        { uid: 'player3', email: 'player3@example.com', username: 'Solo Player Gamma', game_id: 'mockGame2', player_number: 1, is_ai: false, user_type: UserRole.PLAYER },
      ]
    }
  ];

  getAdminGames(): Observable<GameAdminListItem[]> {
    console.log('MockAdminGameService: getAdminGames called');
    const listItems: GameAdminListItem[] = this.mockGamesStore.map(game => ({
      id: game.id,
      name: game.name,
      game_status: game.game_status as GameAdminListItem['game_status'], // Cast for stricter type matching if needed
      current_round_number: game.current_round_number,
      max_players: game.max_players,
      admin_id: game.admin_id
    }));
    return of(listItems).pipe(delay(300));
  }

  getGameDetails(gameId: string): Observable<GameDetailsView> {
    console.log(`MockAdminGameService: getGameDetails called for game ${gameId}`);
    const game = this.mockGamesStore.find(g => g.id === gameId);
    if (game) {
      return of({...game}).pipe(delay(300)); // Return a copy
    }
    return of(this.mockGamesStore[0]).pipe(delay(300)); // Fallback to first game if not found, or throwError
  }

  createGame(payload: GameCreateAdminPayload): Observable<GameDetailsView> {
    console.log('MockAdminGameService: createGame called with', payload);
    const newMockGame: GameDetailsView = {
      id: `mockNew-${Math.random().toString(36).substring(7)}`,
      name: payload.name,
      game_status: 'pending',
      current_round_number: 0,
      max_players: payload.max_players, // Corrected from number_of_players
      number_of_rounds: payload.number_of_rounds,
      admin_id: 'currentAdminUserMock', // Simulate current admin
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      weather_sequence: Array(payload.number_of_rounds).fill('SUNNY'),
      vermin_sequence: Array(payload.number_of_rounds).fill('NONE'),
      player_uids: [],
      players: [],
      ai_player_strategies: {}
    };
    this.mockGamesStore.push(newMockGame);
    return of(newMockGame).pipe(delay(300));
  }

  advanceGameRound(gameId: string): Observable<GameDetailsView> {
    console.log(`MockAdminGameService: advanceGameRound called for game ${gameId}`);
    const game = this.mockGamesStore.find(g => g.id === gameId);
    if (game) {
      if (game.game_status === 'pending') game.game_status = 'in_progress';
      if (game.current_round_number < game.number_of_rounds) {
        game.current_round_number += 1;
      }
      if (game.current_round_number === game.number_of_rounds) {
        game.game_status = 'finished';
      }
      game.updated_at = new Date().toISOString();
      return of({...game}).pipe(delay(300));
    }
    // Fallback or throw error if game not found
    return of(this.mockGamesStore[0]).pipe(delay(300)); 
  }

  deleteGame(gameId: string): Observable<void> {
    console.log(`MockAdminGameService: deleteGame called for game ${gameId}`);
    this.mockGamesStore = this.mockGamesStore.filter(g => g.id !== gameId);
    return of(undefined).pipe(delay(300));
  }
}

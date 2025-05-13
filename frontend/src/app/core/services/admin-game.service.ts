
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators'; // Import map operator
import { environment } from '../../../environments/environment';
import { GameAdminListItem, GameDetailsView, GameCreateAdminPayload } from '../models/game.model'; // GameDetailsView already includes PlayerPublic[]
import { PlayerPublic } from '../models/player.model'; // Corrected: Import PlayerPublic from player.model
import { IAdminGameService } from './admin-game.service.interface';
import { MockAdminGameService } from './admin-game.service.mock';

@Injectable({
  providedIn: 'root'
})
export class AdminGameService implements IAdminGameService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/games`;
  private mockService: MockAdminGameService | null = null;

  constructor() {
    if (environment.useMocks) {
      this.mockService = new MockAdminGameService();
      console.log('AdminGameService: Using MOCK data via MockAdminGameService');
    }
  }

  getAdminGames(): Observable<GameAdminListItem[]> {
    if (this.mockService) {
      return this.mockService.getAdminGames();
    }
    return this.http.get<GameAdminListItem[]>(this.apiUrl);
  }

  // Added method to fetch full game details including players
  getGameDetails(gameId: string): Observable<GameDetailsView> {
    if (this.mockService) {
      return this.mockService.getGameDetails(gameId);
    }
    return this.http.get<GameDetailsView>(`${this.apiUrl}/${gameId}`).pipe(
      map(game => {
        // Ensure players array is initialized if backend might not send it
        if (!game.players) {
          game.players = [];
        }
        return game;
      })
    );
  }

  createGame(payload: GameCreateAdminPayload): Observable<GameDetailsView> {
    if (this.mockService) {
      return this.mockService.createGame(payload);
    }
    return this.http.post<GameDetailsView>(this.apiUrl, payload);
  }

  advanceGameRound(gameId: string): Observable<GameDetailsView> {
    if (this.mockService) {
      return this.mockService.advanceGameRound(gameId);
    }
    return this.http.post<GameDetailsView>(`${this.apiUrl}/${gameId}/advance-to-next-round`, {}); // Corrected endpoint path
  }

  deleteGame(gameId: string): Observable<void> {
    if (this.mockService) {
      return this.mockService.deleteGame(gameId);
    }
    return this.http.delete<void>(`${this.apiUrl}/${gameId}`);
  }
}

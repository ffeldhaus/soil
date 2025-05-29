
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs'; // Removed 'of'
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { GameAdminListItem, GamePublic, GameCreateAdminPayload } from '../models/game.model';
// import { PlayerPublic } from '../models/player.model'; // Removed PlayerPublic
import { IAdminGameService } from './admin-game.service.interface';
import { MockAdminGameService } from './admin-game.service.mock';

@Injectable({
  providedIn: 'root'
})
export class AdminGameService implements IAdminGameService {
  private http = inject(HttpClient);
  // Corrected to use environment.apiUrl which is defined
  private resolvedApiUrl = `${environment.apiUrl}/admin/games`; 

  private mockService: MockAdminGameService | null = null;

  constructor() {
    if (environment.useMocks) {
      this.mockService = new MockAdminGameService();
      // console.log('AdminGameService: Using MOCK data via MockAdminGameService');
    }
  }

  getAdminGames(): Observable<GameAdminListItem[]> {
    if (this.mockService) {
      return this.mockService.getAdminGames();
    }
    return this.http.get<GameAdminListItem[]>(this.resolvedApiUrl);
  }

  getGameDetails(gameId: string): Observable<GamePublic> { 
    if (this.mockService) {
      return this.mockService.getGameDetails(gameId);
    }
    return this.http.get<GamePublic>(`${this.resolvedApiUrl}/${gameId}`).pipe(
      map(game => {
        if (!game.players) {
          game.players = [];
        }
        return game;
      })
    );
  }

  createGame(payload: GameCreateAdminPayload): Observable<GamePublic> { 
    if (this.mockService) {
      return this.mockService.createGame(payload);
    }
    return this.http.post<GamePublic>(this.resolvedApiUrl, payload);
  }

  advanceGameRound(gameId: string): Observable<GamePublic> { 
    if (this.mockService) {
      return this.mockService.advanceGameRound(gameId);
    }
    return this.http.post<GamePublic>(`${this.resolvedApiUrl}/${gameId}/advance-to-next-round`, {});
  }

  deleteGame(gameId: string): Observable<void> {
    if (this.mockService) {
      return this.mockService.deleteGame(gameId);
    }
    return this.http.delete<void>(`${this.resolvedApiUrl}/${gameId}`);
  }
}

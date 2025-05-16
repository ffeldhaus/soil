// File: frontend/src/app/core/services/game.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs'; // Added of for placeholder
import { environment } from '../../../environments/environment';
import { GamePublic } from '../models/game.model';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/games`; // Adjust if admin endpoints are different

  // Get game details (public view)
  getGameById(gameId: string): Observable<GamePublic> {
    // return this.http.get<GamePublic>(`${this.apiUrl}/${gameId}`);
    // Placeholder until backend endpoint is confirmed for player access to general game details
    console.warn('GameService.getGameById is using placeholder data.');
    return of({
      id: gameId,
      name: 'Placeholder Game Name',
      numberOfRounds: 15,
      maxPlayers: 4,
      currentRoundNumber: 1, // This should be dynamic
      gameStatus: 'active',
      adminId: 'admin123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      playerUids: [],
      players: []
    } as GamePublic);
  }

  // Admin-specific methods for game management would go here or in a separate AdminGameService
  // e.g., createGame, advanceRound, etc. (already handled by AdminGameService usually)
}

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // Removed HttpParams
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RoundWithFieldPublic, PlayerRoundSubmission, RoundPublic } from '../models/round.model';

@Injectable({
  providedIn: 'root'
})
export class RoundService {
  private http = inject(HttpClient);
  // Adjusted to point to general API, specific paths will be appended
  private baseApiUrl = `${environment.apiBaseUrl}`;

  getPlayerRounds(gameId: string): Observable<RoundPublic[]> {
    return this.http.get<RoundPublic[]>(`${this.baseApiUrl}/games/${gameId}/rounds/my-rounds`);
  }

  getPlayerCurrentRoundDetails(gameId: string): Observable<RoundWithFieldPublic> {
    return this.http.get<RoundWithFieldPublic>(`${this.baseApiUrl}/games/${gameId}/rounds/my-current-round`);
  }

  submitPlayerRoundDecisions(gameId: string, roundNumber: number, submission: PlayerRoundSubmission): Observable<RoundPublic> {
    // Path was /games/{game_id}/rounds/{round_number}/my-decisions in backend, 
    // but PlayerComponent used /my-current-round/decisions. Standardizing to {round_number} path.
    return this.http.put<RoundPublic>(
      `${this.baseApiUrl}/games/${gameId}/rounds/${roundNumber}/my-decisions`,
      submission
    );
  }

  /**
   * Retrieves full details (including field state and potentially result ID) for a specific past round for the player.
   * GET /games/{game_id}/rounds/{round_number}/my-details
   */
  getPlayerRoundDetails(gameId: string, roundNumber: number): Observable<RoundWithFieldPublic> {
    return this.http.get<RoundWithFieldPublic>(`${this.baseApiUrl}/games/${gameId}/rounds/${roundNumber}/my-details`);
  }
}

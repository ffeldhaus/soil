// File: frontend/src/app/core/services/player-game.service.interface.ts
import { Observable } from 'rxjs';
import { PlantationType } from '../models/parcel.model';
import { GamePublic } from '../models/game.model';
// Corrected import to include RoundPublic
import { RoundWithFieldPublic, PlayerRoundSubmission, RoundPublic } from '../models/round.model'; 
import { ResultPublic } from '../models/result.model';

export interface IPlayerGameService {
  getCurrentRoundWithField(gameId: string): Observable<RoundWithFieldPublic>;

  getGameDetails(gameId: string): Observable<GamePublic>;

  submitPlayerDecisions(
    gameId: string,
    roundNumber: number, 
    payload: PlayerRoundSubmission 
  ): Observable<RoundPublic>; // Correctly uses RoundPublic

  getPlayerResults(gameId: string, playerId: string): Observable<ResultPublic[]>;
}

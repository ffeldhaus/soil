// File: frontend/src/app/core/services/player-game.service.interface.ts
import { Observable } from 'rxjs';
import { PlantationType } from '../models/parcel.model'; // Adjusted path
import { GameDetailsView } from '../models/game.model'; // Adjusted path
import { RoundWithFieldPublic, RoundDecisionBase } from '../models/round.model'; // Adjusted path
import { ResultPublic } from '../models/result.model'; // Adjusted path

export interface IPlayerGameService {
  getCurrentRoundWithField(gameId: string): Observable<RoundWithFieldPublic>;

  getGameDetails(gameId: string): Observable<GameDetailsView>;

  submitPlayerDecisions(
    gameId: string,
    payload: {
      round_decisions: RoundDecisionBase;
      parcel_plantation_choices: Record<number, PlantationType>;
    }
  ): Observable<RoundWithFieldPublic>;

  getPlayerResults(gameId: string): Observable<ResultPublic[]>;
}

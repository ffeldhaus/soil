import { Observable } from 'rxjs';
import { GameAdminListItem, GameDetailsView, GameCreateAdminPayload } from '../models/game.model';

export interface IAdminGameService {
  getAdminGames(): Observable<GameAdminListItem[]>;
  createGame(payload: GameCreateAdminPayload): Observable<GameDetailsView>;
  advanceGameRound(gameId: string): Observable<GameDetailsView>;
  deleteGame(gameId: string): Observable<void>;
  // Add other admin game method signatures as needed
}

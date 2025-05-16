import { Observable } from 'rxjs';
import { GameAdminListItem, GamePublic, GameCreateAdminPayload } from '../models/game.model'; // Changed GameDetailsView to GamePublic

export interface IAdminGameService {
  getAdminGames(): Observable<GameAdminListItem[]>;
  createGame(payload: GameCreateAdminPayload): Observable<GamePublic>; // Changed GameDetailsView to GamePublic
  getGameDetails(gameId: string): Observable<GamePublic>; // Added this method based on typical needs
  advanceGameRound(gameId: string): Observable<GamePublic>; // Changed GameDetailsView to GamePublic
  deleteGame(gameId: string): Observable<void>;
  // Add other admin game method signatures as needed
}

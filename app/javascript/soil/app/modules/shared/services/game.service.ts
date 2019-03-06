import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';

import {Response} from '../models/response.model';
import {AngularTokenService} from "angular-token";

@Injectable()
export class GameService {

  constructor(
      private tokenService: AngularTokenService,
      private http: HttpClient) {
  }

  getGame(id: string) {
    return this.http.get<Response>(`/api/v1/game/${id}`);
  }

  getGames() {
    return this.http.get<Response>(`/api/v1/game`);
  }

  newGame(game) {
    return this.http.post<Response>(`/api/v1/game`,game)
  }

  deleteGame(id: string) {
    return this.http.delete<Response>(`/api/v1/game/${id}`);
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Response } from '../models/response.model';

@Injectable()
export class GameService {

  constructor(private http: HttpClient) { }

  getGame(id: string) {
    return this.http.get<Response>(`/game/${id}`);
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Response } from '../models/response.model';
import { Round } from '../models/round.model';

@Injectable()
export class RoundService {

  constructor(private http: HttpClient) { }

  getRound(id: string) {
    return this.http.get<Response>(`/api/v1/round/${id}`);
  }

  getRounds() {
    return this.http.get<Response>(`/api/v1/round`);
  }

  updateRound(round: Round) {
    return this.http.put<Response>(`/api/v1/round/${round.id}`,round);
  }
}
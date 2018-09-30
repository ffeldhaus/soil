import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Response } from '../models/response.model';

@Injectable()
export class RoundService {

  constructor(private http: HttpClient) { }

  getRound(id: string) {
    return this.http.get<Response>(`/round/${id}`);
  }
}
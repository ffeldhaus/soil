import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Response } from '../models/response.model';

@Injectable()
export class ResultService {

  constructor(private http: HttpClient) { }

  getResults  () {
    return this.http.get<Response>(`/api/v1/result/`);
  }

  getResult (id: string) {
    return this.http.get<Response>(`/api/v1/result/${id}`)
  }
}
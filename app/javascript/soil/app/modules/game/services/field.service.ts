import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Response } from '../models/response.model';

@Injectable()
export class FieldService {

  constructor(private http: HttpClient) { }

  getField(id: string) {
    return this.http.get<Response>(`/api/v1/field/${id}`);
  }
}
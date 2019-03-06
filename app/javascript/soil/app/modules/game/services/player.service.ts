import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';

import {Response} from '../../shared/models/response.model';

@Injectable()
export class PlayerService {

  constructor(private http: HttpClient) {
  }

  getPlayer(id: string) {
    return this.http.get<Response>(`/api/v1/player/${id}`);
  }
}
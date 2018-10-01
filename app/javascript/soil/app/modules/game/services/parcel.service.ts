import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';

import {Response} from '../models/response.model';

import {Parcel} from '../models/parcel.model';

@Injectable()
export class ParcelService {

  constructor(private http: HttpClient) {
  }

  getParcel(id: number) {
    return this.http.get<Response>(`/api/v1/parcel/${id}`);
  }

  updateParcel(parcel: Parcel) {
    return this.http.put<Response>(`/api/v1/parcel/${parcel.id}`, {"plantation":parcel.plantation});
  }
}
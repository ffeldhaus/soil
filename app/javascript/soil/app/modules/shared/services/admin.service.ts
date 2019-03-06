import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';

import {Response} from '../models/response.model';
import {Admin} from "../models/admin.model";

@Injectable()
export class AdminService {

  constructor(private http: HttpClient) {
  }

  createAdmin(admin: Admin) {
    return this.http.post<Response>(`/api/v1/admin`,admin);
  }
}
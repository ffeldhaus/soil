import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { map } from 'rxjs/operators';

@Injectable()
export class AuthenticationService {
  constructor(private http: HttpClient) { }

  login(gameId: number, name: string, password: string) {
    return this.http.post<any>('/api/v1/auth/login', { game_id: gameId, name: name, password: password })
        .pipe(map(result => {
          // login successful if there is an authentication token in the data element of the response
          if (result && result.access_token) {
            // store user details and token in local storage to keep user logged in between page refreshes
            localStorage.setItem('currentUser', JSON.stringify({ id: result.id, gameId: gameId, name: name, role: result.role, token: result.access_token, expiration: result.expiration}));
          }

          return result;
        }));
  }

  logout() {
    // remove user from local storage to log user out
    localStorage.removeItem('currentUser');

    // TODO: Implement Token blacklisting on Server
    //return this.http.delete<any>('/auth/logout');
  }
}
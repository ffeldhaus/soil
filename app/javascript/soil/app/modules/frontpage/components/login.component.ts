import {Component} from '@angular/core';
import {Router} from '@angular/router';

import templateString from './login.component.html'

import { AuthenticationService } from '../../shared/services/authentication.service'

@Component({
  template: templateString,
})
export class LoginComponent {
  constructor(
      private router: Router,
      private authenticationService: AuthenticationService
  ) {
  }

  gameId: number;
  username: string;
  password: string;

  login(): void {
    this.authenticationService.login(this.gameId, this.username, this.password)
        .subscribe(
            data => {
              console.log("data")
              this.router.navigate(['/game']);
            },
            error => {
              console.log("error")
              alert(error);
            });
  }
}
import {Component} from '@angular/core';
import {Router} from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import templateString from './login.component.html'

import { AuthenticationService } from '../../shared/services/authentication.service'

@Component({
  template: templateString,
})
export class LoginComponent {
  constructor(
      private router: Router,
      private route: ActivatedRoute,
      private authenticationService: AuthenticationService
  ) {
  }

  gameId: number;
  username: string;
  password: string;

  ngOnInit() {
    // reset login status
    this.authenticationService.logout();

    this.gameId = Number(this.route.snapshot.queryParamMap.get('gameId'));
  }

  login(): void {
    this.authenticationService.login(this.gameId, this.username, this.password)
        .subscribe(
            data => {
              this.router.navigate(['/']);
            },
            error => {
              alert(error);
            });
  }
}
import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {ActivatedRoute} from '@angular/router';

import {AngularTokenService} from "angular-token";

import templateString from './login.component.html'

@Component({
  template: templateString,
})
export class LoginComponent {
  constructor(
      private router: Router,
      private route: ActivatedRoute,
      private tokenService: AngularTokenService,
  ) {
  }

  email: string;
  password: string;

  ngOnInit() {
    // reset login status
    this.email = this.route.snapshot.queryParamMap.get('uid');

    //this.gameId = Number(this.route.snapshot.queryParamMap.get('gameId'));
  }

  login(): void {
    this.tokenService.signIn({
          userType: 'ADMIN',
          login: this.email,
          password: this.password
        }
    ).subscribe(
        res => {
          console.log(res);
          this.router.navigate(['/admin']);
        },
        error => console.log(error)
    );
  }
}
import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {ActivatedRoute} from '@angular/router';

import {AngularTokenService} from "angular-token";

import templateString from './login.component.html'
import {Player} from "../../shared/models/player.model";

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
  gameId: number;
  player: number;

  ngOnInit() {
    // reset login status
    this.email = this.route.snapshot.queryParamMap.get('uid');

    if (this.route.snapshot.queryParamMap.get('gameId')) {
      this.gameId = Number(this.route.snapshot.queryParamMap.get('gameId'));
    }
    if (this.route.snapshot.queryParamMap.get('player')) {
      this.player = Number(this.route.snapshot.queryParamMap.get('player'));
    }
  }

  login(): void {
    if (this.email) {
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
          error => {
            alert('Login fehlgeschlagen');
            console.log(error)
          }
      );
    }
    if (this.gameId && this.player) {
      this.tokenService.signIn({
            userType: 'PLAYER',
            login: 'player' + this.player + '@game' + this.gameId + '.soil.app',
            password: this.password
          }
      ).subscribe(
          res => {
            console.log(res);
            this.router.navigate(['/game',this.gameId,'/player',res.data.id]);
          },
          error => {
            alert('Login fehlgeschlagen');
            console.log(error)
          }
      );
    }
  }
}
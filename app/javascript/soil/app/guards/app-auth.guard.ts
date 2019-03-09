import {Injectable} from '@angular/core';
import {Router, CanActivate} from '@angular/router';

import {map} from 'rxjs/operators';

import {AngularTokenService} from "angular-token";

@Injectable()
export class AppAuthGuard implements CanActivate {

  constructor(private authTokenService: AngularTokenService,
              private router: Router) {
  }

  canActivate() {
    console.log('User logged in?', this.authTokenService.userSignedIn());
    console.log('User type', this.authTokenService.currentUserType);

    if (this.authTokenService.userSignedIn()) {
      return this.authTokenService.validateToken().pipe(map(
          result => {
            console.log('Token validation result', result);
            if (this.authTokenService.currentUserData) {
              console.log('User data', this.authTokenService.currentUserData);
              if (this.authTokenService.currentUserType === "PLAYER") {
                this.router.navigate(['/game', this.authTokenService.currentUserData['game_id'],'/player',this.authTokenService.currentUserData['id']]);
                return true
              } else if (this.authTokenService.currentUserType === "ADMIN") {
                this.router.navigate(['/admin', this.authTokenService.currentUserData['id']]);
                return true
              } else if (this.authTokenService.currentUserType === "SUPERUSER") {
                this.router.navigate(['/superuser', this.authTokenService.currentUserData['id']]);
                return true
              }
              else {
                console.log('User not logged in, navigating to ', '/frontpage/overview');
                this.router.navigate(['/frontpage/overview']);
                return false
              }
            }
            else {
              console.log('User not logged in, navigating to ', '/frontpage/overview');
              this.router.navigate(['/frontpage/overview']);
              return false
            }
          },
      ));
    }
    else {
      console.log('User not logged in, navigating to ', '/frontpage/overview');
      this.router.navigate(['/frontpage/overview']);
      return false
    }
  }
}
import {Injectable} from '@angular/core';
import {Router, CanActivate} from '@angular/router';

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
      if (!this.authTokenService.currentUserData) {
        console.log("user data empty");
        this.authTokenService.validateToken().subscribe(
            result => console.log('Token validation result', result),
            error => console.log('Token validation error', error)
        )
      }

      if (this.authTokenService.currentUserData) {
        console.log('User data', this.authTokenService.currentUserData);
        if (this.authTokenService.currentUserType === "PLAYER") {
          this.router.navigate(['/game', this.authTokenService.currentUserData['gameId']]);
          return true
        } else if (this.authTokenService.currentUserType === "ADMIN") {
          this.router.navigate(['/admin', this.authTokenService.currentUserData['id']]);
          return true
        } else if (this.authTokenService.currentUserType === "SUPERUSER") {
          this.router.navigate(['/superuser', this.authTokenService.currentUserData['id']]);
          return true
        }
      }
    }

    console.log('User not logged in, navigating to ', '/frontpage/overview')
    this.router.navigate(['/frontpage/overview']);
    return false
  }
}
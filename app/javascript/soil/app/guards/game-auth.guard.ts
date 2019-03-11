import {Injectable} from '@angular/core';
import {Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, ActivatedRoute} from '@angular/router';
import {AngularTokenService} from "angular-token";
import {map} from "rxjs/operators";

@Injectable()
export class GameAuthGuard implements CanActivate {

  constructor(
      private authTokenService: AngularTokenService,
      private router: Router) {
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    console.log('User logged in?', this.authTokenService.userSignedIn());
    console.log('User type', this.authTokenService.currentUserType);

    if (this.authTokenService.userSignedIn()) {
      return this.authTokenService.validateToken().pipe(map(
          result => {
            console.log('Token validation result', result);
            if (this.authTokenService.currentUserData) {
              console.log('User data', this.authTokenService.currentUserData);
              if (this.authTokenService.currentUserType === "PLAYER") {
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
          }
      ));
    }

    console.log('User not logged in, navigating to ', '/frontpage/overview');
    this.router.navigate(['/frontpage/overview']);
    return false
  }
}
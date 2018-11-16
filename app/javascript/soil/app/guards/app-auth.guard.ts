import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable()
export class AppAuthGuard implements CanActivate {

  constructor(private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
      if (currentUser.role === "player") {
        this.router.navigate(['/game',  currentUser.gameId]);
        return true
      }
      else if (currentUser.role === "admin") {
        this.router.navigate(['/admin', currentUser.id]);
        return true
      }
      else if (currentUser.role === "superuser") {
        this.router.navigate(['/superuser', currentUser.id]);
        return true
      }
    }
    this.router.navigate(['/frontpage/overview']);
    return false
  }
}
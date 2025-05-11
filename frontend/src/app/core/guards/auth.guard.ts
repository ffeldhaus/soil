import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> | Promise<boolean> | boolean => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    map(user => !!user), // Convert user object to boolean
    tap(isAuthenticated => {
      if (!isAuthenticated) {
        console.log('AuthGuard: User not authenticated, redirecting to login.');
        router.navigate(['/frontpage/login'], { queryParams: { returnUrl: state.url } });
      }
    })
  );
};
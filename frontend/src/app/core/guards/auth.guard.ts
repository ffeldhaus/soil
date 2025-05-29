import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { IAuthService } from '../services/auth.service.interface';
import { AUTH_SERVICE_TOKEN } from '../services/injection-tokens';
import { User } from '../models/user.model'; // Import User
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> | Promise<boolean> | boolean => {
  // Explicitly type the injected service
  const authService: IAuthService = inject(AUTH_SERVICE_TOKEN);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    map((user: User | null | undefined) => !!user),
    tap(isAuthenticated => {
      if (!isAuthenticated) {
        // console.log('AuthGuard: User not authenticated, redirecting to login.');
        router.navigate(['/frontpage/login'], { queryParams: { returnUrl: state.url } });
      }
    })
  );
};
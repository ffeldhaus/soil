import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router'; // Removed ActivatedRouteSnapshot, RouterStateSnapshot
import { IAuthService } from '../services/auth.service.interface';
import { AUTH_SERVICE_TOKEN } from '../services/injection-tokens'; 
import { User, UserRole } from '../models/user.model'; // Import User
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const adminGuard: CanActivateFn = (
  // _route: ActivatedRouteSnapshot, // Removed as it's unused
  // _state: RouterStateSnapshot // Removed as it's unused
): Observable<boolean> | Promise<boolean> | boolean => {
  // Explicitly type the injected service
  const authService: IAuthService = inject(AUTH_SERVICE_TOKEN);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    map((user: User | null | undefined) => !!user && user.role === UserRole.ADMIN),
    tap(isAdmin => {
      if (!isAdmin) {
        // console.log('AdminGuard: User is not admin or not authenticated, redirecting.');
        router.navigate(['/frontpage/login']);
      }
    })
  );
};
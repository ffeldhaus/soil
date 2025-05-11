import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const adminGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> | Promise<boolean> | boolean => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    map(user => !!user && user.role === UserRole.ADMIN),
    tap(isAdmin => {
      if (!isAdmin) {
        console.log('AdminGuard: User is not admin or not authenticated, redirecting.');
        router.navigate(['/frontpage/login']); // Or a 'forbidden' page
      }
    })
  );
};
import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { IAuthService } from '../services/auth.service.interface';
import { AUTH_SERVICE_TOKEN } from '../services/injection-tokens';
import { User, UserRole } from '../models/user.model';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const playerGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> | Promise<boolean> | boolean => {
  // Explicitly type the injected service
  const authService: IAuthService = inject(AUTH_SERVICE_TOKEN);
  const router = inject(Router);
  const gameIdFromRoute = route.paramMap.get('gameId');

  return authService.currentUser$.pipe(
    map((user: User | null | undefined) => {
      if (user && user.role === UserRole.PLAYER) {
        if (gameIdFromRoute && user.gameId === gameIdFromRoute) {
          return true;
        }
        if (gameIdFromRoute && user.gameId !== gameIdFromRoute) {
          console.warn(`PlayerGuard: Player ${user.uid} is in game ${user.gameId}, attempted to access game ${gameIdFromRoute}.`);
        }
        return false;
      }
      return false;
    }),
    tap(isAuthorizedPlayer => {
      if (!isAuthorizedPlayer) {
        console.log('PlayerGuard: User is not an authorized player for this game, redirecting.');
        router.navigate(['/frontpage/overview']);
      }
    })
  );
};
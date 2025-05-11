import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const playerGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean> | Promise<boolean> | boolean => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const gameIdFromRoute = route.paramMap.get('gameId');

  return authService.currentUser$.pipe(
    map(user => {
      if (user && user.role === UserRole.PLAYER) {
        if (gameIdFromRoute && user.gameId === gameIdFromRoute) {
          return true;
        }
        // Log if game ID mismatch, but still deny access
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
        router.navigate(['/frontpage/overview']); // Or more specific error/redirect
      }
    })
  );
};
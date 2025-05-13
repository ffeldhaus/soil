import { InjectionToken } from '@angular/core';
import { IAuthService } from './auth.service.interface';
import { IPlayerGameService } from './player-game.service.interface';

export const AUTH_SERVICE_TOKEN = new InjectionToken<IAuthService>('AuthService');
export const PLAYER_GAME_SERVICE_TOKEN = new InjectionToken<IPlayerGameService>('PlayerGameService');

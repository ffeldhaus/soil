import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { playerGuard } from './core/guards/player.guard';
// ImpressumComponent is no longer routed here directly

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'frontpage/overview',
    pathMatch: 'full'
  },
  {
    path: 'frontpage',
    loadChildren: () => import('./features/frontpage/frontpage.routes').then(m => m.FRONTPAGE_ROUTES),
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'game/:gameId', // gameId will be a parameter
    loadChildren: () => import('./features/game/game.routes').then(m => m.GAME_ROUTES),
    canActivate: [authGuard, playerGuard],
  },
  // {
  //   path: 'impressum', // REMOVED - Will be a child of frontpage
  //   component: ImpressumComponent
  // },
  {
    path: '**',
    redirectTo: 'frontpage/overview' 
  }
];

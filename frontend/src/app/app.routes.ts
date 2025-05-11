import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { playerGuard } from './core/guards/player.guard';

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
  // Example of a simple NotFoundComponent route
  // { path: 'not-found', component: NotFoundComponent }, // Create this component
  {
    path: '**',
    redirectTo: 'frontpage/overview' // Or '/not-found'
  }
];
import { Routes } from '@angular/router';
// Guards will be created later. For now, we'll define routes that might use them.
// import { AuthGuard } from './core/guards/auth.guard'; // Example guard
// import { AdminGuard } from './core/guards/admin.guard'; // Example guard
// import { PlayerGuard } from './core/guards/player.guard'; // Example guard

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'frontpage/overview', // Default route
    pathMatch: 'full'
  },
  {
    path: 'frontpage',
    loadChildren: () => import('./features/frontpage/frontpage.routes').then(m => m.FRONTPAGE_ROUTES),
    // data: { preload: true } // Optional: for custom preloading strategy
  },
  {
    path: 'admin', // Base path for admin section
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
    // canActivate: [AuthGuard, AdminGuard], // Example guards
    // data: { role: 'ADMIN' }
  },
  {
    path: 'game/:gameId', // Base path for a specific game, gameId will be a parameter
    loadChildren: () => import('./features/game/game.routes').then(m => m.GAME_ROUTES),
    // canActivate: [AuthGuard, PlayerGuard], // Example guards
  },
  // Fallback route for unknown paths
  {
    path: '**',
    redirectTo: 'frontpage/overview' // Or a dedicated 'NotFoundComponent'
  }
];
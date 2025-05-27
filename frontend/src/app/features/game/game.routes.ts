// frontend/src/app/features/game/game.routes.ts
import { Routes } from '@angular/router';
import { GameLayoutComponent } from './game-layout/game-layout.component';
import { PlayerFieldComponent } from './player-field/player-field.component'; // Assuming this is the player's main game view

export const GAME_ROUTES: Routes = [
  {
    path: '', // This path is relative to 'game/:gameId' from app.routes.ts
    component: GameLayoutComponent, // Provides the overall game interface shell
    children: [
      // If a player navigates to 'game/:gameId' directly, redirect to their dashboard
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, 
      // The dashboard path as used by AuthService navigation
      { path: 'dashboard', component: PlayerFieldComponent },
      // You can add other game-related views here, e.g.:
      // { path: 'field', component: PlayerFieldComponent }, 
      // { path: 'market', component: MarketComponent },
      // { path: 'results', component: ResultsComponent },
    ]
  }
];

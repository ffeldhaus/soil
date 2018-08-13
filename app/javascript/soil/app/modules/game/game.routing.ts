import {Routes, RouterModule} from '@angular/router';

import {GameComponent} from './components/game.component';


const gameRoutes: Routes = [
  {
    path: '',
    component: GameComponent,
  },
  {
    path: '**',
    redirectTo: ''
  }
];

export const GameRouting = RouterModule.forChild(gameRoutes);
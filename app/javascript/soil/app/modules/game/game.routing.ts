import {Routes, RouterModule} from '@angular/router';

import {GameComponent} from './game.component'
import {PlayerComponent} from './components/player.component';
import {RoundComponent} from './components/round.component';
import {FieldComponent} from './components/field.component';

import {GameResolver} from "./services/game-resolver.service";
import {PlayerResolver} from "./services/player-resolver.service";
import {RoundResolver} from "./services/round-resolver.service";
import {FieldResolver} from "./services/field-resolver.service";

const gameRoutes: Routes = [
  {
    path: '',
    component: GameComponent,
    resolve: {game: GameResolver},
    children: [
      {
        path: 'player/:id',
        component: PlayerComponent,
        resolve: {player: PlayerResolver},
        children: [
          {
            path: 'round/:id',
            component: RoundComponent,
            resolve: {round: RoundResolver},
            children: [
              {
                path: 'field/:id',
                component: FieldComponent,
                resolve: { field: FieldResolver}
              }
            ]
          }
        ]
      },
    ],
  },
  {
    path: '**',
    redirectTo: ''
  }
];

export const GameRouting = RouterModule.forChild(gameRoutes);
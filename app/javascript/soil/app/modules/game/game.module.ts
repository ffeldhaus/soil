import {NgModule} from '@angular/core';

import {GameComponent} from './components/game.component';

import {GameRouting} from './game.routing';

@NgModule({
  declarations: [
    GameComponent,
  ],
  imports: [
    GameRouting,
  ],
  providers: [],
})
export class GameModule {
}
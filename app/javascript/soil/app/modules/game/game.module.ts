import {NgModule} from '@angular/core';

import {SharedModule} from "../shared/shared.module";

import {GameResolver} from "./services/game-resolver.service";
import {GameService} from "./services/game.service";
import {PlayerService} from "./services/player.service";
import {RoundService} from "./services/round.service";
import {FieldService} from "./services/field.service";
import {ParcelService} from "./services/parcel.service";

import {PlayerComponent} from "./components/player.component"
import {RoundComponent} from "./components/round.component"
import {FieldComponent} from "./components/field.component"
import {PlantationDialogComponent} from "./components/plantation-dialog.component";

import {GameComponent} from './game.component';
import {GameRouting} from './game.routing';
import {PlayerResolver} from "./services/player-resolver.service";
import {RoundResolver} from "./services/round-resolver.service";
import {FieldResolver} from "./services/field-resolver.service";

@NgModule({
  declarations: [
    GameComponent,
    PlayerComponent,
    RoundComponent,
    FieldComponent,
    PlantationDialogComponent
  ],
  imports: [
    SharedModule,
    GameRouting
  ],
  providers: [
    GameResolver,
    GameService,
    PlayerService,
    PlayerResolver,
    RoundService,
    RoundResolver,
    FieldService,
    FieldResolver,
    ParcelService
  ],
  entryComponents: [
    FieldComponent,
    PlantationDialogComponent
  ],
})
export class GameModule {
}
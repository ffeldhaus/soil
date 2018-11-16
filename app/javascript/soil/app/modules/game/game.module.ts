import {NgModule} from '@angular/core';

import {SharedModule} from "../shared/shared.module";

import {GameResolver} from "./services/game-resolver.service";
import {GameService} from "./services/game.service";
import {PlayerService} from "./services/player.service";
import {RoundService} from "./services/round.service";
import {FieldService} from "./services/field.service";
import {ResultService} from "./services/result.service";
import {ParcelService} from "./services/parcel.service";

import {PlayerComponent} from "./components/player.component"
import {RoundComponent} from "./components/round.component"
import {FieldComponent} from "./components/field.component"
import {ResultComponent} from "./components/result.component"
import {PlantationDialogComponent} from "./components/plantation-dialog.component";
import {EndRoundDialogComponent} from "./components/end-round-dialog.component";
import {NewRoundDialogComponent} from "./components/new-round-dialog.component";

import {GameComponent} from './game.component';
import {GameRouting} from './game.routing';
import {PlayerResolver} from "./services/player-resolver.service";
import {RoundResolver} from "./services/round-resolver.service";
import {FieldResolver} from "./services/field-resolver.service";
import {ResultResolver} from "./services/result-resolver.service";

@NgModule({
  declarations: [
    GameComponent,
    PlayerComponent,
    RoundComponent,
    FieldComponent,
    ResultComponent,
    PlantationDialogComponent,
    EndRoundDialogComponent,
    NewRoundDialogComponent
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
    ResultService,
    ResultResolver,
    ParcelService
  ],
  entryComponents: [
    FieldComponent,
    PlantationDialogComponent,
    EndRoundDialogComponent,
    NewRoundDialogComponent
  ],
})
export class GameModule {
}
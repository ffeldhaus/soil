import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

import {
  RouterModule
} from '@angular/router';

import {
  MatToolbarModule,
  MatButtonModule,
  MatSidenavModule,
  MatIconModule,
  MatListModule,
  MatCardModule,
  MatFormFieldModule,
  MatInputModule,
  MatTabsModule,
  MatDialogModule,
  MatCheckboxModule,
  MatSelectModule,
  MatExpansionModule,
  MatSliderModule
} from '@angular/material';

import {FlexLayoutModule} from '@angular/flex-layout';

import {CheckmarkPipe} from './pipes/checkmark.pipe';

import {GameResolver} from "./services/game-resolver.service";
import {GameService} from "./services/game.service";

import {ImpressumComponent} from './components/impressum.component';
import {PrivacyComponent} from './components/privacy.component';
import {AdminService} from "./services/admin.service";

@NgModule({
  imports: [
    CommonModule,
    MatCardModule,
  ],
  declarations: [
    CheckmarkPipe,
    ImpressumComponent,
    PrivacyComponent
  ],
  providers: [
    GameResolver,
    GameService,
    AdminService,
  ],
  exports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatDialogModule,
    MatCheckboxModule,
    MatSelectModule,
    MatExpansionModule,
    MatSliderModule,
    FlexLayoutModule,
    CheckmarkPipe
  ],
})
export class SharedModule {
}
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {
  MatToolbarModule,
  MatButtonModule,
  MatSidenavModule,
  MatIconModule,
  MatListModule,
  MatCardModule,
  MatFormFieldModule,
  MatInputModule,
} from '@angular/material';

import {SharedModule} from "../shared/shared.module";

import {FrontpageComponent} from './frontpage.component';

import {OverviewComponent} from './components/overview.component';
import {BackgroundComponent} from './components/background.component';
import {LoginComponent} from './components/login.component';
import {RegisterComponent} from './components/register.component';

import {ImpressumComponent} from '../shared/components/impressum.component';
import {PrivacyComponent} from '../shared/components/privacy.component';

import {FooterComponent} from "../shared/components/footer.component";

import {FrontpageRouting} from './frontpage.routing';

@NgModule({
  declarations: [
    FrontpageComponent,
    OverviewComponent,
    BackgroundComponent,
    LoginComponent,
    RegisterComponent,
    ImpressumComponent,
    PrivacyComponent,
    FooterComponent
  ],
  imports: [
    SharedModule,
    FrontpageRouting,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,]
})
export class FrontpageModule {
}
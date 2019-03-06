import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {SharedModule} from "../shared/shared.module";

import {FrontpageComponent} from './frontpage.component';

import {OverviewComponent} from './components/overview.component';
import {BackgroundComponent} from './components/background.component';
import {LoginComponent} from './components/login.component';
import {RegisterComponent} from './components/register.component';

import {FooterComponent} from "../shared/components/footer.component";

import {FrontpageRouting} from './frontpage.routing';

@NgModule({
  declarations: [
    FrontpageComponent,
    OverviewComponent,
    BackgroundComponent,
    LoginComponent,
    RegisterComponent,
    FooterComponent
  ],
  imports: [
    SharedModule,
    FrontpageRouting,
    FormsModule
  ]
})
export class FrontpageModule {
}
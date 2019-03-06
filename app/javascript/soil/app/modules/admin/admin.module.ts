import {NgModule} from '@angular/core';

import {SharedModule} from "../shared/shared.module";

import {AdminComponent} from './admin.component';
import {AdminRouting} from './admin.routing';

@NgModule({
  declarations: [
    AdminComponent
  ],
  imports: [
    SharedModule,
    AdminRouting
  ],
  providers: [],
  entryComponents: [],
})
export class AdminModule {
}
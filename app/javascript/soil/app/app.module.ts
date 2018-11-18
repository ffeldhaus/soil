import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {LOCALE_ID, NgModule} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';

registerLocaleData(localeDe, 'de');

import {SharedModule} from "./modules/shared/shared.module";

import {GameAuthGuard} from "./guards/game-auth.guard";
import {AppAuthGuard} from "./guards/app-auth.guard";

import {AppComponent} from './app.component';
import {AppRouting} from './app.routing';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    SharedModule,
    BrowserModule,
    AppRouting,
    BrowserAnimationsModule,
  ],
  providers: [
    GameAuthGuard,
    AppAuthGuard,
    {provide: LOCALE_ID, useValue: 'de'},
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule {
}

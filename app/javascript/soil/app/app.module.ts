import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {LOCALE_ID, NgModule} from '@angular/core';
import {registerLocaleData} from '@angular/common';
import localeDe from '@angular/common/locales/de';

import {AngularTokenModule} from 'angular-token';

import {
  HttpClientModule,
} from '@angular/common/http';

registerLocaleData(localeDe, 'de');

import {SharedModule} from "./modules/shared/shared.module";

import {GameAuthGuard} from "./guards/game-auth.guard";
import {AppAuthGuard} from "./guards/app-auth.guard";
import {AdminAuthGuard} from "./guards/admin-auth.guard";

import {AppComponent} from './app.component';
import {AppRouting} from './app.routing';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    AppRouting,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AngularTokenModule.forRoot({
      apiPath: 'api/v1',
      signInPath: 'sign_in',
      signOutPath: 'sign_out',
      validateTokenPath: 'validate_token',
      registerAccountPath: '',
      registerAccountCallback: window.location.origin + '/frontpage/login',
      deleteAccountPath: null,
      updatePasswordPath: 'password',
      resetPasswordPath: 'password',
      userTypes: [
        {name: 'ADMIN', path: 'admin'},
        {name: 'PLAYER', path: 'player'}
      ],
    }),
    SharedModule,
  ],
  providers: [
    GameAuthGuard,
    AppAuthGuard,
    AdminAuthGuard,
    {provide: LOCALE_ID, useValue: 'de'},
    AngularTokenModule,
  ],
  bootstrap: [
    AppComponent,
  ]
})
export class AppModule {
}

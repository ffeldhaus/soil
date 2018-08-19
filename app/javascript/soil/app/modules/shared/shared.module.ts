import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {
  RouterModule
} from '@angular/router';

import {
  HttpClientModule,
  HttpClientXsrfModule,
  HTTP_INTERCEPTORS
} from '@angular/common/http';

import {
  MatCardModule,
  MatToolbarModule,
  MatButtonModule,
} from '@angular/material';

import {FlexLayoutModule} from '@angular/flex-layout';

import {AuthenticationService} from "./services/authentication.service";
import {AuthGuard} from './guards/auth.guard';
import {AuthInterceptor} from './interceptors/auth.interceptor';
import {ErrorInterceptor} from './interceptors/error.interceptor';


@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    HttpClientXsrfModule
  ],
  declarations: [],
  providers: [
    AuthGuard,
    AuthenticationService,
    {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true},
    {provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true}
  ],
  exports: [
    CommonModule,
    RouterModule,
    HttpClientModule,
    HttpClientXsrfModule,
    MatCardModule,
    MatToolbarModule,
    MatButtonModule,
    FlexLayoutModule
  ],
})
export class SharedModule {
}
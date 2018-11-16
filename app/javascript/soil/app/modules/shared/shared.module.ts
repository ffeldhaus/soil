import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

import {
  RouterModule
} from '@angular/router';

import {
  HttpClientModule,
  HttpClientXsrfModule,
  HTTP_INTERCEPTORS
} from '@angular/common/http';

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
  MatExpansionModule
} from '@angular/material';

import {FlexLayoutModule} from '@angular/flex-layout';

import { CheckmarkPipe } from './pipes/checkmark.pipe';

import {AuthenticationService} from "./services/authentication.service";
import {AuthInterceptor} from './interceptors/auth.interceptor';
import {ErrorInterceptor} from './interceptors/error.interceptor';


@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    HttpClientXsrfModule
  ],
  declarations: [
    CheckmarkPipe
  ],
  providers: [
    AuthenticationService,
    {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true},
    {provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true}
  ],
  exports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    HttpClientModule,
    HttpClientXsrfModule,
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
    FlexLayoutModule,
    CheckmarkPipe
  ],
})
export class SharedModule {
}
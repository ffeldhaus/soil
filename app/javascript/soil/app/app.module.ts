import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router'

import {
  MatCardModule,
  MatToolbarModule,
  MatButtonModule,
} from '@angular/material';

import {FlexLayoutModule} from '@angular/flex-layout';

import {AppComponent} from './app.component';
import {AppRouting} from './app.routing';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    RouterModule,
    BrowserModule,
    BrowserAnimationsModule,
    MatCardModule,
    MatToolbarModule,
    MatButtonModule,
    FlexLayoutModule,
    AppRouting
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}

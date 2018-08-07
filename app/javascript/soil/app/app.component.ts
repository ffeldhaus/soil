import { Component } from '@angular/core';
import templateString from './app.component.html'

@Component({
  selector: 'soil-app',
  template: templateString,
})
export class AppComponent {
  name = 'Angular!';
}

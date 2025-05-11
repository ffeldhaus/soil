import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // Needed for <router-outlet>

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule], // Import RouterModule for <router-outlet>
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Soil Game';

  constructor() {
    // You can add initialization logic here if needed
    // For example, checking authentication status, loading initial global data, etc.
    // This will be expanded later.
    console.log('AppComponent initialized');
  }
}
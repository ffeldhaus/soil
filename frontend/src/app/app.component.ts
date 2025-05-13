import { Component, OnInit, Inject, PLATFORM_ID, inject, Signal } from '@angular/core'; 
import { isPlatformBrowser, CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button'; // For button
import { MatIconModule } from '@angular/material/icon'; // For icon
import { MatToolbarModule } from '@angular/material/toolbar'; // For a nice banner

import { environment } from '../environments/environment'; 
import { AuthService } from './core/services/auth.service'; // Import AuthService
import { User } from './core/models/user.model'; // Import User model for typing

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, // Added CommonModule for *ngIf
    RouterModule,
    MatButtonModule, // Added MatButtonModule
    MatIconModule, // Added MatIconModule
    MatToolbarModule // Added MatToolbarModule for the banner
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Soil Game';
  private platformId = inject(PLATFORM_ID);
  public authService = inject(AuthService); // Injected AuthService and made public for template access

  // Expose signals directly or create computed signals if transformation is needed
  isImpersonating: Signal<boolean>;
  currentUser: Signal<User | null | undefined>;

  constructor() {
    console.log('AppComponent initialized');
    this.isImpersonating = this.authService.isImpersonating;
    this.currentUser = this.authService.currentUser;
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId) && !environment.production && environment.devDefaults) {
      console.log('--- Development Defaults ---');
      console.log('Admin Email:', environment.devDefaults.adminEmail);
      console.log('Admin Password:', environment.devDefaults.adminPassword);
      if (environment.devDefaults.game) {
        console.log('Game Name:', environment.devDefaults.game.name);
        console.log('Game Rounds:', environment.devDefaults.game.rounds);
        console.log('Game Max Players:', environment.devDefaults.game.maxPlayers);
        console.log('Game Human Players:', environment.devDefaults.game.humanPlayers);
        console.log('Game AI Players:', environment.devDefaults.game.aiPlayers);
      }
      console.log('---------------------------');
    }
  }

  async stopImpersonation(): Promise<void> {
    try {
      await this.authService.stopImpersonation();
      // Notification can be added here or handled within AuthService/navigation
    } catch (error) {
      console.error('Failed to stop impersonation from AppComponent', error);
      // Optionally show a global error notification
    }
  }
}

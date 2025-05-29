import { Component, OnInit, PLATFORM_ID, inject, Signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
// TranslateModule might still be needed if the app.component.html uses the | translate pipe directly
import { TranslateModule } from '@ngx-translate/core'; 

import { environment } from '../environments/environment';
import { AuthService } from './core/services/auth.service';
import { User } from './core/models/user.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    TranslateModule 
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Soil Game';
  private platformId = inject(PLATFORM_ID);
  public authService = inject(AuthService);

  isImpersonating: Signal<boolean>;
  currentUser: Signal<User | null | undefined>;

  constructor() { // Removed TranslateService from constructor
    // console.log('AppComponent initialized - Language setup moved to APP_INITIALIZER');
    this.isImpersonating = this.authService.isImpersonating;
    this.currentUser = this.authService.currentUser;
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId) && !environment.production && environment.devDefaults) {
      // console.log('--- Development Defaults ---');
      // ... (rest of your dev defaults logging)
      // console.log('---------------------------');
    }
  }

  async stopImpersonation(): Promise<void> {
    try {
      await this.authService.stopImpersonation();
    } catch { // Removed _error
      // console.error('Failed to stop impersonation from AppComponent');
    }
  }
}

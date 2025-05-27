// File: frontend/src/app/features/admin/admin-layout/admin-layout.component.ts
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu'; // Import MatMenuModule
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AsyncPipe, NgIf, NgFor } from '@angular/common';
import { IAuthService } from '../../../core/services/auth.service.interface';
import { AUTH_SERVICE_TOKEN } from '../../../core/services/injection-tokens';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterModule, NgIf, AsyncPipe, NgFor,
    MatToolbarModule, MatButtonModule, MatIconModule,
    MatSidenavModule, MatListModule, MatDividerModule,
    MatMenuModule, // Add MatMenuModule here
  ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
  private breakpointObserver = inject(BreakpointObserver);
  // Explicitly type the injected service
  public authService: IAuthService = inject(AUTH_SERVICE_TOKEN);
  private router = inject(Router);

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  adminNavItems = [
    { label: 'Dashboard', link: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Create Game', link: '/admin/games/new', icon: 'add_circle_outline' },
  ];

  async onLogout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout failed in admin layout component', error);
    }
  }
}

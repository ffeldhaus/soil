import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu'; // Import MatMenuModule
import { MatDividerModule } from '@angular/material/divider'; // Often needed with menus
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { CommonModule, NgIf, AsyncPipe, NgFor } from '@angular/common'; // Ensure NgIf, AsyncPipe, NgFor are covered
import { IAuthService } from '../../core/services/auth.service.interface'; // Import interface
import { AUTH_SERVICE_TOKEN } from '../../core/services/injection-tokens'; // Import token
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-frontpage-layout',
  standalone: true,
  imports: [
    CommonModule, // Or NgIf, AsyncPipe, NgFor individually if preferred
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule, // Keep if any sidenav-related logic/styles are being kept for other purposes
    MatListModule,    // Keep if used by mat-nav-list inside the new mat-menu or elsewhere
    MatMenuModule,    // Add MatMenuModule here
    MatDividerModule, // Add MatDividerModule
    FooterComponent
  ],
  templateUrl: './frontpage-layout.component.html',
  styleUrls: ['./frontpage-layout.component.scss']
})
export class FrontpageLayoutComponent {
  private breakpointObserver = inject(BreakpointObserver);
  public authService: IAuthService = inject(AUTH_SERVICE_TOKEN); 
  private router = inject(Router);

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  navItems = [
    { label: 'Overview', link: 'overview' },
    { label: 'Background', link: 'background' },
  ];

  async onLogout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout failed in layout component', error);
    }
  }
}

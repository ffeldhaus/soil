import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AsyncPipe, NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service'; // For showing login/logout status
import { FooterComponent } from '../../shared/components/footer/footer.component'; // Import FooterComponent

@Component({
  selector: 'app-frontpage-layout',
  standalone: true,
  imports: [
    RouterModule,
    NgIf,
    AsyncPipe,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    FooterComponent // Add FooterComponent here
  ],
  templateUrl: './frontpage-layout.component.html',
  styleUrls: ['./frontpage-layout.component.scss']
})
export class FrontpageLayoutComponent {
  private breakpointObserver = inject(BreakpointObserver);
  public authService = inject(AuthService);
  private router = inject(Router);

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  navItems = [
    { label: 'Overview', link: 'overview' },
    { label: 'Background', link: 'background' },
    // Conditional items will be handled in the template based on auth state
  ];

  async onLogout() {
    try {
      await this.authService.logout();
      // Navigation is handled by authService or can be forced here if needed
      // this.router.navigate(['/frontpage/login']);
    } catch (error) {
      console.error('Logout failed in layout component', error);
    }
  }
}
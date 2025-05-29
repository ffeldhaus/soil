import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { CommonModule, isPlatformBrowser } from '@angular/common'; // Removed NgIf, AsyncPipe, NgFor
import { IAuthService } from '../../core/services/auth.service.interface';
import { AUTH_SERVICE_TOKEN } from '../../core/services/injection-tokens';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-frontpage-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatDividerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    TranslateModule
  ],
  templateUrl: './frontpage-layout.component.html',
  styleUrls: ['./frontpage-layout.component.scss']
})
export class FrontpageLayoutComponent implements OnInit {
  private breakpointObserver = inject(BreakpointObserver);
  public authService: IAuthService = inject(AUTH_SERVICE_TOKEN);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private translate = inject(TranslateService);

  currentLang: string = 'en';
  languages = [{ code: 'en', label: 'English' }, { code: 'de', label: 'Deutsch' }];

  navItems = [
    { label: 'Overview', link: 'overview' },
    { label: 'Background', link: 'background' },
    { label: 'Imprint', link: 'imprint' },
    { label: 'Privacy', link: 'privacy' },
  ];

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  ngOnInit(): void {
    // Initialize ngx-translate
    this.translate.setDefaultLang('en');
    const browserLang = this.translate.getBrowserLang();
    this.currentLang = browserLang?.match(/en|de/) ? browserLang : 'en';
    this.translate.use(this.currentLang);
  }

  async onLogout() {
    try {
      await this.authService.logout();
      // Optionally navigate or show notification on successful logout
    } catch { // Removed error parameter
      // console.error('Logout failed in layout component');
    }
  }

  onLanguageChange(langCode: string): void {
    this.translate.use(langCode);
    this.currentLang = langCode;
    // Optionally, save the selected language to localStorage or a user profile
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('preferredLang', langCode);
    }
  }
}

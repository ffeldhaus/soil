import { Routes } from '@angular/router';
import { FrontpageLayoutComponent } from './frontpage-layout.component';
import { OverviewComponent } from './overview/overview.component';
import { BackgroundComponent } from './background/background.component';
import { LoginComponent } from './login/login.component';
import { AdminRegisterComponent } from './admin-register/admin-register.component';
import { ImprintComponent } from './imprint/imprint.component'; // Assuming shared
import { PrivacyComponent } from './privacy/privacy.component'; // Assuming shared

export const FRONTPAGE_ROUTES: Routes = [
  {
    path: '',
    component: FrontpageLayoutComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: OverviewComponent, title: 'Soil Game - Overview' },
      { path: 'background', component: BackgroundComponent, title: 'Soil Game - Background' },
      { path: 'login', component: LoginComponent, title: 'Soil Game - Login' },
      { path: 'register', component: AdminRegisterComponent, title: 'Soil Game - Admin Registration' },
      { path: 'imprint', component: ImprintComponent, title: 'Soil Game - Impressum' },
      { path: 'privacy', component: PrivacyComponent, title: 'Soil Game - Privacy Policy' },
    ]
  }
];
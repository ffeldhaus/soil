import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-super-admin',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-super-admin.html',
})
export class DashboardSuperAdminComponent {
  t(key: string): string {
    const translations: Record<string, string> = {
      'dashboard.super.title': 'Super-Admin-Zugriff',
      'dashboard.super.redirect': 'Weiterleitung zur Super-Admin-Konsole...',
      'dashboard.super.btnGo': 'Zur Konsole',
    };
    return translations[key] || key;
  }
}

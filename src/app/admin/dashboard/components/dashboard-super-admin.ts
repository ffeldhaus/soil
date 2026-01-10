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
      'dashboard.super.title': $localize`:Heading|Title for the super admin access section@@dashboard.super.title:Super-Admin-Zugriff`,
      'dashboard.super.redirect': $localize`:Info Message|Information about being redirected to the super admin console@@dashboard.super.redirect:Weiterleitung zur Super-Admin-Konsole...`,
      'dashboard.super.btnGo': $localize`:Action Label|Button to go to the super admin console@@dashboard.super.btnGo:Zur Konsole`,
    };
    return translations[key] || key;
  }
}

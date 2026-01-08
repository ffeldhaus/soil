import { Component, Input } from '@angular/core';

import { SystemStats } from '../../../types';

@Component({
  selector: 'app-super-admin-stats',
  standalone: true,
  imports: [],
  templateUrl: './super-admin-stats.html',
})
export class SuperAdminStatsComponent {
  @Input() stats: SystemStats | null = null;

  t(key: string): string {
    const translations: Record<string, string> = {
      'superadmin.stats.totalGames': $localize`:@@superadmin.stats.totalGames:Gesamt Spiele`,
      'superadmin.stats.created': $localize`:@@superadmin.stats.created:erstellt`,
      'superadmin.stats.active': $localize`:@@superadmin.stats.active:Aktiv`,
      'superadmin.stats.trash': $localize`:@@superadmin.stats.trash:Papierkorb`,
      'superadmin.stats.totalUsers': $localize`:@@superadmin.stats.totalUsers:Gesamt Benutzer`,
      'superadmin.stats.registered': $localize`:@@superadmin.stats.registered:registriert`,
      'superadmin.stats.teachers': $localize`:@@superadmin.stats.teachers:Lehrkräfte`,
      'superadmin.stats.pending': $localize`:@@superadmin.stats.pending:Ausstehend`,
      'superadmin.stats.rejected': $localize`:@@superadmin.stats.rejected:Abgelehnt`,
      'superadmin.stats.banned': $localize`:@@superadmin.stats.banned:Gesperrt`,
    };
    return translations[key] || key;
  }
}

import { Component, Input } from '@angular/core';

import type { SystemStats } from '../../../types';

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
      'superadmin.stats.totalGames': 'Gesamt Spiele',
      'superadmin.stats.created': 'erstellt',
      'superadmin.stats.active': 'Aktiv',
      'superadmin.stats.trash': 'Papierkorb',
      'superadmin.stats.totalUsers': 'Gesamt Benutzer',
      'superadmin.stats.registered': 'registriert',
      'superadmin.stats.teachers': 'Lehrkräfte',
      'superadmin.stats.rejected': 'Abgelehnt',
      'superadmin.stats.banned': 'Gesperrt',
    };
    return translations[key] || key;
  }
}

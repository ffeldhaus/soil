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
      'superadmin.stats.totalGames': $localize`:Stat Label|Total number of games in the system@@superadmin.stats.totalGames:Gesamt Spiele`,
      'superadmin.stats.created': $localize`:Stat Sub-label|Indicator for created games@@superadmin.stats.created:erstellt`,
      'superadmin.stats.active': $localize`:Stat Sub-label|Indicator for active games@@superadmin.stats.active:Aktiv`,
      'superadmin.stats.trash': $localize`:Stat Sub-label|Indicator for games in trash@@superadmin.stats.trash:Papierkorb`,
      'superadmin.stats.totalUsers': $localize`:Stat Label|Total number of users in the system@@superadmin.stats.totalUsers:Gesamt Benutzer`,
      'superadmin.stats.registered': $localize`:Stat Sub-label|Indicator for registered users@@superadmin.stats.registered:registriert`,
      'superadmin.stats.teachers': $localize`:Stat Sub-label|Indicator for teacher accounts@@superadmin.stats.teachers:Lehrkräfte`,
      'superadmin.stats.pending': $localize`:Stat Sub-label|Indicator for pending approvals@@superadmin.stats.pending:Ausstehend`,
      'superadmin.stats.rejected': $localize`:Stat Sub-label|Indicator for rejected applications@@superadmin.stats.rejected:Abgelehnt`,
      'superadmin.stats.banned': $localize`:Stat Sub-label|Indicator for banned users@@superadmin.stats.banned:Gesperrt`,
    };
    return translations[key] || key;
  }
}

import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-super-admin-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './super-admin-stats.html',
})
export class SuperAdminStatsComponent {
  @Input() stats: any = null;

  t(key: string): string {
    const translations: Record<string, string> = {
      'superadmin.stats.totalGames': $localize`:@@superadmin.stats.totalGames:Gesamt Spiele`,
      'superadmin.stats.created': $localize`:@@superadmin.stats.created:erstellt`,
      'superadmin.stats.active': $localize`:@@superadmin.stats.active:Aktiv`,
    };
    return translations[key] || key;
  }
}

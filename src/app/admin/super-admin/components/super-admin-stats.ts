import { Component, Input } from '@angular/core';

import type { SystemStats } from '../../../types';

export interface TelemetryMetricRow {
  key: string;
  label: string;
  count: number;
}

@Component({
  selector: 'app-super-admin-stats',
  standalone: true,
  imports: [],
  templateUrl: './super-admin-stats.html',
})
export class SuperAdminStatsComponent {
  @Input() stats: SystemStats | null = null;

  private readonly routeDefinitions: ReadonlyArray<{ key: string; label: string }> = [
    { key: '/', label: 'Startseite (/)' },
    { key: '/game', label: 'Spielfeld (/game)' },
    { key: '/manual', label: 'Handbuch (/manual)' },
    { key: '/info', label: 'Hintergrund (/info)' },
    { key: '/research', label: 'Forschung (/research)' },
    { key: '/admin', label: 'Lehrkräfte (/admin)' },
  ];

  private readonly eventDefinitions: ReadonlyArray<{ key: string; label: string }> = [
    { key: 'quick_game_started', label: 'Sofort-Spiele gestartet' },
    { key: 'trailer_opened', label: 'Trailer angesehen' },
    { key: 'research_export', label: 'Forschungs-Exporte' },
  ];

  get routeRows(): TelemetryMetricRow[] {
    const routes = this.stats?.telemetry?.routes || {};
    return this.routeDefinitions.map((item) => ({
      key: item.key,
      label: item.label,
      count: Number(routes[item.key] || 0),
    }));
  }

  get eventRows(): TelemetryMetricRow[] {
    const events = this.stats?.telemetry?.events || {};
    return this.eventDefinitions.map((item) => ({
      key: item.key,
      label: item.label,
      count: Number(events[item.key] || 0),
    }));
  }

  get referrerRows(): TelemetryMetricRow[] {
    const referrers = this.stats?.telemetry?.referrers || {};
    return Object.entries(referrers)
      .map(([key, count]) => ({
        key,
        label: key === 'direct' ? 'Direktaufruf' : key === 'pwa_launch' ? 'PWA-App-Start' : key,
        count: Number(count || 0),
      }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }

  t(key: string): string {
    const translations: Record<string, string> = {
      'superadmin.stats.totalGames': 'Gesamt Spiele',
      'superadmin.stats.created': 'erstellt',
      'superadmin.stats.active': 'Aktiv',
      'superadmin.stats.trash': 'Papierkorb',
      'superadmin.stats.totalUsers': 'Gesamt Benutzer',
      'superadmin.stats.registered': 'registriert',
      'superadmin.stats.teachers': 'Administratoren',
      'superadmin.stats.rejected': 'Abgelehnt',
      'superadmin.stats.banned': 'Gesperrt',
      'superadmin.stats.telemetryViews': 'Seitenzugriffe (Anonym)',
      'superadmin.stats.telemetryTotal': 'gesamt',
      'superadmin.stats.telemetryBreakdown': 'Seiten, Aktionen & Herkunft',
    };
    return translations[key] || key;
  }
}

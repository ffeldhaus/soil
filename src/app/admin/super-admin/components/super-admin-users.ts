import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { Game, PlayerState, SystemStats, UserStatus } from '../../../types';

export type AdminAccountRow = UserStatus & { gameCount: number; quota: number };

@Component({
  selector: 'app-super-admin-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './super-admin-users.html',
})
export class SuperAdminUsersComponent {
  @Input() stats: SystemStats | null = null;
  @Input() admins: AdminAccountRow[] = [];
  @Input() selectedAdmin: AdminAccountRow | null = null;
  @Input() adminGames: Game[] = [];
  @Input() isLoadingGames = false;
  @Input() evaluatingPlayers = new Set<string>();
  @Input() systemInsights: any[] = [];
  @Input() isAnalyzing = false;

  @Output() viewGames = new EventEmitter<AdminAccountRow>();
  @Output() closeAdminGames = new EventEmitter<void>();
  @Output() setQuota = new EventEmitter<AdminAccountRow>();
  @Output() banAdmin = new EventEmitter<UserStatus>();
  @Output() deleteAdmin = new EventEmitter<UserStatus>();
  @Output() deleteGame = new EventEmitter<Game>();
  @Output() evaluatePlayer = new EventEmitter<{ game: Game; player: PlayerState }>();
  @Output() viewAsPlayer = new EventEmitter<{ gameId: string; playerUid: string }>();
  @Output() analyzeSystem = new EventEmitter<void>();

  getPlayers(game: Game): PlayerState[] {
    return Object.values(game.players || {}).filter((p) => !p.isAi);
  }

  formatDate(
    d: { seconds?: number; nanoseconds?: number } | Record<string, unknown> | Date | string | number | null | undefined,
  ): Date | null {
    if (!d) return null;
    if (d instanceof Date) return Number.isNaN(d.getTime()) ? null : d;
    if (typeof d === 'number') return new Date(d);
    if (typeof d === 'string') {
      const parsed = new Date(d);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof (d as any).toDate === 'function') return (d as any).toDate();
    if (typeof (d as any).seconds === 'number') return new Date((d as any).seconds * 1000);
    if (typeof (d as any)._seconds === 'number') return new Date((d as any)._seconds * 1000);
    return null;
  }

  formatRoleLabel(role?: string): string {
    switch (role) {
      case 'superadmin':
        return 'System-Admin';
      case 'admin':
        return 'Lehrkraft';
      case 'banned':
        return 'Gesperrt';
      case 'new':
        return 'Neu';
      default:
        return role || 'Unbekannt';
    }
  }

  formatStatusLabel(status?: string): string {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'banned':
        return 'Gesperrt';
      case 'rejected':
        return 'Abgelehnt';
      case 'pending':
        return 'Ausstehend';
      default:
        return status || 'Unbekannt';
    }
  }

  formatGameStatus(status?: string): string {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'finished':
        return 'Beendet';
      case 'deleted':
        return 'Papierkorb';
      default:
        return (status || 'Aktiv').toUpperCase();
    }
  }

  quotaPercent(admin: AdminAccountRow): number {
    if (!admin.quota || admin.quota <= 0) return 0;
    return Math.min(100, Math.round((admin.gameCount / admin.quota) * 100));
  }
}

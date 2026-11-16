import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { Game, PlayerState } from '../../../types';

@Component({
  selector: 'app-super-admin-research',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './super-admin-research.html',
})
export class SuperAdminResearchComponent {
  @Input() researchGames: Game[] = [];
  @Input() expandedGames = new Set<string>();

  @Output() toggleGameExpansion = new EventEmitter<string>();
  @Output() viewAsPlayer = new EventEmitter<{ gameId: string; playerUid: string }>();

  getPlayers(game: Game): PlayerState[] {
    return Object.values(game.players || {}).filter((p) => !p.isAi);
  }

  isCloudResearchGame(game: Game): boolean {
    if (game?.sourceType === 'cloud') return true;
    if (game?.sourceType === 'local') return false;
    const rawId = `${game?.id || ''} ${(game as any)?.migratedFrom || ''}`;
    return !rawId.includes('local-');
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
}

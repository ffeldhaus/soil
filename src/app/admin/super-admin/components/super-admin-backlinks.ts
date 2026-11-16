import { ChangeDetectorRef, Component, Input, inject, NgZone, ViewEncapsulation } from '@angular/core';

import { GameService } from '../../../game/game.service';
import { type BacklinkCheckResult, KNOWN_BACKLINKS, type KnownBacklinkEntry, type SystemStats } from '../../../types';

const CHECKED_TIME_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function formatIsoDateDe(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

@Component({
  selector: 'app-super-admin-backlinks',
  standalone: true,
  templateUrl: './super-admin-backlinks.html',
  styleUrl: './super-admin-backlinks.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SuperAdminBacklinksComponent {
  private gameService = inject(GameService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  @Input() stats: SystemStats | null = null;
  @Input() entries: readonly KnownBacklinkEntry[] = KNOWN_BACKLINKS;

  isChecking = false;
  lastCheckedAt: string | null = null;
  checkError: string | null = null;
  resultsById: Record<string, BacklinkCheckResult> = {};

  get formattedCheckedTime(): string | null {
    if (!this.lastCheckedAt) return null;
    const parsed = new Date(this.lastCheckedAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return CHECKED_TIME_FORMATTER.format(parsed);
  }

  referrerCount(entry: KnownBacklinkEntry): number {
    return this.stats?.telemetry?.referrers?.[entry.domain] ?? 0;
  }

  formatPrimaryDateLabel(entry: KnownBacklinkEntry): string {
    if (entry.publishedAt) {
      return `Freigeschaltet ${formatIsoDateDe(entry.publishedAt)}`;
    }
    return `Eingereicht ${formatIsoDateDe(entry.submittedAt)}`;
  }

  formatSecondaryDateLabel(entry: KnownBacklinkEntry): string | null {
    if (entry.publishedAt && entry.submittedAt && entry.publishedAt !== entry.submittedAt) {
      return `Eingereicht ${formatIsoDateDe(entry.submittedAt)}`;
    }
    return null;
  }

  formatSeoLabel(seoType: KnownBacklinkEntry['seoType']): string {
    switch (seoType) {
      case 'dofollow':
        return 'dofollow';
      case '302-dofollow':
        return '302 → dofollow';
      case 'nofollow':
        return 'nofollow';
      case 'pending':
        return 'In Prüfung';
    }
  }

  isHttp2xxWithoutLink(result: BacklinkCheckResult): boolean {
    return result.httpStatus !== null && result.httpStatus >= 200 && result.httpStatus < 300 && !result.linksToSoil;
  }

  formatErrorStatus(result: BacklinkCheckResult): string {
    if (result.httpStatus !== null) {
      return `Fehler / HTTP ${result.httpStatus}`;
    }
    return `Fehler · ${result.error || 'Nicht erreichbar'}`;
  }

  async runBacklinkCheck(): Promise<void> {
    if (this.isChecking) return;
    this.isChecking = true;
    this.checkError = null;
    this.cdr.detectChanges();

    try {
      const res = await this.gameService.checkBacklinkStatus();
      this.ngZone.run(() => {
        const nextMap: Record<string, BacklinkCheckResult> = {};
        for (const item of res.results || []) {
          nextMap[item.id] = item;
        }
        this.resultsById = nextMap;
        this.lastCheckedAt = res.checkedAt || new Date().toISOString();
        this.isChecking = false;
        this.cdr.detectChanges();
      });
    } catch (err: unknown) {
      this.ngZone.run(() => {
        this.checkError = err instanceof Error ? err.message : 'Verbindungsfehler';
        this.isChecking = false;
        this.cdr.detectChanges();
      });
    }
  }
}

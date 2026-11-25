import { ChangeDetectorRef, Component, Input, inject } from '@angular/core';

import type {
  ActiveGameRoundBucket,
  ActiveRoundDistribution,
  FinishedGameLengthSummary,
  SystemStats,
} from '../../../types';

export type RoundDistributionSource = 'all' | 'local' | 'cloud';
export type RemainingBandKey = 'short' | 'medium' | 'long' | 'extended';

export interface RemainingBandDefinition {
  key: RemainingBandKey;
  label: string;
  colorClass: string;
}

export interface RoundColumnDetail {
  remaining: number;
  roundLimit: number;
  count: number;
  band: RemainingBandKey;
}

export interface RoundColumnSegment {
  band: RemainingBandKey;
  count: number;
  heightPercent: number;
  sharePercent: number;
  colorClass: string;
}

export interface ActiveRoundColumn {
  round: number;
  shortLabel: string;
  label: string;
  total: number;
  localCount: number;
  cloudCount: number;
  barHeightPercent: number;
  segments: RoundColumnSegment[];
  details: RoundColumnDetail[];
}

export function getRemainingBand(remaining: number): RemainingBandKey {
  if (remaining <= 3) return 'short';
  if (remaining <= 6) return 'medium';
  if (remaining <= 10) return 'long';
  return 'extended';
}

function computeNiceIntegerHalfStep(rawMax: number): number {
  const roughHalf = rawMax / 2;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, roughHalf)));
  const normalized = roughHalf / magnitude;
  let multiplier = 10;
  if (normalized <= 1) multiplier = 1;
  else if (normalized <= 2) multiplier = 2;
  else if (normalized <= 2.5 && magnitude >= 10) multiplier = 2.5;
  else if (normalized <= 5) multiplier = 5;
  return Math.max(1, Math.ceil(multiplier * magnitude));
}

@Component({
  selector: 'app-super-admin-round-distribution',
  standalone: true,
  imports: [],
  templateUrl: './super-admin-round-distribution.html',
})
export class SuperAdminRoundDistributionComponent {
  private cdr = inject(ChangeDetectorRef);

  @Input() stats: SystemStats | null = null;
  @Input() startedCount = 0;
  @Input() rangeLabel = '28T';

  selectedSource: RoundDistributionSource = 'all';
  hoveredRound: number | null = null;

  readonly sourceOptions: readonly { id: RoundDistributionSource; label: string }[] = [
    { id: 'all', label: 'Alle' },
    { id: 'local', label: 'Mensch vs. KI' },
    { id: 'cloud', label: 'Cloud' },
  ];

  readonly remainingBands: readonly RemainingBandDefinition[] = [
    { key: 'short', label: '1–3 Rd. offen', colorClass: 'bg-emerald-500' },
    { key: 'medium', label: '4–6 Rd. offen', colorClass: 'bg-sky-500' },
    { key: 'long', label: '7–10 Rd. offen', colorClass: 'bg-amber-500' },
    { key: 'extended', label: '> 10 Rd. offen', colorClass: 'bg-slate-400' },
  ];

  get distribution(): ActiveRoundDistribution | null {
    return this.stats?.games?.roundDistribution ?? null;
  }

  get filteredBuckets(): ActiveGameRoundBucket[] {
    const allBuckets = this.distribution?.buckets ?? [];
    if (this.selectedSource === 'all') {
      return allBuckets;
    }
    return allBuckets.filter((b) => b.source === this.selectedSource);
  }

  get maxRound(): number {
    let highest = 10;
    for (const bucket of this.filteredBuckets) {
      if (bucket.round > highest) {
        highest = bucket.round;
      }
    }
    return highest;
  }

  get totalActive(): number {
    return this.filteredBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
  }

  get finishedSummaries(): FinishedGameLengthSummary[] {
    const dist = this.distribution;
    if (!dist) return [];

    const byLimit = new Map<number, number>();
    const addSummaries = (list: readonly FinishedGameLengthSummary[] | undefined) => {
      for (const item of list ?? []) {
        if (item.roundLimit >= 3 && item.count > 0) {
          byLimit.set(item.roundLimit, (byLimit.get(item.roundLimit) || 0) + item.count);
        }
      }
    };

    if (this.selectedSource === 'all' || this.selectedSource === 'local') {
      addSummaries(dist.localFinished30dByLength);
    }
    if (this.selectedSource === 'all' || this.selectedSource === 'cloud') {
      addSummaries(dist.cloudFinishedByLength);
    }

    return Array.from(byLimit.entries())
      .map(([roundLimit, count]) => ({ roundLimit, count }))
      .sort((a, b) => a.roundLimit - b.roundLimit);
  }

  get totalFinished(): number {
    return this.finishedSummaries.reduce((sum, item) => sum + item.count, 0);
  }

  get formattedFinishedBreakdown(): string {
    return this.finishedSummaries.map((item) => `${item.count}× ${item.roundLimit} Rd.`).join(' · ');
  }

  get hasLocalSessionDocs(): boolean {
    return this.distribution?.hasLocalSessionDocs === true;
  }

  get showLocalV357Hint(): boolean {
    return this.selectedSource !== 'cloud' && !this.hasLocalSessionDocs;
  }

  get yMax(): number {
    const totalsByRound = new Map<number, number>();
    for (const bucket of this.filteredBuckets) {
      totalsByRound.set(bucket.round, (totalsByRound.get(bucket.round) || 0) + bucket.count);
    }
    let rawMax = 0;
    for (const count of totalsByRound.values()) {
      if (count > rawMax) rawMax = count;
    }
    if (rawMax <= 2) return 2;
    if (rawMax <= 4) return 4;
    if (rawMax <= 6) return 6;
    if (rawMax <= 10) return 10;
    return computeNiceIntegerHalfStep(rawMax) * 2;
  }

  get yTicks(): number[] {
    const max = this.yMax;
    return [max, Math.round(max / 2), 0];
  }

  get columns(): ActiveRoundColumn[] {
    const buckets = this.filteredBuckets;
    const maxRound = this.maxRound;
    const yMax = this.yMax;

    const byRound = new Map<number, ActiveGameRoundBucket[]>();
    for (const bucket of buckets) {
      if (bucket.count <= 0 || bucket.round < 1) continue;
      const list = byRound.get(bucket.round);
      if (list) list.push(bucket);
      else byRound.set(bucket.round, [bucket]);
    }

    const result: ActiveRoundColumn[] = [];
    for (let round = 1; round <= maxRound; round++) {
      const roundBuckets = byRound.get(round) ?? [];
      let total = 0;
      let localCount = 0;
      let cloudCount = 0;
      const detailMap = new Map<string, RoundColumnDetail>();
      const bandCounts: Record<RemainingBandKey, number> = {
        short: 0,
        medium: 0,
        long: 0,
        extended: 0,
      };

      for (const bucket of roundBuckets) {
        total += bucket.count;
        if (bucket.source === 'local') localCount += bucket.count;
        else cloudCount += bucket.count;

        const band = getRemainingBand(bucket.remaining);
        bandCounts[band] += bucket.count;

        const detailKey = `${bucket.remaining}:${bucket.roundLimit}`;
        const existing = detailMap.get(detailKey);
        if (existing) {
          existing.count += bucket.count;
        } else {
          detailMap.set(detailKey, {
            remaining: bucket.remaining,
            roundLimit: bucket.roundLimit,
            count: bucket.count,
            band,
          });
        }
      }

      const details = Array.from(detailMap.values()).sort(
        (a, b) => a.remaining - b.remaining || a.roundLimit - b.roundLimit,
      );

      const segments: RoundColumnSegment[] = [];
      if (total > 0) {
        for (const bandDef of this.remainingBands) {
          const count = bandCounts[bandDef.key];
          if (count > 0) {
            segments.push({
              band: bandDef.key,
              count,
              heightPercent: Number(((count / yMax) * 100).toFixed(2)),
              sharePercent: Number(((count / total) * 100).toFixed(2)),
              colorClass: bandDef.colorClass,
            });
          }
        }
      }

      result.push({
        round,
        shortLabel: `R${round}`,
        label: `Runde ${round}`,
        total,
        localCount,
        cloudCount,
        barHeightPercent: total > 0 ? Number(((total / yMax) * 100).toFixed(2)) : 0,
        segments,
        details,
      });
    }

    return result;
  }

  get hoveredColumn(): ActiveRoundColumn | null {
    if (this.hoveredRound === null) return null;
    return this.columns.find((col) => col.round === this.hoveredRound) ?? null;
  }

  selectSource(source: RoundDistributionSource): void {
    this.selectedSource = source;
    this.hoveredRound = null;
    this.cdr.markForCheck();
  }

  setHoveredRound(round: number | null): void {
    this.hoveredRound = round;
    this.cdr.markForCheck();
  }

  formatDetailSummary(col: ActiveRoundColumn): string {
    return col.details
      .map((d) => `${d.count}× noch ${d.remaining} ${d.remaining === 1 ? 'Runde' : 'Runden'} (${d.roundLimit}er)`)
      .join(' · ');
  }

  formatSourceSplit(col: ActiveRoundColumn): string | null {
    if (this.selectedSource !== 'all' || col.total === 0) return null;
    if (col.localCount > 0 && col.cloudCount > 0) {
      return `${col.localCount} KI · ${col.cloudCount} Cloud`;
    }
    if (col.localCount > 0) return `${col.localCount} KI`;
    return `${col.cloudCount} Cloud`;
  }
}

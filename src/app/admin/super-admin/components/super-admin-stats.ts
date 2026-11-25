import { ChangeDetectorRef, Component, Input, inject, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { SystemStats, TelemetryDailyEntry, TelemetryHourlyEntry } from '../../../types';
import { SuperAdminRoundDistributionComponent } from './super-admin-round-distribution';

export type TelemetryRangePreset = '24h' | '7d' | '28d' | '3m' | '12m' | 'all' | 'custom';
export type TelemetrySeriesKey = 'total' | 'web' | 'pwa' | 'interactions';

export interface TelemetryMetricRow {
  key: string;
  label: string;
  count: number;
  percent: number;
}

export interface TelemetryMetricTile {
  key: TelemetrySeriesKey;
  label: string;
  subtitle: string;
  color: string;
  dashed: boolean;
  count: number;
  active: boolean;
}

export interface ChartDayPoint {
  index: number;
  date: string;
  shortLabel: string;
  fullLabel: string;
  total: number;
  web: number;
  pwa: number;
  interactions: number;
  x: number;
  yTotal: number;
  yWeb: number;
  yPwa: number;
  yInteractions: number;
  hitX: number;
  hitWidth: number;
}

export interface ChartAxisTick {
  value?: number;
  label: string;
  x?: number;
  y?: number;
  anchor?: 'start' | 'middle' | 'end';
}

interface WindowBucketEntry {
  key: string;
  shortLabel: string;
  fullLabel: string;
  total: number;
  web: number;
  pwa: number;
  interactions: number;
  routes?: Record<string, number>;
  events?: Record<string, number>;
  referrers?: Record<string, number>;
}

const WEEKDAYS_DE = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'] as const;

const LOCAL_HOUR_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function parseUtcDateMs(dateKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function parseUtcHourMs(hourKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/.exec(hourKey);
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]));
}

function formatUtcDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function formatUtcHourKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 13);
}

function addUtcDays(dateKey: string, deltaDays: number): string {
  const base = parseUtcDateMs(dateKey);
  if (Number.isNaN(base)) return dateKey;
  return formatUtcDateKey(base + deltaDays * 86_400_000);
}

export function formatGermanDate(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function formatGermanShortDate(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;
  return `${match[3]}.${match[2]}.`;
}

function formatGermanFullLabel(dateKey: string): string {
  const ms = parseUtcDateMs(dateKey);
  if (Number.isNaN(ms)) return dateKey;
  const weekday = WEEKDAYS_DE[new Date(ms).getUTCDay()];
  return `${weekday}, ${formatGermanDate(dateKey)}`;
}

function formatLocalHourShortLabel(hourMs: number): string {
  return LOCAL_HOUR_FORMATTER.format(new Date(hourMs));
}

function formatLocalDayMonthTime(ms: number): string {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}., ${LOCAL_HOUR_FORMATTER.format(d)}`;
}

function formatLocalHourFullLabel(hourMs: number): string {
  const start = new Date(hourMs);
  const weekday = WEEKDAYS_DE[start.getDay()];
  const dd = String(start.getDate()).padStart(2, '0');
  const mm = String(start.getMonth() + 1).padStart(2, '0');
  const yyyy = start.getFullYear();
  const startClock = LOCAL_HOUR_FORMATTER.format(start);
  const endClock = LOCAL_HOUR_FORMATTER.format(new Date(hourMs + 3_600_000));
  return `${weekday}, ${dd}.${mm}.${yyyy} · ${startClock}–${endClock} Uhr`;
}

function computeNiceIntegerMax(rawMax: number): { yMax: number; step: number } {
  if (rawMax <= 4) {
    return { yMax: 4, step: 1 };
  }
  const roughStep = rawMax / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  let niceMultiplier = 10;
  if (normalized <= 1) niceMultiplier = 1;
  else if (normalized <= 2) niceMultiplier = 2;
  else if (normalized <= 2.5 && magnitude >= 10) niceMultiplier = 2.5;
  else if (normalized <= 5) niceMultiplier = 5;

  const step = Math.max(1, Math.round(niceMultiplier * magnitude));
  return { yMax: step * 4, step };
}

@Component({
  selector: 'app-super-admin-stats',
  standalone: true,
  imports: [FormsModule, SuperAdminRoundDistributionComponent],
  templateUrl: './super-admin-stats.html',
  styleUrl: './super-admin-stats.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SuperAdminStatsComponent {
  private cdr = inject(ChangeDetectorRef);

  @Input() stats: SystemStats | null = null;
  @Input() referenceDate: string | null = null;
  @Input() referenceHour: string | null = null;

  readonly svgWidth = 960;
  readonly svgHeight = 204;
  readonly padLeft = 44;
  readonly padRight = 18;
  readonly padTop = 14;
  readonly padBottom = 26;

  readonly rangePresets: ReadonlyArray<{ id: TelemetryRangePreset; label: string }> = [
    { id: '24h', label: '24 Std.' },
    { id: '7d', label: '7 Tage' },
    { id: '28d', label: '28 Tage' },
    { id: '3m', label: '3 Monate' },
    { id: '12m', label: '12 Monate' },
    { id: 'all', label: 'Gesamt' },
    { id: 'custom', label: 'Benutzerdefiniert' },
  ];

  selectedRange: TelemetryRangePreset = '28d';
  customStartDate = '';
  customEndDate = '';
  hoveredDayIndex: number | null = null;

  private activeSeries = new Set<TelemetrySeriesKey>(['total', 'web', 'pwa', 'interactions']);

  private readonly routeDefinitions: ReadonlyArray<{ key: string; label: string }> = [
    { key: '/', label: 'Startseite (/)' },
    { key: '/game', label: 'Spielfeld (/game)' },
    { key: '/manual', label: 'Handbuch (/manual)' },
    { key: '/info', label: 'Hintergrund (/info)' },
    { key: '/research', label: 'Forschung (/research)' },
    { key: '/trailer', label: 'Trailer (/trailer)' },
    { key: '/admin', label: 'Lehrkräfte (/admin)' },
    { key: '/game-login', label: 'Spiel-Login (/game-login)' },
    { key: '/impressum', label: 'Impressum (/impressum)' },
    { key: '/privacy', label: 'Datenschutz (/privacy)' },
  ];

  private readonly eventDefinitions: ReadonlyArray<{ key: string; label: string }> = [
    { key: 'quick_game_started', label: 'Sofort-Spiele gestartet' },
    { key: 'quick_game_round_1', label: 'Einzelspieler (≥ 1 Runde)' },
    { key: 'trailer_opened', label: 'Trailer angesehen' },
    { key: 'research_export', label: 'Forschungs-Exporte' },
  ];

  get todayKey(): string {
    if (this.referenceDate && /^\d{4}-\d{2}-\d{2}$/.test(this.referenceDate)) {
      return this.referenceDate;
    }
    return new Date().toISOString().slice(0, 10);
  }

  get currentHourKey(): string {
    if (this.referenceHour && /^\d{4}-\d{2}-\d{2}T\d{2}$/.test(this.referenceHour)) {
      return this.referenceHour;
    }
    return new Date().toISOString().slice(0, 13);
  }

  get isHourlyRange(): boolean {
    return this.selectedRange === '24h';
  }

  get hasDailySeries(): boolean {
    return (this.stats?.telemetry?.dailySeries?.length ?? 0) > 0;
  }

  get hasHourlySeries(): boolean {
    return (this.stats?.telemetry?.hourlySeries?.length ?? 0) > 0;
  }

  get isRangeFiltered(): boolean {
    if (this.isHourlyRange) return true;
    return this.selectedRange !== 'all' && this.hasDailySeries;
  }

  get viewsLast24h(): number {
    const tel = this.stats?.telemetry;
    if (!tel) return 0;
    if (typeof tel.viewsLast24h === 'number') {
      return tel.viewsLast24h;
    }
    if (tel.hourlySeries && tel.hourlySeries.length > 0) {
      const endMs = parseUtcHourMs(this.currentHourKey);
      if (Number.isNaN(endMs)) return 0;
      const startKey = formatUtcHourKey(endMs - 23 * 3_600_000);
      const endKey = this.currentHourKey;
      return tel.hourlySeries
        .filter((h) => h.hour >= startKey && h.hour <= endKey)
        .reduce((sum, h) => sum + (h.totalViews || 0), 0);
    }
    return 0;
  }

  get firstRecordedDate(): string | null {
    const explicit = this.stats?.telemetry?.firstRecordedDate;
    if (explicit && /^\d{4}-\d{2}-\d{2}$/.test(explicit)) {
      return explicit;
    }
    const series = this.stats?.telemetry?.dailySeries;
    if (series && series.length > 0) {
      return series[0].date;
    }
    return null;
  }

  get firstRecordedHour(): string | null {
    const explicit = this.stats?.telemetry?.firstRecordedHour;
    if (explicit && /^\d{4}-\d{2}-\d{2}T\d{2}$/.test(explicit)) {
      return explicit;
    }
    const series = this.stats?.telemetry?.hourlySeries;
    if (series && series.length > 0) {
      return series[0].hour;
    }
    return null;
  }

  get resolvedDateRange(): { startDate: string; endDate: string } {
    const today = this.todayKey;
    switch (this.selectedRange) {
      case '7d':
        return { startDate: addUtcDays(today, -6), endDate: today };
      case '3m':
        return { startDate: addUtcDays(today, -89), endDate: today };
      case '12m':
        return { startDate: addUtcDays(today, -364), endDate: today };
      case 'all': {
        const minSpanStart = addUtcDays(today, -13);
        const earliest = this.firstRecordedDate;
        const startDate = earliest && earliest < minSpanStart ? earliest : minSpanStart;
        return { startDate, endDate: today };
      }
      case 'custom': {
        const fallbackStart = addUtcDays(today, -27);
        const rawStart = /^\d{4}-\d{2}-\d{2}$/.test(this.customStartDate) ? this.customStartDate : fallbackStart;
        const rawEnd = /^\d{4}-\d{2}-\d{2}$/.test(this.customEndDate) ? this.customEndDate : today;
        const [orderedStart, orderedEnd] = rawStart <= rawEnd ? [rawStart, rawEnd] : [rawEnd, rawStart];
        const maxSpanStart = addUtcDays(orderedEnd, -399);
        return {
          startDate: orderedStart < maxSpanStart ? maxSpanStart : orderedStart,
          endDate: orderedEnd,
        };
      }
      default:
        return { startDate: addUtcDays(today, -27), endDate: today };
    }
  }

  get formattedDateRange(): string {
    if (this.isHourlyRange) {
      const endHourMs = parseUtcHourMs(this.currentHourKey);
      if (!Number.isNaN(endHourMs)) {
        const startHourMs = endHourMs - 23 * 3_600_000;
        const endMinuteMs = endHourMs + 59 * 60_000;
        return `Letzte 24 Stunden (${formatLocalDayMonthTime(startHourMs)} – ${formatLocalDayMonthTime(endMinuteMs)} Uhr)`;
      }
      return 'Letzte 24 Stunden';
    }
    const { startDate, endDate } = this.resolvedDateRange;
    return `${formatGermanDate(startDate)} – ${formatGermanDate(endDate)}`;
  }

  get formattedFirstDateNote(): string | null {
    if (this.isHourlyRange) return null;
    const first = this.firstRecordedDate;
    if (!first) return null;
    const { startDate } = this.resolvedDateRange;
    return first > startDate ? formatGermanDate(first) : null;
  }

  get formattedHourlyStatusNote(): string | null {
    if (!this.isHourlyRange) return null;
    if (!this.hasHourlySeries) {
      return 'Stundenreihe aktiv ab erstem Aufruf';
    }
    const first = this.firstRecordedHour;
    const endHourMs = parseUtcHourMs(this.currentHourKey);
    if (!first || Number.isNaN(endHourMs)) return null;
    const startKey = formatUtcHourKey(endHourMs - 23 * 3_600_000);
    if (first > startKey) {
      const firstMs = parseUtcHourMs(first);
      if (!Number.isNaN(firstMs)) {
        return `Stundenreihe aktiv seit ${formatLocalDayMonthTime(firstMs)} Uhr`;
      }
    }
    return null;
  }

  selectRange(preset: TelemetryRangePreset): void {
    if (preset === 'custom' && (!this.customStartDate || !this.customEndDate)) {
      const current = this.resolvedDateRange;
      this.customStartDate = current.startDate;
      this.customEndDate = current.endDate;
    }
    this.selectedRange = preset;
    this.hoveredDayIndex = null;
    this.cdr.markForCheck();
  }

  onCustomDateChange(): void {
    this.hoveredDayIndex = null;
    this.cdr.markForCheck();
  }

  isSeriesActive(key: TelemetrySeriesKey): boolean {
    return this.activeSeries.has(key);
  }

  toggleSeries(key: TelemetrySeriesKey): void {
    if (this.activeSeries.has(key)) {
      if (this.activeSeries.size <= 1) return;
      this.activeSeries.delete(key);
    } else {
      this.activeSeries.add(key);
    }
    this.cdr.markForCheck();
  }

  private get dailyMap(): Map<string, TelemetryDailyEntry> {
    const map = new Map<string, TelemetryDailyEntry>();
    for (const entry of this.stats?.telemetry?.dailySeries || []) {
      map.set(entry.date, entry);
    }
    return map;
  }

  private get hourlyMap(): Map<string, TelemetryHourlyEntry> {
    const map = new Map<string, TelemetryHourlyEntry>();
    for (const entry of this.stats?.telemetry?.hourlySeries || []) {
      map.set(entry.hour, entry);
    }
    return map;
  }

  private get rawWindowEntries(): WindowBucketEntry[] {
    if (this.isHourlyRange) {
      const endHourMs = parseUtcHourMs(this.currentHourKey);
      if (Number.isNaN(endHourMs)) return [];
      const startHourMs = endHourMs - 23 * 3_600_000;
      const byHour = this.hourlyMap;
      const list: WindowBucketEntry[] = [];

      for (let i = 0; i < 24; i++) {
        const hourMs = startHourMs + i * 3_600_000;
        const hourKey = formatUtcHourKey(hourMs);
        const doc = byHour.get(hourKey);
        const total = doc?.totalViews ?? 0;
        const web = doc?.webViews ?? 0;
        const pwa = doc?.pwaViews ?? 0;
        const interactions = (doc?.events?.quick_game_started || 0) + (doc?.events?.trailer_opened || 0);
        list.push({
          key: hourKey,
          shortLabel: formatLocalHourShortLabel(hourMs),
          fullLabel: formatLocalHourFullLabel(hourMs),
          total,
          web,
          pwa,
          interactions,
          routes: doc?.routes,
          events: doc?.events,
          referrers: doc?.referrers,
        });
      }
      return list;
    }

    const { startDate, endDate } = this.resolvedDateRange;
    const startMs = parseUtcDateMs(startDate);
    const endMs = parseUtcDateMs(endDate);
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return [];

    const byDate = this.dailyMap;
    const dayCount = Math.min(400, Math.floor((endMs - startMs) / 86_400_000) + 1);
    const list: WindowBucketEntry[] = [];

    for (let i = 0; i < dayCount; i++) {
      const date = formatUtcDateKey(startMs + i * 86_400_000);
      const doc = byDate.get(date);
      const total = doc?.totalViews ?? 0;
      const web = doc?.webViews ?? 0;
      const pwa = doc?.pwaViews ?? 0;
      const interactions = (doc?.events?.quick_game_started || 0) + (doc?.events?.trailer_opened || 0);
      list.push({
        key: date,
        shortLabel: formatGermanShortDate(date),
        fullLabel: formatGermanFullLabel(date),
        total,
        web,
        pwa,
        interactions,
        routes: doc?.routes,
        events: doc?.events,
        referrers: doc?.referrers,
      });
    }
    return list;
  }

  get metricTiles(): TelemetryMetricTile[] {
    const tel = this.stats?.telemetry;
    let totalCount = 0;
    let webCount = 0;
    let pwaCount = 0;
    let interactionsCount = 0;

    if (this.isRangeFiltered) {
      for (const bucket of this.rawWindowEntries) {
        totalCount += bucket.total;
        webCount += bucket.web;
        pwaCount += bucket.pwa;
        interactionsCount += bucket.interactions;
      }
    } else if (tel) {
      if (this.selectedRange === '7d' && !this.hasDailySeries) {
        totalCount = tel.viewsLast7d || 0;
      } else if (this.selectedRange === '28d' && !this.hasDailySeries) {
        totalCount = tel.viewsLast30d || 0;
      } else {
        totalCount = tel.viewsTotal || 0;
      }
      webCount = tel.webViewsTotal || 0;
      pwaCount = tel.pwaViewsTotal || 0;
      interactionsCount = (tel.events?.quick_game_started || 0) + (tel.events?.trailer_opened || 0);
    }

    return [
      {
        key: 'total',
        label: 'Aufrufe gesamt',
        subtitle: 'Alle Zugriffe',
        color: '#10b981',
        dashed: false,
        count: totalCount,
        active: this.activeSeries.has('total'),
      },
      {
        key: 'web',
        label: 'Web-Browser',
        subtitle: 'Desktop & Mobil',
        color: '#38bdf8',
        dashed: false,
        count: webCount,
        active: this.activeSeries.has('web'),
      },
      {
        key: 'pwa',
        label: 'PWA / App',
        subtitle: 'Installierte App',
        color: '#f59e0b',
        dashed: false,
        count: pwaCount,
        active: this.activeSeries.has('pwa'),
      },
      {
        key: 'interactions',
        label: 'Interaktionen',
        subtitle: 'Sofort-Spiele & Trailer',
        color: '#fb7185',
        dashed: true,
        count: interactionsCount,
        active: this.activeSeries.has('interactions'),
      },
    ];
  }

  get chartScale(): { yMax: number; step: number } {
    let rawMax = 0;
    for (const bucket of this.rawWindowEntries) {
      if (this.activeSeries.has('total')) rawMax = Math.max(rawMax, bucket.total);
      if (this.activeSeries.has('web')) rawMax = Math.max(rawMax, bucket.web);
      if (this.activeSeries.has('pwa')) rawMax = Math.max(rawMax, bucket.pwa);
      if (this.activeSeries.has('interactions')) rawMax = Math.max(rawMax, bucket.interactions);
    }
    return computeNiceIntegerMax(rawMax);
  }

  get yTicks(): ChartAxisTick[] {
    const { yMax, step } = this.chartScale;
    const plotHeight = this.svgHeight - this.padTop - this.padBottom;
    const ticks: ChartAxisTick[] = [];
    for (let i = 0; i <= 4; i++) {
      const value = i * step;
      const y = this.padTop + plotHeight - (value / yMax) * plotHeight;
      ticks.push({ value, label: String(value), y: Number(y.toFixed(2)) });
    }
    return ticks;
  }

  get chartDays(): ChartDayPoint[] {
    const raw = this.rawWindowEntries;
    const n = raw.length;
    if (n === 0) return [];

    const plotWidth = this.svgWidth - this.padLeft - this.padRight;
    const plotHeight = this.svgHeight - this.padTop - this.padBottom;
    const baselineY = this.padTop + plotHeight;
    const { yMax } = this.chartScale;
    const stepX = n > 1 ? plotWidth / (n - 1) : 0;

    return raw.map((item, i) => {
      const x = n > 1 ? this.padLeft + i * stepX : this.padLeft + plotWidth / 2;
      const toY = (val: number) => Number((baselineY - (Math.max(0, val) / yMax) * plotHeight).toFixed(2));
      const hitX = n > 1 ? (i === 0 ? this.padLeft : x - stepX / 2) : this.padLeft;
      const hitEnd = n > 1 ? (i === n - 1 ? this.padLeft + plotWidth : x + stepX / 2) : this.padLeft + plotWidth;

      return {
        index: i,
        date: item.key,
        shortLabel: item.shortLabel,
        fullLabel: item.fullLabel,
        total: item.total,
        web: item.web,
        pwa: item.pwa,
        interactions: item.interactions,
        x: Number(x.toFixed(2)),
        yTotal: toY(item.total),
        yWeb: toY(item.web),
        yPwa: toY(item.pwa),
        yInteractions: toY(item.interactions),
        hitX: Number(hitX.toFixed(2)),
        hitWidth: Number(Math.max(4, hitEnd - hitX).toFixed(2)),
      };
    });
  }

  get showPointDots(): boolean {
    return this.chartDays.length <= 45;
  }

  get xTicks(): ChartAxisTick[] {
    const days = this.chartDays;
    const n = days.length;
    if (n === 0) return [];
    if (this.isHourlyRange && n === 24) {
      const hourlyTickIndices = [0, 4, 8, 12, 16, 20, 23];
      return hourlyTickIndices.map((idx, pos) => ({
        label: days[idx].shortLabel,
        x: days[idx].x,
        anchor: pos === 0 ? 'start' : pos === hourlyTickIndices.length - 1 ? 'end' : 'middle',
      }));
    }
    if (n <= 7) {
      return days.map((d, i) => ({
        label: d.shortLabel,
        x: d.x,
        anchor: i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle',
      }));
    }

    const desiredTicks = 7;
    const indices = new Set<number>([0, n - 1]);
    for (let k = 1; k < desiredTicks - 1; k++) {
      indices.add(Math.round((k * (n - 1)) / (desiredTicks - 1)));
    }
    const sorted = Array.from(indices).sort((a, b) => a - b);
    return sorted.map((idx, pos) => ({
      label: days[idx].shortLabel,
      x: days[idx].x,
      anchor: pos === 0 ? 'start' : pos === sorted.length - 1 ? 'end' : 'middle',
    }));
  }

  buildLinePath(series: TelemetrySeriesKey): string {
    const days = this.chartDays;
    if (days.length === 0) return '';
    const pickY = (d: ChartDayPoint): number => {
      switch (series) {
        case 'total':
          return d.yTotal;
        case 'web':
          return d.yWeb;
        case 'pwa':
          return d.yPwa;
        case 'interactions':
          return d.yInteractions;
      }
    };
    if (days.length === 1) {
      const y = pickY(days[0]);
      return `M ${this.padLeft} ${y} L ${this.svgWidth - this.padRight} ${y}`;
    }
    return days.map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${d.x} ${pickY(d)}`).join(' ');
  }

  get totalAreaPath(): string {
    const days = this.chartDays;
    if (days.length === 0) return '';
    const baselineY = this.svgHeight - this.padBottom;
    if (days.length === 1) {
      const y = days[0].yTotal;
      const rightX = this.svgWidth - this.padRight;
      return `M ${this.padLeft} ${baselineY} L ${this.padLeft} ${y} L ${rightX} ${y} L ${rightX} ${baselineY} Z`;
    }
    const linePart = days.map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${d.x} ${d.yTotal}`).join(' ');
    return `${linePart} L ${days[days.length - 1].x} ${baselineY} L ${days[0].x} ${baselineY} Z`;
  }

  get hoveredPoint(): ChartDayPoint | null {
    if (this.hoveredDayIndex === null) return null;
    return this.chartDays[this.hoveredDayIndex] ?? null;
  }

  get tooltipLeftPercent(): number {
    const pt = this.hoveredPoint;
    if (!pt) return 50;
    return Number(((pt.x / this.svgWidth) * 100).toFixed(2));
  }

  get isTooltipRightAligned(): boolean {
    const pt = this.hoveredPoint;
    return !!pt && pt.x > this.svgWidth * 0.56;
  }

  setHoveredDay(index: number | null): void {
    this.hoveredDayIndex = index;
    this.cdr.markForCheck();
  }

  private sumWindowMap(field: 'routes' | 'events' | 'referrers'): Record<string, number> {
    const result: Record<string, number> = {};
    for (const bucket of this.rawWindowEntries) {
      const source = bucket[field];
      if (!source) continue;
      for (const [key, val] of Object.entries(source)) {
        const count = Number(val || 0);
        if (count > 0) {
          result[key] = (result[key] || 0) + count;
        }
      }
    }
    return result;
  }

  get routeRows(): TelemetryMetricRow[] {
    const routes = this.isRangeFiltered ? this.sumWindowMap('routes') : this.stats?.telemetry?.routes || {};
    const rawRows = this.routeDefinitions.map((item) => ({
      key: item.key,
      label: item.label,
      count: Number(routes[item.key] || 0),
    }));
    const sorted = [...rawRows].sort((a, b) => b.count - a.count);
    const max = sorted.reduce((acc, r) => Math.max(acc, r.count), 0);
    return sorted.map((row) => ({
      ...row,
      percent: max > 0 ? Math.round((row.count / max) * 100) : 0,
    }));
  }

  get eventRows(): TelemetryMetricRow[] {
    const events = this.isRangeFiltered ? this.sumWindowMap('events') : this.stats?.telemetry?.events || {};
    const rawRows = this.eventDefinitions.map((item) => ({
      key: item.key,
      label: item.label,
      count: Number(events[item.key] || 0),
    }));
    const max = rawRows.reduce((acc, r) => Math.max(acc, r.count), 0);
    return rawRows.map((row) => ({
      ...row,
      percent: max > 0 ? Math.round((row.count / max) * 100) : 0,
    }));
  }

  private get currentTelemetryEvents(): Record<string, number> {
    return this.isRangeFiltered ? this.sumWindowMap('events') : this.stats?.telemetry?.events || {};
  }

  get selectedRangeShortLabel(): string {
    const labels: Record<TelemetryRangePreset, string> = {
      '24h': '24 Std.',
      '7d': '7T',
      '28d': '28T',
      '3m': '3M',
      '12m': '12M',
      all: 'Gesamt',
      custom: 'Auswahl',
    };
    return labels[this.selectedRange];
  }

  get quickPlayStartedCount(): number {
    return Number(this.currentTelemetryEvents.quick_game_started || 0);
  }

  get referrerRows(): TelemetryMetricRow[] {
    const referrers = this.isRangeFiltered ? this.sumWindowMap('referrers') : this.stats?.telemetry?.referrers || {};
    const sorted = Object.entries(referrers)
      .map(([key, count]) => ({
        key,
        label: key === 'direct' ? 'Direktaufruf' : key === 'pwa_launch' ? 'PWA-App-Start' : key,
        count: Number(count || 0),
      }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const max = sorted.reduce((acc, r) => Math.max(acc, r.count), 0);
    return sorted.map((row) => ({
      ...row,
      percent: max > 0 ? Math.round((row.count / max) * 100) : 0,
    }));
  }

  get breakdownSubtitle(): string {
    if (!this.isRangeFiltered) return 'Gesamtzeitraum';
    return this.isHourlyRange
      ? `Im gewählten Zeitraum · ${this.formattedDateRange}`
      : `Im gewählten Zeitraum (${this.formattedDateRange})`;
  }
}

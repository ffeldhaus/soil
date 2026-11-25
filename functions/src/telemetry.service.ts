import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { checkPublicRateLimit } from './research.service';
import type {
  ActiveGameRoundBucket,
  ActiveRoundDistribution,
  FinishedGameLengthSummary,
  TelemetryDailyEntry,
  TelemetryHourlyEntry,
  TelemetryLocalSessionUpdate,
  TelemetryStats,
} from './types';

export const ALLOWED_TELEMETRY_ROUTES = new Set<string>([
  '/',
  '/manual',
  '/info',
  '/research',
  '/trailer',
  '/game',
  '/game-login',
  '/admin',
  '/impressum',
  '/privacy',
]);

const QUICK_GAME_ROUND_EVENTS = Array.from({ length: 20 }, (_, i) => `quick_game_round_${i + 1}`);

export const ALLOWED_TELEMETRY_EVENTS = new Set<string>([
  'quick_game_started',
  'quick_game_first_plant',
  ...QUICK_GAME_ROUND_EVENTS,
  'quick_game_finished',
  'quick_game_deleted',
  'trailer_opened',
  'research_export',
  'feedback_opened',
  'feedback_submitted',
]);

const BOT_UA_REGEX =
  /bot|crawler|spider|slurp|bingpreview|headless|lighthouse|cypress|playwright|puppeteer|facebookexternalhit|whatsapp|twitterbot|linkedinbot|embedly|quora|pinterest|slackbot|discordbot|telegrambot|applebot|yandex|baiduspider|duckduckbot|ia_archiver|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|perplexitybot|ccbot|oai-searchbot/i;

const SELF_REFERRER_HOSTS = new Set<string>(['soil.app', 'www.soil.app', 'localhost', '127.0.0.1']);

const MAX_KEYS_PER_MAP = 15;
const MAX_COUNT_PER_KEY = 20;
const MAX_SESSIONS_PER_REQUEST = 10;
const SESSION_SLOT_REGEX = /^[a-f0-9]{12,32}$/;
const ALLOWED_SESSION_STATUSES = new Set<TelemetryLocalSessionUpdate['status']>(['in_progress', 'finished', 'deleted']);

export function isBotUserAgent(ua?: unknown): boolean {
  if (typeof ua !== 'string' || !ua.trim()) return false;
  return BOT_UA_REGEX.test(ua);
}

export function isPrivacySignalOptOut(headers?: Record<string, unknown>): boolean {
  if (!headers || typeof headers !== 'object') return false;
  const dnt = String(headers.dnt ?? headers.DNT ?? '')
    .trim()
    .toLowerCase();
  const gpc = String(headers['sec-gpc'] ?? headers['Sec-GPC'] ?? '')
    .trim()
    .toLowerCase();
  return dnt === '1' || dnt === 'yes' || gpc === '1' || gpc === 'true';
}

export function normalizeTelemetryRoute(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withoutQueryOrHash = trimmed.split(/[?#]/)[0] || '/';
  const withLeadingSlash = withoutQueryOrHash.startsWith('/') ? withoutQueryOrHash : `/${withoutQueryOrHash}`;
  const normalized = withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, '') : '/';

  return ALLOWED_TELEMETRY_ROUTES.has(normalized) ? normalized : null;
}

function isSelfReferrerHost(hostname: string): boolean {
  return (
    SELF_REFERRER_HOSTS.has(hostname) ||
    hostname.endsWith('.soil.app') ||
    hostname.endsWith('.hosted.app') ||
    hostname.endsWith('.run.app')
  );
}

function parseExternalHostname(trimmed: string): string | null {
  try {
    const parsed = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
    const hostname = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, '')
      .replace(/\.$/, '');
    if (!hostname || hostname.length > 64 || hostname.includes('..') || isSelfReferrerHost(hostname)) {
      return null;
    }
    return /^[a-z0-9.-]+\.[a-z]{2,24}$/.test(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

export function sanitizeTelemetryReferrer(raw?: unknown, mode?: 'web' | 'pwa'): string | null {
  const defaultBucket = mode === 'pwa' ? 'pwa_launch' : 'direct';
  if (!raw || raw === 'direct') return defaultBucket;
  if (raw === 'pwa_launch') return 'pwa_launch';
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === 'direct') return defaultBucket;
  if (trimmed === 'pwa_launch' || trimmed.startsWith('android-app://')) return 'pwa_launch';

  return parseExternalHostname(trimmed);
}

export interface SanitizedTelemetryPayload {
  mode: 'web' | 'pwa';
  views: Record<string, number>;
  events: Record<string, number>;
  referrers: Record<string, number>;
  sessions: TelemetryLocalSessionUpdate[];
  totalViews: number;
}

function clampCount(val: unknown): number {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 1) return 0;
  return Math.min(MAX_COUNT_PER_KEY, Math.floor(num));
}

function collectSanitizedCounts(rawMap: unknown, keyMapper: (rawKey: string) => string | null): Record<string, number> {
  if (!rawMap || typeof rawMap !== 'object') return {};
  const result: Record<string, number> = {};
  const entries = Object.entries(rawMap as Record<string, unknown>).slice(0, MAX_KEYS_PER_MAP);
  for (const [rawKey, rawCount] of entries) {
    const cleanKey = keyMapper(rawKey);
    const count = clampCount(rawCount);
    if (cleanKey && count > 0) {
      result[cleanKey] = Math.min(MAX_COUNT_PER_KEY, (result[cleanKey] || 0) + count);
    }
  }
  return result;
}

function parseSanitizedSessionEntry(rawEntry: unknown): TelemetryLocalSessionUpdate | null {
  if (!rawEntry || typeof rawEntry !== 'object') return null;
  const entry = rawEntry as Record<string, unknown>;
  const slot = typeof entry.slot === 'string' ? entry.slot.trim().toLowerCase() : '';
  if (!SESSION_SLOT_REGEX.test(slot)) return null;

  const roundLimit = Math.round(Number(entry.roundLimit));
  const currentRound = Math.round(Number(entry.currentRound));
  const validRounds =
    Number.isFinite(roundLimit) &&
    roundLimit >= 3 &&
    roundLimit <= 100 &&
    Number.isFinite(currentRound) &&
    currentRound >= 1 &&
    currentRound <= roundLimit;
  if (!validRounds) return null;

  const status =
    typeof entry.status === 'string' ? (entry.status.trim() as TelemetryLocalSessionUpdate['status']) : null;
  if (!status || !ALLOWED_SESSION_STATUSES.has(status)) return null;

  return { slot, currentRound, roundLimit, status };
}

function collectSanitizedSessions(rawSessions: unknown): TelemetryLocalSessionUpdate[] {
  if (!Array.isArray(rawSessions)) return [];
  const bySlot = new Map<string, TelemetryLocalSessionUpdate>();
  for (const rawEntry of rawSessions) {
    const parsed = parseSanitizedSessionEntry(rawEntry);
    if (!parsed) continue;
    if (!bySlot.has(parsed.slot) && bySlot.size >= MAX_SESSIONS_PER_REQUEST) continue;
    bySlot.set(parsed.slot, parsed);
  }
  return Array.from(bySlot.values());
}

export function sanitizeTelemetryPayload(rawBody: unknown): SanitizedTelemetryPayload | null {
  if (!rawBody || typeof rawBody !== 'object') return null;
  const body = rawBody as Record<string, unknown>;
  const mode: 'web' | 'pwa' = body.mode === 'pwa' ? 'pwa' : 'web';

  const views = collectSanitizedCounts(body.views, (k) => normalizeTelemetryRoute(k));
  const events = collectSanitizedCounts(body.events, (k) => {
    const trimmed = String(k).trim();
    return ALLOWED_TELEMETRY_EVENTS.has(trimmed) ? trimmed : null;
  });
  const referrers = collectSanitizedCounts(body.referrers, (k) => sanitizeTelemetryReferrer(k, mode));
  const sessions = collectSanitizedSessions(body.sessions);

  let totalViews = 0;
  for (const count of Object.values(views)) {
    totalViews += count;
  }

  if (
    totalViews === 0 &&
    Object.keys(events).length === 0 &&
    Object.keys(referrers).length === 0 &&
    sessions.length === 0
  ) {
    return null;
  }

  return { mode, views, events, referrers, sessions, totalViews };
}

function parseRequestBody(req: any): unknown {
  if (!req || req.body === undefined || req.body === null) return null;
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf-8'));
    } catch {
      return null;
    }
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return typeof req.body === 'object' ? req.body : null;
}

function mapToFieldIncrements(counts: Record<string, number>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, count] of Object.entries(counts)) {
    result[key] = admin.firestore.FieldValue.increment(count);
  }
  return result;
}

function buildFirestoreIncrementRecord(
  sanitized: SanitizedTelemetryPayload,
  bucketField?: { key: 'date' | 'hour'; value: string },
): Record<string, unknown> {
  const inc = (n: number) => admin.firestore.FieldValue.increment(n);
  const payload: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (bucketField) {
    payload[bucketField.key] = bucketField.value;
  }

  if (sanitized.totalViews > 0) {
    payload.totalViews = inc(sanitized.totalViews);
    payload[sanitized.mode === 'pwa' ? 'pwaViews' : 'webViews'] = inc(sanitized.totalViews);
    payload.routes = mapToFieldIncrements(sanitized.views);
  }

  if (Object.keys(sanitized.events).length > 0) {
    payload.events = mapToFieldIncrements(sanitized.events);
  }

  if (Object.keys(sanitized.referrers).length > 0) {
    payload.referrers = mapToFieldIncrements(sanitized.referrers);
  }

  return payload;
}

export async function handleTelemetryHttpRequest(req: any, res: any, db: admin.firestore.Firestore): Promise<void> {
  res.setHeader?.('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  if (isBotUserAgent(req.headers?.['user-agent']) || isPrivacySignalOptOut(req.headers)) {
    res.status(204).send('');
    return;
  }

  const forwarded = req.headers?.['x-forwarded-for'];
  const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.ip || 'anon').trim();
  // Classroom NAT IP headroom: allow 30–40 students behind one school IP to batch events without 429s.
  const rate = checkPublicRateLimit(`telemetry:${clientIp}`, 300, 60_000);
  if (!rate.allowed) {
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }

  const sanitized = sanitizeTelemetryPayload(parseRequestBody(req));
  if (!sanitized) {
    res.status(204).send('');
    return;
  }

  const writes: Promise<unknown>[] = [];
  const hasAggregateCounts =
    sanitized.totalViews > 0 || Object.keys(sanitized.events).length > 0 || Object.keys(sanitized.referrers).length > 0;

  if (hasAggregateCounts) {
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const hourKey = now.toISOString().slice(0, 13);
    const dailyUpdate = buildFirestoreIncrementRecord(sanitized, { key: 'date', value: dateKey });
    const hourlyUpdate = buildFirestoreIncrementRecord(sanitized, { key: 'hour', value: hourKey });
    const totalsUpdate = buildFirestoreIncrementRecord(sanitized);

    writes.push(
      db.collection('telemetry_daily').doc(dateKey).set(dailyUpdate, { merge: true }),
      db.collection('telemetry_hourly').doc(hourKey).set(hourlyUpdate, { merge: true }),
      db.collection('telemetry_totals').doc('all').set(totalsUpdate, { merge: true }),
    );
  }

  for (const session of sanitized.sessions) {
    writes.push(
      db.collection('telemetry_local_sessions').doc(session.slot).set(
        {
          currentRound: session.currentRound,
          roundLimit: session.roundLimit,
          status: session.status,
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      ),
    );
  }

  await Promise.all(writes);

  res.status(204).send('');
}

function toSafeNumberMap(raw: unknown, maxEntries?: number): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const entries = Object.entries(raw as Record<string, unknown>)
    .map(([k, v]) => [k, Math.max(0, Math.round(Number(v) || 0))] as const)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const sliced = typeof maxEntries === 'number' ? entries.slice(0, maxEntries) : entries;
  return Object.fromEntries(sliced);
}

function normalizeDailyEntry(
  doc: { id: string; data: () => Record<string, unknown> | undefined },
  cutoff400dKey: string,
  todayKey: string,
): TelemetryDailyEntry | null {
  const data = doc.data() || {};
  const rawDate = typeof data.date === 'string' && data.date.trim() ? data.date.trim() : doc.id;
  const date = rawDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (date < cutoff400dKey || date > todayKey) return null;

  const totalViews = Math.max(0, Math.round(Number(data.totalViews) || 0));
  const pwaViews = Math.max(0, Math.round(Number(data.pwaViews) || 0));
  const webViews =
    data.webViews !== undefined
      ? Math.max(0, Math.round(Number(data.webViews) || 0))
      : Math.max(0, totalViews - pwaViews);

  return {
    date,
    totalViews,
    webViews,
    pwaViews,
    routes: toSafeNumberMap(data.routes),
    events: toSafeNumberMap(data.events),
    referrers: toSafeNumberMap(data.referrers),
  };
}

function normalizeHourlyEntry(
  doc: { id: string; data: () => Record<string, unknown> | undefined },
  cutoff24hHourKey: string,
  currentHourKey: string,
): TelemetryHourlyEntry | null {
  const data = doc.data() || {};
  const rawHour = typeof data.hour === 'string' && data.hour.trim() ? data.hour.trim() : doc.id;
  const hour = rawHour.slice(0, 13);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(hour)) return null;
  if (hour < cutoff24hHourKey || hour > currentHourKey) return null;

  const totalViews = Math.max(0, Math.round(Number(data.totalViews) || 0));
  const pwaViews = Math.max(0, Math.round(Number(data.pwaViews) || 0));
  const webViews =
    data.webViews !== undefined
      ? Math.max(0, Math.round(Number(data.webViews) || 0))
      : Math.max(0, totalViews - pwaViews);

  return {
    hour,
    totalViews,
    webViews,
    pwaViews,
    routes: toSafeNumberMap(data.routes),
    events: toSafeNumberMap(data.events),
    referrers: toSafeNumberMap(data.referrers),
  };
}

function sumDailyWindowViews(
  dailySeries: readonly TelemetryDailyEntry[],
  todayKey: string,
  cutoff7dKey: string,
  cutoff30dKey: string,
): { viewsToday: number; viewsLast7d: number; viewsLast30d: number; viewsWindowTotal: number } {
  let viewsToday = 0;
  let viewsLast7d = 0;
  let viewsLast30d = 0;
  let viewsWindowTotal = 0;

  for (const entry of dailySeries) {
    viewsWindowTotal += entry.totalViews;
    if (entry.date >= cutoff30dKey && entry.date <= todayKey) viewsLast30d += entry.totalViews;
    if (entry.date >= cutoff7dKey && entry.date <= todayKey) viewsLast7d += entry.totalViews;
    if (entry.date === todayKey) viewsToday += entry.totalViews;
  }

  return { viewsToday, viewsLast7d, viewsLast30d, viewsWindowTotal };
}

export async function aggregateTelemetryStats(
  db: admin.firestore.Firestore,
  nowDate: Date = new Date(),
): Promise<TelemetryStats> {
  const todayKey = nowDate.toISOString().slice(0, 10);
  const cutoff7dKey = new Date(nowDate.getTime() - 6 * 86_400_000).toISOString().slice(0, 10);
  const cutoff30dKey = new Date(nowDate.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
  const cutoff400dKey = new Date(nowDate.getTime() - 399 * 86_400_000).toISOString().slice(0, 10);

  const currentHourMs = Date.UTC(
    nowDate.getUTCFullYear(),
    nowDate.getUTCMonth(),
    nowDate.getUTCDate(),
    nowDate.getUTCHours(),
  );
  const currentHourKey = new Date(currentHourMs).toISOString().slice(0, 13);
  const cutoff24hHourKey = new Date(currentHourMs - 23 * 3_600_000).toISOString().slice(0, 13);

  const dailyColl = db.collection('telemetry_daily');
  const dailyQuery = typeof dailyColl.where === 'function' ? dailyColl.where('date', '>=', cutoff400dKey) : dailyColl;

  const hourlyColl = db.collection('telemetry_hourly');
  const hourlyQuery =
    hourlyColl && typeof hourlyColl.where === 'function'
      ? hourlyColl.where('hour', '>=', cutoff24hHourKey)
      : hourlyColl;
  const hourlyPromise =
    hourlyQuery && typeof hourlyQuery.get === 'function' ? hourlyQuery.get() : Promise.resolve({ docs: [] });

  const [totalsSnap, dailySnap, hourlySnap] = await Promise.all([
    db.collection('telemetry_totals').doc('all').get(),
    dailyQuery.get(),
    hourlyPromise,
  ]);

  const dailySeries = (dailySnap.docs || [])
    .map((doc) => normalizeDailyEntry(doc, cutoff400dKey, todayKey))
    .filter((entry): entry is TelemetryDailyEntry => entry !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const hourlySeries = (hourlySnap.docs || [])
    .map((doc: any) => normalizeHourlyEntry(doc, cutoff24hHourKey, currentHourKey))
    .filter((entry): entry is TelemetryHourlyEntry => entry !== null)
    .sort((a, b) => a.hour.localeCompare(b.hour));

  let viewsLast24h = 0;
  for (const entry of hourlySeries) {
    viewsLast24h += entry.totalViews;
  }
  const firstRecordedHour = hourlySeries[0]?.hour ?? null;

  const { viewsToday, viewsLast7d, viewsLast30d, viewsWindowTotal } = sumDailyWindowViews(
    dailySeries,
    todayKey,
    cutoff7dKey,
    cutoff30dKey,
  );

  const totalsData = totalsSnap.exists ? totalsSnap.data() || {} : {};
  const viewsTotal = Math.max(viewsWindowTotal, Math.round(Number(totalsData.totalViews) || 0));
  const pwaViewsTotal = Math.max(0, Math.round(Number(totalsData.pwaViews) || 0));
  const webViewsTotal = Math.max(0, Math.round(Number(totalsData.webViews) || Math.max(0, viewsTotal - pwaViewsTotal)));
  const firstRecordedDate = dailySeries.length > 0 ? dailySeries[0].date : null;

  return {
    viewsToday,
    viewsLast24h,
    viewsLast7d,
    viewsLast30d,
    viewsTotal,
    pwaViewsTotal,
    webViewsTotal,
    routes: toSafeNumberMap(totalsData.routes),
    events: toSafeNumberMap(totalsData.events),
    referrers: toSafeNumberMap(totalsData.referrers, 10),
    dailySeries,
    firstRecordedDate,
    hourlySeries,
    firstRecordedHour,
  };
}

export function computeLocalGameStats(
  telemetry: TelemetryStats,
  todayKey?: string,
): { localActive: number; localPlayedTotal: number; localFinishedTotal: number } {
  const effectiveTodayKey =
    todayKey && /^\d{4}-\d{2}-\d{2}$/.test(todayKey) ? todayKey : new Date().toISOString().slice(0, 10);
  const cutoff30dKey = new Date(Date.parse(`${effectiveTodayKey}T00:00:00.000Z`) - 29 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  let round1Last30d = 0;
  let finishedLast30d = 0;
  let deletedLast30d = 0;

  for (const entry of telemetry.dailySeries || []) {
    if (entry.date >= cutoff30dKey && entry.date <= effectiveTodayKey) {
      round1Last30d += Math.max(0, Math.round(Number(entry.events?.quick_game_round_1 || 0)));
      finishedLast30d += Math.max(0, Math.round(Number(entry.events?.quick_game_finished || 0)));
      deletedLast30d += Math.max(0, Math.round(Number(entry.events?.quick_game_deleted || 0)));
    }
  }

  const localActive = Math.max(0, round1Last30d - finishedLast30d - deletedLast30d);
  const localPlayedTotal = Math.max(
    round1Last30d,
    Math.max(0, Math.round(Number(telemetry.events?.quick_game_round_1 || 0))),
  );
  const localFinishedTotal = Math.max(
    finishedLast30d,
    Math.max(0, Math.round(Number(telemetry.events?.quick_game_finished || 0))),
  );

  return { localActive, localPlayedTotal, localFinishedTotal };
}

export async function cleanupExpiredHourlyTelemetry(
  db: admin.firestore.Firestore,
  nowDate: Date = new Date(),
): Promise<number> {
  const currentHourMs = Date.UTC(
    nowDate.getUTCFullYear(),
    nowDate.getUTCMonth(),
    nowDate.getUTCDate(),
    nowDate.getUTCHours(),
  );
  const cutoff72hHourKey = new Date(currentHourMs - 72 * 3_600_000).toISOString().slice(0, 13);
  let deletedCount = 0;

  while (true) {
    const snap = await db.collection('telemetry_hourly').where('hour', '<', cutoff72hHourKey).limit(200).get();
    if (!snap.docs || snap.docs.length === 0) break;

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deletedCount += snap.docs.length;

    if (snap.docs.length < 200) break;
  }

  return deletedCount;
}

export async function cleanupExpiredLocalSessions(
  db: admin.firestore.Firestore,
  nowDate: Date = new Date(),
): Promise<number> {
  const cutoffTimestamp = Timestamp.fromMillis(nowDate.getTime() - 30 * 86_400_000);
  let deletedCount = 0;

  while (true) {
    const snap = await db
      .collection('telemetry_local_sessions')
      .where('updatedAt', '<', cutoffTimestamp)
      .limit(200)
      .get();
    if (!snap.docs || snap.docs.length === 0) break;

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deletedCount += snap.docs.length;

    if (snap.docs.length < 200) break;
  }

  return deletedCount;
}

function toTimestampMillisOrNull(val: unknown): number | null {
  if (!val) return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj.toMillis === 'function') return (obj.toMillis as () => number)();
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
    if (typeof obj._seconds === 'number') return obj._seconds * 1000;
  }
  return null;
}

function mapFinishedCountsToSortedList(counts: Map<number, number>): FinishedGameLengthSummary[] {
  return Array.from(counts.entries())
    .map(([roundLimit, count]) => ({ roundLimit, count }))
    .sort((a, b) => a.roundLimit - b.roundLimit);
}

function incrementRoundBucket(
  bucketMap: Map<string, ActiveGameRoundBucket>,
  source: 'local' | 'cloud',
  round: number,
  roundLimit: number,
): void {
  const remaining = roundLimit - round;
  const key = `${source}:${round}:${roundLimit}`;
  const existing = bucketMap.get(key);
  if (existing) {
    existing.count += 1;
  } else {
    bucketMap.set(key, { round, remaining, roundLimit, count: 1, source });
  }
}

function recordLocalSessionDoc(
  data: Record<string, unknown>,
  bucketMap: Map<string, ActiveGameRoundBucket>,
  finishedMap: Map<number, number>,
): number {
  const roundLimit = Math.round(Number(data.roundLimit) || 0);
  if (roundLimit < 3) return 0;

  const currentRound = Math.round(Number(data.currentRound) || 0);
  const status = typeof data.status === 'string' ? data.status : '';
  if (status === 'in_progress' && currentRound >= 1 && currentRound < roundLimit) {
    incrementRoundBucket(bucketMap, 'local', currentRound, roundLimit);
    return 1;
  }
  if (status === 'finished') {
    finishedMap.set(roundLimit, (finishedMap.get(roundLimit) || 0) + 1);
  }
  return 0;
}

function collectLocalSessionBuckets(
  docs: readonly any[],
  cutoffMs: number,
  bucketMap: Map<string, ActiveGameRoundBucket>,
  finishedMap: Map<number, number>,
): { localActiveSessions: number; hasLocalSessionDocs: boolean } {
  let localActiveSessions = 0;
  let hasLocalSessionDocs = false;

  for (const doc of docs) {
    const data = (doc.data?.() || {}) as Record<string, unknown>;
    const updatedMs = toTimestampMillisOrNull(data.updatedAt);
    if (updatedMs !== null && updatedMs < cutoffMs) continue;

    hasLocalSessionDocs = true;
    localActiveSessions += recordLocalSessionDoc(data, bucketMap, finishedMap);
  }

  return { localActiveSessions, hasLocalSessionDocs };
}

function collectCloudGameBuckets(
  docs: readonly any[],
  bucketMap: Map<string, ActiveGameRoundBucket>,
  finishedMap: Map<number, number>,
): number {
  let cloudActiveInProgress = 0;

  for (const doc of docs) {
    const data = (doc.data?.() || {}) as Record<string, any>;
    if (data.deletedAt) continue;

    const roundLimit = Math.max(3, Math.round(Number(data.settings?.length || data.config?.numRounds) || 10));
    const currentRound = Math.max(0, Math.round(Number(data.currentRoundNumber) || 0));
    const status = typeof data.status === 'string' ? data.status : '';

    if (status === 'in_progress' && currentRound >= 1 && currentRound < roundLimit) {
      incrementRoundBucket(bucketMap, 'cloud', currentRound, roundLimit);
      cloudActiveInProgress += 1;
    } else if (status === 'finished') {
      finishedMap.set(roundLimit, (finishedMap.get(roundLimit) || 0) + 1);
    }
  }

  return cloudActiveInProgress;
}

export async function aggregateActiveRoundDistribution(
  db: admin.firestore.Firestore,
  nowDate: Date = new Date(),
): Promise<ActiveRoundDistribution> {
  const cutoffMs = nowDate.getTime() - 30 * 86_400_000;
  const cutoffTimestamp = Timestamp.fromMillis(cutoffMs);

  const localColl = db.collection('telemetry_local_sessions') as any;
  const localQuery =
    localColl && typeof localColl.where === 'function'
      ? localColl.where('updatedAt', '>=', cutoffTimestamp)
      : localColl;
  const localPromise =
    localQuery && typeof localQuery.get === 'function' ? localQuery.get() : Promise.resolve({ docs: [] });

  const gamesColl = db.collection('games') as any;
  const gamesPromise =
    gamesColl && typeof gamesColl.get === 'function' ? gamesColl.get() : Promise.resolve({ docs: [] });

  const [localSnap, gamesSnap] = await Promise.all([localPromise, gamesPromise]);

  const bucketMap = new Map<string, ActiveGameRoundBucket>();
  const localFinishedMap = new Map<number, number>();
  const cloudFinishedMap = new Map<number, number>();

  const { localActiveSessions, hasLocalSessionDocs } = collectLocalSessionBuckets(
    localSnap?.docs || [],
    cutoffMs,
    bucketMap,
    localFinishedMap,
  );
  const cloudActiveInProgress = collectCloudGameBuckets(gamesSnap?.docs || [], bucketMap, cloudFinishedMap);

  const buckets = Array.from(bucketMap.values()).sort(
    (a, b) => a.round - b.round || a.remaining - b.remaining || a.source.localeCompare(b.source),
  );

  return {
    buckets,
    localActiveSessions,
    cloudActiveInProgress,
    hasLocalSessionDocs,
    localFinished30dByLength: mapFinishedCountsToSortedList(localFinishedMap),
    cloudFinishedByLength: mapFinishedCountsToSortedList(cloudFinishedMap),
  };
}

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { checkPublicRateLimit } from './research.service';
import type { TelemetryStats } from './types';

export const ALLOWED_TELEMETRY_ROUTES = new Set<string>([
  '/',
  '/manual',
  '/info',
  '/research',
  '/game',
  '/game-login',
  '/admin',
  '/admin/login',
  '/admin/register',
  '/impressum',
  '/privacy',
]);

export const ALLOWED_TELEMETRY_EVENTS = new Set<string>(['quick_game_started', 'trailer_opened', 'research_export']);

const BOT_UA_REGEX =
  /bot|crawler|spider|slurp|bingpreview|headless|lighthouse|cypress|playwright|puppeteer|facebookexternalhit|whatsapp|twitterbot|linkedinbot|embedly|quora|pinterest|slackbot|discordbot|telegrambot|applebot|yandex|baiduspider|duckduckbot|ia_archiver|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|perplexitybot|ccbot|oai-searchbot/i;

const SELF_REFERRER_HOSTS = new Set<string>(['soil.app', 'www.soil.app', 'localhost', '127.0.0.1']);

const MAX_KEYS_PER_MAP = 15;
const MAX_COUNT_PER_KEY = 20;

export function isBotUserAgent(ua?: unknown): boolean {
  if (typeof ua !== 'string' || !ua.trim()) return false;
  return BOT_UA_REGEX.test(ua);
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

  let totalViews = 0;
  for (const count of Object.values(views)) {
    totalViews += count;
  }

  if (totalViews === 0 && Object.keys(events).length === 0 && Object.keys(referrers).length === 0) {
    return null;
  }

  return { mode, views, events, referrers, totalViews };
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
  dateKey?: string,
): Record<string, unknown> {
  const inc = (n: number) => admin.firestore.FieldValue.increment(n);
  const payload: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (dateKey) {
    payload.date = dateKey;
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

  if (isBotUserAgent(req.headers?.['user-agent'])) {
    res.status(204).send('');
    return;
  }

  const forwarded = req.headers?.['x-forwarded-for'];
  const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.ip || 'anon').trim();
  const rate = checkPublicRateLimit(`telemetry:${clientIp}`, 60, 60_000);
  if (!rate.allowed) {
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }

  const sanitized = sanitizeTelemetryPayload(parseRequestBody(req));
  if (!sanitized) {
    res.status(204).send('');
    return;
  }

  const dateKey = new Date().toISOString().slice(0, 10);
  const dailyUpdate = buildFirestoreIncrementRecord(sanitized, dateKey);
  const totalsUpdate = buildFirestoreIncrementRecord(sanitized);

  await Promise.all([
    db.collection('telemetry_daily').doc(dateKey).set(dailyUpdate, { merge: true }),
    db.collection('telemetry_totals').doc('all').set(totalsUpdate, { merge: true }),
  ]);

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

function sumDailyWindowViews(
  docs: Array<{ id: string; data: () => Record<string, unknown> | undefined }>,
  todayKey: string,
  cutoff7dKey: string,
  cutoff30dKey: string,
): { viewsToday: number; viewsLast7d: number; viewsLast30d: number } {
  let viewsToday = 0;
  let viewsLast7d = 0;
  let viewsLast30d = 0;

  for (const doc of docs) {
    const data = doc.data() || {};
    const docDate = typeof data.date === 'string' ? data.date : doc.id;
    const count = Math.max(0, Math.round(Number(data.totalViews) || 0));
    if (docDate >= cutoff30dKey && docDate <= todayKey) viewsLast30d += count;
    if (docDate >= cutoff7dKey && docDate <= todayKey) viewsLast7d += count;
    if (docDate === todayKey) viewsToday += count;
  }

  return { viewsToday, viewsLast7d, viewsLast30d };
}

export async function aggregateTelemetryStats(
  db: admin.firestore.Firestore,
  nowDate: Date = new Date(),
): Promise<TelemetryStats> {
  const todayKey = nowDate.toISOString().slice(0, 10);
  const cutoff7dKey = new Date(nowDate.getTime() - 6 * 86_400_000).toISOString().slice(0, 10);
  const cutoff30dKey = new Date(nowDate.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);

  const dailyColl = db.collection('telemetry_daily');
  const dailyQuery = typeof dailyColl.where === 'function' ? dailyColl.where('date', '>=', cutoff30dKey) : dailyColl;

  const [totalsSnap, dailySnap] = await Promise.all([
    db.collection('telemetry_totals').doc('all').get(),
    dailyQuery.get(),
  ]);

  const { viewsToday, viewsLast7d, viewsLast30d } = sumDailyWindowViews(
    dailySnap.docs || [],
    todayKey,
    cutoff7dKey,
    cutoff30dKey,
  );

  const totalsData = totalsSnap.exists ? totalsSnap.data() || {} : {};
  const viewsTotal = Math.max(viewsLast30d, Math.round(Number(totalsData.totalViews) || 0));
  const pwaViewsTotal = Math.max(0, Math.round(Number(totalsData.pwaViews) || 0));
  const webViewsTotal = Math.max(0, Math.round(Number(totalsData.webViews) || Math.max(0, viewsTotal - pwaViewsTotal)));

  return {
    viewsToday,
    viewsLast7d,
    viewsLast30d,
    viewsTotal,
    pwaViewsTotal,
    webViewsTotal,
    routes: toSafeNumberMap(totalsData.routes),
    events: toSafeNumberMap(totalsData.events),
    referrers: toSafeNumberMap(totalsData.referrers, 10),
  };
}

import { HttpsError } from 'firebase-functions/v2/https';
import { mailService } from './mail.service';
import type { TelemetryDailyEntry, TelemetryStats } from './types';
import { escapeHtml } from './utils';

export function buildFeedbackNotificationEmail(
  cleanCategory: string,
  cleanRating: number,
  cleanComment: string,
  aiAnalysis?: any,
  cleanEmail?: string,
): { subject: string; text: string; html: string } {
  const safeCategory = escapeHtml(cleanCategory);
  const safeComment = escapeHtml(cleanComment);
  const safeContact = escapeHtml(cleanEmail || 'Anonymous');
  const safeSentiment = escapeHtml(aiAnalysis?.sentiment || 'N/A');
  const safeSummary = escapeHtml(aiAnalysis?.summary || 'N/A');
  const actionsList = (aiAnalysis?.suggestedActions || []) as string[];

  const subject = `New Feedback Received: ${cleanCategory} (${cleanRating}/5)`;
  const text = `New feedback received:\n\nCategory: ${cleanCategory}\nRating: ${cleanRating}/5\nContact Email: ${cleanEmail || 'Anonymous'}\nComment: ${cleanComment}\n\nAI Analysis:\nSummary: ${aiAnalysis?.summary || 'N/A'}\nSentiment: ${aiAnalysis?.sentiment || 'N/A'}\nSuggested Actions: ${actionsList.join(', ')}`;

  const analysisHtml = aiAnalysis
    ? `
          <h3 style="color: #10b981;">Gemini Analysis</h3>
          <p><strong>Sentiment:</strong> ${safeSentiment}</p>
          <p><strong>Summary:</strong> ${safeSummary}</p>
          <p><strong>Suggested Actions:</strong></p>
          <ul>
            ${actionsList.map((a: string) => `<li>${escapeHtml(a)}</li>`).join('')}
          </ul>
        `
    : '';

  const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">New Feedback Received</h2>
        <p><strong>Category:</strong> ${safeCategory}</p>
        <p><strong>Rating:</strong> ${cleanRating}/5</p>
        <p><strong>Contact Email:</strong> ${safeContact}</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">${safeComment}</p>
        </div>
        ${analysisHtml}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">View this feedback in the Super Admin Dashboard.</p>
      </div>
    `;

  return { subject, text, html };
}

export function sanitizeOptionalFeedbackEmail(rawEmail: unknown): string | undefined {
  if (typeof rawEmail !== 'string') return undefined;
  const trimmed = rawEmail.trim().slice(0, 200);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : undefined;
}

export async function sendFeedbackReplyEmailIfPresent(feedback: any, response: string): Promise<void> {
  if (!feedback.userEmail) return;
  const userName = feedback.userName || 'User';
  const safeUserName = escapeHtml(userName);
  const safeComment = escapeHtml(feedback.comment || '');
  const safeResponse = escapeHtml(response);
  const subject = `Re: Your feedback on SOIL (${feedback.category})`;
  const text = `Hello ${userName},\n\nThank you for your feedback. A system administrator has replied to your comment:\n\n"${feedback.comment}"\n\nReply:\n${response}\n\nBest regards,\nThe SOIL Team`;
  const html = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2>Reply to your Feedback</h2>
            <p>Hello ${safeUserName},</p>
            <p>Thank you for your feedback. A system administrator has replied to your comment:</p>
            <div style="border-left: 4px solid #e5e7eb; padding-left: 15px; font-style: italic; color: #4b5563; margin: 20px 0;">
              "${safeComment}"
            </div>
            <p><strong>Reply:</strong></p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px;">
              ${safeResponse}
            </div>
            <p>Best regards,<br>The SOIL Team</p>
          </div>
        `;

  try {
    await mailService.sendEmail({ to: feedback.userEmail, subject, text, html });
  } catch (e) {
    console.error('Failed to send feedback reply email', e);
    throw new HttpsError('internal', 'Failed to send email');
  }
}

function toTimestampMillis(value: any): number {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface WeeklyResearchDigestStats {
  totalResearchGames: number;
  researchGamesLast7d: number;
  sourceBreakdown: { local: number; cloud: number };
  difficultyBreakdown: { easy: number; normal: number; hard: number };
}

export function summarizeWeeklyResearchGames(docs: any[], cutoffMillis: number): WeeklyResearchDigestStats {
  const stats: WeeklyResearchDigestStats = {
    totalResearchGames: docs.length,
    researchGamesLast7d: 0,
    sourceBreakdown: { local: 0, cloud: 0 },
    difficultyBreakdown: { easy: 0, normal: 0, hard: 0 },
  };

  for (const doc of docs) {
    const data = doc.data() || {};
    const ts = Math.max(
      toTimestampMillis(data.completedAt),
      toTimestampMillis(data.uploadedAt),
      toTimestampMillis(data.createdAt),
    );
    if (ts >= cutoffMillis) {
      stats.researchGamesLast7d++;
      const src = data.sourceType === 'cloud' ? 'cloud' : 'local';
      stats.sourceBreakdown[src]++;
      const diff = data.settings?.difficulty as string | undefined;
      if (diff === 'easy' || diff === 'normal' || diff === 'hard') {
        stats.difficultyBreakdown[diff]++;
      }
    }
  }
  return stats;
}

export interface WeeklyCloudGamesDigestStats {
  activeCloudGames: number;
  finishedCloudGames: number;
  gamesLast7d: number;
}

export function summarizeWeeklyCloudGames(docs: any[], cutoffMillis: number): WeeklyCloudGamesDigestStats {
  const stats: WeeklyCloudGamesDigestStats = {
    activeCloudGames: 0,
    finishedCloudGames: 0,
    gamesLast7d: 0,
  };

  for (const doc of docs) {
    const data = doc.data() || {};
    if (data.deletedAt) continue;
    if (data.status === 'in_progress') stats.activeCloudGames++;
    if (data.status === 'finished') stats.finishedCloudGames++;
    const ts = Math.max(toTimestampMillis(data.createdAt), toTimestampMillis(data.updatedAt));
    if (ts >= cutoffMillis) {
      stats.gamesLast7d++;
    }
  }
  return stats;
}

export interface WeeklyFeedbackItem {
  rating: number;
  category: string;
  comment: string;
  contact: string;
}

export interface WeeklyFeedbackDigestStats {
  totalFeedback: number;
  unresolvedFeedback: number;
  recentFeedback: WeeklyFeedbackItem[];
}

export function summarizeWeeklyFeedback(docs: any[], cutoffMillis: number): WeeklyFeedbackDigestStats {
  const recentFeedback: WeeklyFeedbackItem[] = [];
  let unresolvedFeedback = 0;

  for (const doc of docs) {
    const data = doc.data() || {};
    if (data.status === 'new') unresolvedFeedback++;
    if (toTimestampMillis(data.createdAt) >= cutoffMillis) {
      recentFeedback.push({
        rating: Number(data.rating) || 0,
        category: String(data.category || 'other'),
        comment: String(data.comment || ''),
        contact: String(data.userEmail || 'Anonym'),
      });
    }
  }

  return {
    totalFeedback: docs.length,
    unresolvedFeedback,
    recentFeedback,
  };
}

export interface WeeklyTelemetryDigestStats {
  viewsLast7d: number;
  viewsPrev7d: number;
  webViewsLast7d: number;
  pwaViewsLast7d: number;
  viewsTotal: number;
  interactionsLast7d: number;
  quickGamesLast7d: number;
  quickGamesTotal: number;
  trailerOpenedLast7d: number;
  trailerOpenedTotal: number;
  researchExportsLast7d: number;
  researchExportsTotal: number;
  topRoutesLast7d: Array<{ route: string; count: number }>;
  topReferrersLast7d: Array<{ source: string; count: number }>;
}

function toSafeInt(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : 0;
}

function mapDigestReferrerLabel(rawSource: string): string {
  if (rawSource === 'direct') return 'Direktaufruf';
  if (rawSource === 'pwa_launch') return 'PWA-App-Start';
  return rawSource;
}

function formatTrendDelta(current: number, previous: number): string {
  const diff = current - previous;
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `${diff}`;
  return '±0';
}

function addMapCounts(
  target: Map<string, number>,
  source: Record<string, number> | undefined,
  keyMapper?: (key: string) => string,
): void {
  if (!source) return;
  for (const [rawKey, rawCount] of Object.entries(source)) {
    const count = toSafeInt(rawCount);
    if (count > 0) {
      const key = keyMapper ? keyMapper(rawKey) : rawKey;
      target.set(key, (target.get(key) || 0) + count);
    }
  }
}

interface WeeklyWindowAccumulator {
  viewsLast7d: number;
  viewsPrev7d: number;
  webViewsLast7d: number;
  pwaViewsLast7d: number;
  quickGamesLast7d: number;
  trailerOpenedLast7d: number;
  researchExportsLast7d: number;
  routeTotals: Map<string, number>;
  referrerTotals: Map<string, number>;
}

function accumulateCurrentWeekEntry(acc: WeeklyWindowAccumulator, entry: TelemetryDailyEntry): void {
  const entryTotal = toSafeInt(entry.totalViews);
  const entryPwa = toSafeInt(entry.pwaViews);
  const entryWeb = entry.webViews !== undefined ? toSafeInt(entry.webViews) : Math.max(0, entryTotal - entryPwa);

  acc.viewsLast7d += entryTotal;
  acc.webViewsLast7d += entryWeb;
  acc.pwaViewsLast7d += entryPwa;
  acc.quickGamesLast7d += toSafeInt(entry.events?.quick_game_started);
  acc.trailerOpenedLast7d += toSafeInt(entry.events?.trailer_opened);
  acc.researchExportsLast7d += toSafeInt(entry.events?.research_export);

  addMapCounts(acc.routeTotals, entry.routes);
  addMapCounts(acc.referrerTotals, entry.referrers, mapDigestReferrerLabel);
}

function collectDailySeriesWindows(
  dailySeries: readonly TelemetryDailyEntry[],
  cutoff7dKey: string,
  todayKey: string,
  prevStartKey: string,
  prevEndKey: string,
): WeeklyWindowAccumulator {
  const acc: WeeklyWindowAccumulator = {
    viewsLast7d: 0,
    viewsPrev7d: 0,
    webViewsLast7d: 0,
    pwaViewsLast7d: 0,
    quickGamesLast7d: 0,
    trailerOpenedLast7d: 0,
    researchExportsLast7d: 0,
    routeTotals: new Map<string, number>(),
    referrerTotals: new Map<string, number>(),
  };

  for (const entry of dailySeries) {
    if (!entry?.date) continue;
    if (entry.date >= cutoff7dKey && entry.date <= todayKey) {
      accumulateCurrentWeekEntry(acc, entry);
    } else if (entry.date >= prevStartKey && entry.date <= prevEndKey) {
      acc.viewsPrev7d += toSafeInt(entry.totalViews);
    }
  }

  return acc;
}

export function summarizeWeeklyTelemetry(
  telemetry: TelemetryStats | null | undefined,
  nowDate: Date = new Date(),
): WeeklyTelemetryDigestStats {
  const dayMs = 86_400_000;
  const todayKey = nowDate.toISOString().slice(0, 10);
  const cutoff7dKey = new Date(nowDate.getTime() - 6 * dayMs).toISOString().slice(0, 10);
  const prevEndKey = new Date(nowDate.getTime() - 7 * dayMs).toISOString().slice(0, 10);
  const prevStartKey = new Date(nowDate.getTime() - 13 * dayMs).toISOString().slice(0, 10);

  const dailySeries = Array.isArray(telemetry?.dailySeries) ? telemetry.dailySeries : [];
  const acc = collectDailySeriesWindows(dailySeries, cutoff7dKey, todayKey, prevStartKey, prevEndKey);
  if (dailySeries.length === 0) {
    acc.viewsLast7d = toSafeInt(telemetry?.viewsLast7d);
  }

  const interactionsLast7d = acc.quickGamesLast7d + acc.trailerOpenedLast7d + acc.researchExportsLast7d;

  const topRoutesLast7d = Array.from(acc.routeTotals.entries())
    .map(([route, count]) => ({ route, count }))
    .sort((a, b) => b.count - a.count || a.route.localeCompare(b.route))
    .slice(0, 5);

  const topReferrersLast7d = Array.from(acc.referrerTotals.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source))
    .slice(0, 6);

  return {
    viewsLast7d: acc.viewsLast7d,
    viewsPrev7d: acc.viewsPrev7d,
    webViewsLast7d: acc.webViewsLast7d,
    pwaViewsLast7d: acc.pwaViewsLast7d,
    viewsTotal: toSafeInt(telemetry?.viewsTotal),
    interactionsLast7d,
    quickGamesLast7d: acc.quickGamesLast7d,
    quickGamesTotal: toSafeInt(telemetry?.events?.quick_game_started),
    trailerOpenedLast7d: acc.trailerOpenedLast7d,
    trailerOpenedTotal: toSafeInt(telemetry?.events?.trailer_opened),
    researchExportsLast7d: acc.researchExportsLast7d,
    researchExportsTotal: toSafeInt(telemetry?.events?.research_export),
    topRoutesLast7d,
    topReferrersLast7d,
  };
}

export function buildWeeklyDigestEmail(
  research: WeeklyResearchDigestStats,
  cloud: WeeklyCloudGamesDigestStats,
  feedback: WeeklyFeedbackDigestStats,
  pendingEducators: number,
  telemetry?: WeeklyTelemetryDigestStats,
): { subject: string; text: string; html: string } {
  const feedbackLast7d = feedback.recentFeedback.length;
  const subject = telemetry
    ? `[SOIL] Wochenbericht: ${telemetry.viewsLast7d} Aufrufe, ${telemetry.interactionsLast7d} Interaktionen, ${research.researchGamesLast7d} Spiele, ${feedbackLast7d} Feedback`
    : `[SOIL] Wochenbericht: ${research.researchGamesLast7d} abgeschlossene Spiele, ${feedbackLast7d} neues Feedback`;

  const feedbackTextLines =
    feedbackLast7d > 0
      ? feedback.recentFeedback
          .map((f) => `- [${f.rating}/5 | ${f.category} | ${f.contact}] ${f.comment || '(Kein Kommentar)'}`)
          .join('\n')
      : '- Kein neues Feedback in den letzten 7 Tagen.';

  const viewsTrend = telemetry ? formatTrendDelta(telemetry.viewsLast7d, telemetry.viewsPrev7d) : '±0';
  const topRoutesText =
    telemetry && telemetry.topRoutesLast7d.length > 0
      ? telemetry.topRoutesLast7d.map((r) => `${r.route} (${r.count})`).join(', ')
      : 'Keine Daten';
  const topReferrersText =
    telemetry && telemetry.topReferrersLast7d.length > 0
      ? telemetry.topReferrersLast7d.map((r) => `${r.source} (${r.count})`).join(', ')
      : 'Keine Daten';

  const telemetryTextLines = telemetry
    ? [
        'Zugriffe & Interaktionen (Letzte 7 Tage)',
        '----------------------------------------',
        `Seitenaufrufe (7 Tage): ${telemetry.viewsLast7d} (Vorwoche: ${telemetry.viewsPrev7d}, Trend ${viewsTrend}; Kanal: ${telemetry.webViewsLast7d} Web / ${telemetry.pwaViewsLast7d} PWA; Gesamt: ${telemetry.viewsTotal})`,
        `Interaktionen (7 Tage): ${telemetry.interactionsLast7d} gesamt — Sofort-Spiele gestartet: ${telemetry.quickGamesLast7d} (Gesamt: ${telemetry.quickGamesTotal}), Trailer angesehen: ${telemetry.trailerOpenedLast7d} (Gesamt: ${telemetry.trailerOpenedTotal}), Forschungs-Exporte: ${telemetry.researchExportsLast7d} (Gesamt: ${telemetry.researchExportsTotal})`,
        `Meistbesuchte Seiten (7 Tage): ${topRoutesText}`,
        `Herkunft / Referrer (7 Tage): ${topReferrersText}`,
        '',
      ]
    : [];

  const text = [
    'SOIL Wochenbericht (Letzte 7 Tage)',
    '===================================',
    ...telemetryTextLines,
    `Abgeschlossene Spiele (Forschungsdatensatz, 7 Tage): ${research.researchGamesLast7d} (Gesamt: ${research.totalResearchGames})`,
    `  - Lokal vs. Cloud (7 Tage): ${research.sourceBreakdown.local} lokal / ${research.sourceBreakdown.cloud} Cloud`,
    `  - Schwierigkeitsgrad (7 Tage): Einfach ${research.difficultyBreakdown.easy}, Normal ${research.difficultyBreakdown.normal}, Schwer ${research.difficultyBreakdown.hard}`,
    `Cloud-Spiele (aktiv in letzten 7 Tagen): ${cloud.gamesLast7d} (Laufend: ${cloud.activeCloudGames}, Beendet: ${cloud.finishedCloudGames})`,
    `Offene Lehrkräfte-Freischaltungen: ${pendingEducators}`,
    `Feedback (7 Tage): ${feedbackLast7d} (Offen/Ungelesen: ${feedback.unresolvedFeedback}, Gesamt: ${feedback.totalFeedback})`,
    '',
    'Neues Feedback:',
    feedbackTextLines,
    '',
    'Details & Zeitreihen-Charts in der System-Konsole öffnen: https://soil.app/admin/super',
  ].join('\n');

  const feedbackHtmlItems =
    feedbackLast7d > 0
      ? feedback.recentFeedback
          .map(
            (f) =>
              `<li><strong>${f.rating}/5</strong> (${escapeHtml(f.category)} – <code>${escapeHtml(f.contact)}</code>): ${escapeHtml(f.comment || '(Kein Kommentar)')}</li>`,
          )
          .join('')
      : '<li>Kein neues Feedback in den letzten 7 Tagen.</li>';

  const topRoutesHtml =
    telemetry && telemetry.topRoutesLast7d.length > 0
      ? telemetry.topRoutesLast7d.map((r) => `${escapeHtml(r.route)} (${r.count})`).join(', ')
      : 'Keine Daten';
  const topReferrersHtml =
    telemetry && telemetry.topReferrersLast7d.length > 0
      ? telemetry.topReferrersLast7d.map((r) => `${escapeHtml(r.source)} (${r.count})`).join(', ')
      : 'Keine Daten';

  const telemetryHtmlSection = telemetry
    ? `
      <h3 style="color: #047857;">Zugriffe &amp; Interaktionen (Letzte 7 Tage)</h3>
      <ul>
        <li><strong>Seitenaufrufe (7 Tage):</strong> ${telemetry.viewsLast7d} (Vorwoche: ${telemetry.viewsPrev7d}, Trend ${escapeHtml(viewsTrend)}; Kanal: ${telemetry.webViewsLast7d} Web / ${telemetry.pwaViewsLast7d} PWA; Gesamt: ${telemetry.viewsTotal})</li>
        <li><strong>Interaktionen (7 Tage):</strong> ${telemetry.interactionsLast7d} gesamt — Sofort-Spiele gestartet: ${telemetry.quickGamesLast7d} (Gesamt: ${telemetry.quickGamesTotal}), Trailer angesehen: ${telemetry.trailerOpenedLast7d} (Gesamt: ${telemetry.trailerOpenedTotal}), Forschungs-Exporte: ${telemetry.researchExportsLast7d} (Gesamt: ${telemetry.researchExportsTotal})</li>
        <li><strong>Meistbesuchte Seiten (7 Tage):</strong> ${topRoutesHtml}</li>
        <li><strong>Herkunft / Referrer (7 Tage):</strong> ${topReferrersHtml}</li>
      </ul>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; max-width: 640px; margin: 0 auto;">
      <h2 style="color: #059669;">SOIL Wochenbericht (Letzte 7 Tage)</h2>${telemetryHtmlSection}
      <h3 style="color: #047857;">Spielbetrieb &amp; Forschung (Letzte 7 Tage)</h3>
      <ul>
        <li><strong>Abgeschlossene Spiele (7 Tage):</strong> ${research.researchGamesLast7d} (Gesamt im Forschungsdatensatz: ${research.totalResearchGames})</li>
        <li><strong>Quelle (7 Tage):</strong> ${research.sourceBreakdown.local} Lokal / ${research.sourceBreakdown.cloud} Cloud</li>
        <li><strong>Schwierigkeitsgrad (7 Tage):</strong> Einfach ${research.difficultyBreakdown.easy}, Normal ${research.difficultyBreakdown.normal}, Schwer ${research.difficultyBreakdown.hard}</li>
        <li><strong>Cloud-Spiele (7 Tage aktiv):</strong> ${cloud.gamesLast7d} (Aktuell laufend: ${cloud.activeCloudGames}, Beendet: ${cloud.finishedCloudGames})</li>
        <li><strong>Offene Lehrkräfte-Freischaltungen:</strong> ${pendingEducators}</li>
        <li><strong>Feedback (7 Tage):</strong> ${feedbackLast7d} (Offen: ${feedback.unresolvedFeedback}, Gesamt: ${feedback.totalFeedback})</li>
      </ul>
      <h3 style="color: #047857;">Neues Feedback der letzten 7 Tage</h3>
      <ul>${feedbackHtmlItems}</ul>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0 12px;" />
      <p style="font-size: 13px; color: #4b5563;">
        <a href="https://soil.app/admin/super" style="color: #059669; text-decoration: underline;">Details &amp; Zeitreihen-Charts in der System-Konsole öffnen</a>
      </p>
    </div>
  `;

  return { subject, text, html };
}

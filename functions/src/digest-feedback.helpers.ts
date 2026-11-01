import { HttpsError } from 'firebase-functions/v2/https';
import { mailService } from './mail.service';
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

export function buildWeeklyDigestEmail(
  research: WeeklyResearchDigestStats,
  cloud: WeeklyCloudGamesDigestStats,
  feedback: WeeklyFeedbackDigestStats,
  pendingEducators: number,
): { subject: string; text: string; html: string } {
  const feedbackLast7d = feedback.recentFeedback.length;
  const subject = `[SOIL] Wochenbericht: ${research.researchGamesLast7d} abgeschlossene Spiele, ${feedbackLast7d} neues Feedback`;

  const feedbackTextLines =
    feedbackLast7d > 0
      ? feedback.recentFeedback
          .map((f) => `- [${f.rating}/5 | ${f.category} | ${f.contact}] ${f.comment || '(Kein Kommentar)'}`)
          .join('\n')
      : '- Kein neues Feedback in den letzten 7 Tagen.';

  const text = [
    'SOIL Wochenbericht (Letzte 7 Tage)',
    '===================================',
    `Abgeschlossene Spiele (Forschungsdatensatz, 7 Tage): ${research.researchGamesLast7d} (Gesamt: ${research.totalResearchGames})`,
    `  - Lokal vs. Cloud (7 Tage): ${research.sourceBreakdown.local} lokal / ${research.sourceBreakdown.cloud} Cloud`,
    `  - Schwierigkeitsgrad (7 Tage): Einfach ${research.difficultyBreakdown.easy}, Normal ${research.difficultyBreakdown.normal}, Schwer ${research.difficultyBreakdown.hard}`,
    `Cloud-Spiele (aktiv in letzten 7 Tagen): ${cloud.gamesLast7d} (Laufend: ${cloud.activeCloudGames}, Beendet: ${cloud.finishedCloudGames})`,
    `Offene Lehrkräfte-Freischaltungen: ${pendingEducators}`,
    `Feedback (7 Tage): ${feedbackLast7d} (Offen/Ungelesen: ${feedback.unresolvedFeedback}, Gesamt: ${feedback.totalFeedback})`,
    '',
    'Neues Feedback:',
    feedbackTextLines,
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

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; max-width: 640px; margin: 0 auto;">
      <h2 style="color: #059669;">SOIL Wochenbericht (Letzte 7 Tage)</h2>
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
    </div>
  `;

  return { subject, text, html };
}

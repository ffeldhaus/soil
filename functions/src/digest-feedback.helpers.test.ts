import { expect } from 'chai';
import {
  buildWeeklyDigestEmail,
  summarizeWeeklyTelemetry,
  type WeeklyCloudGamesDigestStats,
  type WeeklyFeedbackDigestStats,
  type WeeklyResearchDigestStats,
} from './digest-feedback.helpers';
import type { TelemetryStats } from './types';

describe('Weekly Digest Telemetry & Email Helpers', () => {
  const baseResearch: WeeklyResearchDigestStats = {
    totalResearchGames: 48,
    researchGamesLast7d: 5,
    sourceBreakdown: { local: 3, cloud: 2 },
    difficultyBreakdown: { easy: 1, normal: 3, hard: 1 },
  };

  const baseCloud: WeeklyCloudGamesDigestStats = {
    activeCloudGames: 2,
    finishedCloudGames: 14,
    gamesLast7d: 3,
  };

  const baseFeedback: WeeklyFeedbackDigestStats = {
    totalFeedback: 12,
    unresolvedFeedback: 1,
    recentFeedback: [
      {
        rating: 5,
        category: 'gameplay',
        comment: 'Sehr anschaulich im Unterricht!',
        contact: 'Anonym',
      },
    ],
  };

  describe('summarizeWeeklyTelemetry', () => {
    it('computes 7d vs prev-7d windows, channel split, event sums, top 5 routes, and top 6 mapped referrers', () => {
      const now = new Date('2026-11-16T08:00:00.000Z');
      const telemetry: TelemetryStats = {
        viewsToday: 20,
        viewsLast7d: 95,
        viewsLast30d: 260,
        viewsTotal: 1250,
        pwaViewsTotal: 250,
        webViewsTotal: 1000,
        routes: { '/': 600, '/info': 300 },
        events: {
          quick_game_started: 85,
          trailer_opened: 40,
          research_export: 11,
        },
        referrers: { direct: 700, pwa_launch: 200 },
        dailySeries: [
          // Outside prev-7d window (14 days ago: 2026-11-02) -> ignored
          {
            date: '2026-11-02',
            totalViews: 99,
            webViews: 90,
            pwaViews: 9,
            routes: { '/privacy': 99 },
            events: { quick_game_started: 50 },
            referrers: { 'ignored-old.de': 99 },
          },
          // Start of prev-7d window (13 days ago: 2026-11-03)
          {
            date: '2026-11-03',
            totalViews: 30,
            webViews: 25,
            pwaViews: 5,
            routes: { '/': 30 },
            events: { quick_game_started: 4 },
            referrers: { direct: 30 },
          },
          // End of prev-7d window (7 days ago: 2026-11-09)
          {
            date: '2026-11-09',
            totalViews: 40,
            webViews: 32,
            pwaViews: 8,
            routes: { '/': 40 },
            events: { trailer_opened: 2 },
            referrers: { direct: 40 },
          },
          // Start of current 7d window (6 days ago: 2026-11-10)
          {
            date: '2026-11-10',
            totalViews: 50,
            webViews: 38,
            pwaViews: 12,
            routes: {
              '/': 22,
              '/info': 10,
              '/manual': 7,
              '/trailer': 5,
              '/research': 4,
              '/impressum': 2,
            },
            events: {
              quick_game_started: 6,
              trailer_opened: 3,
              research_export: 1,
            },
            referrers: {
              direct: 20,
              pwa_launch: 8,
              'bpb.de': 7,
              'bildungsserver.de': 6,
              'google.com': 5,
              'ecosia.org': 3,
              'duckduckgo.com': 1,
            },
          },
          // End of current 7d window (today: 2026-11-16)
          {
            date: '2026-11-16',
            totalViews: 45,
            webViews: 37,
            pwaViews: 8,
            routes: {
              '/': 23,
              '/info': 8,
              '/manual': 6,
              '/game': 5,
              '/research': 3,
            },
            events: {
              quick_game_started: 4,
              trailer_opened: 2,
              research_export: 2,
            },
            referrers: {
              direct: 15,
              pwa_launch: 4,
              'bpb.de': 5,
              'google.com': 4,
            },
          },
        ],
      };

      const digest = summarizeWeeklyTelemetry(telemetry, now);

      expect(digest.viewsLast7d).to.equal(95);
      expect(digest.viewsPrev7d).to.equal(70);
      expect(digest.webViewsLast7d).to.equal(75);
      expect(digest.pwaViewsLast7d).to.equal(20);
      expect(digest.viewsTotal).to.equal(1250);

      expect(digest.quickGamesLast7d).to.equal(10);
      expect(digest.quickGamesTotal).to.equal(85);
      expect(digest.trailerOpenedLast7d).to.equal(5);
      expect(digest.trailerOpenedTotal).to.equal(40);
      expect(digest.researchExportsLast7d).to.equal(3);
      expect(digest.researchExportsTotal).to.equal(11);
      expect(digest.interactionsLast7d).to.equal(18);

      expect(digest.topRoutesLast7d).to.deep.equal([
        { route: '/', count: 45 },
        { route: '/info', count: 18 },
        { route: '/manual', count: 13 },
        { route: '/research', count: 7 },
        { route: '/game', count: 5 },
      ]);

      expect(digest.topReferrersLast7d).to.deep.equal([
        { source: 'Direktaufruf', count: 35 },
        { source: 'bpb.de', count: 12 },
        { source: 'PWA-App-Start', count: 12 },
        { source: 'google.com', count: 9 },
        { source: 'bildungsserver.de', count: 6 },
        { source: 'ecosia.org', count: 3 },
      ]);
    });

    it('falls back gracefully when dailySeries is empty or telemetry is undefined', () => {
      const fallbackDigest = summarizeWeeklyTelemetry({
        viewsToday: 0,
        viewsLast7d: 33,
        viewsLast30d: 80,
        viewsTotal: 210,
        pwaViewsTotal: 10,
        webViewsTotal: 200,
        routes: {},
        events: { quick_game_started: 7 },
        referrers: {},
        dailySeries: [],
      });

      expect(fallbackDigest.viewsLast7d).to.equal(33);
      expect(fallbackDigest.viewsPrev7d).to.equal(0);
      expect(fallbackDigest.viewsTotal).to.equal(210);
      expect(fallbackDigest.quickGamesTotal).to.equal(7);
      expect(fallbackDigest.interactionsLast7d).to.equal(0);
      expect(fallbackDigest.topRoutesLast7d).to.deep.equal([]);
      expect(fallbackDigest.topReferrersLast7d).to.deep.equal([]);

      const emptyDigest = summarizeWeeklyTelemetry(undefined);
      expect(emptyDigest.viewsLast7d).to.equal(0);
      expect(emptyDigest.viewsTotal).to.equal(0);
      expect(emptyDigest.topRoutesLast7d).to.deep.equal([]);
    });
  });

  describe('buildWeeklyDigestEmail', () => {
    it('renders telemetry subject, positive/negative/neutral trend, routes, referrers, and admin link', () => {
      const telemetryDigest = {
        viewsLast7d: 95,
        viewsPrev7d: 70,
        webViewsLast7d: 75,
        pwaViewsLast7d: 20,
        viewsTotal: 1250,
        interactionsLast7d: 18,
        quickGamesLast7d: 10,
        quickGamesTotal: 85,
        trailerOpenedLast7d: 5,
        trailerOpenedTotal: 40,
        researchExportsLast7d: 3,
        researchExportsTotal: 11,
        topRoutesLast7d: [
          { route: '/', count: 45 },
          { route: '/info', count: 18 },
        ],
        topReferrersLast7d: [
          { source: 'Direktaufruf', count: 35 },
          { source: 'bpb.de', count: 12 },
        ],
      };

      const email = buildWeeklyDigestEmail(baseResearch, baseCloud, baseFeedback, 2, telemetryDigest);

      expect(email.subject).to.equal('[SOIL] Wochenbericht: 95 Aufrufe, 18 Interaktionen, 5 Spiele, 1 Feedback');
      expect(email.text).to.contain('Zugriffe & Interaktionen (Letzte 7 Tage)');
      expect(email.text).to.contain(
        'Seitenaufrufe (7 Tage): 95 (Vorwoche: 70, Trend +25; Kanal: 75 Web / 20 PWA; Gesamt: 1250)',
      );
      expect(email.text).to.contain(
        'Interaktionen (7 Tage): 18 gesamt — Sofort-Spiele gestartet: 10 (Gesamt: 85), Trailer angesehen: 5 (Gesamt: 40), Forschungs-Exporte: 3 (Gesamt: 11)',
      );
      expect(email.text).to.contain('Meistbesuchte Seiten (7 Tage): / (45), /info (18)');
      expect(email.text).to.contain('Herkunft / Referrer (7 Tage): Direktaufruf (35), bpb.de (12)');
      expect(email.text).to.contain('https://soil.app/admin/super');

      expect(email.html).to.contain('Zugriffe &amp; Interaktionen (Letzte 7 Tage)');
      expect(email.html).to.contain('Trend +25; Kanal: 75 Web / 20 PWA; Gesamt: 1250');
      expect(email.html).to.contain('/ (45), /info (18)');
      expect(email.html).to.contain('Direktaufruf (35), bpb.de (12)');
      expect(email.html).to.contain('href="https://soil.app/admin/super"');
      expect(email.html).to.contain('Details &amp; Zeitreihen-Charts in der System-Konsole öffnen');

      // Negative and neutral trend formatting + empty lists
      const downEmail = buildWeeklyDigestEmail(baseResearch, baseCloud, baseFeedback, 0, {
        ...telemetryDigest,
        viewsLast7d: 40,
        viewsPrev7d: 55,
        topRoutesLast7d: [],
        topReferrersLast7d: [],
      });
      expect(downEmail.text).to.contain('Trend -15;');
      expect(downEmail.text).to.contain('Meistbesuchte Seiten (7 Tage): Keine Daten');
      expect(downEmail.text).to.contain('Herkunft / Referrer (7 Tage): Keine Daten');

      const flatEmail = buildWeeklyDigestEmail(baseResearch, baseCloud, baseFeedback, 0, {
        ...telemetryDigest,
        viewsLast7d: 55,
        viewsPrev7d: 55,
      });
      expect(flatEmail.text).to.contain('Trend ±0;');
    });

    it('preserves fallback subject when telemetry argument is omitted and escapes dynamic HTML strings', () => {
      const xssFeedback: WeeklyFeedbackDigestStats = {
        totalFeedback: 1,
        unresolvedFeedback: 1,
        recentFeedback: [
          {
            rating: 2,
            category: '<img src=x onerror=alert(1)>',
            comment: '<script>steal()</script>',
            contact: '"bad"@example.org',
          },
        ],
      };

      const fallbackEmail = buildWeeklyDigestEmail(baseResearch, baseCloud, xssFeedback, 0);
      expect(fallbackEmail.subject).to.equal('[SOIL] Wochenbericht: 5 abgeschlossene Spiele, 1 neues Feedback');
      expect(fallbackEmail.html).to.not.contain('<script>');
      expect(fallbackEmail.html).to.contain('&lt;script&gt;steal()&lt;/script&gt;');

      const xssTelemetryEmail = buildWeeklyDigestEmail(baseResearch, baseCloud, xssFeedback, 0, {
        viewsLast7d: 1,
        viewsPrev7d: 1,
        webViewsLast7d: 1,
        pwaViewsLast7d: 0,
        viewsTotal: 1,
        interactionsLast7d: 0,
        quickGamesLast7d: 0,
        quickGamesTotal: 0,
        trailerOpenedLast7d: 0,
        trailerOpenedTotal: 0,
        researchExportsLast7d: 0,
        researchExportsTotal: 0,
        topRoutesLast7d: [{ route: '/<svg onload=alert(1)>', count: 1 }],
        topReferrersLast7d: [{ source: '<b onmouseover=alert(2)>evil</b>', count: 1 }],
      });
      expect(xssTelemetryEmail.html).to.not.contain('<svg onload=alert(1)>');
      expect(xssTelemetryEmail.html).to.not.contain('<b onmouseover=alert(2)>');
      expect(xssTelemetryEmail.html).to.contain('/&lt;svg onload=alert(1)&gt; (1)');
      expect(xssTelemetryEmail.html).to.contain('&lt;b onmouseover=alert(2)&gt;evil&lt;/b&gt; (1)');
    });
  });
});

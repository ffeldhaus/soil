import { expect } from 'chai';
import * as sinon from 'sinon';
import { resetRateLimitStore } from './research.service';
import {
  aggregateTelemetryStats,
  handleTelemetryHttpRequest,
  isBotUserAgent,
  normalizeTelemetryRoute,
  sanitizeTelemetryPayload,
  sanitizeTelemetryReferrer,
} from './telemetry.service';

describe('Telemetry Service (Zero-Cookie / Zero-PII Aggregate Counters)', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it('identifies bot and crawler user agents', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).to.equal(true);
    expect(isBotUserAgent('Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/125.0.0.0')).to.equal(true);
    expect(
      isBotUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0'),
    ).to.equal(false);
  });

  it('normalizes canonical routes and rejects unknown or sensitive routes', () => {
    expect(normalizeTelemetryRoute('/')).to.equal('/');
    expect(normalizeTelemetryRoute('/manual/?foo=bar')).to.equal('/manual');
    expect(normalizeTelemetryRoute('/game-login#pin')).to.equal('/game-login');
    expect(normalizeTelemetryRoute('/admin/super')).to.equal(null);
    expect(normalizeTelemetryRoute('/auth/action')).to.equal(null);
  });

  it('sanitizes external referrers to bare domain names and ignores self-referrals', () => {
    expect(sanitizeTelemetryReferrer('', 'web')).to.equal('direct');
    expect(sanitizeTelemetryReferrer('', 'pwa')).to.equal('pwa_launch');
    expect(sanitizeTelemetryReferrer('https://www.bpb.de/themen/landwirtschaft?id=5', 'web')).to.equal('bpb.de');
    expect(sanitizeTelemetryReferrer('https://soil.app/manual', 'web')).to.equal(null);
    expect(sanitizeTelemetryReferrer('https://soil--soil-602ea.europe-west4.hosted.app/', 'web')).to.equal(null);
    expect(sanitizeTelemetryReferrer('http://localhost:4200/', 'web')).to.equal(null);
  });

  it('sanitizes and clamps telemetry batch payloads', () => {
    const sanitized = sanitizeTelemetryPayload({
      mode: 'pwa',
      views: { '/': 2, '/manual': 99, '/invalid': 5 },
      events: { quick_game_started: 3, unknown_event: 2 },
      referrers: { 'https://www.bildungsserver.de/': 1, 'https://soil.app/': 4 },
    });

    expect(sanitized).to.deep.equal({
      mode: 'pwa',
      views: { '/': 2, '/manual': 20 },
      events: { quick_game_started: 3 },
      referrers: { 'bildungsserver.de': 1 },
      totalViews: 22,
    });
  });

  it('handles HTTP POST requests, ignores bots, and writes atomic increments', async () => {
    const dailySetStub = sinon.stub().resolves();
    const totalsSetStub = sinon.stub().resolves();
    const mockDb: any = {
      collection: (name: string) => ({
        doc: (_id: string) => ({
          set: name === 'telemetry_daily' ? dailySetStub : totalsSetStub,
        }),
      }),
    };

    const createRes = () => {
      const res: any = {
        statusCode: 200,
        body: null,
        setHeader: sinon.stub(),
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        send(payload: any) {
          this.body = payload;
          return this;
        },
        json(payload: any) {
          this.body = payload;
          return this;
        },
      };
      return res;
    };

    // 1. Bot request is ignored with 204
    const botRes = createRes();
    await handleTelemetryHttpRequest(
      {
        method: 'POST',
        headers: { 'user-agent': 'Googlebot/2.1' },
        body: { views: { '/': 1 } },
      },
      botRes,
      mockDb,
    );
    expect(botRes.statusCode).to.equal(204);
    expect(dailySetStub.called).to.equal(false);

    // 1b. Do Not Track / Sec-GPC request is ignored with 204
    const dntRes = createRes();
    await handleTelemetryHttpRequest(
      {
        method: 'POST',
        headers: { 'user-agent': 'Mozilla/5.0 Firefox/128.0', dnt: '1' },
        body: { views: { '/': 1 } },
      },
      dntRes,
      mockDb,
    );
    expect(dntRes.statusCode).to.equal(204);
    expect(dailySetStub.called).to.equal(false);

    // 2. Valid browser request increments daily and totals docs
    const validRes = createRes();
    await handleTelemetryHttpRequest(
      {
        method: 'POST',
        headers: { 'user-agent': 'Mozilla/5.0 Firefox/128.0' },
        body: {
          mode: 'web',
          views: { '/': 1, '/research': 2 },
          events: { research_export: 1 },
          referrers: { 'bpb.de': 1 },
        },
      },
      validRes,
      mockDb,
    );
    expect(validRes.statusCode).to.equal(204);
    expect(dailySetStub.calledOnce).to.equal(true);
    expect(totalsSetStub.calledOnce).to.equal(true);
  });

  it('aggregates daily windows and total counters for getSystemStats', async () => {
    const now = new Date('2026-11-05T12:00:00.000Z');
    const mockDb: any = {
      collection: (name: string) => {
        if (name === 'telemetry_totals') {
          return {
            doc: () => ({
              get: async () => ({
                exists: true,
                data: () => ({
                  totalViews: 500,
                  pwaViews: 80,
                  webViews: 420,
                  routes: { '/': 250, '/game': 150, '/manual': 100 },
                  events: { quick_game_started: 90, trailer_opened: 45 },
                  referrers: { direct: 300, 'bpb.de': 120, pwa_launch: 80 },
                }),
              }),
            }),
          };
        }
        return {
          where: () => ({
            get: async () => ({
              docs: [
                { id: '2026-11-05', data: () => ({ date: '2026-11-05', totalViews: 25 }) },
                { id: '2026-11-02', data: () => ({ date: '2026-11-02', totalViews: 75 }) },
                { id: '2026-10-15', data: () => ({ date: '2026-10-15', totalViews: 150 }) },
              ],
            }),
          }),
        };
      },
    };

    const stats = await aggregateTelemetryStats(mockDb, now);
    expect(stats.viewsToday).to.equal(25);
    expect(stats.viewsLast7d).to.equal(100);
    expect(stats.viewsLast30d).to.equal(250);
    expect(stats.viewsTotal).to.equal(500);
    expect(stats.pwaViewsTotal).to.equal(80);
    expect(stats.webViewsTotal).to.equal(420);
    expect(stats.routes['/']).to.equal(250);
    expect(stats.events.quick_game_started).to.equal(90);
    expect(stats.referrers['bpb.de']).to.equal(120);
  });
});

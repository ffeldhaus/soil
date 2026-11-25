import { expect } from 'chai';
import * as sinon from 'sinon';
import { resetRateLimitStore } from './research.service';
import {
  aggregateTelemetryStats,
  cleanupExpiredHourlyTelemetry,
  computeLocalGameStats,
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

  it('normalizes canonical routes including /trailer and rejects unknown or sensitive routes', () => {
    expect(normalizeTelemetryRoute('/')).to.equal('/');
    expect(normalizeTelemetryRoute('/manual/?foo=bar')).to.equal('/manual');
    expect(normalizeTelemetryRoute('/trailer?ref=share')).to.equal('/trailer');
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
      views: { '/': 2, '/manual': 99, '/trailer': 4, '/invalid': 5 },
      events: {
        quick_game_started: 3,
        quick_game_first_plant: 2,
        quick_game_round_1: 2,
        quick_game_round_20: 1,
        quick_game_finished: 1,
        quick_game_deleted: 1,
        quick_game_round_21: 4,
        unknown_event: 2,
      },
      referrers: { 'https://www.bildungsserver.de/': 1, 'https://soil.app/': 4 },
    });

    expect(sanitized).to.deep.equal({
      mode: 'pwa',
      views: { '/': 2, '/manual': 20, '/trailer': 4 },
      events: {
        quick_game_started: 3,
        quick_game_first_plant: 2,
        quick_game_round_1: 2,
        quick_game_round_20: 1,
        quick_game_finished: 1,
        quick_game_deleted: 1,
      },
      referrers: { 'bildungsserver.de': 1 },
      totalViews: 26,
    });
  });

  it('handles HTTP POST requests, ignores bots, and writes atomic increments to daily, hourly, and totals', async () => {
    const dailySetStub = sinon.stub().resolves();
    const hourlySetStub = sinon.stub().resolves();
    const totalsSetStub = sinon.stub().resolves();
    let recordedHourDocId = '';
    const mockDb: any = {
      collection: (name: string) => ({
        doc: (id: string) => {
          if (name === 'telemetry_hourly') recordedHourDocId = id;
          return {
            set:
              name === 'telemetry_daily' ? dailySetStub : name === 'telemetry_hourly' ? hourlySetStub : totalsSetStub,
          };
        },
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
    expect(hourlySetStub.called).to.equal(false);

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
    expect(hourlySetStub.called).to.equal(false);

    // 2. Valid browser request increments daily, hourly, and totals docs
    const validRes = createRes();
    await handleTelemetryHttpRequest(
      {
        method: 'POST',
        headers: { 'user-agent': 'Mozilla/5.0 Firefox/128.0' },
        body: {
          mode: 'web',
          views: { '/': 1, '/research': 2, '/trailer': 1 },
          events: { research_export: 1 },
          referrers: { 'bpb.de': 1 },
        },
      },
      validRes,
      mockDb,
    );
    expect(validRes.statusCode).to.equal(204);
    expect(dailySetStub.calledOnce).to.equal(true);
    expect(hourlySetStub.calledOnce).to.equal(true);
    expect(totalsSetStub.calledOnce).to.equal(true);
    expect(recordedHourDocId).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}$/);
    expect(hourlySetStub.firstCall.args[0].hour).to.equal(recordedHourDocId);
  });

  it('aggregates 400-day dailySeries, 24h hourlySeries, viewsLast24h, and window counters', async () => {
    const now = new Date('2026-11-05T12:35:00.000Z');
    let queriedDailyCutoff = '';
    let queriedHourlyCutoff = '';
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
                  routes: { '/': 250, '/game': 150, '/manual': 80, '/trailer': 20 },
                  events: { quick_game_started: 90, trailer_opened: 45 },
                  referrers: { direct: 300, 'bpb.de': 120, pwa_launch: 80 },
                }),
              }),
            }),
          };
        }
        if (name === 'telemetry_hourly') {
          return {
            where: (_field: string, _op: string, val: string) => {
              queriedHourlyCutoff = val;
              return {
                get: async () => ({
                  docs: [
                    {
                      id: '2026-11-05T12',
                      data: () => ({
                        hour: '2026-11-05T12',
                        totalViews: 9,
                        webViews: 7,
                        pwaViews: 2,
                        routes: { '/': 5, '/trailer': 4 },
                        events: { trailer_opened: 3 },
                        referrers: { 'bpb.de': 4, direct: 5 },
                      }),
                    },
                    {
                      id: '2026-11-04T13',
                      data: () => ({
                        hour: '2026-11-04T13',
                        totalViews: 14,
                        pwaViews: 3,
                        routes: { '/': 10, '/game': 4 },
                        events: { quick_game_started: 2 },
                        referrers: { direct: 11, pwa_launch: 3 },
                      }),
                    },
                    {
                      // Outside 24h window (24h ago = 2026-11-04T12 < cutoff 2026-11-04T13)
                      id: '2026-11-04T12',
                      data: () => ({
                        hour: '2026-11-04T12',
                        totalViews: 40,
                        webViews: 40,
                        pwaViews: 0,
                      }),
                    },
                  ],
                }),
              };
            },
          };
        }
        return {
          where: (_field: string, _op: string, val: string) => {
            queriedDailyCutoff = val;
            return {
              get: async () => ({
                docs: [
                  {
                    id: '2026-11-05',
                    data: () => ({
                      date: '2026-11-05',
                      totalViews: 25,
                      webViews: 20,
                      pwaViews: 5,
                      routes: { '/': 15, '/trailer': 10 },
                      events: { trailer_opened: 6 },
                      referrers: { 'facebook.com': 4, direct: 16 },
                    }),
                  },
                  {
                    id: '2026-03-10',
                    data: () => ({
                      date: '2026-03-10',
                      totalViews: 60,
                      pwaViews: 10,
                    }),
                  },
                  {
                    id: '2026-11-02',
                    data: () => ({
                      date: '2026-11-02',
                      totalViews: 75,
                      webViews: 70,
                      pwaViews: 5,
                    }),
                  },
                  {
                    id: '2026-10-15',
                    data: () => ({
                      date: '2026-10-15',
                      totalViews: 150,
                      webViews: 140,
                      pwaViews: 10,
                    }),
                  },
                ],
              }),
            };
          },
        };
      },
    };

    const stats = await aggregateTelemetryStats(mockDb, now);
    expect(queriedDailyCutoff).to.equal('2025-10-02');
    expect(queriedHourlyCutoff).to.equal('2026-11-04T13');
    expect(stats.viewsToday).to.equal(25);
    expect(stats.viewsLast24h).to.equal(23);
    expect(stats.viewsLast7d).to.equal(100);
    expect(stats.viewsLast30d).to.equal(250);
    expect(stats.viewsTotal).to.equal(500);
    expect(stats.pwaViewsTotal).to.equal(80);
    expect(stats.webViewsTotal).to.equal(420);
    expect(stats.routes['/trailer']).to.equal(20);
    expect(stats.firstRecordedDate).to.equal('2026-03-10');
    expect(stats.firstRecordedHour).to.equal('2026-11-04T13');
    expect(stats.hourlySeries?.map((h) => h.hour)).to.deep.equal(['2026-11-04T13', '2026-11-05T12']);
    expect(stats.hourlySeries?.[0].webViews).to.equal(11);
    expect(stats.hourlySeries?.[1].routes['/trailer']).to.equal(4);
    expect(stats.dailySeries?.map((d) => d.date)).to.deep.equal([
      '2026-03-10',
      '2026-10-15',
      '2026-11-02',
      '2026-11-05',
    ]);
    expect(stats.dailySeries?.[0].webViews).to.equal(50);
    expect(stats.dailySeries?.[3].routes['/trailer']).to.equal(10);
  });

  it('cleans up telemetry_hourly documents older than 72 hours in batches', async () => {
    const now = new Date('2026-11-16T12:45:00.000Z');
    let cutoffUsed = '';
    const batchDeleteStub = sinon.stub();
    const batchCommitStub = sinon.stub().resolves();
    const expiredRefs = [{ id: '2026-11-12T08' }, { id: '2026-11-13T11' }];

    const mockDb: any = {
      collection: (name: string) => {
        expect(name).to.equal('telemetry_hourly');
        return {
          where: (field: string, op: string, val: string) => {
            expect(field).to.equal('hour');
            expect(op).to.equal('<');
            cutoffUsed = val;
            return {
              limit: (lim: number) => {
                expect(lim).to.equal(200);
                return {
                  get: async () => ({
                    docs: expiredRefs.map((ref) => ({ ref })),
                  }),
                };
              },
            };
          },
        };
      },
      batch: () => ({
        delete: batchDeleteStub,
        commit: batchCommitStub,
      }),
    };

    const deleted = await cleanupExpiredHourlyTelemetry(mockDb, now);
    expect(cutoffUsed).to.equal('2026-11-13T12');
    expect(deleted).to.equal(2);
    expect(batchDeleteStub.callCount).to.equal(2);
    expect(batchCommitStub.calledOnce).to.equal(true);
  });

  it('computes 30-day active Human-vs-AI games (round_1 - finished - deleted) and all-time local totals', () => {
    const localStats = computeLocalGameStats(
      {
        viewsToday: 10,
        viewsLast24h: 10,
        viewsLast7d: 50,
        viewsLast30d: 120,
        viewsTotal: 500,
        pwaViewsTotal: 50,
        webViewsTotal: 450,
        routes: {},
        events: {
          quick_game_round_1: 35,
          quick_game_finished: 14,
          quick_game_deleted: 4,
        },
        referrers: {},
        dailySeries: [
          {
            // Older than 30-day window [2026-10-21 .. 2026-11-19] -> aged out of localActive
            date: '2026-10-10',
            totalViews: 40,
            webViews: 40,
            pwaViews: 0,
            routes: {},
            events: { quick_game_round_1: 15, quick_game_finished: 5, quick_game_deleted: 1 },
            referrers: {},
          },
          {
            date: '2026-10-25',
            totalViews: 30,
            webViews: 25,
            pwaViews: 5,
            routes: {},
            events: { quick_game_round_1: 12, quick_game_finished: 5, quick_game_deleted: 2 },
            referrers: {},
          },
          {
            date: '2026-11-19',
            totalViews: 10,
            webViews: 10,
            pwaViews: 0,
            routes: {},
            events: { quick_game_round_1: 8, quick_game_finished: 4, quick_game_deleted: 1 },
            referrers: {},
          },
        ],
      },
      '2026-11-19',
    );

    // 30d window: round1 = 12 + 8 = 20, finished = 5 + 4 = 9, deleted = 2 + 1 = 3 -> localActive = 20 - 9 - 3 = 8
    expect(localStats).to.deep.equal({
      localActive: 8,
      localPlayedTotal: 35,
      localFinishedTotal: 14,
    });
  });

  it('allows up to 300 telemetry requests per minute from a shared school NAT IP before returning 429', async () => {
    const setStub = sinon.stub().resolves();
    const mockDb: any = {
      collection: () => ({
        doc: () => ({ set: setStub }),
      }),
    };
    const createRes = () => ({
      statusCode: 200,
      body: null as any,
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
    });

    for (let i = 0; i < 300; i++) {
      const res = createRes();
      await handleTelemetryHttpRequest(
        {
          method: 'POST',
          headers: { 'user-agent': 'Mozilla/5.0 Chrome/126.0.0.0', 'x-forwarded-for': '203.0.113.42' },
          body: { views: { '/': 1 } },
        },
        res,
        mockDb,
      );
      expect(res.statusCode).to.equal(204);
    }

    const throttledRes = createRes();
    await handleTelemetryHttpRequest(
      {
        method: 'POST',
        headers: { 'user-agent': 'Mozilla/5.0 Chrome/126.0.0.0', 'x-forwarded-for': '203.0.113.42' },
        body: { views: { '/': 1 } },
      },
      throttledRes,
      mockDb,
    );
    expect(throttledRes.statusCode).to.equal(429);
  });
});

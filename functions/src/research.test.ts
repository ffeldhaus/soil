import { expect } from 'chai';
import * as sinon from 'sinon';
import { db, internalGetGameState, internalGetResearchGames, internalGetRoundData } from './index';
import {
  buildPublicResearchDataset,
  CSV_COLUMNS,
  checkPublicRateLimit,
  computeResearchSummary,
  formatResearchGamesAsCsv,
  handleResearchApiHttpRequest,
  handleResearchMcpHttpRequest,
  processMcpJsonRpc,
  resetRateLimitStore,
  sanitizeResearchGameForPublic,
} from './research.service';

describe('Public Research Service, API & MCP Server', () => {
  let sandbox: sinon.SinonSandbox;

  const sampleRawResearchGames = [
    {
      id: 'research_local-101',
      name: 'Original Secret Name',
      status: 'finished',
      currentRoundNumber: 2,
      migratedFrom: 'local-101',
      hostUid: 'secret-host-uid',
      hostEmail: 'secret@university.edu',
      settings: { length: 10, difficulty: 'normal', playerLabel: 'Team' },
      config: { numPlayers: 1, numRounds: 10, numAi: 1, advancedPricingEnabled: false },
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T11:00:00.000Z',
      players: {
        'player-research_local-101-1': {
          uid: 'player-research_local-101-1',
          displayName: 'Team 1',
          isAi: false,
          playerNumber: 1,
          capital: 120000,
          currentRound: 2,
          avgSoil: 102,
          avgNutrition: 98,
          history: [
            {
              number: 1,
              avgSoil: 101,
              avgNutrition: 99,
              decision: {
                machines: 1,
                organic: true,
                fertilizer: false,
                pesticide: false,
                organisms: true,
                parcels: { 0: 'Wheat', 1: 'Wheat', 2: 'Fieldbean', 3: 'Potato' },
              },
              result: {
                profit: 10000,
                capital: 110000,
                income: 25000,
                subsidies: 4000,
                expenses: { seeds: 5000, labor: 4000, running: 4000, investments: 2000, total: 15000 },
                events: { weather: 'Normal', vermin: [] },
              },
            },
            {
              number: 2,
              avgSoil: 102,
              avgNutrition: 98,
              decision: {
                machines: 1,
                organic: true,
                fertilizer: false,
                pesticide: false,
                organisms: false,
                parcels: { 0: 'Fieldbean', 1: 'Barley', 2: 'Wheat', 3: 'Oat' },
              },
              result: {
                profit: 10000,
                capital: 120000,
                income: 26000,
                subsidies: 4000,
                expenses: { seeds: 5000, labor: 5000, running: 4000, investments: 2000, total: 16000 },
                events: { weather: 'Drought', vermin: ['aphid', 'beetle'] },
              },
            },
          ],
        },
        'player-research_local-101-2': {
          uid: 'player-research_local-101-2',
          displayName: 'Team 2',
          isAi: true,
          aiLevel: 'middle',
          playerNumber: 2,
          capital: 95000,
          currentRound: 2,
          avgSoil: 94,
          avgNutrition: 90,
          history: [],
        },
      },
    },
    {
      id: 'research_cloud-202',
      name: 'Classroom Game',
      status: 'finished',
      currentRoundNumber: 1,
      migratedFrom: 'cloud-202',
      settings: { length: 15, difficulty: 'hard', playerLabel: 'Group' },
      config: { numPlayers: 2, numRounds: 15, numAi: 0, advancedPricingEnabled: true },
      createdAt: '2026-03-02T10:00:00.000Z',
      updatedAt: '2026-03-02T12:00:00.000Z',
      players: {
        'player-research_cloud-202-1': {
          uid: 'player-research_cloud-202-1',
          displayName: 'Team 1',
          isAi: false,
          playerNumber: 1,
          capital: 80000,
          currentRound: 1,
          avgSoil: 90,
          avgNutrition: 85,
          sustainabilityScore: 810,
          history: [
            {
              number: 1,
              avgSoil: 90,
              avgNutrition: 85,
              decision: {
                machines: 2,
                organic: false,
                fertilizer: true,
                pesticide: true,
                organisms: false,
                parcels: { 0: 'Corn', 1: 'Corn', 2: 'Beet', 3: 'Rapeseed' },
              },
              result: {
                profit: -20000,
                capital: 80000,
                income: 18000,
                subsidies: 1000,
                expenses: { seeds: 8000, labor: 10000, running: 10000, investments: 10000, total: 38000 },
                events: { weather: 'Flood', vermin: [] },
              },
            },
          ],
        },
      },
    },
  ];

  function stubResearchFirestore(games = sampleRawResearchGames) {
    const collectionStub = sandbox.stub(db, 'collection');

    const docs = games.map((g) => ({
      id: g.id,
      exists: true,
      data: () => g,
    }));

    const queryMock = {
      orderBy: sandbox.stub().returnsThis(),
      limit: sandbox.stub().returnsThis(),
      get: sandbox.stub().resolves({ empty: docs.length === 0, docs }),
    };

    const docStub = sandbox.stub().callsFake((docId: string) => {
      const found = games.find((g) => g.id === docId);
      return {
        id: docId,
        get: sandbox.stub().resolves({
          id: docId,
          exists: !!found,
          data: () => found,
        }),
        collection: sandbox
          .stub()
          .withArgs('rounds')
          .returns({
            get: sandbox.stub().resolves({
              docs: found
                ? [
                    {
                      data: () => ({
                        number: 1,
                        events: { weather: 'Normal', vermin: [] },
                        playerData: {
                          [Object.keys(found.players)[0]]: found.players[Object.keys(found.players)[0]].history[0],
                        },
                      }),
                    },
                  ]
                : [],
            }),
            doc: sandbox.stub().callsFake((roundDocId: string) => {
              const rNum = Number(String(roundDocId).replace('round_', ''));
              const firstPlayer = found ? found.players[Object.keys(found.players)[0]] : null;
              const roundObj = firstPlayer?.history?.find((h: any) => h.number === rNum) || firstPlayer?.history?.[0];
              return {
                get: sandbox.stub().resolves({
                  exists: !!roundObj,
                  data: () => ({
                    number: rNum,
                    playerData: firstPlayer ? { [firstPlayer.uid]: roundObj } : {},
                  }),
                }),
              };
            }),
          }),
      };
    });

    collectionStub.withArgs('research_games').returns({
      ...queryMock,
      doc: docStub,
    } as any);

    collectionStub.withArgs('system_insights').returns({
      orderBy: sandbox.stub().returns({
        limit: sandbox.stub().returns({
          get: sandbox.stub().resolves({
            empty: false,
            docs: [
              {
                data: () => ({
                  strategies: [{ name: 'Organic Right', description: 'Diverse rotation with legumes' }],
                  balancingReport: { summary: 'Balanced economy', issues: [], cropAnalysis: [] },
                  gameCount: 42,
                  createdAt: '2026-03-03T00:00:00.000Z',
                }),
              },
            ],
          }),
        }),
      }),
    } as any);

    return { collectionStub, docStub };
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    resetRateLimitStore();
  });

  afterEach(() => {
    sandbox.restore();
    resetRateLimitStore();
  });

  describe('sanitizeResearchGameForPublic', () => {
    it('strips migratedFrom and internal fields while deriving sourceType and sustainabilityScore', () => {
      const sanitized = sanitizeResearchGameForPublic(sampleRawResearchGames[0]);

      expect(sanitized.id).to.equal('research_local-101');
      expect(sanitized.name).to.equal('Anonymized Game');
      expect(sanitized.sourceType).to.equal('local');
      expect(sanitized).to.not.have.property('migratedFrom');
      expect(sanitized).to.not.have.property('hostUid');
      expect(sanitized).to.not.have.property('hostEmail');

      const p1 = sanitized.players['player-research_local-101-1'];
      expect(p1.displayName).to.equal('Team 1');
      expect(p1.sustainabilityScore).to.be.a('number');
      expect(p1.sustainabilityScore).to.be.greaterThan(1000);
    });

    it('derives cloud sourceType for multiplayer or cloud-migrated games', () => {
      const sanitized = sanitizeResearchGameForPublic(sampleRawResearchGames[1]);
      expect(sanitized.sourceType).to.equal('cloud');
      expect(sanitized).to.not.have.property('migratedFrom');
    });
  });

  describe('computeResearchSummary & buildPublicResearchDataset', () => {
    it('computes accurate aggregate statistics and crop shares across games', () => {
      const sanitizedGames = sampleRawResearchGames.map(sanitizeResearchGameForPublic);
      const summary = computeResearchSummary(sanitizedGames);

      expect(summary.totalGames).to.equal(2);
      expect(summary.totalHumanPlayers).to.equal(2);
      expect(summary.totalAiPlayers).to.equal(1);
      expect(summary.totalRoundsPlayed).to.equal(3);
      expect(summary.avgFinalCapital).to.equal(100000);
      expect(summary.avgFinalSoil).to.equal(96);
      expect(summary.avgFinalNutrition).to.equal(91.5);
      // 2 of 3 human round decisions were organic (66.7%)
      expect(summary.organicDecisionShare).to.equal(66.7);
      expect(summary.fertilizerDecisionShare).to.equal(33.3);
      expect(summary.pesticideDecisionShare).to.equal(33.3);
      expect(summary.organismsDecisionShare).to.equal(33.3);
      // 3 of 12 total human parcels were Wheat (25%)
      expect(summary.cropShares.Wheat).to.equal(25);
      expect(summary.difficultyBreakdown).to.deep.equal({ easy: 0, normal: 1, hard: 1 });
      expect(summary.sourceBreakdown).to.deep.equal({ local: 1, cloud: 1 });
    });

    it('filters dataset by difficulty, sourceType, and organicOnly', async () => {
      stubResearchFirestore();

      const allData = await buildPublicResearchDataset(db, { page: 1, pageSize: 10 });
      expect(allData.total).to.equal(2);
      expect(allData.latestInsight?.gameCount).to.equal(42);

      const organicData = await buildPublicResearchDataset(db, { organicOnly: true });
      expect(organicData.total).to.equal(1);
      expect(organicData.games[0].id).to.equal('research_local-101');

      const hardCloudData = await buildPublicResearchDataset(db, { difficulty: 'hard', sourceType: 'cloud' });
      expect(hardCloudData.total).to.equal(1);
      expect(hardCloudData.games[0].id).to.equal('research_cloud-202');
    });
  });

  describe('formatResearchGamesAsCsv', () => {
    it('formats games into RFC-4180 CSV with expected columns and values', () => {
      const csv = formatResearchGamesAsCsv(sampleRawResearchGames);
      const lines = csv.split('\n');

      expect(lines[0]).to.equal(CSV_COLUMNS.join(','));
      // 2 rounds from game 1 + 1 round from game 2 = 3 data rows + 1 header row
      expect(lines.length).to.equal(4);
      expect(lines[1]).to.include('research_local-101,local,normal,2,player-research_local-101-1,Team 1,false,1,true');
      expect(lines[2]).to.include('Drought,aphid;beetle');
    });
  });

  describe('Unauthenticated Read Access for research_games in getGameState & getRoundData', () => {
    it('allows unauthenticated getGameState and getRoundData for research_games while stripping migratedFrom', async () => {
      stubResearchFirestore();

      const stateResult = await internalGetGameState({
        data: { gameId: 'research_local-101' },
        auth: undefined,
      });

      expect(stateResult.game.id).to.equal('research_local-101');
      expect(stateResult.game).to.not.have.property('migratedFrom');
      expect(stateResult.playerState?.displayName).to.equal('Team 1');

      const roundResult = await internalGetRoundData({
        data: { gameId: 'research_local-101', roundNumber: 1 },
        auth: undefined,
      });
      expect(roundResult.number).to.equal(1);
      expect(roundResult.decision.organic).to.be.true;
    });

    it('rejects unauthenticated getGameState for normal games in the games collection', async () => {
      const { collectionStub } = stubResearchFirestore([]);
      collectionStub.withArgs('games').returns({
        doc: sandbox.stub().returns({
          get: sandbox.stub().resolves({ exists: true, data: () => ({ id: 'normal-game-1', players: {} }) }),
        }),
      } as any);

      try {
        await internalGetGameState({
          data: { gameId: 'normal-game-1' },
          auth: undefined,
        });
        expect.fail('Should have thrown unauthenticated error');
      } catch (err: any) {
        expect(err.code).to.equal('unauthenticated');
      }
    });

    it('allows unauthenticated getResearchGames callable with rate limiting', async () => {
      stubResearchFirestore();
      const res = await internalGetResearchGames({ data: { page: 1, pageSize: 10 } });
      expect(res.total).to.equal(2);
      expect(res.games[0]).to.not.have.property('migratedFrom');
      expect(res.summary.totalGames).to.equal(2);
    });
  });

  describe('Public Read-Only HTTP API (handleResearchApiHttpRequest)', () => {
    function createMockRes() {
      const headers: Record<string, string> = {};
      const res: any = {
        statusCode: 200,
        headers,
        body: undefined as any,
        setHeader(k: string, v: string) {
          headers[k] = v;
        },
        status(code: number) {
          res.statusCode = code;
          return res;
        },
        json(payload: any) {
          res.body = payload;
          return res;
        },
        send(payload: any) {
          res.body = payload;
          return res;
        },
      };
      return res;
    }

    it('serves JSON summary, single game trajectory, CSV export, and rejects non-GET requests', async () => {
      stubResearchFirestore();

      // 1. Non-GET rejected with 405
      const postRes = createMockRes();
      await handleResearchApiHttpRequest(db, { method: 'POST', query: {} }, postRes);
      expect(postRes.statusCode).to.equal(405);

      // 2. GET summary
      const summaryRes = createMockRes();
      await handleResearchApiHttpRequest(db, { method: 'GET', query: { difficulty: 'normal' } }, summaryRes);
      expect(summaryRes.statusCode).to.equal(200);
      expect(summaryRes.body.total).to.equal(1);
      expect(summaryRes.body.summary.totalGames).to.equal(1);

      // 3. GET single game with rounds
      const gameRes = createMockRes();
      await handleResearchApiHttpRequest(db, { method: 'GET', query: { gameId: 'research_local-101' } }, gameRes);
      expect(gameRes.statusCode).to.equal(200);
      expect(gameRes.body.game.id).to.equal('research_local-101');
      expect(gameRes.body.rounds).to.have.length(1);

      // 4. GET CSV export
      const csvRes = createMockRes();
      await handleResearchApiHttpRequest(db, { method: 'GET', query: { format: 'csv' } }, csvRes);
      expect(csvRes.statusCode).to.equal(200);
      expect(csvRes.headers['Content-Type']).to.include('text/csv');
      expect(csvRes.body).to.include('gameId,sourceType,difficulty');
    });

    it('enforces per-IP rate limiting', () => {
      for (let i = 0; i < 60; i++) {
        expect(checkPublicRateLimit('127.0.0.1', 60, 60_000).allowed).to.be.true;
      }
      expect(checkPublicRateLimit('127.0.0.1', 60, 60_000).allowed).to.be.false;
    });
  });

  describe('Public Stateless MCP Server (processMcpJsonRpc & handleResearchMcpHttpRequest)', () => {
    it('handles initialize, tools/list, tools/call, and resources/read', async () => {
      stubResearchFirestore();

      const initRes = await processMcpJsonRpc(db, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2024-11-05' },
      });
      expect(initRes.result.serverInfo.name).to.equal('soil-research-mcp');

      const toolsListRes = await processMcpJsonRpc(db, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      });
      expect(toolsListRes.result.tools).to.have.length(4);

      const summaryCallRes = await processMcpJsonRpc(db, {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'get_research_summary', arguments: {} },
      });
      expect(summaryCallRes.result.isError).to.be.false;
      const parsedSummary = JSON.parse(summaryCallRes.result.content[0].text);
      expect(parsedSummary.summary.totalGames).to.equal(2);

      const trajectoryCallRes = await processMcpJsonRpc(db, {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'get_research_game_trajectory', arguments: { gameId: 'research_local-101' } },
      });
      expect(trajectoryCallRes.result.isError).to.be.false;
      const parsedTrajectory = JSON.parse(trajectoryCallRes.result.content[0].text);
      expect(parsedTrajectory.game.id).to.equal('research_local-101');
      expect(parsedTrajectory.game).to.not.have.property('migratedFrom');

      const constantsCallRes = await processMcpJsonRpc(db, {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'get_game_constants_and_sources', arguments: { section: 'crops' } },
      });
      expect(constantsCallRes.result.isError).to.be.false;
      const parsedConstants = JSON.parse(constantsCallRes.result.content[0].text);
      expect(parsedConstants.crops).to.have.property('Wheat');

      const resourceReadRes = await processMcpJsonRpc(db, {
        jsonrpc: '2.0',
        id: 6,
        method: 'resources/read',
        params: { uri: 'soil://research/summary' },
      });
      expect(resourceReadRes.result.contents[0].uri).to.equal('soil://research/summary');

      // HTTP GET returns server metadata
      let httpStatus = 0;
      let httpBody: any = null;
      await handleResearchMcpHttpRequest(
        db,
        { method: 'GET', headers: {} },
        {
          setHeader: () => {},
          status(c: number) {
            httpStatus = c;
            return this;
          },
          json(b: any) {
            httpBody = b;
            return this;
          },
          send(b: any) {
            httpBody = b;
            return this;
          },
        },
      );
      expect(httpStatus).to.equal(200);
      expect(httpBody.name).to.equal('soil-research-mcp');
    });
  });
});

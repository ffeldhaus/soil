import { expect } from 'chai';
import * as sinon from 'sinon';
import {
  buildDefaultContinuationDecision,
  db,
  enforceCallableRateLimit,
  internalForceAdvanceRound,
  internalSubmitFeedback,
  internalUploadFinishedGame,
  sendWeeklyActivityDigest,
} from './index';
import { mailService } from './mail.service';
import { resetRateLimitStore } from './research.service';

describe('Upload Logic Security', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    resetRateLimitStore();
  });

  afterEach(() => {
    sandbox.restore();
    resetRateLimitStore();
  });

  it('should reject games without local- prefix', async () => {
    try {
      await internalUploadFinishedGame({
        gameData: {
          game: { id: 'cloud-123', players: { p1: {} } },
          allRounds: { p1: [] },
        },
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.code).to.equal('invalid-argument');
      expect(error.message).to.contain('Only local games can be uploaded');
    }
  });

  it('should reject games with too many players', async () => {
    const hugePlayers: Record<string, any> = {};
    for (let i = 0; i < 15; i++) {
      hugePlayers[`p${i}`] = { playerNumber: i };
    }

    try {
      await internalUploadFinishedGame({
        gameData: {
          game: { id: 'local-123', players: hugePlayers },
          allRounds: { p1: [] },
        },
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.code).to.equal('invalid-argument');
      expect(error.message).to.contain('Invalid player count');
    }
  });

  it('should reject games with too many rounds', async () => {
    try {
      await internalUploadFinishedGame({
        gameData: {
          game: {
            id: 'local-123',
            players: { p1: { playerNumber: 1 } },
            settings: { length: 150 },
          },
          allRounds: { p1: [] },
        },
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.code).to.equal('invalid-argument');
      expect(error.message).to.contain('Invalid round limit');
    }
  });

  it('should reject unfinished games', async () => {
    try {
      await internalUploadFinishedGame({
        gameData: {
          game: {
            id: 'local-123',
            players: { p1: { playerNumber: 1 } },
            settings: { length: 20 },
            currentRoundNumber: 5,
            status: 'in_progress',
          },
          allRounds: { p1: [] },
        },
      });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.code).to.equal('failed-precondition');
      expect(error.message).to.contain('Only finished games');
    }
  });

  it('should allow valid local finished games', async () => {
    // Mock Firestore for internalAnonymizeAndUploadForResearch
    const collectionStub = sandbox.stub(db, 'collection');
    collectionStub.withArgs('research_games').returns({
      where: sandbox
        .stub()
        .returns({ limit: sandbox.stub().returns({ get: sandbox.stub().resolves({ empty: true }) }) }),
      doc: sandbox.stub().returns({
        id: 'new-id',
        collection: sandbox.stub().returns({ doc: sandbox.stub().returns({ set: sandbox.stub().resolves() }) }),
      }),
    } as any);

    collectionStub.withArgs('system_metadata').returns({
      doc: sandbox.stub().returns({
        get: sandbox.stub().resolves({ exists: true, data: () => ({ gameCount: 0 }) }),
        set: sandbox.stub().resolves(),
      }),
    } as any);

    sandbox.stub(db, 'runTransaction').callsFake(async (callback) => {
      return await callback({
        set: sandbox.stub(),
        update: sandbox.stub(),
        get: sandbox.stub().resolves({ exists: true, data: () => ({ gameCount: 0 }) }),
      });
    });

    const result = await internalUploadFinishedGame({
      gameData: {
        game: {
          id: 'local-123',
          players: { p1: { uid: 'p1', playerNumber: 1, history: [] } },
          settings: { length: 20 },
          currentRoundNumber: 20,
          status: 'finished',
        },
        allRounds: { p1: Array(21).fill({ number: 0, result: { events: {} } }) },
      },
    });

    expect(result.success).to.be.true;
    expect(result.status).to.equal('uploaded');
  });

  it('should skip uploading test games or 100% Fallow click-through games to analytics', async () => {
    const testFlagResult = await internalUploadFinishedGame({
      gameData: {
        game: {
          id: 'local-test1',
          isTest: true,
          players: { p1: { uid: 'p1', playerNumber: 1, history: [] } },
          settings: { length: 10 },
          currentRoundNumber: 10,
          status: 'finished',
        },
        allRounds: { p1: Array(11).fill({ number: 1, result: { events: {} } }) },
      },
    });
    expect(testFlagResult.success).to.be.true;
    expect(testFlagResult.status).to.equal('skipped_test_data');

    const fallowParcels: Record<string, string> = {};
    for (let i = 0; i < 40; i++) fallowParcels[String(i)] = 'Fallow';

    const fallowClickThroughResult = await internalUploadFinishedGame({
      gameData: {
        game: {
          id: 'local-fallow1',
          players: { p1: { uid: 'p1', playerNumber: 1, isAi: false, history: [] } },
          settings: { length: 10 },
          currentRoundNumber: 10,
          status: 'finished',
        },
        allRounds: {
          p1: [
            { number: 0, decision: { parcels: {} } },
            ...Array(10).fill({ number: 1, decision: { parcels: fallowParcels }, result: { events: {} } }),
          ],
        },
      },
    });
    expect(fallowClickThroughResult.success).to.be.true;
    expect(fallowClickThroughResult.status).to.equal('skipped_test_data');
  });

  it('should store optional email in internalSubmitFeedback when provided and omit when anonymous', async () => {
    const savedDocs: any[] = [];
    const collectionStub = sandbox.stub(db, 'collection');
    collectionStub.withArgs('feedback').returns({
      doc: sandbox.stub().callsFake((id?: string) => ({
        id: id || 'fb-doc-1',
        set: sandbox.stub().callsFake(async (data: any) => {
          savedDocs.push(data);
        }),
        update: sandbox.stub().resolves(),
      })),
    } as any);
    collectionStub.withArgs('users').returns({
      where: sandbox.stub().returns({
        get: sandbox.stub().resolves({ docs: [] }),
      }),
    } as any);

    const sendEmailStub = sandbox.stub(mailService, 'sendEmail').resolves();

    await internalSubmitFeedback(
      { category: 'other', rating: 5, comment: '', email: 'lehrkraft@schule.de' },
      { uid: 'u1', token: { name: 'Frau Müller' } },
    );

    expect(savedDocs).to.have.lengthOf(1);
    expect(savedDocs[0].userEmail).to.equal('lehrkraft@schule.de');
    expect(savedDocs[0].userName).to.equal('Frau Müller');
    expect(sendEmailStub.calledOnce).to.be.true;
    expect(sendEmailStub.firstCall.args[0].text).to.contain('Contact Email: lehrkraft@schule.de');

    await internalSubmitFeedback({ category: 'other', rating: 4, comment: '' });
    expect(savedDocs).to.have.lengthOf(2);
    expect(savedDocs[1].userEmail).to.be.undefined;
    expect(sendEmailStub.secondCall.args[0].text).to.contain('Contact Email: Anonymous');
  });

  it('should aggregate 7-day metrics and send weekly digest email in sendWeeklyActivityDigest', async () => {
    const nowMs = Date.now();
    const recentTs = { toMillis: () => nowMs - 2 * 24 * 60 * 60 * 1000 };
    const oldTs = { toMillis: () => nowMs - 14 * 24 * 60 * 60 * 1000 };

    const collectionStub = sandbox.stub(db, 'collection');
    collectionStub.withArgs('research_games').returns({
      get: sandbox.stub().resolves({
        docs: [
          { data: () => ({ completedAt: recentTs, sourceType: 'local', settings: { difficulty: 'normal' } }) },
          { data: () => ({ completedAt: oldTs, sourceType: 'cloud', settings: { difficulty: 'hard' } }) },
        ],
      }),
    } as any);

    collectionStub.withArgs('games').returns({
      get: sandbox.stub().resolves({
        docs: [{ data: () => ({ status: 'in_progress', updatedAt: recentTs }) }],
      }),
    } as any);

    collectionStub.withArgs('feedback').returns({
      get: sandbox.stub().resolves({
        docs: [
          {
            data: () => ({
              status: 'new',
              rating: 5,
              category: 'other',
              comment: 'Tolles Spiel!',
              userEmail: 'lehrer@gymnasium.de',
              createdAt: recentTs,
            }),
          },
        ],
      }),
    } as any);

    collectionStub.withArgs('users').returns({
      where: sandbox.stub().callsFake((field: string) => ({
        get: sandbox.stub().resolves({
          docs: field === 'status' ? [{ data: () => ({ status: 'pending' }) }] : [],
        }),
      })),
    } as any);

    const sendEmailStub = sandbox.stub(mailService, 'sendEmail').resolves();

    const summary = await sendWeeklyActivityDigest();
    expect(summary.researchGamesLast7d).to.equal(1);
    expect(summary.gamesLast7d).to.equal(1);
    expect(summary.feedbackLast7d).to.equal(1);
    expect(sendEmailStub.calledOnce).to.be.true;
    expect(sendEmailStub.firstCall.args[0].subject).to.contain(
      '[SOIL] Wochenbericht: 1 abgeschlossene Spiele, 1 neues Feedback',
    );
    expect(sendEmailStub.firstCall.args[0].text).to.contain('lehrer@gymnasium.de');
  });

  it('should enforce per-IP rate limits on sensitive callables', () => {
    const req = { rawRequest: { ip: '198.51.100.42' } };
    for (let i = 0; i < 5; i++) {
      enforceCallableRateLimit(req, 'submitFeedback', 5);
    }
    try {
      enforceCallableRateLimit(req, 'submitFeedback', 5);
      expect.fail('Should have thrown resource-exhausted');
    } catch (err: any) {
      expect(err.code).to.equal('resource-exhausted');
    }
  });

  it('should build continuation decisions and force-advance round for host admin', async () => {
    const draftPlayer = {
      pendingDecisions: {
        machines: 2,
        organic: true,
        fertilizer: false,
        pesticide: false,
        organisms: true,
        parcels: { 0: 'Fieldbean', 1: 'Pea' },
      },
      history: [],
    };
    const contWithDraft = buildDefaultContinuationDecision(draftPlayer, {
      number: 0,
      parcelsSnapshot: Array.from({ length: 40 }, (_, i) => ({
        index: i,
        crop: i === 2 ? 'Wheat' : 'Fallow',
        soil: 100,
        nutrition: 100,
      })),
    } as any);
    expect(contWithDraft.machines).to.equal(2);
    expect(contWithDraft.organic).to.be.true;
    expect(contWithDraft.parcels[0]).to.equal('Fieldbean');
    expect(contWithDraft.parcels[2]).to.equal('Wheat');

    const idlePlayer = { history: [] };
    const contIdle = buildDefaultContinuationDecision(idlePlayer, {
      number: 0,
      parcelsSnapshot: Array.from({ length: 40 }, (_, i) => ({
        index: i,
        crop: i < 10 ? 'Barley' : 'Fallow',
        soil: 100,
        nutrition: 100,
      })),
    } as any);
    expect(contIdle.machines).to.equal(0);
    expect(contIdle.fertilizer).to.be.false;
    expect(contIdle.parcels[0]).to.equal('Barley');
    expect(contIdle.parcels[15]).to.equal('Fallow');

    // Non-host should be rejected by internalForceAdvanceRound
    const collectionStub = sandbox.stub(db, 'collection');
    collectionStub.withArgs('users').returns({
      doc: sandbox.stub().returns({
        get: sandbox.stub().resolves({ exists: false }),
      }),
    } as any);

    const mockGameRef = {
      id: 'game-force-1',
      collection: sandbox.stub().returns({
        doc: sandbox.stub().returns({}),
      }),
    };
    collectionStub.withArgs('games').returns({
      doc: sandbox.stub().returns(mockGameRef),
    } as any);

    sandbox.stub(db, 'runTransaction').callsFake(async (cb) => {
      const tx = {
        get: sandbox.stub().callsFake(async (ref: any) => {
          if (ref === mockGameRef) {
            return {
              exists: true,
              data: () => ({
                id: 'game-force-1',
                hostUid: 'teacher-1',
                currentRoundNumber: 0,
                settings: { length: 5, difficulty: 'normal' },
                players: {
                  'player-game-force-1-1': { uid: 'player-game-force-1-1', isAi: false, capital: 100000, history: [] },
                },
              }),
            };
          }
          return { exists: false };
        }),
        set: sandbox.stub(),
        update: sandbox.stub(),
      };
      return await cb(tx as any);
    });

    try {
      await internalForceAdvanceRound({
        data: { gameId: 'game-force-1' },
        auth: { uid: 'player-game-force-1-1', token: {} },
      });
      expect.fail('Non-host should not be able to force-advance round');
    } catch (err: any) {
      expect(err.code).to.equal('permission-denied');
    }

    const hostRes = await internalForceAdvanceRound({
      data: { gameId: 'game-force-1' },
      auth: { uid: 'teacher-1', token: {} },
    });
    expect(hostRes.status).to.equal('calculated');
    expect(hostRes.number).to.equal(1);
  });
});

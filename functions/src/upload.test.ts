import { expect } from 'chai';
import * as sinon from 'sinon';
import { db, internalSubmitFeedback, internalUploadFinishedGame, sendWeeklyActivityDigest } from './index';
import { mailService } from './mail.service';

describe('Upload Logic Security', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
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
});

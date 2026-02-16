import { expect } from 'chai';
import * as sinon from 'sinon';
import { db, internalUploadFinishedGame } from './index';

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
});

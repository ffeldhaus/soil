import { expect } from 'chai';
import * as sinon from 'sinon';
import { internalAnonymizeAndUploadForResearch, db } from './index';

describe('Sync and Research Upload', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should anonymize and upload finished game', async () => {
    const mockGame = {
      id: 'local-123',
      name: 'Secret Game Name',
      status: 'finished',
      currentRoundNumber: 1,
      players: {
        'player-1': { uid: 'player-1', displayName: 'Real Name', playerNumber: 1, history: [] }
      },
      createdAt: new Date().toISOString()
    };

    const mockRounds = {
      'player-1': [
        { number: 0, result: { events: { weather: 'Normal' } } },
        { number: 1, result: { events: { weather: 'Drought' } } }
      ]
    };

    // Mock Firestore
    const collectionStub = sandbox.stub(db, 'collection');
    const docStub = sandbox.stub();
    const whereStub = sandbox.stub();
    const limitStub = sandbox.stub();
    const getStub = sandbox.stub();
    const setStub = sandbox.stub();
    const runTransactionStub = sandbox.stub(db, 'runTransaction');

    collectionStub.withArgs('research_games').returns({
      where: whereStub,
      doc: docStub
    } as any);

    collectionStub.withArgs('system_metadata').returns({
      doc: sandbox.stub().returns({
        get: sandbox.stub().resolves({ data: () => ({ gameCount: 0 }) }),
        set: sandbox.stub().resolves()
      })
    } as any);

    whereStub.returns({ limit: limitStub } as any);
    limitStub.returns({ get: getStub } as any);
    getStub.resolves({ empty: true }); // Not already uploaded

    docStub.returns({
      id: 'target-game-id',
      collection: sandbox.stub().returns({
        doc: sandbox.stub().returns({
          set: sandbox.stub().resolves()
        })
      })
    } as any);
    
    runTransactionStub.callsFake(async (callback) => {
      const transaction = {
        set: setStub,
        update: sandbox.stub(),
        get: sandbox.stub().resolves({
          exists: true,
          data: () => ({ gameCount: 0 })
        })
      };
      return await callback(transaction);
    });

    const result = await internalAnonymizeAndUploadForResearch(mockGame, mockRounds as any);

    expect(result.success).to.be.true;
    expect(result.status).to.equal('uploaded');

    // Verify anonymization
    const uploadedGame = setStub.firstCall.args[1];
    expect(uploadedGame.name).to.equal('Anonymized Game');
    expect(uploadedGame.players['player-target-game-id-1'].displayName).to.equal('Anonymized Player');
    expect(uploadedGame.isResearchData).to.be.true;
    expect(uploadedGame.migratedFrom).to.equal('local-123');
  });

  it('should not upload if already migrated', async () => {
    const mockGame = { id: 'local-123' };
    
    const collectionStub = sandbox.stub(db, 'collection');
    const whereStub = sandbox.stub();
    const limitStub = sandbox.stub();
    const getStub = sandbox.stub();

    collectionStub.withArgs('research_games').returns({ where: whereStub } as any);
    whereStub.returns({ limit: limitStub } as any);
    limitStub.returns({ get: getStub } as any);
    getStub.resolves({ empty: false, docs: [{ id: 'existing-id' }] });

    const result = await internalAnonymizeAndUploadForResearch(mockGame);

    expect(result.success).to.be.true;
    expect(result.status).to.equal('already_uploaded');
  });

  it('should fetch rounds from DB for cloud games', async () => {
    const mockGame = {
      id: 'cloud-123',
      name: 'Cloud Game',
      status: 'finished',
      currentRoundNumber: 0,
      players: {
        'player-1': { uid: 'player-1', displayName: 'Real Name', playerNumber: 1, history: [] }
      }
    };

    const collectionStub = sandbox.stub(db, 'collection');
    const docStub = sandbox.stub();
    const whereStub = sandbox.stub();
    const limitStub = sandbox.stub();
    const getStub = sandbox.stub();
    const setStub = sandbox.stub();
    const runTransactionStub = sandbox.stub(db, 'runTransaction');

    const gameDocMock = {
      collection: sandbox.stub().returns({
        get: sandbox.stub().resolves({
          docs: [
            {
              data: () => ({
                number: 0,
                playerData: {
                  'player-1': { number: 0, result: { events: { weather: 'Normal' } } }
                }
              })
            }
          ]
        })
      })
    };

    collectionStub.withArgs('games').returns({ doc: sandbox.stub().withArgs('cloud-123').returns(gameDocMock) } as any);
    collectionStub.withArgs('research_games').returns({ where: whereStub, doc: docStub } as any);
    collectionStub.withArgs('system_metadata').returns({
      doc: sandbox.stub().returns({
        get: sandbox.stub().resolves({ exists: true, data: () => ({ gameCount: 0 }) }),
        set: sandbox.stub().resolves()
      })
    } as any);

    whereStub.returns({ limit: limitStub } as any);
    limitStub.returns({ get: getStub } as any);
    getStub.resolves({ empty: true });

    docStub.returns({
      id: 'target-game-id',
      collection: sandbox.stub().returns({
        doc: sandbox.stub().returns({ set: sandbox.stub().resolves() })
      })
    } as any);

    runTransactionStub.callsFake(async (callback) => {
      const transaction = {
        set: setStub,
        update: sandbox.stub(),
        get: sandbox.stub().resolves({ exists: true, data: () => ({ gameCount: 0 }) })
      };
      return await callback(transaction);
    });

    const result = await internalAnonymizeAndUploadForResearch(mockGame);

    expect(result.success).to.be.true;
    expect(result.status).to.equal('uploaded');
    expect(gameDocMock.collection.calledWith('rounds')).to.be.true;
    
    // Verify anonymized round data in transaction
    const roundData = setStub.secondCall.args[1];
    expect(roundData.playerData['player-target-game-id-1']).to.exist;
  });
});

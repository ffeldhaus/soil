import { GoogleGenAI } from '@google/genai';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { AiAgent } from './ai-agent';
import { GAME_CONSTANTS, GEMINI_MODEL } from './constants';
import { GameEngine } from './game-engine';
import { mailService } from './mail.service';
import type { Round } from './types';
import { generateRandomPassword } from './utils';

setGlobalOptions({
  region: 'europe-west4',
  serviceAccount: 'firebase-app-hosting-compute@soil-602ea.iam.gserviceaccount.com',
});

admin.initializeApp();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Initialize Vertex AI with the new @google/genai SDK
const ai = new GoogleGenAI({
  vertexai: true,
  project: 'soil-602ea',
  location: 'europe-west4',
});

// --- HTTP Callable Functions for Game Logic ---

// --- Sync and Game State ---

export const migrateLocalGame = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  const { gameData } = request.data;
  if (!gameData || !gameData.game || !gameData.allRounds) {
    throw new HttpsError('invalid-argument', 'Missing gameData');
  }

  const { game, allRounds } = gameData;
  const uid = request.auth.uid;
  const oldGameId = game.id;

  // 1. Check for existing migration
  const existingMigratedSnap = await db
    .collection('games')
    .where('migratedFrom', '==', oldGameId)
    .where('hostUid', '==', uid)
    .limit(1)
    .get();

  let targetGameId: string;
  let startRound = 0;

  if (!existingMigratedSnap.empty) {
    const existingGame = existingMigratedSnap.docs[0].data();
    if (game.currentRoundNumber <= (existingGame.currentRoundNumber || 0)) {
      return { success: true, gameId: existingMigratedSnap.docs[0].id, status: 'already_synced' };
    }
    targetGameId = existingMigratedSnap.docs[0].id;
    startRound = (existingGame.currentRoundNumber || 0) + 1;
  } else {
    targetGameId = db.collection('games').doc().id;
  }

  // 2. Map UIDs
  const oldHostUid =
    Object.keys(game.players).find((key) => game.players[key].playerNumber === 1) ||
    game.players[Object.keys(game.players)[0]]?.uid;

  if (!oldHostUid) throw new HttpsError('invalid-argument', 'Invalid local game state: no host player found');

  const uidMap: Record<string, string> = {};
  for (const playerUid in game.players) {
    if (playerUid === oldHostUid) {
      uidMap[playerUid] = uid;
    } else {
      const p = game.players[playerUid];
      const playerNum = p.playerNumber || playerUid.split('-').pop();
      uidMap[playerUid] = `player-${targetGameId}-${playerNum}`;
    }
  }

  // 3. Prepare Game Document
  const newPlayers: Record<string, any> = {};
  for (const oldUid in game.players) {
    const newUid = uidMap[oldUid];
    const p = game.players[oldUid];
    newPlayers[newUid] = {
      ...p,
      uid: newUid,
      hostUid: newUid === uid ? uid : undefined,
      joinedAt: Timestamp.now(),
      history: p.history.map((h: any) => ({
        ...h,
        parcelsSnapshot: [],
      })),
    };
  }

  const gameUpdate: any = {
    ...game,
    id: targetGameId,
    hostUid: uid,
    players: newPlayers,
    updatedAt: Timestamp.now(),
    migratedFrom: oldGameId,
    status: game.status || 'in_progress',
  };

  if (startRound === 0) {
    gameUpdate.createdAt = Timestamp.now();
  }

  // 4. Write in transaction
  await db.runTransaction(async (t) => {
    t.set(db.collection('games').doc(targetGameId), gameUpdate, { merge: true });

    // Write all rounds from startRound to currentRound
    const currentRound = game.currentRoundNumber || 0;
    for (let r = startRound; r <= currentRound; r++) {
      const playerData: Record<string, any> = {};
      let roundEvents = { weather: 'Normal', vermin: [] };

      for (const oldUid in allRounds) {
        const newUid = uidMap[oldUid];
        const round = allRounds[oldUid][r];
        if (round) {
          playerData[newUid] = round;
          if (round.result?.events) {
            roundEvents = round.result.events;
          }
        }
      }

      t.set(db.collection('games').doc(targetGameId).collection('rounds').doc(`round_${r}`), {
        number: r,
        playerData,
        events: roundEvents,
        createdAt: Timestamp.now(),
      });
    }
  });

  return { success: true, gameId: targetGameId, status: startRound === 0 ? 'created' : 'updated' };
});

export const uploadFinishedGame = onCall({ enforceAppCheck: true }, async (request) => {
  const { gameData } = request.data;
  if (!gameData || !gameData.game || !gameData.allRounds) {
    throw new HttpsError('invalid-argument', 'Missing gameData');
  }

  const { game, allRounds } = gameData;

  // 0. Respect Opt-Out
  if (game.config?.analyticsEnabled === false) {
    return { success: true, status: 'opted_out' };
  }

  const oldGameId = game.id;

  // 1. Basic validation
  const roundLimit = game.settings?.length || GAME_CONSTANTS.DEFAULT_ROUNDS;
  if (game.currentRoundNumber < roundLimit && game.status !== 'finished') {
    throw new HttpsError('failed-precondition', 'Only finished games can be uploaded via this endpoint');
  }

  // 2. Check if already uploaded
  const existingSnap = await db.collection('research_games').where('migratedFrom', '==', oldGameId).limit(1).get();

  if (!existingSnap.empty) {
    return { success: true, gameId: existingSnap.docs[0].id, status: 'already_uploaded' };
  }

  const targetGameId = db.collection('research_games').doc().id;

  // 3. Prepare anonymized game document
  // We remove any PII (displayName, game name)
  const anonymizedPlayers: Record<string, any> = {};
  const uidMap: Record<string, string> = {};

  for (const oldUid in game.players) {
    const p = game.players[oldUid];
    const newUid = `player-${targetGameId}-${p.playerNumber || oldUid.split('-').pop()}`;
    uidMap[oldUid] = newUid;

    anonymizedPlayers[newUid] = {
      ...p,
      uid: newUid,
      displayName: 'Anonymized Player', // Clear display name
      history: p.history.map((h: any) => ({
        ...h,
        parcelsSnapshot: [], // Lightweight history
      })),
    };
  }

  const gameDoc: any = {
    ...game,
    id: targetGameId,
    name: 'Anonymized Game', // Clear game name
    players: anonymizedPlayers,
    updatedAt: Timestamp.now(),
    createdAt: game.createdAt ? Timestamp.fromDate(new Date(game.createdAt)) : Timestamp.now(),
    migratedFrom: oldGameId,
    isResearchData: true,
  };

  // 4. Write in transaction
  await db.runTransaction(async (t) => {
    t.set(db.collection('research_games').doc(targetGameId), gameDoc);

    // Write all rounds
    const currentRound = game.currentRoundNumber || 0;
    for (let r = 0; r <= currentRound; r++) {
      const playerData: Record<string, any> = {};
      let roundEvents = { weather: 'Normal', vermin: [] };

      for (const oldUid in allRounds) {
        const newUid = uidMap[oldUid];
        const round = allRounds[oldUid][r];
        if (round) {
          playerData[newUid] = round;
          if (round.result?.events) {
            roundEvents = round.result.events;
          }
        }
      }

      t.set(db.collection('research_games').doc(targetGameId).collection('rounds').doc(`round_${r}`), {
        number: r,
        playerData,
        events: roundEvents,
        createdAt: Timestamp.now(),
      });
    }
  });

  return { success: true, gameId: targetGameId, status: 'uploaded' };
});

export const getGameState = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  const { gameId } = request.data;
  if (!gameId) throw new HttpsError('invalid-argument', 'Missing gameId');

  const gameRef = db.collection('games').doc(gameId);
  const gameSnap = await gameRef.get();
  if (!gameSnap.exists) throw new HttpsError('not-found', 'Game not found');

  const game = gameSnap.data()!;
  const uid = request.auth.uid;
  const playerState = game.players?.[uid];

  if (!playerState) throw new HttpsError('not-found', 'Player not found in this game');

  const currentRoundNum = game.currentRoundNumber || 0;

  // Fetch the full data for the last calculated round for this player
  let lastRound: Round | undefined;
  if (currentRoundNum >= 0) {
    const roundRef = gameRef.collection('rounds').doc(`round_${currentRoundNum}`);
    const roundSnap = await roundRef.get();
    if (roundSnap.exists) {
      const roundData = roundSnap.data();
      if (roundData?.playerData?.[uid]) {
        lastRound = roundData.playerData[uid];
      } else if (currentRoundNum === 0) {
        // Fallback for legacy round_0 or global round_0
        lastRound = roundData as Round;
      }
    }
  }

  return {
    game: {
      id: game.id,
      status: game.status,
      currentRoundNumber: game.currentRoundNumber,
      settings: game.settings,
      players: game.players,
    },
    playerState: {
      ...playerState,
      playerNumber: uid.startsWith('player-') ? uid.split('-')[2] : undefined,
      // history in playerState is already the lightweight version (parcelsSnapshot = [])
    },
    lastRound,
  };
});

export const getRoundData = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  const { gameId, roundNumber, targetUid } = request.data;
  if (!gameId || roundNumber === undefined) throw new HttpsError('invalid-argument', 'Missing gameId or roundNumber');

  const uid = targetUid || request.auth.uid;
  const roundRef = db.collection('games').doc(gameId).collection('rounds').doc(`round_${roundNumber}`);
  const roundSnap = await roundRef.get();

  if (!roundSnap.exists) throw new HttpsError('not-found', 'Round data not found');

  const data = roundSnap.data();
  if (data?.playerData?.[uid]) {
    return data.playerData[uid];
  } else if (roundNumber === 0) {
    return data; // Legacy/Global round 0
  }

  throw new HttpsError('not-found', 'No data for player in this round');
});

export const submitDecision = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
    const { gameId, decision } = request.data;
    const uid = request.auth.uid;

    if (!gameId || !decision) {
      throw new HttpsError('invalid-argument', 'Missing gameId or decision');
    }

    const gameRef = db.collection('games').doc(gameId);

    try {
      return await db.runTransaction(async (transaction) => {
        // 1. ALL READS FIRST
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists) throw new HttpsError('not-found', 'Game not found');
        const game = gameDoc.data()!;

        // 2. LOGIC
        const players = game.players || {};
        if (!players[uid]) {
          console.error(
            `submitDecision: User ${uid} not found in players map for game ${gameId}. Players: ${Object.keys(players).join(', ')}`,
          );
          throw new HttpsError('permission-denied', `Not a player in this game: ${uid}`);
        }

        const currentRound = game.currentRoundNumber || 0;
        const roundLimit = game.settings?.length || GAME_CONSTANTS.DEFAULT_ROUNDS;

        if (currentRound >= roundLimit) {
          throw new HttpsError('failed-precondition', 'Game has reached the round limit.');
        }

        players[uid].submittedRound = currentRound;
        players[uid].pendingDecisions = decision;

        // Process AI turns immediately (passes preloaded data to avoid internal reads)
        const updatedPlayers = (await internalProcessAiTurns(gameId, transaction, { ...game, players })) || players;

        const calculationResults = await checkAndPerformCalculation(
          gameId,
          transaction,
          { ...game, players: updatedPlayers },
          uid,
          decision,
        );
        if (calculationResults) {
          const myNewRound = calculationResults.playerRounds[uid];
          return { status: 'calculated', nextRound: myNewRound };
        }

        // 3. WRITES (only if not calculating, since calculation does its own update)
        transaction.update(gameRef, {
          players: updatedPlayers,
          updatedAt: Timestamp.now(),
        });

        return { status: 'submitted' };
      });
    } catch (error: any) {
      console.error('Error in submitDecision:', error);
      throw new HttpsError('internal', error.message || 'Internal Error');
    }
  },
);

async function checkAndPerformCalculation(
  gameId: string,
  transaction: admin.firestore.Transaction,
  game: any,
  _triggerUid?: string,
  fallbackDecision?: any,
) {
  const players = game.players || {};
  const currentRound = game.currentRoundNumber || 0;
  const allPlayersArr = Object.values(players);
  const allSubmitted = allPlayersArr.every((p: any) => p.submittedRound === currentRound);

  if (allSubmitted) {
    // We use the provided decision if available, or an empty object.
    // performCalculation prioritizes player.pendingDecisions anyway.
    return await performCalculation(gameId, fallbackDecision || {}, transaction, game);
  }
  return null;
}

async function performCalculation(
  gameId: string,
  decision: any,
  transaction: admin.firestore.Transaction,
  preloadedGame?: any,
) {
  const gameRef = db.collection('games').doc(gameId);
  const game = preloadedGame || (await transaction.get(gameRef)).data();
  if (!game) return null;

  const players = game.players || {};
  const currentRound = game.currentRoundNumber || 0;
  const roundLimit = game.settings?.length || GAME_CONSTANTS.DEFAULT_ROUNDS;

  if (currentRound >= roundLimit) {
    console.warn(`performCalculation: Game ${gameId} already at or above limit (${currentRound}/${roundLimit})`);
    return null;
  }

  const nextRoundNumber = currentRound + 1;

  const weatherRoll = Math.random();
  const weather =
    weatherRoll > 0.9
      ? 'SummerDrought'
      : weatherRoll > 0.8
        ? 'Drought'
        : weatherRoll > 0.7
          ? 'LateFrost'
          : weatherRoll < 0.1
            ? 'Flood'
            : weatherRoll < 0.2
              ? 'Storm'
              : 'Normal';

  const vermin: string[] = [];
  const pestRoll = Math.random();
  if (pestRoll > 0.8) {
    // 20% chance of at least one pest
    // Choose 1-3 random pests from the available ones
    const availablePests = [
      'aphid-black',
      'aphid-cereal',
      'potato-beetle',
      'corn-borer',
      'pollen-beetle',
      'pea-moth',
      'oat-rust',
      'nematode',
      'swine-fever',
    ];
    const numPests = Math.floor(Math.random() * 2) + 1; // 1-2 pests
    for (let i = 0; i < numPests; i++) {
      const p = availablePests[Math.floor(Math.random() * availablePests.length)];
      if (!vermin.includes(p)) vermin.push(p);
    }
  }

  const events = {
    weather,
    vermin,
  };

  // Fetch previous round data once for all players
  const prevRoundRef = gameRef.collection('rounds').doc(`round_${game.currentRoundNumber || 0}`);
  const prevRoundSnap = await transaction.get(prevRoundRef);
  const prevRoundGlobalData = prevRoundSnap.exists ? prevRoundSnap.data() : undefined;

  const allPlayerRounds: Record<string, Round> = {};
  const totalYields: Record<string, number> = {};
  const playerHarvests: Record<string, Record<string, number>> = {};

  // 1. First Pass: Calculate yields for all players to determine market prices
  for (const uid of Object.keys(players)) {
    const player = players[uid];
    const playerDecision = player.pendingDecisions || decision;

    let prevRoundData: Round | undefined;
    if (prevRoundGlobalData) {
      if (prevRoundGlobalData.playerData?.[uid]) {
        prevRoundData = prevRoundGlobalData.playerData[uid];
      } else if (game.currentRoundNumber === 0) {
        prevRoundData = prevRoundGlobalData as Round;
      }
    }

    // We do a "dry run" of calculateRound to get the yields
    const tempRound = GameEngine.calculateRound(
      nextRoundNumber,
      prevRoundData,
      playerDecision,
      events,
      0, // capital doesn't matter for yields
      game.settings?.length || GAME_CONSTANTS.DEFAULT_ROUNDS,
    );

    playerHarvests[uid] = tempRound.result?.harvestSummary || {};
    Object.entries(playerHarvests[uid]).forEach(([crop, amount]) => {
      totalYields[crop] = (totalYields[crop] || 0) + (amount as number);
    });
  }

  // 2. Calculate Market Prices if enabled
  let marketPrices: Record<string, { organic: number; conventional: number }> | undefined;
  if (game.config?.advancedPricingEnabled) {
    marketPrices = {};
    const numPlayers = Object.keys(players).length;

    Object.keys(GAME_CONSTANTS.CROPS).forEach((crop) => {
      const cropConfig = GAME_CONSTANTS.CROPS[crop];
      if (!cropConfig || crop === 'Fallow' || crop === 'Grass') return;

      const baseYieldPerPlayer = cropConfig.baseYield * 40; // 40 parcels
      const totalExpectedYield = baseYieldPerPlayer * numPlayers;
      const actualYield = totalYields[crop] || 0;

      let priceFactor = 1.0;
      if (totalExpectedYield > 0 && actualYield > 0) {
        const yieldRatio = actualYield / totalExpectedYield;
        priceFactor = 1.0 + (1.0 - yieldRatio) * 0.5;
        priceFactor = Math.max(0.7, Math.min(1.3, priceFactor));
      }

      marketPrices![crop] = {
        organic: Math.round(cropConfig.marketValue.organic * priceFactor * 10) / 10,
        conventional: Math.round(cropConfig.marketValue.conventional * priceFactor * 10) / 10,
      };
    });
  }

  // 3. Second Pass: Calculate full round results with market prices and subsidies
  for (const uid of Object.keys(players)) {
    const player = players[uid];
    const playerDecision = player.pendingDecisions || decision;

    let prevRoundData: Round | undefined;
    if (prevRoundGlobalData) {
      if (prevRoundGlobalData.playerData?.[uid]) {
        prevRoundData = prevRoundGlobalData.playerData[uid];
      } else if (game.currentRoundNumber === 0) {
        prevRoundData = prevRoundGlobalData as Round;
      }
    }

    const currentCapital = prevRoundData?.result?.capital ?? player.capital ?? 1000;

    const nextRound = GameEngine.calculateRound(
      nextRoundNumber,
      prevRoundData,
      playerDecision,
      events,
      currentCapital,
      roundLimit,
      {
        marketPrices,
      },
    );

    allPlayerRounds[uid] = nextRound;

    // Calculate player-specific averages
    const pAvgSoil = nextRound.parcelsSnapshot.reduce((sum, p) => sum + p.soil, 0) / nextRound.parcelsSnapshot.length;
    const pAvgNutrition =
      nextRound.parcelsSnapshot.reduce((sum, p) => sum + p.nutrition, 0) / nextRound.parcelsSnapshot.length;

    // Update player state with lightweight history
    const lightweightRound: Round = {
      ...nextRound,
      parcelsSnapshot: [], // Strip parcels for storage in main doc
    };

    player.history = player.history || [];
    player.history.push(lightweightRound);
    player.currentRound = nextRoundNumber;
    player.capital = nextRound.result?.capital; // Sync current capital
    player.avgSoil = Math.round(pAvgSoil);
    player.avgNutrition = Math.round(pAvgNutrition);

    // Reset pending decisions for next round (Firestore doesn't allow undefined)
    (player as any).pendingDecisions = undefined;
  }

  // Save full rounds to subcollection
  transaction.set(gameRef.collection('rounds').doc(`round_${nextRoundNumber}`), {
    number: nextRoundNumber,
    playerData: allPlayerRounds,
    events,
    createdAt: Timestamp.now(),
  });

  // Update game state (current round pointer and all players)
  const isFinished = nextRoundNumber >= roundLimit;

  transaction.update(gameRef, {
    currentRoundNumber: nextRoundNumber,
    status: isFinished ? 'finished' : game.status,
    players,
    updatedAt: Timestamp.now(),
  });
  return { number: nextRoundNumber, playerRounds: allPlayerRounds };
}

export const calculateNextRound = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const { gameId, decision } = request.data;
  if (!gameId || !decision) {
    throw new HttpsError('invalid-argument', 'Missing gameId or decision');
  }

  try {
    return await db.runTransaction(async (transaction) => {
      return await performCalculation(gameId, decision, transaction);
    });
  } catch (error: any) {
    console.error('Error in calculateNextRound:', error);
    throw new HttpsError('internal', error.message || 'Internal Error');
  }
});

export const setAdminRole = onCall(async (request) => {
  // Development helper: promote self to admin
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  await admin.auth().setCustomUserClaims(request.auth.uid, { role: 'admin' });
  return { success: true };
});

export const createGame = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const {
    name,
    // password, // Unused
    settings = { length: GAME_CONSTANTS.DEFAULT_ROUNDS, difficulty: 'normal', playerLabel: 'Player' },
    config = { numPlayers: 1, numRounds: GAME_CONSTANTS.DEFAULT_ROUNDS, numAi: 0, advancedPricingEnabled: false }, // Default config
    retentionDays = 90,
  } = request.data;

  // Rounds range check: 10 minimum, 50 maximum.
  const numRounds = Math.min(50, Math.max(10, config.numRounds || GAME_CONSTANTS.DEFAULT_ROUNDS));
  config.numRounds = numRounds;
  settings.length = numRounds;

  // Players range check: 1 minimum, 10 maximum.
  const numPlayers = Math.min(10, Math.max(1, config.numPlayers || 1));
  config.numPlayers = numPlayers;

  // Authorization & Quota Check
  const uid = request.auth.uid;
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  // For now, if user doc doesn't exist, we might allow creation if legacy?
  // No, strictly enforce new rules.
  // BUT checking for superadmin override in code for 'florian.feldhaus@gmail.com' not needed if data is correct.
  // However, for bootstrap, we need to handle the first user.

  let userRole = request.auth.token.role;
  let quota = 5;

  if (userSnap.exists) {
    const userData = userSnap.data();
    userRole = userData?.role || 'player';
    quota = userData?.quota || 5;
  } else {
    // Bootstrap: If email is florian.feldhaus@gmail.com, make superadmin
    if (request.auth.token.email === 'florian.feldhaus@gmail.com') {
      userRole = 'superadmin';
      quota = 999;
      // Auto-create user doc
      await userRef.set({
        uid,
        email: request.auth.token.email,
        role: 'superadmin',
        status: 'active',
        quota: 999,
        gameCount: 0,
        createdAt: Timestamp.now(),
      });
    } else if (request.auth.token.role === 'guest') {
      userRole = 'guest';
      quota = 100; // Increase guest quota significantly, basically "unlimited" for a single user
    }
  }

  // Determine if this is a "local" game (only 1 human player)
  const isLocalGame = config.numPlayers - config.numAi === 1;

  // Dynamic Quota Check (Skip for local games)
  if (!isLocalGame) {
    const activeGamesCountSnap = await db
      .collection('games')
      .where('hostUid', '==', uid)
      .where('deletedAt', '==', null)
      .count()
      .get();

    const currentActiveGames = activeGamesCountSnap.data().count;

    if (currentActiveGames >= quota) {
      throw new HttpsError(
        'resource-exhausted',
        `Game quota exceeded (${currentActiveGames}/${quota}). Request an increase or delete old games.`,
      );
    }
  }

  // Validate retention
  const validRetention = Math.min(Math.max(Number(retentionDays) || 90, 1), 365);

  const gameId = db.collection('games').doc().id;

  // For Guest/Local games, strictly enforce 1 human player
  if (userRole === 'guest') {
    config.numAi = numPlayers - 1;
  }

  // Ensure numAi does not exceed numPlayers - 1 (since host is always a player now)
  const numAi = Math.min(numPlayers - 1, Math.max(0, config.numAi || 0));
  config.numAi = numAi;

  // Generate secrets for all players
  const playerSecrets: Record<string, { password: string }> = {};
  for (let i = 1; i <= numPlayers; i++) {
    playerSecrets[String(i)] = { password: generateRandomPassword(4) };
  }

  const players: Record<string, any> = {};
  // Player 1 is ALWAYS the host
  const hostPlayerUid = `player-${gameId}-1`;
  players[hostPlayerUid] = {
    uid: hostPlayerUid,
    displayName: `${settings.playerLabel} 1`,
    isAi: false,
    playerNumber: 1,
    capital: 1000,
    currentRound: 0,
    history: [],
    joinedAt: Timestamp.now(),
    hostUid: uid, // Link to the actual auth user
  };

  // Remaining players are either AI or human placeholders
  for (let i = 2; i <= numPlayers; i++) {
    const pUid = `player-${gameId}-${i}`;
    const isAi = i > numPlayers - numAi;
    players[pUid] = {
      uid: pUid,
      displayName: `${settings.playerLabel} ${i}`,
      isAi: isAi,
      playerNumber: i,
      aiLevel: isAi ? config.aiLevel || 'middle' : undefined,
      capital: 1000,
      currentRound: 0,
      history: [],
    };
  }

  const newGame = {
    id: gameId,
    name: name || `Game ${gameId.substr(0, 6)}`,
    hostUid: uid,
    hostRole: userRole,
    status: 'waiting',
    currentRoundNumber: 0,
    settings,
    config,
    playerSecrets,
    players,
    retentionDays: validRetention,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    deletedAt: null,
  };

  await db.runTransaction(async (t) => {
    // Initialize Round 0 Metrics for all players
    const initialParcels = GameEngine.createInitialParcels();
    const startSoil = Math.round(initialParcels.reduce((sum, p) => sum + p.soil, 0) / initialParcels.length);
    const startNutrition = Math.round(initialParcels.reduce((sum, p) => sum + p.nutrition, 0) / initialParcels.length);

    const lightweightRound0 = {
      number: 0,
      parcelsSnapshot: [],
      avgSoil: startSoil,
      avgNutrition: startNutrition,
    };

    const playerData: Record<string, any> = {};

    for (const uid of Object.keys(newGame.players)) {
      newGame.players[uid].avgSoil = startSoil;
      newGame.players[uid].avgNutrition = startNutrition;
      newGame.players[uid].history = [lightweightRound0];
      playerData[uid] = {
        number: 0,
        parcelsSnapshot: initialParcels,
        avgSoil: startSoil,
        avgNutrition: startNutrition,
      };
    }

    // Auto-process AI turns for the first round BEFORE any writes
    await internalProcessAiTurns(gameId, t, newGame);

    t.set(db.collection('games').doc(gameId), newGame);

    // Initialize Round 0 Doc using the new format
    await t.set(db.collection('games').doc(gameId).collection('rounds').doc('round_0'), {
      number: 0,
      playerData,
      createdAt: Timestamp.now(),
    });

    // Increment User Game Count
    if (userSnap.exists) {
      // Only increment if user doc exists (which it should for admins)
      t.update(userRef, { gameCount: admin.firestore.FieldValue.increment(1) });
    }
  });

  return {
    gameId,
    password: playerSecrets['1']?.password,
  };
});

// --- Helper for AI Automation ---

async function internalProcessAiTurns(gameId: string, transaction: admin.firestore.Transaction, preloadedGame?: any) {
  const game = preloadedGame || (await transaction.get(db.collection('games').doc(gameId))).data();
  if (!game) return null;

  const players = game.players || {};
  const currentRound = game.currentRoundNumber || 0;

  for (const uid in players) {
    const p = players[uid];
    if (p.isAi && (p.submittedRound === undefined || p.submittedRound < currentRound)) {
      // Use player's own history for decision context
      const lastRound = p.history && p.history.length > 0 ? p.history[p.history.length - 1] : undefined;
      const decision = AiAgent.makeDecision((p.aiLevel || 'middle') as any, lastRound);
      p.submittedRound = currentRound;
      p.pendingDecisions = decision;
    }
  }

  return players;
}

// --- User Management ---

export const submitOnboarding = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { firstName, lastName } = request.data;
    const email = request.auth.token.email || '';

    // Check Banned Emails
    const bannedSnap = await db.collection('banned_emails').doc(email).get();
    if (bannedSnap.exists) {
      console.warn(`submitOnboarding: Email ${email} is banned.`);
      throw new HttpsError('permission-denied', 'This email is banned from registration.');
    }

    // Basic Validation
    if (!firstName || !lastName) {
      console.warn(`submitOnboarding: Missing fields for ${email}.`, request.data);
      throw new HttpsError('invalid-argument', 'Missing fields');
    }

    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);

    const userData = {
      uid,
      email,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      role: 'admin',
      status: 'active',
      quota: 5,
      gameCount: 0,
      createdAt: Timestamp.now(),
    };

    await userRef.set(userData, { merge: true });

    // Notify System-Administrator
    const adminEmail = 'florian.feldhaus@gmail.com';
    try {
      await mailService.sendAdminNewRegistrationNotification(adminEmail, userData);
    } catch (e) {
      console.error('submitOnboarding: Failed to send admin notification', e);
    }

    return { success: true };
  },
);

export const manageAdmin = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    // System-Administrator Check
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();

    // Allow hardcoded superadmin for bootstrap
    const isSuper =
      (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
      request.auth.token.email === 'florian.feldhaus@gmail.com';

    if (!isSuper) {
      throw new HttpsError('permission-denied', 'System-Administratoren only');
    }

    const { targetUid, action, value } = request.data;
    if (!targetUid || !action) throw new HttpsError('invalid-argument', 'Missing args');

    const targetRef = db.collection('users').doc(targetUid);
    const updates: any = {};

    if (action === 'setQuota') {
      updates.quota = Number(value);
    } else if (action === 'ban') {
      // Full Ban
      updates.status = 'banned';
      updates.role = 'banned'; // Revoke admin privileges

      const targetDoc = await targetRef.get();
      const targetEmail = targetDoc.data()?.email;
      if (targetEmail) {
        await db.collection('banned_emails').doc(targetEmail).set({
          bannedAt: Timestamp.now(),
          bannedBy: request.auth.uid,
          reason: 'Banned by System-Administrator',
        });
      }
    } else if (action === 'delete') {
      // Cascade delete all games owned by this user
      const gamesSnapshot = await db.collection('games').where('hostUid', '==', targetUid).get();

      for (const gameDoc of gamesSnapshot.docs) {
        await db.recursiveDelete(gameDoc.ref);
      }

      // Delete User Document and Auth
      await db.recursiveDelete(targetRef);
      try {
        await admin.auth().deleteUser(targetUid);
      } catch (e) {
        console.warn('Failed to delete auth user, might already be gone', e);
      }
      return { success: true };
    }

    await targetRef.update(updates);

    // Sync custom claims
    if (updates.role) {
      await admin.auth().setCustomUserClaims(targetUid, { role: updates.role });
    }

    return { success: true };
  },
);

export const getUserStatus = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  const userRef = db.collection('users').doc(request.auth.uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    // Bootstrap Check
    if (request.auth.token.email === 'florian.feldhaus@gmail.com') {
      return { role: 'superadmin', status: 'active', quota: 999, gameCount: 0 };
    }
    return { role: 'new', status: 'unknown', gameCount: 0 };
  }

  const userData = doc.data();

  // Dynamic Count
  const activeGamesCountSnap = await db
    .collection('games')
    .where('hostUid', '==', request.auth.uid)
    .where('deletedAt', '==', null)
    .count()
    .get();

  return { ...userData, gameCount: activeGamesCountSnap.data().count };
});

export const getSystemStats = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  // Super Check
  const callerRef = db.collection('users').doc(request.auth.uid);
  const callerSnap = await callerRef.get();
  const isSuper =
    (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
    request.auth.token.email === 'florian.feldhaus@gmail.com';

  if (!isSuper) throw new HttpsError('permission-denied', 'System-Administratoren only');

  // Aggregations
  const gamesColl = db.collection('games');
  const usersColl = db.collection('users');

  const totalGamesSnap = await gamesColl.count().get();
  const deletedGamesSnap = await gamesColl.where('deletedAt', '!=', null).count().get();

  // For users, we want specific role counts
  const totalUsersSnap = await usersColl.count().get();
  const adminUsersSnap = await usersColl.where('role', 'in', ['admin', 'superadmin']).count().get();
  const rejectedUsersSnap = await usersColl.where('role', '==', 'rejected').count().get();
  const bannedUsersSnap = await usersColl.where('role', '==', 'banned').count().get();

  return {
    games: {
      total: totalGamesSnap.data().count,
      deleted: deletedGamesSnap.data().count,
      active: totalGamesSnap.data().count - deletedGamesSnap.data().count,
    },
    users: {
      total: totalUsersSnap.data().count,
      admins: adminUsersSnap.data().count,
      rejected: rejectedUsersSnap.data().count,
      banned: bannedUsersSnap.data().count,
    },
  };
});

export const getAllAdmins = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  // System Check
  const callerRef = db.collection('users').doc(request.auth.uid);
  const callerSnap = await callerRef.get();
  const isSuper =
    (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
    request.auth.token.email === 'florian.feldhaus@gmail.com';

  if (!isSuper) throw new HttpsError('permission-denied', 'System-Administratoren only');

  const snap = await db.collection('users').get();
  return snap.docs.map((d) => d.data());
});

export const getAdminGames = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const { page = 1, pageSize = 10, showDeleted = false, targetUid } = request.data;
  const offset = (page - 1) * pageSize;

  let searchUid = request.auth.uid;

  // Super Admin Override
  if (targetUid && targetUid !== request.auth.uid) {
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();
    const isSuper =
      (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
      request.auth.token.email === 'florian.feldhaus@gmail.com';

    if (!isSuper) {
      throw new HttpsError('permission-denied', 'Only System-Administratoren can view other users games.');
    }
    searchUid = targetUid;
  }

  // Return games hosted by the target user
  let query = db.collection('games').where('hostUid', '==', searchUid);

  if (showDeleted) {
    query = query.where('deletedAt', '!=', null).orderBy('deletedAt', 'desc');
  } else {
    query = query.where('deletedAt', '==', null).orderBy('createdAt', 'desc');
  }

  try {
    const snapshot = await query.limit(pageSize).offset(offset).get();

    // Get total count for pagination UI
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    const games = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: d.id,
        name: d.name,
        password: d.password, // Legacy support
        playerSecrets: d.playerSecrets, // New per-player secrets
        config: d.config,
        status: d.status,
        createdAt: d.createdAt?.toDate().toISOString(),
        players: d.players,
        currentRoundNumber: d.currentRoundNumber,
        retentionDays: d.retentionDays,
        deletedAt: d.deletedAt ? d.deletedAt.toDate().toISOString() : null,
      };
    });

    return { games, total };
  } catch (error: any) {
    console.error('Error fetching admin games:', error);
    // Expose index errors for debugging
    if (error.code === 9 && error.message.includes('index')) {
      throw new HttpsError('failed-precondition', `Missing Index: ${error.message}`);
    }
    throw new HttpsError('internal', error.message || 'Unknown error fetching games');
  }
});

export const updatePlayerType = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const { gameId, playerNumber, type, aiLevel } = request.data;

    if (!gameId || !playerNumber || !type) {
      throw new HttpsError('invalid-argument', 'Missing arguments');
    }

    if (playerNumber < 1 || playerNumber > 10) {
      throw new HttpsError('invalid-argument', 'Invalid player number (max 10)');
    }

    const gameRef = db.collection('games').doc(gameId);
    const callerRef = db.collection('users').doc(request.auth.uid);
    const uid = `player-${gameId}-${playerNumber}`;

    await db.runTransaction(async (t) => {
      // 1. ALL READS FIRST
      const [doc, callerSnap] = await Promise.all([t.get(gameRef), t.get(callerRef)]);

      if (!doc.exists) throw new HttpsError('not-found', 'Game not found');

      const game = doc.data()!;
      const isSuper =
        callerSnap.exists &&
        (callerSnap.data()?.role === 'superadmin' || request.auth?.token.email === 'florian.feldhaus@gmail.com');

      if (game.hostUid !== request.auth?.uid && !isSuper) {
        throw new HttpsError('permission-denied', 'Not your game');
      }

      // 2. LOGIC
      const players = game.players || {};
      const existingPlayer = players[uid];

      if (type === 'ai') {
        players[uid] = {
          ...(existingPlayer || {}),
          uid: uid,
          displayName: existingPlayer?.displayName || `KI Team ${playerNumber}`,
          isAi: true,
          playerNumber: playerNumber,
          aiLevel: aiLevel || 'middle',
          capital: existingPlayer?.capital ?? 1000,
          currentRound: existingPlayer?.currentRound ?? 0,
          history: existingPlayer?.history ?? [],
        };
      } else {
        // Convert to Human
        if (existingPlayer) {
          players[uid].isAi = false;
          players[uid].aiLevel = undefined;
          players[uid].displayName = `Team ${playerNumber}`;
          players[uid].playerNumber = playerNumber;
        } else {
          players[uid] = {
            uid,
            displayName: `Team ${playerNumber}`,
            isAi: false,
            playerNumber: playerNumber,
            capital: 1000,
            currentRound: 0,
            history: [],
          };
        }
      }

      // If changed to AI, auto-process turn (modifies players object)
      if (type === 'ai') {
        const updatedPlayers = (await internalProcessAiTurns(gameId, t, { ...game, players })) || players;
        // Check if this AI turn completes the round
        const calculationPerformed = await checkAndPerformCalculation(gameId, t, { ...game, players: updatedPlayers });

        if (!calculationPerformed) {
          t.update(gameRef, {
            players: updatedPlayers,
            updatedAt: Timestamp.now(),
          });
        }
      } else {
        // 3. WRITES
        t.update(gameRef, {
          players,
          updatedAt: Timestamp.now(),
        });
      }
    });

    return { success: true };
  },
);

export const deleteGames = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const { gameIds, force } = request.data;
  if (!Array.isArray(gameIds) || gameIds.length === 0) {
    throw new HttpsError('invalid-argument', 'No game IDs provided');
  }

  // Check if System-Administrator
  const callerRef = db.collection('users').doc(request.auth.uid);
  const callerSnap = await callerRef.get();
  const isSuper =
    (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
    request.auth.token.email === 'florian.feldhaus@gmail.com';

  // Process deletions
  const batch = db.batch();
  let batchCount = 0;
  const maxBatch = 500;

  for (const gameId of gameIds) {
    const gameRef = db.collection('games').doc(gameId);
    const doc = await gameRef.get();

    if (doc.exists) {
      const isOwner = doc.data()?.hostUid === request.auth.uid;

      if (isOwner || isSuper) {
        if (force) {
          // Hard Delete
          await db.recursiveDelete(gameRef);
        } else {
          // Soft Delete
          batch.update(gameRef, {
            deletedAt: Timestamp.now(),
            status: 'deleted',
          });
          batchCount++;

          if (batchCount >= maxBatch) {
            await batch.commit();
            batchCount = 0;
          }
        }
      } else {
        console.warn(`Skipping delete for ${gameId}: Not owner and not system-administrator.`);
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { success: true };
});

export const undeleteGames = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const { gameIds } = request.data;
  if (!Array.isArray(gameIds) || gameIds.length === 0) {
    throw new HttpsError('invalid-argument', 'No game IDs provided');
  }

  const batch = db.batch();
  let batchCount = 0;

  for (const gameId of gameIds) {
    const gameRef = db.collection('games').doc(gameId);
    const doc = await gameRef.get();
    if (doc.exists && doc.data()?.hostUid === request.auth.uid) {
      batch.update(gameRef, { deletedAt: null, status: 'waiting' }); // Or restore previous status? 'waiting'/ 'active' is safe.
      batchCount++;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { success: true };
});

// europe-west4 does not support Cloud Scheduler, so we use europe-west3 for scheduled functions
export const dailyGamePurge = onSchedule({ schedule: 'every 24 hours', region: 'europe-west3' }, async (_event) => {
  const now = Timestamp.now();
  const nowMillis = now.toMillis();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const thirtyDaysMs = 30 * oneDayMs;

  // 1. Soft delete expired games
  // We need to find games where createdAt < now - retentionDays.
  // Since retentionDays varies per game, we can't do a simple query index easily unless we store "expiresAt".
  // Efficient Approach: Query ALL Active games (deletedAt == null) and check locally (if dataset small) OR
  // Better: We SHOULD verify if we can query strictly.
  // For this implementation, let's iterate active games. If scale is huge, we'd need 'expiresAt' field.
  // OPTIMIZATION for V2: Add 'expiresAt' field to Game.
  // Current: Iterate "active" games. Limit to chunks if needed.
  // Assuming < 10k games for now.

  // Actually, let's fetch 'games' where 'deletedAt' == null.
  // This might be large.
  // To enable efficient querying, we really should compute 'expiresAt' at creation.
  // But since we didn't add that, let's do a stream.

  const activeGamesSnap = await db.collection('games').where('deletedAt', '==', null).get();
  const softDeleteBatch = db.batch();
  let softDelCount = 0;

  activeGamesSnap.forEach((doc) => {
    const data = doc.data();
    const retentionDays = data.retentionDays || 90;
    // Use updatedAt if available, otherwise fallback to createdAt
    const lastPlayed = (data.updatedAt || data.createdAt).toMillis();
    const expiresAt = lastPlayed + retentionDays * oneDayMs;

    if (nowMillis > expiresAt) {
      softDeleteBatch.update(doc.ref, {
        deletedAt: now,
        status: 'expired',
      });
      softDelCount++;
    }
  });

  if (softDelCount > 0) {
    await softDeleteBatch.commit();
  }

  // 2. Hard delete old soft-deleted games
  // deletedAt < now - 30 days
  const purgeThreshold = Timestamp.fromMillis(nowMillis - thirtyDaysMs);
  const trashSnap = await db.collection('games').where('deletedAt', '<', purgeThreshold).get();

  for (const doc of trashSnap.docs) {
    await db.recursiveDelete(doc.ref);
  }

  // 3. Purge unverified admin registrations
  // Admin users older than 24h who haven't verified their email
  const adminUsersSnap = await db.collection('users').where('role', '==', 'admin').get();

  for (const doc of adminUsersSnap.docs) {
    const userData = doc.data();
    const createdAt = userData.createdAt?.toMillis() || 0;

    if (nowMillis - createdAt > oneDayMs) {
      try {
        const authUser = await admin.auth().getUser(doc.id);
        if (!authUser.emailVerified) {
          await db.recursiveDelete(doc.ref);
          await admin.auth().deleteUser(doc.id);
        }
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          await db.recursiveDelete(doc.ref);
        } else {
          console.error(`Failed to check/purge user ${doc.id}:`, error);
        }
      }
    }
  }
});

export const playerLogin = onCall(async (request) => {
  const { gameId, password } = request.data;
  if (!gameId || !password) {
    throw new HttpsError('invalid-argument', 'Missing gameId, or password');
  }

  const gameDoc = await db.collection('games').doc(gameId).get();
  if (!gameDoc.exists) {
    throw new HttpsError('not-found', 'Game not found');
  }

  const game = gameDoc.data();
  const playerSecrets = game?.playerSecrets || {};

  // playerSecrets is { "1": { password: "PIN1" }, "2": { password: "PIN2" }, ... }
  const playerNumber = Object.keys(playerSecrets).find((key) => playerSecrets[key]?.password === password);

  if (!playerNumber) {
    throw new HttpsError('permission-denied', 'Incorrect PIN');
  }

  // Construct deterministic UID for the player
  const uid = `player-${gameId}-${playerNumber}`;

  try {
    const customToken = await admin.auth().createCustomToken(uid, {
      gameId,
      role: 'player',
      playerNumber,
    });
    return { customToken };
  } catch (error: any) {
    console.error('Token creation error:', error);
    throw new HttpsError('internal', `Failed to create token: ${error.message}`);
  }
});

export const triggerAiTurn = onCall(async (request) => {
  const { gameId, level = 'rotation' } = request.data;
  // Logic to fetch game state, run AiAgent.makeDecision, and then call calculateRound logic (or return decision)

  // For now, just return a decision
  const gameRef = db.collection('games').doc(gameId);
  const roundsRef = gameRef.collection('rounds');
  const roundsSnap = await roundsRef.orderBy('number', 'desc').limit(1).get();
  const lastRound = roundsSnap.docs[0]?.data() as Round | undefined;

  return AiAgent.makeDecision(level as any, lastRound);
});

export const submitFeedback = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { category, rating, comment } = request.data;
    if (!category || rating === undefined || !comment) {
      throw new HttpsError('invalid-argument', 'Missing feedback fields');
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email || '';
    const name = request.auth.token.name || email;

    const feedbackId = db.collection('feedback').doc().id;
    const feedbackRef = db.collection('feedback').doc(feedbackId);

    const feedbackData: any = {
      id: feedbackId,
      userId: uid,
      userEmail: email,
      userName: name,
      category,
      rating,
      comment,
      status: 'new',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // 1. Save feedback
    await feedbackRef.set(feedbackData);

    // 2. Perform AI Analysis with Gemini
    try {
      const prompt = `
        Analyze the following feedback from a user of the SOIL agricultural simulation game.
        User: ${name} (${email})
        Category: ${category}
        Rating: ${rating}/5
        Comment: ${comment}

        Provide a JSON response with the following fields:
        - summary: A concise summary of the feedback.
        - suggestedActions: A list of 2-3 actionable steps for the development team.
        - sentiment: One of 'positive', 'neutral', 'negative'.
      `;

      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (responseText) {
        const analysis = JSON.parse(responseText);
        await feedbackRef.update({
          aiAnalysis: analysis,
          updatedAt: Timestamp.now(),
        });
        feedbackData.aiAnalysis = analysis;
      }
    } catch (error) {
      console.error('Gemini analysis failed:', error);
    }

    // 3. Notify Super Admins
    const superAdminsSnap = await db.collection('users').where('role', '==', 'superadmin').get();
    const superAdminEmails = superAdminsSnap.docs.map((doc) => doc.data().email).filter((e) => !!e);

    // Also include the hardcoded super admin
    if (!superAdminEmails.includes('florian.feldhaus@gmail.com')) {
      superAdminEmails.push('florian.feldhaus@gmail.com');
    }

    const notificationSubject = `New Feedback Received: ${category} (${rating}/5)`;
    const notificationText = `New feedback from ${name} (${email}):\n\nCategory: ${category}\nRating: ${rating}/5\nComment: ${comment}\n\nAI Analysis:\nSummary: ${feedbackData.aiAnalysis?.summary || 'N/A'}\nSentiment: ${feedbackData.aiAnalysis?.sentiment || 'N/A'}\nSuggested Actions: ${(feedbackData.aiAnalysis?.suggestedActions || []).join(', ')}`;

    const notificationHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">New Feedback Received</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Rating:</strong> ${rating}/5</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;">${comment}</p>
        </div>
        ${
          feedbackData.aiAnalysis
            ? `
          <h3 style="color: #10b981;">Gemini Analysis</h3>
          <p><strong>Sentiment:</strong> ${feedbackData.aiAnalysis.sentiment}</p>
          <p><strong>Summary:</strong> ${feedbackData.aiAnalysis.summary}</p>
          <p><strong>Suggested Actions:</strong></p>
          <ul>
            ${feedbackData.aiAnalysis.suggestedActions.map((a: string) => `<li>${a}</li>`).join('')}
          </ul>
        `
            : ''
        }
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">View this feedback in the Super Admin Dashboard.</p>
      </div>
    `;

    for (const adminEmail of superAdminEmails) {
      try {
        await mailService.sendEmail({
          to: adminEmail,
          subject: notificationSubject,
          text: notificationText,
          html: notificationHtml,
        });
      } catch (e) {
        console.error(`Failed to notify super admin ${adminEmail}:`, e);
      }
    }

    return { success: true };
  },
);

export const getAllFeedback = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  // Super Admin Check
  const callerRef = db.collection('users').doc(request.auth.uid);
  const callerSnap = await callerRef.get();
  const isSuper =
    (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
    request.auth.token.email === 'florian.feldhaus@gmail.com';

  if (!isSuper) throw new HttpsError('permission-denied', 'Super-Administratoren only');

  const feedbackSnap = await db.collection('feedback').orderBy('createdAt', 'desc').get();
  return feedbackSnap.docs.map((doc) => doc.data());
});

export const updateRoundDeadline = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  const { gameId, roundNumber, deadline } = request.data;
  if (!gameId || roundNumber === undefined) throw new HttpsError('invalid-argument', 'Missing gameId or roundNumber');

  const gameRef = db.collection('games').doc(gameId);
  const gameSnap = await gameRef.get();
  if (!gameSnap.exists) throw new HttpsError('not-found', 'Game not found');
  if (gameSnap.data()?.hostUid !== request.auth.uid) throw new HttpsError('permission-denied', 'Not your game');

  const deadlines = gameSnap.data()?.roundDeadlines || {};
  if (deadline) {
    deadlines[roundNumber] = Timestamp.fromDate(new Date(deadline));
  } else {
    delete deadlines[roundNumber];
  }

  await gameRef.update({ roundDeadlines: deadlines });
  return { success: true };
});

// europe-west4 does not support Cloud Scheduler, so we use europe-west3 for scheduled functions
export const processDeadlines = onSchedule({ schedule: 'every 1 minutes', region: 'europe-west3' }, async (_event) => {
  const now = Timestamp.now();

  // Find games in progress
  const activeGames = await db.collection('games').where('status', '==', 'in_progress').get();

  for (const gameDoc of activeGames.docs) {
    const game = gameDoc.data();
    const currentRound = game.currentRoundNumber;
    const deadline = game.roundDeadlines?.[currentRound];

    if (deadline && deadline.toMillis() < now.toMillis()) {
      await db.runTransaction(async (transaction) => {
        const refreshedGameDoc = await transaction.get(gameDoc.ref);
        const refreshedGame = refreshedGameDoc.data();
        if (!refreshedGame || refreshedGame.status !== 'in_progress') return;

        const players = refreshedGame.players || {};
        let logicNeedsCalc = false;

        for (const uid in players) {
          const p = players[uid];
          if (p.submittedRound === undefined || p.submittedRound < currentRound) {
            // FORCE AI decision
            const lastRound = p.history && p.history.length > 0 ? p.history[p.history.length - 1] : undefined;
            const aiLevel = p.isAi ? p.aiLevel || 'middle' : 'middle';
            const decision = AiAgent.makeDecision(aiLevel as any, lastRound);

            p.submittedRound = currentRound;
            p.pendingDecisions = decision;
            logicNeedsCalc = true;
          }
        }

        if (logicNeedsCalc) {
          const allSubmitted = Object.values(players).every((p: any) => p.submittedRound === currentRound);
          if (allSubmitted) {
            await performCalculation(game.id, null, transaction, { ...refreshedGame, players });
          } else {
            transaction.update(gameDoc.ref, { players });
          }
        }
      });
    }
  }
});

export const saveDraft = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const { gameId, decision } = request.data;
  if (!gameId || !decision) {
    throw new HttpsError('invalid-argument', 'Missing gameId or decision');
  }

  const gameRef = db.collection('games').doc(gameId);

  // We update the specific player's state.
  // We assume the player fields map is keyed by UID as per data model.
  // We need to know WHICH player key to update.
  // In createGame, we keyed by UID. In playerLogin, we key by 'player-gameId-number'.
  // The request.auth.uid SHOULD match the key in the map.

  // However, the players map is a nested object "players: { [uid]: state }".
  // Firestore dot notation allows updating a specific key.

  const uid = request.auth.uid;
  const fieldPath = `players.${uid}.pendingDecisions`;

  // Verify game exists? Or just blind update?
  // Blind update is faster/cheaper, but risky if game deleted.
  // Let's allow blind update for draft saving efficiency, but catch "not found".

  // Actually, we should check if user is part of the game to be safe?
  // Using a precondition or update allows us to fail if doc doesn't exist.

  try {
    await gameRef.update({
      [fieldPath]: decision,
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    // If error is NOT FOUND, throw.
    console.error('saveDraft failed:', error);
    throw new HttpsError('internal', 'Failed to save draft');
  }

  return { success: true };
});

export const sendPlayerInvite = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { gameId, playerNumber, email, origin } = request.data;
    if (!gameId || !playerNumber || !email) throw new HttpsError('invalid-argument', 'Missing args');

    const gameRef = db.collection('games').doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) throw new HttpsError('not-found', 'Game not found');
    const game = gameDoc.data();

    if (game?.hostUid !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Only game host can send invites');
    }

    const playerSecrets = game?.playerSecrets || {};
    const secret = playerSecrets[String(playerNumber)];

    if (!secret || !secret.password) {
      throw new HttpsError('not-found', 'Player or PIN not found');
    }

    // Construct login link
    const loginLink = `${origin}/game-login?gameId=${gameId}&pin=${secret.password}`;

    await mailService.sendPlayerLoginInfo(email, loginLink);

    return { success: true };
  },
);

export const sendVerificationEmail = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { origin } = request.data;
    const email = request.auth.token.email;
    if (!email) throw new HttpsError('invalid-argument', 'No email found for user');

    const link = await admin.auth().generateEmailVerificationLink(email, {
      url: `${origin}/admin/login?email=${email}&verified=true`,
    });

    await mailService.sendVerificationEmail(email, link);
    return { success: true };
  },
);

export const sendPasswordResetEmail = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    const { email, origin } = request.data;
    if (!email) throw new HttpsError('invalid-argument', 'Email is required');

    const link = await admin.auth().generatePasswordResetLink(email, {
      url: `${origin}/admin/login?email=${email}`,
    });

    await mailService.sendPasswordResetEmail(email, link);
    return { success: true };
  },
);

export const manageFeedback = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    // Super Admin Check
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();
    const isSuper =
      (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
      request.auth.token.email === 'florian.feldhaus@gmail.com';

    if (!isSuper) throw new HttpsError('permission-denied', 'Super-Administratoren only');

    const { feedbackId, action, value } = request.data;
    if (!feedbackId || !action) throw new HttpsError('invalid-argument', 'Missing feedbackId or action');

    const feedbackRef = db.collection('feedback').doc(feedbackId);
    const feedbackSnap = await feedbackRef.get();
    if (!feedbackSnap.exists) throw new HttpsError('not-found', 'Feedback not found');

    const feedback = feedbackSnap.data() as any;
    const updates: any = {
      updatedAt: Timestamp.now(),
    };

    if (action === 'reply') {
      const response = value?.response;
      if (!response) throw new HttpsError('invalid-argument', 'Missing reply response');

      updates.status = 'replied';
      updates.adminResponse = response;

      // Send email to the admin who provided feedback
      const subject = `Re: Your feedback on SOIL (${feedback.category})`;
      const text = `Hello ${feedback.userName},\n\nThank you for your feedback. A system administrator has replied to your comment:\n\n"${feedback.comment}"\n\nReply:\n${response}\n\nBest regards,\nThe SOIL Team`;
      const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <h2>Reply to your Feedback</h2>
          <p>Hello ${feedback.userName},</p>
          <p>Thank you for your feedback. A system administrator has replied to your comment:</p>
          <div style="border-left: 4px solid #e5e7eb; padding-left: 15px; font-style: italic; color: #4b5563; margin: 20px 0;">
            "${feedback.comment}"
          </div>
          <p><strong>Reply:</strong></p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px;">
            ${response}
          </div>
          <p>Best regards,<br>The SOIL Team</p>
        </div>
      `;

      try {
        await mailService.sendEmail({
          to: feedback.userEmail,
          subject,
          text,
          html,
        });
      } catch (e) {
        console.error('Failed to send feedback reply email', e);
        throw new HttpsError('internal', 'Failed to send email');
      }
    } else if (action === 'resolve') {
      updates.status = 'resolved';
      if (value?.externalReference) {
        updates.externalReference = value.externalReference;
      }
    } else if (action === 'reject') {
      updates.status = 'rejected';
    }

    await feedbackRef.update(updates);
    return { success: true };
  },
);

// --- Game Evaluation ---

async function getExistingCategories(): Promise<string[]> {
  const categoriesSnap = await db.collection('game_categories').get();
  if (categoriesSnap.empty) {
    const initialCategories = [
      'Integrated Farming',
      'Organic Right',
      'Organic Wrong',
      'Conventional Right',
      'Conventional Wrong',
      'Resource Miser',
    ];
    // Seed categories
    const batch = db.batch();
    for (const cat of initialCategories) {
      batch.set(db.collection('game_categories').doc(), { name: cat });
    }
    await batch.commit();
    return initialCategories;
  }
  return categoriesSnap.docs.map((doc) => doc.data().name);
}

export const evaluateGame = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  // Super Admin Check
  const callerRef = db.collection('users').doc(request.auth.uid);
  const callerSnap = await callerRef.get();
  const isSuper =
    (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
    request.auth.token.email === 'florian.feldhaus@gmail.com';

  if (!isSuper) throw new HttpsError('permission-denied', 'Super-Administratoren only');

  const { gameId, targetUid } = request.data;
  if (!gameId || !targetUid) throw new HttpsError('invalid-argument', 'Missing gameId or targetUid');

  const gameRef = db.collection('games').doc(gameId);
  const gameSnap = await gameRef.get();
  if (!gameSnap.exists) throw new HttpsError('not-found', 'Game not found');
  const game = gameSnap.data()!;

  const player = game.players[targetUid];
  if (!player) throw new HttpsError('not-found', 'Player not found in this game');

  const existingCategories = await getExistingCategories();

  const prompt = `
    Analyze the following game data for a player in the "Soil" agricultural management game.
    Cluster the player's play style into one of the existing categories if it fits, or create a new one if it is significantly different.
    
    Existing Categories: ${existingCategories.join(', ')}
    
    Game Data:
    - Game Name: ${game.name}
    - Player: ${player.displayName}
    - Total Rounds: ${game.currentRoundNumber}
    - Final Capital: ${player.capital}
    - Avg Soil Quality: ${player.avgSoil}
    - Avg Nutrition: ${player.avgNutrition}
    - History Summary: ${JSON.stringify(
      player.history.map((h: any) => ({
        round: h.number,
        decisions: h.decision,
        result: h.result ? { profit: h.result.profit, events: h.result.events } : 'N/A',
      })),
    )}

    Provide:
    1. "playStyle": The name of the category (existing or new).
    2. "analysis": A detailed analysis of their strategy and its consequences.
    3. "improvements": A list of potential improvements to make the game mechanics better based on this player's experience.
    4. "isNewCategory": Boolean indicating if you created a new category.
  `;

  try {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            playStyle: { type: 'string' },
            analysis: { type: 'string' },
            improvements: {
              type: 'array',
              items: { type: 'string' },
            },
            isNewCategory: { type: 'boolean' },
          },
          required: ['playStyle', 'analysis', 'improvements', 'isNewCategory'],
        },
      },
    });

    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) throw new Error('No response from Gemini');

    const response = JSON.parse(responseText);

    const evaluation: any = {
      playStyle: response.playStyle,
      analysis: response.analysis,
      improvements: response.improvements,
      evaluatedAt: Timestamp.now(),
    };

    // Update game with evaluation
    await gameRef.update({
      [`evaluations.${targetUid}`]: evaluation,
    });

    // If new category, add to our list
    if (response.isNewCategory && !existingCategories.includes(response.playStyle)) {
      await db.collection('game_categories').add({ name: response.playStyle });
    }

    return evaluation;
  } catch (error: any) {
    console.error('Gemini evaluation failed:', error);
    throw new HttpsError('internal', `Evaluation failed: ${error.message}`);
  }
});

export const sendGameInvite = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { gameId, email } = request.data;
    if (!gameId || !email) throw new HttpsError('invalid-argument', 'Missing args');

    const gameSnap = await db.collection('games').doc(gameId).get();
    const game = gameSnap.data();

    await mailService.sendGameInvite(email, game?.name || 'Untitled Game', gameId);

    return { success: true };
  },
);

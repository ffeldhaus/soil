import * as admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { AiAgent } from './ai-agent';
import { GameEngine } from './game-engine';
import { mailService } from './mail.service';
import { Round } from './types';
import { generateRandomPassword } from './utils';

setGlobalOptions({
  region: 'europe-west4',
  serviceAccount: 'firebase-app-hosting-compute@soil-602ea.iam.gserviceaccount.com',
});

admin.initializeApp();
const db = admin.firestore();

// --- HTTP Callable Functions for Game Logic ---

// --- Sync and Game State ---

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

  // Fetch rounds for history
  const roundsRef = gameRef.collection('rounds');
  const roundsSnap = await roundsRef.orderBy('number', 'asc').get();
  const rounds = roundsSnap.docs.map((doc) => doc.data() as Round);

  return {
    game: {
      id: game.id,
      status: game.status,
      currentRoundNumber: game.currentRoundNumber,
      settings: game.settings,
      players: game.players, // Include for Finance view
    },
    playerState: {
      ...playerState,
      playerNumber: uid.startsWith('player-') ? uid.split('-')[2] : undefined,
      history: rounds,
    },
    lastRound: rounds[rounds.length - 1],
  };
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
        const roundLimit = game.settings?.length || 10;

        if (currentRound >= roundLimit) {
          throw new HttpsError('failed-precondition', 'Game has reached the round limit.');
        }

        players[uid].submittedRound = currentRound;
        players[uid].pendingDecisions = decision;

        // Process AI turns immediately (passes preloaded data to avoid internal reads)
        const updatedPlayers = (await internalProcessAiTurns(gameId, transaction, { ...game, players })) || players;

        const calculationPerformed = await checkAndPerformCalculation(
          gameId,
          transaction,
          { ...game, players: updatedPlayers },
          uid,
          decision,
        );
        if (calculationPerformed) {
          const myState = updatedPlayers[uid];
          const myNewRound = myState.history[myState.history.length - 1];
          return { status: 'calculated', nextRound: myNewRound };
        }

        // 3. WRITES (only if not calculating, since calculation does its own update)
        transaction.update(gameRef, {
          players: updatedPlayers,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
  triggerUid?: string,
  fallbackDecision?: any,
) {
  const players = game.players || {};
  const currentRound = game.currentRoundNumber || 0;
  const allPlayersArr = Object.values(players);
  const allSubmitted = allPlayersArr.every((p: any) => p.submittedRound === currentRound);

  console.log(
    `Debug checkAndPerformCalculation: gameId=${gameId}, currentRound=${currentRound}, playerCount=${allPlayersArr.length}, allSubmitted=${allSubmitted}`,
  );

  if (allSubmitted) {
    // We use the provided decision if available, or an empty object.
    // performCalculation prioritizes player.pendingDecisions anyway.
    await performCalculation(gameId, fallbackDecision || {}, transaction, game);
    return true;
  }
  return false;
}

async function performCalculation(
  gameId: string,
  decision: any,
  transaction: admin.firestore.Transaction,
  preloadedGame?: any,
) {
  const gameRef = db.collection('games').doc(gameId);
  const game = preloadedGame || (await transaction.get(gameRef)).data();
  if (!game) return;

  const players = game.players || {};
  const nextRoundNumber = (game.currentRoundNumber || 0) + 1;

  console.log(`Calculating round ${nextRoundNumber} for all players in game ${gameId}`);

  const events = {
    weather: Math.random() > 0.8 ? 'Drought' : Math.random() < 0.2 ? 'Flood' : 'Normal',
    vermin: Math.random() > 0.9 ? 'Beetle' : 'None',
  };

  // Calculate next round for EACH player
  for (const uid of Object.keys(players)) {
    const player = players[uid];
    const playerDecision = player.pendingDecisions || decision; // Fallback to provided decision

    // Get last round from player history
    const lastRound =
      player.history && player.history.length > 0 ? player.history[player.history.length - 1] : undefined;

    const currentCapital = lastRound?.result?.capital ?? player.capital ?? 1000;
    const roundLimit = game.settings?.length || 20;

    const nextRound = GameEngine.calculateRound(
      nextRoundNumber,
      lastRound,
      playerDecision,
      events,
      currentCapital,
      roundLimit,
    );

    // Calculate player-specific averages
    const pAvgSoil = nextRound.parcelsSnapshot.reduce((sum, p) => sum + p.soil, 0) / nextRound.parcelsSnapshot.length;
    const pAvgNutrition =
      nextRound.parcelsSnapshot.reduce((sum, p) => sum + p.nutrition, 0) / nextRound.parcelsSnapshot.length;

    // Update player state
    player.history = player.history || [];
    player.history.push(nextRound);
    player.currentRound = nextRoundNumber;
    player.capital = nextRound.result!.capital; // Sync current capital
    player.avgSoil = Math.round(pAvgSoil);
    player.avgNutrition = Math.round(pAvgNutrition);

    // Reset pending decisions for next round (Firestore doesn't allow undefined)
    delete (player as any).pendingDecisions;
  }

  // Update game state (current round pointer and all players)
  const roundLimit = game.settings?.length || 10;
  const isFinished = nextRoundNumber >= roundLimit;

  transaction.update(gameRef, {
    currentRoundNumber: nextRoundNumber,
    status: isFinished ? 'finished' : game.status,
    players,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Round ${nextRoundNumber} finalized for ${Object.keys(players).length} players`);
  return { number: nextRoundNumber };
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
    settings = { length: 20, difficulty: 'normal', playerLabel: 'Player' },
    config = { numPlayers: 1, numRounds: 20, numAi: 0 }, // Default config to 20 as requested
    retentionDays = 90,
  } = request.data;

  // Rounds range check: 10 minimum, 50 maximum.
  const numRounds = Math.min(50, Math.max(10, config.numRounds || 20));
  config.numRounds = numRounds;
  settings.length = numRounds;

  // Authorization & Quota Check
  const uid = request.auth.uid;
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  // For now, if user doc doesn't exist, we might allow creation if legacy?
  // No, strictly enforce new rules.
  // BUT checking for superadmin override in code for 'florian.feldhaus@gmail.com' not needed if data is correct.
  // However, for bootstrap, we need to handle the first user.

  let userRole = request.auth.token['role'];
  let quota = 5;
  // let gameCount = 0; // Legacy counter, ignored for quota check

  if (userSnap.exists) {
    const userData = userSnap.data();
    userRole = userData?.role || 'pending';
    quota = userData?.quota || 5;
    quota = userData?.quota || 5;
    // gameCount = userData?.gameCount || 0; // Legacy
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  if (userRole !== 'admin' && userRole !== 'superadmin') {
    throw new HttpsError('permission-denied', 'You must be an approved admin to create games.');
  }

  // Dynamic Quota Check
  // Count games where hostUid == uid AND status != 'deleted' AND status != 'expired'
  // Since we don't have a composite index for everything, and status can be multiple values,
  // let's just count games where hostUid == uid and deletedAt == null.
  // This assumes 'status' is kept in sync with 'deletedAt' for soft checking.
  // Ideally we filter status 'in' ['waiting', 'in_progress', 'finished'] but that requires an index.
  // 'deletedAt == null' is a good proxy for active games.

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

  // Validate retention
  const validRetention = Math.min(Math.max(Number(retentionDays) || 90, 1), 365);

  const gameId = db.collection('games').doc().id;

  // Generate secrets for all players
  const numPlayers = config.numPlayers || 1;
  const playerSecrets: Record<string, { password: string }> = {};
  for (let i = 1; i <= numPlayers; i++) {
    playerSecrets[String(i)] = {
      password: generateRandomPassword(6),
    };
  }

  const newGame = {
    id: gameId,
    name: name || `Game ${gameId.substr(0, 6)}`,
    // password: finalPassword, // Removed global password
    hostUid: request.auth.uid,
    status: 'waiting',
    settings, // Keep old settings structure for compatibility if needed, or merge
    config, // New explicit config
    players: {
      ...Array(config.numPlayers || 1)
        .fill(0)
        .reduce((acc, _, i) => {
          const playerNumber = i + 1;
          const playerId = `player-${gameId}-${playerNumber}`;
          acc[playerId] = {
            uid: playerId,
            displayName: `Player ${playerNumber}`,
            isAi: playerNumber <= (config.numAi || 0),
            capital: 1000,
            currentRound: 0,
            history: [],
          };
          return acc;
        }, {} as any),
    },

    currentRoundNumber: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    retentionDays: validRetention,
    deletedAt: null,
    playerSecrets,
  };

  await db.runTransaction(async (t) => {
    // Initialize Round 0 Metrics for all players
    const initialParcels = GameEngine.createInitialParcels();
    const startSoil = Math.round(initialParcels.reduce((sum, p) => sum + p.soil, 0) / initialParcels.length);
    const startNutrition = Math.round(initialParcels.reduce((sum, p) => sum + p.nutrition, 0) / initialParcels.length);

    const round0 = {
      number: 0,
      parcelsSnapshot: initialParcels,
      avgSoil: startSoil,
      avgNutrition: startNutrition,
    };

    for (const uid of Object.keys(newGame.players)) {
      newGame.players[uid].avgSoil = startSoil;
      newGame.players[uid].avgNutrition = startNutrition;
    }

    // Auto-process AI turns for the first round BEFORE any writes
    await internalProcessAiTurns(gameId, t, newGame);

    t.set(db.collection('games').doc(gameId), newGame);

    // Initialize Round 0 Doc (Global reference if needed)
    await t.set(db.collection('games').doc(gameId).collection('rounds').doc('round_0'), round0);

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

    const { firstName, lastName, explanation, institution, institutionLink, lang } = request.data;
    const email = request.auth.token.email || '';

    console.log(`submitOnboarding: Received request from ${email} (${request.auth.uid}) - lang: ${lang || 'de'}`);

    // Check Banned Emails
    const bannedSnap = await db.collection('banned_emails').doc(email).get();
    if (bannedSnap.exists) {
      console.warn(`submitOnboarding: Email ${email} is banned.`);
      throw new HttpsError('permission-denied', 'This email is banned from registration.');
    }

    // Basic Validation
    if (!explanation || !institution || !firstName || !lastName) {
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
      role: 'pending',
      status: 'pending',
      quota: 5,
      gameCount: 0,
      lang: lang || 'de',
      onboarding: {
        explanation,
        institution,
        institutionLink: institutionLink || '',
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await userRef.set(userData, { merge: true });
    console.log(`submitOnboarding: User document created/updated for ${email}`);

    // Notify Super Admin
    const adminEmail = 'florian.feldhaus@gmail.com';
    try {
      console.log(`submitOnboarding: Sending notification to admin ${adminEmail}`);
      await mailService.sendAdminNewRegistrationNotification(adminEmail, userData);
      console.log(`submitOnboarding: Admin notification sent successfully.`);
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

    // Super Admin Check
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();

    // Allow hardcoded superadmin for bootstrap
    const isSuper =
      (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
      request.auth.token.email === 'florian.feldhaus@gmail.com';

    if (!isSuper) {
      throw new HttpsError('permission-denied', 'Super Admins only');
    }

    const { targetUid, action, value, lang } = request.data;
    if (!targetUid || !action) throw new HttpsError('invalid-argument', 'Missing args');

    const targetRef = db.collection('users').doc(targetUid);
    const updates: any = {};

    if (action === 'approve') {
      updates.role = 'admin';
      updates.status = 'active';

      // Send email notification
      const targetDoc = await targetRef.get();
      const targetData = targetDoc.data();
      const targetEmail = targetData?.email;
      const targetLang = lang || targetData?.lang || 'de';

      if (targetEmail) {
        try {
          await mailService.sendAdminRegistrationApproved(targetEmail, targetLang);
        } catch (e) {
          console.error('Failed to send approval email', e);
          // Don't fail the operation just because email failed
        }
      }
    } else if (action === 'reject') {
      updates.status = 'rejected';

      // Optional: Ban email if requested
      if (value && value.banEmail) {
        const targetDoc = await targetRef.get();
        const targetEmail = targetDoc.data()?.email;
        if (targetEmail) {
          await db.collection('banned_emails').doc(targetEmail).set({
            bannedAt: admin.firestore.FieldValue.serverTimestamp(),
            bannedBy: request.auth.uid,
            reason: 'Rejected by Super Admin',
          });
        }
      }
    } else if (action === 'setQuota') {
      updates.quota = Number(value);
    } else if (action === 'ban') {
      // Full Ban
      updates.status = 'banned';
      updates.role = 'pending'; // Revoke admin privileges

      const targetDoc = await targetRef.get();
      const targetEmail = targetDoc.data()?.email;
      if (targetEmail) {
        await db.collection('banned_emails').doc(targetEmail).set({
          bannedAt: admin.firestore.FieldValue.serverTimestamp(),
          bannedBy: request.auth.uid,
          reason: 'Banned by Super Admin',
        });
      }
    } else if (action === 'delete') {
      // Cascade delete all games owned by this user
      const gamesSnapshot = await db.collection('games').where('hostUid', '==', targetUid).get();
      console.log(`Cascading delete for user ${targetUid}: Found ${gamesSnapshot.size} games.`);

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

  if (!isSuper) throw new HttpsError('permission-denied', 'Super Admins only');

  // Aggregations
  const gamesColl = db.collection('games');
  const usersColl = db.collection('users');

  const totalGamesSnap = await gamesColl.count().get();
  const deletedGamesSnap = await gamesColl.where('status', '==', 'deleted').count().get();

  // For users, we want specific role counts
  const totalUsersSnap = await usersColl.count().get();
  const pendingUsersSnap = await usersColl.where('role', '==', 'pending').count().get();
  const adminUsersSnap = await usersColl.where('role', 'in', ['admin', 'superadmin']).count().get();

  return {
    games: {
      total: totalGamesSnap.data().count,
      deleted: deletedGamesSnap.data().count,
      active: totalGamesSnap.data().count - deletedGamesSnap.data().count,
    },
    users: {
      total: totalUsersSnap.data().count,
      pending: pendingUsersSnap.data().count,
      admins: adminUsersSnap.data().count,
    },
  };
});

export const getPendingUsers = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  // Super Check
  const callerRef = db.collection('users').doc(request.auth.uid);
  const callerSnap = await callerRef.get();
  const isSuper =
    (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
    request.auth.token.email === 'florian.feldhaus@gmail.com';

  if (!isSuper) throw new HttpsError('permission-denied', 'Super Admins only');

  const snap = await db.collection('users').where('role', '==', 'pending').get();
  return snap.docs.map((d) => d.data());
});

export const getAllAdmins = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  // Super Check
  const callerRef = db.collection('users').doc(request.auth.uid);
  const callerSnap = await callerRef.get();
  const isSuper =
    (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
    request.auth.token.email === 'florian.feldhaus@gmail.com';

  if (!isSuper) throw new HttpsError('permission-denied', 'Super Admins only');

  const snap = await db.collection('users').where('role', 'in', ['admin', 'superadmin']).get();
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
      throw new HttpsError('permission-denied', 'Only Super Admins can view other users games.');
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

    const gameRef = db.collection('games').doc(gameId);
    const uid = `player-${gameId}-${playerNumber}`;

    await db.runTransaction(async (t) => {
      // 1. ALL READS FIRST
      const doc = await t.get(gameRef);
      if (!doc.exists) throw new HttpsError('not-found', 'Game not found');

      const game = doc.data()!;
      if (game.hostUid !== request.auth!.uid) {
        throw new HttpsError('permission-denied', 'Not your game');
      }

      // 2. LOGIC
      const players = game.players || {};
      const existingPlayer = players[uid];

      if (type === 'ai') {
        players[uid] = {
          ...(existingPlayer || {}),
          uid: uid,
          displayName: existingPlayer?.displayName || `AI Player ${playerNumber}`,
          isAi: true,
          aiLevel: aiLevel || 'middle',
          capital: existingPlayer?.capital ?? 1000,
          currentRound: existingPlayer?.currentRound ?? 0,
          history: existingPlayer?.history ?? [],
        };
      } else {
        // Convert to Human
        if (existingPlayer) {
          players[uid].isAi = false;
          delete players[uid].aiLevel;
          players[uid].displayName = `Player ${playerNumber}`;
        } else {
          players[uid] = {
            uid,
            displayName: `Player ${playerNumber}`,
            isAi: false,
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
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } else {
        // 3. WRITES
        t.update(gameRef, {
          players,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

  // Check if Super Admin
  const callerRef = db.collection('users').doc(request.auth.uid);
  const callerSnap = await callerRef.get();
  const isSuper =
    (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
    request.auth.token.email === 'florian.feldhaus@gmail.com';

  // Process deletions
  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH = 500;

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
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'deleted',
          });
          batchCount++;

          if (batchCount >= MAX_BATCH) {
            await batch.commit();
            batchCount = 0;
          }
        }
      } else {
        console.warn(`Skipping delete for ${gameId}: Not owner and not super admin.`);
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
export const dailyGamePurge = onSchedule({ schedule: 'every 24 hours', region: 'europe-west3' }, async (event) => {
  const now = admin.firestore.Timestamp.now();
  const nowMillis = now.toMillis();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

  console.log('Starting dailyGamePurge...');

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
    const createdAt = data.createdAt.toMillis();
    const expiresAt = createdAt + retentionDays * ONE_DAY_MS;

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
    console.log(`Soft deleted ${softDelCount} expired games.`);
  }

  // 2. Hard delete old soft-deleted games
  // deletedAt < now - 30 days
  const purgeThreshold = admin.firestore.Timestamp.fromMillis(nowMillis - THIRTY_DAYS_MS);
  const trashSnap = await db.collection('games').where('deletedAt', '<', purgeThreshold).get();

  console.log(`Found ${trashSnap.size} games to permanently purge.`);

  for (const doc of trashSnap.docs) {
    await db.recursiveDelete(doc.ref);
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
  const playerSecrets = game?.['playerSecrets'] || {};

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
    deadlines[roundNumber] = admin.firestore.Timestamp.fromDate(new Date(deadline));
  } else {
    delete deadlines[roundNumber];
  }

  await gameRef.update({ roundDeadlines: deadlines });
  return { success: true };
});

// europe-west4 does not support Cloud Scheduler, so we use europe-west3 for scheduled functions
export const processDeadlines = onSchedule({ schedule: 'every 1 minutes', region: 'europe-west3' }, async (event) => {
  const now = admin.firestore.Timestamp.now();

  // Find games in progress
  const activeGames = await db.collection('games').where('status', '==', 'in_progress').get();

  for (const gameDoc of activeGames.docs) {
    const game = gameDoc.data();
    const currentRound = game.currentRoundNumber;
    const deadline = game.roundDeadlines?.[currentRound];

    if (deadline && deadline.toMillis() < now.toMillis()) {
      console.log(`Deadline passed for game ${game.id} round ${currentRound}. Forcing AI turns.`);

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
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

    const { gameId, playerNumber, email, origin, lang } = request.data;
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

    // Use provided origin or default to production
    const appOrigin = origin || 'https://soil-602ea.web.app';
    // Construct login link
    const loginLink = `${appOrigin}/login/player?gameId=${gameId}&pin=${secret.password}`;

    await mailService.sendPlayerLoginInfo(email, loginLink, lang || 'de');

    return { success: true };
  },
);

export const sendVerificationEmail = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const email = request.auth.token.email;
    if (!email) throw new HttpsError('invalid-argument', 'User has no email');

    const { lang, origin } = request.data;
    const appOrigin = origin || 'https://soil-602ea.web.app';

    let finalLang = lang;
    if (!finalLang) {
      const userSnap = await db.collection('users').doc(request.auth.uid).get();
      finalLang = userSnap.data()?.lang || 'de';
    }

    try {
      const link = await admin.auth().generateEmailVerificationLink(email, {
        url: `${appOrigin}/${finalLang}/onboarding`,
      });
      await mailService.sendVerificationEmail(email, link, finalLang);
      return { success: true };
    } catch (error: any) {
      console.error('Error generating verification link:', error);
      throw new HttpsError('internal', error.message);
    }
  },
);

export const sendPasswordResetEmail = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    const { email, lang, origin } = request.data;
    if (!email) throw new HttpsError('invalid-argument', 'Email is required');

    const appOrigin = origin || 'https://soil-602ea.web.app';

    let finalLang = lang;
    if (!finalLang) {
      const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!userSnap.empty) {
        finalLang = userSnap.docs[0].data()?.lang || 'de';
      } else {
        finalLang = 'de';
      }
    }

    try {
      const link = await admin.auth().generatePasswordResetLink(email, {
        url: `${appOrigin}/${finalLang}/admin/login`,
      });
      await mailService.sendPasswordResetEmail(email, link, finalLang);
      return { success: true };
    } catch (error: any) {
      console.error('Error generating password reset link:', error);
      // For security, don't reveal if user exists or not if that's what the error means
      // But generatePasswordResetLink throws if user not found.
      // However, the standard Firebase behavior is to not reveal this.
      // For now, let's just return success anyway if it's "user not found" to avoid enumeration.
      throw new HttpsError('internal', error.message);
    }
  },
);

export const sendGameInvite = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { gameId, email, lang } = request.data;
    if (!gameId || !email) throw new HttpsError('invalid-argument', 'Missing gameId or email');

    const gameRef = db.collection('games').doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) throw new HttpsError('not-found', 'Game not found');
    const game = gameDoc.data();

    if (game?.hostUid !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Only game host can send invites');
    }

    await mailService.sendGameInvite(email, game?.name || 'Untitled Game', gameId, lang || 'de');

    return { success: true };
  },
);

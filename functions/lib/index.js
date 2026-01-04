"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDraft = exports.processDeadlines = exports.updateRoundDeadline = exports.triggerAiTurn = exports.playerLogin = exports.dailyGamePurge = exports.undeleteGames = exports.deleteGames = exports.updatePlayerType = exports.getAdminGames = exports.getAllAdmins = exports.getPendingUsers = exports.getSystemStats = exports.getUserStatus = exports.manageAdmin = exports.submitOnboarding = exports.createGame = exports.setAdminRole = exports.impersonatePlayer = exports.calculateNextRound = exports.submitDecision = exports.getGameState = void 0;
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
(0, v2_1.setGlobalOptions)({ region: "europe-west4" });
const scheduler_1 = require("firebase-functions/v2/scheduler");
const game_engine_1 = require("./game-engine");
const ai_agent_1 = require("./ai-agent");
const utils_1 = require("./utils");
admin.initializeApp();
const db = admin.firestore();
// --- HTTP Callable Functions for Game Logic ---
// --- Sync and Game State ---
exports.getGameState = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    const { gameId } = request.data;
    if (!gameId)
        throw new https_1.HttpsError('invalid-argument', 'Missing gameId');
    const gameRef = db.collection('games').doc(gameId);
    const gameSnap = await gameRef.get();
    if (!gameSnap.exists)
        throw new https_1.HttpsError('not-found', 'Game not found');
    const game = gameSnap.data();
    const uid = request.auth.uid;
    const playerState = (_a = game.players) === null || _a === void 0 ? void 0 : _a[uid];
    // Fetch rounds for history
    const roundsRef = gameRef.collection('rounds');
    const roundsSnap = await roundsRef.orderBy('number', 'asc').get();
    const rounds = roundsSnap.docs.map(doc => doc.data());
    return {
        game: {
            id: game.id,
            status: game.status,
            currentRoundNumber: game.currentRoundNumber,
            settings: game.settings,
            players: game.players // Include for Finance view
        },
        playerState: Object.assign(Object.assign({}, playerState), { playerNumber: uid.startsWith('player-') ? uid.split('-')[2] : undefined, history: rounds }),
        lastRound: rounds[rounds.length - 1]
    };
});
exports.submitDecision = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    const { gameId, decision } = request.data;
    const uid = request.auth.uid;
    if (!gameId || !decision) {
        throw new https_1.HttpsError('invalid-argument', 'Missing gameId or decision');
    }
    const gameRef = db.collection('games').doc(gameId);
    try {
        return await db.runTransaction(async (transaction) => {
            var _a;
            // 1. ALL READS FIRST
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists)
                throw new https_1.HttpsError('not-found', 'Game not found');
            const game = gameDoc.data();
            // 2. LOGIC
            const players = game.players || {};
            if (!players[uid]) {
                console.error(`submitDecision: User ${uid} not found in players map for game ${gameId}. Players: ${Object.keys(players).join(', ')}`);
                throw new https_1.HttpsError('permission-denied', `Not a player in this game: ${uid}`);
            }
            const currentRound = game.currentRoundNumber || 0;
            const roundLimit = ((_a = game.settings) === null || _a === void 0 ? void 0 : _a.length) || 10;
            if (currentRound >= roundLimit) {
                throw new https_1.HttpsError('failed-precondition', 'Game has reached the round limit.');
            }
            players[uid].submittedRound = currentRound;
            players[uid].pendingDecisions = decision;
            // Process AI turns immediately (passes preloaded data to avoid internal reads)
            const updatedPlayers = await internalProcessAiTurns(gameId, transaction, Object.assign(Object.assign({}, game), { players })) || players;
            const calculationPerformed = await checkAndPerformCalculation(gameId, transaction, Object.assign(Object.assign({}, game), { players: updatedPlayers }), uid, decision);
            if (calculationPerformed) {
                const myState = updatedPlayers[uid];
                const myNewRound = myState.history[myState.history.length - 1];
                return { status: 'calculated', nextRound: myNewRound };
            }
            // 3. WRITES (only if not calculating, since calculation does its own update)
            transaction.update(gameRef, {
                players: updatedPlayers,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return { status: 'submitted' };
        });
    }
    catch (error) {
        console.error('Error in submitDecision:', error);
        throw new https_1.HttpsError('internal', error.message || 'Internal Error');
    }
});
async function checkAndPerformCalculation(gameId, transaction, game, triggerUid, fallbackDecision) {
    const players = game.players || {};
    const currentRound = game.currentRoundNumber || 0;
    const allPlayersArr = Object.values(players);
    const allSubmitted = allPlayersArr.every((p) => p.submittedRound === currentRound);
    console.log(`Debug checkAndPerformCalculation: gameId=${gameId}, currentRound=${currentRound}, playerCount=${allPlayersArr.length}, allSubmitted=${allSubmitted}`);
    if (allSubmitted) {
        // We use the provided decision if available, or an empty object.
        // performCalculation prioritizes player.pendingDecisions anyway.
        await performCalculation(gameId, fallbackDecision || {}, transaction, game);
        return true;
    }
    return false;
}
async function performCalculation(gameId, decision, transaction, preloadedGame) {
    var _a, _b, _c, _d;
    const gameRef = db.collection('games').doc(gameId);
    const game = preloadedGame || (await transaction.get(gameRef)).data();
    if (!game)
        return;
    const players = game.players || {};
    const nextRoundNumber = (game.currentRoundNumber || 0) + 1;
    console.log(`Calculating round ${nextRoundNumber} for all players in game ${gameId}`);
    const events = {
        weather: Math.random() > 0.8 ? 'Drought' : (Math.random() < 0.2 ? 'Flood' : 'Normal'),
        vermin: Math.random() > 0.9 ? 'Beetle' : 'None'
    };
    // Calculate next round for EACH player
    for (const uid of Object.keys(players)) {
        const player = players[uid];
        const playerDecision = player.pendingDecisions || decision; // Fallback to provided decision
        // Get last round from player history
        const lastRound = player.history && player.history.length > 0
            ? player.history[player.history.length - 1]
            : undefined;
        const currentCapital = (_c = (_b = (_a = lastRound === null || lastRound === void 0 ? void 0 : lastRound.result) === null || _a === void 0 ? void 0 : _a.capital) !== null && _b !== void 0 ? _b : player.capital) !== null && _c !== void 0 ? _c : 1000;
        const nextRound = game_engine_1.GameEngine.calculateRound(nextRoundNumber, lastRound, playerDecision, events, currentCapital);
        // Calculate player-specific averages
        const pAvgSoil = nextRound.parcelsSnapshot.reduce((sum, p) => sum + p.soil, 0) / nextRound.parcelsSnapshot.length;
        const pAvgNutrition = nextRound.parcelsSnapshot.reduce((sum, p) => sum + p.nutrition, 0) / nextRound.parcelsSnapshot.length;
        // Update player state
        player.history = player.history || [];
        player.history.push(nextRound);
        player.currentRound = nextRoundNumber;
        player.capital = nextRound.result.capital; // Sync current capital
        player.avgSoil = Math.round(pAvgSoil);
        player.avgNutrition = Math.round(pAvgNutrition);
        // Reset pending decisions for next round (Firestore doesn't allow undefined)
        delete player.pendingDecisions;
    }
    // Update game state (current round pointer and all players)
    const roundLimit = ((_d = game.settings) === null || _d === void 0 ? void 0 : _d.length) || 10;
    const isFinished = nextRoundNumber >= roundLimit;
    transaction.update(gameRef, {
        currentRoundNumber: nextRoundNumber,
        status: isFinished ? 'finished' : game.status,
        players,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Round ${nextRoundNumber} finalized for ${Object.keys(players).length} players`);
    return { number: nextRoundNumber };
}
exports.calculateNextRound = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const { gameId, decision } = request.data;
    if (!gameId || !decision) {
        throw new https_1.HttpsError('invalid-argument', 'Missing gameId or decision');
    }
    try {
        return await db.runTransaction(async (transaction) => {
            return await performCalculation(gameId, decision, transaction);
        });
    }
    catch (error) {
        console.error('Error in calculateNextRound:', error);
        throw new https_1.HttpsError('internal', error.message || 'Internal Error');
    }
});
// --- Admin / Roles ---
exports.impersonatePlayer = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to create a game.');
    }
    if (request.auth.token['role'] !== 'admin') {
        // Fallback for development: allow specific UID or email?
        // throw new HttpsError('permission-denied', 'Only admins can impersonate.');
    }
    const { targetUid } = request.data;
    if (!targetUid) {
        throw new https_1.HttpsError('invalid-argument', 'Target UID required.');
    }
    try {
        // Token for the target player
        const customToken = await admin.auth().createCustomToken(targetUid, {
            role: 'player',
            impersonator: true
        });
        // Token for the admin to re-authenticate later
        // We give it a claim so client knows it's a re-auth
        const adminToken = await admin.auth().createCustomToken(request.auth.uid, {
            role: 'admin'
        });
        return { customToken, adminToken };
    }
    catch (error) {
        console.error('Token creation error:', error);
        throw new https_1.HttpsError('internal', `Failed to create token: ${error.message}`);
    }
});
exports.setAdminRole = (0, https_1.onCall)(async (request) => {
    // Development helper: promote self to admin
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    await admin.auth().setCustomUserClaims(request.auth.uid, { role: 'admin' });
    return { success: true };
});
exports.createGame = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const { name, 
    // password, // Unused
    settings = { length: 10, difficulty: 'normal', playerLabel: 'Player' }, config = { numPlayers: 1, numRounds: 12, numAi: 0 }, // Default config to 12 as requested
    retentionDays = 90 } = request.data;
    // Rounds range check: 10-12 minimum, 20-50 maximum. 
    // We'll allow 10 to 100 for now but defaults should be better.
    const numRounds = Math.min(100, Math.max(10, config.numRounds || 12));
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
        userRole = (userData === null || userData === void 0 ? void 0 : userData.role) || 'pending';
        quota = (userData === null || userData === void 0 ? void 0 : userData.quota) || 5;
        quota = (userData === null || userData === void 0 ? void 0 : userData.quota) || 5;
        // gameCount = userData?.gameCount || 0; // Legacy
    }
    else {
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
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    if (userRole !== 'admin' && userRole !== 'superadmin') {
        throw new https_1.HttpsError('permission-denied', 'You must be an approved admin to create games.');
    }
    // Dynamic Quota Check
    // Count games where hostUid == uid AND status != 'deleted' AND status != 'expired'
    // Since we don't have a composite index for everything, and status can be multiple values,
    // let's just count games where hostUid == uid and deletedAt == null. 
    // This assumes 'status' is kept in sync with 'deletedAt' for soft checking.
    // Ideally we filter status 'in' ['waiting', 'in_progress', 'finished'] but that requires an index.
    // 'deletedAt == null' is a good proxy for active games.
    const activeGamesCountSnap = await db.collection('games')
        .where('hostUid', '==', uid)
        .where('deletedAt', '==', null)
        .count()
        .get();
    const currentActiveGames = activeGamesCountSnap.data().count;
    if (currentActiveGames >= quota) {
        throw new https_1.HttpsError('resource-exhausted', `Game quota exceeded (${currentActiveGames}/${quota}). Request an increase or delete old games.`);
    }
    // Validate retention
    const validRetention = Math.min(Math.max(Number(retentionDays) || 90, 1), 365);
    const gameId = db.collection('games').doc().id;
    // Generate secrets for all players
    const numPlayers = config.numPlayers || 1;
    const playerSecrets = {};
    for (let i = 1; i <= numPlayers; i++) {
        playerSecrets[String(i)] = {
            password: (0, utils_1.generateRandomPassword)(6)
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
        players: Object.assign({}, Array(config.numPlayers || 1).fill(0).reduce((acc, _, i) => {
            const playerNumber = i + 1;
            const playerId = `player-${gameId}-${playerNumber}`;
            acc[playerId] = {
                uid: playerId,
                displayName: `Player ${playerNumber}`,
                isAi: playerNumber <= (config.numAi || 0),
                capital: 1000,
                currentRound: 0,
                history: []
            };
            return acc;
        }, {})),
        currentRoundNumber: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        retentionDays: validRetention,
        deletedAt: null,
        playerSecrets
    };
    await db.runTransaction(async (t) => {
        // Initialize Round 0 Metrics for all players
        const initialParcels = game_engine_1.GameEngine.createInitialParcels();
        const startSoil = Math.round(initialParcels.reduce((sum, p) => sum + p.soil, 0) / initialParcels.length);
        const startNutrition = Math.round(initialParcels.reduce((sum, p) => sum + p.nutrition, 0) / initialParcels.length);
        const round0 = {
            number: 0,
            parcelsSnapshot: initialParcels,
            avgSoil: startSoil,
            avgNutrition: startNutrition
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
        if (userSnap.exists) { // Only increment if user doc exists (which it should for admins)
            t.update(userRef, { gameCount: admin.firestore.FieldValue.increment(1) });
        }
    });
    return {
        gameId,
        password: (_a = playerSecrets['1']) === null || _a === void 0 ? void 0 : _a.password
    };
});
// --- Helper for AI Automation ---
async function internalProcessAiTurns(gameId, transaction, preloadedGame) {
    const game = preloadedGame || (await transaction.get(db.collection('games').doc(gameId))).data();
    if (!game)
        return null;
    const players = game.players || {};
    const currentRound = game.currentRoundNumber || 0;
    for (const uid in players) {
        const p = players[uid];
        if (p.isAi && (p.submittedRound === undefined || p.submittedRound < currentRound)) {
            // Use player's own history for decision context
            const lastRound = p.history && p.history.length > 0 ? p.history[p.history.length - 1] : undefined;
            const decision = ai_agent_1.AiAgent.makeDecision((p.aiLevel || 'middle'), lastRound);
            p.submittedRound = currentRound;
            p.pendingDecisions = decision;
        }
    }
    return players;
}
// --- User Management ---
exports.submitOnboarding = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    const { firstName, lastName, explanation, institution, institutionLink } = request.data;
    const email = request.auth.token.email || '';
    // Check Banned Emails
    const bannedSnap = await db.collection('banned_emails').doc(email).get();
    if (bannedSnap.exists) {
        throw new https_1.HttpsError('permission-denied', 'This email is banned from registration.');
    }
    // Basic Validation
    if (!explanation || !institution || !firstName || !lastName) {
        throw new https_1.HttpsError('invalid-argument', 'Missing fields');
    }
    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);
    await userRef.set({
        uid,
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        role: 'pending',
        status: 'pending',
        quota: 5,
        gameCount: 0,
        onboarding: {
            explanation,
            institution,
            institutionLink: institutionLink || '',
            submittedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { success: true };
});
exports.manageAdmin = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    // Super Admin Check
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();
    // Allow hardcoded superadmin for bootstrap
    const isSuper = (callerSnap.exists && ((_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role) === 'superadmin') || request.auth.token.email === 'florian.feldhaus@gmail.com';
    if (!isSuper) {
        throw new https_1.HttpsError('permission-denied', 'Super Admins only');
    }
    const { targetUid, action, value } = request.data;
    if (!targetUid || !action)
        throw new https_1.HttpsError('invalid-argument', 'Missing args');
    const targetRef = db.collection('users').doc(targetUid);
    const updates = {};
    if (action === 'approve') {
        updates.role = 'admin';
        updates.status = 'active';
    }
    else if (action === 'reject') {
        updates.status = 'rejected';
        // Optional: Ban email if requested
        if (value && value.banEmail) {
            const targetDoc = await targetRef.get();
            const targetEmail = (_b = targetDoc.data()) === null || _b === void 0 ? void 0 : _b.email;
            if (targetEmail) {
                await db.collection('banned_emails').doc(targetEmail).set({
                    bannedAt: admin.firestore.FieldValue.serverTimestamp(),
                    bannedBy: request.auth.uid,
                    reason: 'Rejected by Super Admin'
                });
            }
        }
    }
    else if (action === 'setQuota') {
        updates.quota = Number(value);
    }
    else if (action === 'ban') {
        // Full Ban
        updates.status = 'banned';
        updates.role = 'pending'; // Revoke admin privileges
        const targetDoc = await targetRef.get();
        const targetEmail = (_c = targetDoc.data()) === null || _c === void 0 ? void 0 : _c.email;
        if (targetEmail) {
            await db.collection('banned_emails').doc(targetEmail).set({
                bannedAt: admin.firestore.FieldValue.serverTimestamp(),
                bannedBy: request.auth.uid,
                reason: 'Banned by Super Admin'
            });
        }
    }
    else if (action === 'delete') {
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
        }
        catch (e) {
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
});
exports.getUserStatus = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
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
    const activeGamesCountSnap = await db.collection('games')
        .where('hostUid', '==', request.auth.uid)
        .where('deletedAt', '==', null)
        .count()
        .get();
    return Object.assign(Object.assign({}, userData), { gameCount: activeGamesCountSnap.data().count });
});
exports.getSystemStats = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    // Super Check
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();
    const isSuper = (callerSnap.exists && ((_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role) === 'superadmin') || request.auth.token.email === 'florian.feldhaus@gmail.com';
    if (!isSuper)
        throw new https_1.HttpsError('permission-denied', 'Super Admins only');
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
            active: totalGamesSnap.data().count - deletedGamesSnap.data().count
        },
        users: {
            total: totalUsersSnap.data().count,
            pending: pendingUsersSnap.data().count,
            admins: adminUsersSnap.data().count
        }
    };
});
exports.getPendingUsers = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    // Super Check
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();
    const isSuper = (callerSnap.exists && ((_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role) === 'superadmin') || request.auth.token.email === 'florian.feldhaus@gmail.com';
    if (!isSuper)
        throw new https_1.HttpsError('permission-denied', 'Super Admins only');
    const snap = await db.collection('users').where('role', '==', 'pending').get();
    return snap.docs.map(d => d.data());
});
exports.getAllAdmins = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    // Super Check
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();
    const isSuper = (callerSnap.exists && ((_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role) === 'superadmin') || request.auth.token.email === 'florian.feldhaus@gmail.com';
    if (!isSuper)
        throw new https_1.HttpsError('permission-denied', 'Super Admins only');
    const snap = await db.collection('users').where('role', 'in', ['admin', 'superadmin']).get();
    return snap.docs.map(d => d.data());
});
exports.getAdminGames = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const { page = 1, pageSize = 10, showDeleted = false, targetUid } = request.data;
    const offset = (page - 1) * pageSize;
    let searchUid = request.auth.uid;
    // Super Admin Override
    if (targetUid && targetUid !== request.auth.uid) {
        const callerRef = db.collection('users').doc(request.auth.uid);
        const callerSnap = await callerRef.get();
        const isSuper = (callerSnap.exists && ((_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role) === 'superadmin') || request.auth.token.email === 'florian.feldhaus@gmail.com';
        if (!isSuper) {
            throw new https_1.HttpsError('permission-denied', 'Only Super Admins can view other users games.');
        }
        searchUid = targetUid;
    }
    // Return games hosted by the target user
    let query = db.collection('games')
        .where('hostUid', '==', searchUid);
    if (showDeleted) {
        query = query.where('deletedAt', '!=', null).orderBy('deletedAt', 'desc');
    }
    else {
        query = query.where('deletedAt', '==', null).orderBy('createdAt', 'desc');
    }
    try {
        const snapshot = await query
            .limit(pageSize)
            .offset(offset)
            .get();
        // Get total count for pagination UI
        const countSnapshot = await query.count().get();
        const total = countSnapshot.data().count;
        const games = snapshot.docs.map(doc => {
            var _a;
            const d = doc.data();
            return {
                id: d.id,
                name: d.name,
                password: d.password, // Legacy support
                playerSecrets: d.playerSecrets, // New per-player secrets
                config: d.config,
                status: d.status,
                createdAt: (_a = d.createdAt) === null || _a === void 0 ? void 0 : _a.toDate().toISOString(),
                players: d.players,
                currentRoundNumber: d.currentRoundNumber,
                retentionDays: d.retentionDays,
                deletedAt: d.deletedAt ? d.deletedAt.toDate().toISOString() : null
            };
        });
        return { games, total };
    }
    catch (error) {
        console.error('Error fetching admin games:', error);
        // Expose index errors for debugging
        if (error.code === 9 && error.message.includes('index')) {
            throw new https_1.HttpsError('failed-precondition', `Missing Index: ${error.message}`);
        }
        throw new https_1.HttpsError('internal', error.message || 'Unknown error fetching games');
    }
});
exports.updatePlayerType = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const { gameId, playerNumber, type, aiLevel } = request.data;
    if (!gameId || !playerNumber || !type) {
        throw new https_1.HttpsError('invalid-argument', 'Missing arguments');
    }
    const gameRef = db.collection('games').doc(gameId);
    const uid = `player-${gameId}-${playerNumber}`;
    await db.runTransaction(async (t) => {
        var _a, _b, _c;
        // 1. ALL READS FIRST
        const doc = await t.get(gameRef);
        if (!doc.exists)
            throw new https_1.HttpsError('not-found', 'Game not found');
        const game = doc.data();
        if (game.hostUid !== request.auth.uid) {
            throw new https_1.HttpsError('permission-denied', 'Not your game');
        }
        // 2. LOGIC
        const players = game.players || {};
        const existingPlayer = players[uid];
        if (type === 'ai') {
            players[uid] = Object.assign(Object.assign({}, (existingPlayer || {})), { uid: uid, displayName: (existingPlayer === null || existingPlayer === void 0 ? void 0 : existingPlayer.displayName) || `AI Player ${playerNumber}`, isAi: true, aiLevel: aiLevel || 'middle', capital: (_a = existingPlayer === null || existingPlayer === void 0 ? void 0 : existingPlayer.capital) !== null && _a !== void 0 ? _a : 1000, currentRound: (_b = existingPlayer === null || existingPlayer === void 0 ? void 0 : existingPlayer.currentRound) !== null && _b !== void 0 ? _b : 0, history: (_c = existingPlayer === null || existingPlayer === void 0 ? void 0 : existingPlayer.history) !== null && _c !== void 0 ? _c : [] });
        }
        else {
            // Convert to Human
            if (existingPlayer) {
                players[uid].isAi = false;
                delete players[uid].aiLevel;
                players[uid].displayName = `Player ${playerNumber}`;
            }
            else {
                players[uid] = {
                    uid,
                    displayName: `Player ${playerNumber}`,
                    isAi: false,
                    capital: 1000,
                    currentRound: 0,
                    history: []
                };
            }
        }
        // If changed to AI, auto-process turn (modifies players object)
        if (type === 'ai') {
            const updatedPlayers = await internalProcessAiTurns(gameId, t, Object.assign(Object.assign({}, game), { players })) || players;
            // Check if this AI turn completes the round
            const calculationPerformed = await checkAndPerformCalculation(gameId, t, Object.assign(Object.assign({}, game), { players: updatedPlayers }));
            if (!calculationPerformed) {
                t.update(gameRef, {
                    players: updatedPlayers,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        else {
            // 3. WRITES
            t.update(gameRef, {
                players,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    });
    return { success: true };
});
exports.deleteGames = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const { gameIds, force } = request.data;
    if (!Array.isArray(gameIds) || gameIds.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'No game IDs provided');
    }
    // Check if Super Admin
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();
    const isSuper = (callerSnap.exists && ((_a = callerSnap.data()) === null || _a === void 0 ? void 0 : _a.role) === 'superadmin') || request.auth.token.email === 'florian.feldhaus@gmail.com';
    // Process deletions
    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH = 500;
    for (const gameId of gameIds) {
        const gameRef = db.collection('games').doc(gameId);
        const doc = await gameRef.get();
        if (doc.exists) {
            const isOwner = ((_b = doc.data()) === null || _b === void 0 ? void 0 : _b.hostUid) === request.auth.uid;
            if (isOwner || isSuper) {
                if (force) {
                    // Hard Delete
                    await db.recursiveDelete(gameRef);
                }
                else {
                    // Soft Delete
                    batch.update(gameRef, {
                        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                        status: 'deleted'
                    });
                    batchCount++;
                    if (batchCount >= MAX_BATCH) {
                        await batch.commit();
                        batchCount = 0;
                    }
                }
            }
            else {
                console.warn(`Skipping delete for ${gameId}: Not owner and not super admin.`);
            }
        }
    }
    if (batchCount > 0) {
        await batch.commit();
    }
    return { success: true };
});
exports.undeleteGames = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const { gameIds } = request.data;
    if (!Array.isArray(gameIds) || gameIds.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'No game IDs provided');
    }
    const batch = db.batch();
    let batchCount = 0;
    for (const gameId of gameIds) {
        const gameRef = db.collection('games').doc(gameId);
        const doc = await gameRef.get();
        if (doc.exists && ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.hostUid) === request.auth.uid) {
            batch.update(gameRef, { deletedAt: null, status: 'waiting' }); // Or restore previous status? 'waiting'/ 'active' is safe.
            batchCount++;
        }
    }
    if (batchCount > 0) {
        await batch.commit();
    }
    return { success: true };
});
exports.dailyGamePurge = (0, scheduler_1.onSchedule)({ schedule: 'every 24 hours', region: 'europe-west3' }, async (event) => {
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
    activeGamesSnap.forEach(doc => {
        const data = doc.data();
        const retentionDays = data.retentionDays || 90;
        const createdAt = data.createdAt.toMillis();
        const expiresAt = createdAt + (retentionDays * ONE_DAY_MS);
        if (nowMillis > expiresAt) {
            softDeleteBatch.update(doc.ref, {
                deletedAt: now,
                status: 'expired'
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
    const trashSnap = await db.collection('games')
        .where('deletedAt', '<', purgeThreshold)
        .get();
    console.log(`Found ${trashSnap.size} games to permanently purge.`);
    for (const doc of trashSnap.docs) {
        await db.recursiveDelete(doc.ref);
    }
});
exports.playerLogin = (0, https_1.onCall)(async (request) => {
    const { gameId, password } = request.data;
    if (!gameId || !password) {
        throw new https_1.HttpsError('invalid-argument', 'Missing gameId, or password');
    }
    const gameDoc = await db.collection('games').doc(gameId).get();
    if (!gameDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Game not found');
    }
    const game = gameDoc.data();
    const playerSecrets = (game === null || game === void 0 ? void 0 : game['playerSecrets']) || {};
    // playerSecrets is { "1": { password: "PIN1" }, "2": { password: "PIN2" }, ... }
    const playerNumber = Object.keys(playerSecrets).find(key => { var _a; return ((_a = playerSecrets[key]) === null || _a === void 0 ? void 0 : _a.password) === password; });
    if (!playerNumber) {
        throw new https_1.HttpsError('permission-denied', 'Incorrect PIN');
    }
    // Construct deterministic UID for the player
    const uid = `player-${gameId}-${playerNumber}`;
    try {
        const customToken = await admin.auth().createCustomToken(uid, {
            gameId,
            role: 'player',
            playerNumber
        });
        return { customToken };
    }
    catch (error) {
        console.error('Token creation error:', error);
        throw new https_1.HttpsError('internal', `Failed to create token: ${error.message}`);
    }
});
exports.triggerAiTurn = (0, https_1.onCall)(async (request) => {
    var _a;
    const { gameId, level = 'rotation' } = request.data;
    // Logic to fetch game state, run AiAgent.makeDecision, and then call calculateRound logic (or return decision)
    // For now, just return a decision
    const gameRef = db.collection('games').doc(gameId);
    const roundsRef = gameRef.collection('rounds');
    const roundsSnap = await roundsRef.orderBy('number', 'desc').limit(1).get();
    const lastRound = (_a = roundsSnap.docs[0]) === null || _a === void 0 ? void 0 : _a.data();
    return ai_agent_1.AiAgent.makeDecision(level, lastRound);
});
exports.updateRoundDeadline = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    const { gameId, roundNumber, deadline } = request.data;
    if (!gameId || roundNumber === undefined)
        throw new https_1.HttpsError('invalid-argument', 'Missing gameId or roundNumber');
    const gameRef = db.collection('games').doc(gameId);
    const gameSnap = await gameRef.get();
    if (!gameSnap.exists)
        throw new https_1.HttpsError('not-found', 'Game not found');
    if (((_a = gameSnap.data()) === null || _a === void 0 ? void 0 : _a.hostUid) !== request.auth.uid)
        throw new https_1.HttpsError('permission-denied', 'Not your game');
    const deadlines = ((_b = gameSnap.data()) === null || _b === void 0 ? void 0 : _b.roundDeadlines) || {};
    if (deadline) {
        deadlines[roundNumber] = admin.firestore.Timestamp.fromDate(new Date(deadline));
    }
    else {
        delete deadlines[roundNumber];
    }
    await gameRef.update({ roundDeadlines: deadlines });
    return { success: true };
});
exports.processDeadlines = (0, scheduler_1.onSchedule)({ schedule: "every 1 minutes", region: "europe-west3" }, async (event) => {
    var _a;
    const now = admin.firestore.Timestamp.now();
    // Find games in progress
    const activeGames = await db.collection('games')
        .where('status', '==', 'in_progress')
        .get();
    for (const gameDoc of activeGames.docs) {
        const game = gameDoc.data();
        const currentRound = game.currentRoundNumber;
        const deadline = (_a = game.roundDeadlines) === null || _a === void 0 ? void 0 : _a[currentRound];
        if (deadline && deadline.toMillis() < now.toMillis()) {
            console.log(`Deadline passed for game ${game.id} round ${currentRound}. Forcing AI turns.`);
            await db.runTransaction(async (transaction) => {
                const refreshedGameDoc = await transaction.get(gameDoc.ref);
                const refreshedGame = refreshedGameDoc.data();
                if (!refreshedGame || refreshedGame.status !== 'in_progress')
                    return;
                const players = refreshedGame.players || {};
                let logicNeedsCalc = false;
                for (const uid in players) {
                    const p = players[uid];
                    if (p.submittedRound === undefined || p.submittedRound < currentRound) {
                        // FORCE AI decision
                        const lastRound = p.history && p.history.length > 0 ? p.history[p.history.length - 1] : undefined;
                        const aiLevel = p.isAi ? (p.aiLevel || 'middle') : 'middle';
                        const decision = ai_agent_1.AiAgent.makeDecision(aiLevel, lastRound);
                        p.submittedRound = currentRound;
                        p.pendingDecisions = decision;
                        logicNeedsCalc = true;
                    }
                }
                if (logicNeedsCalc) {
                    const allSubmitted = Object.values(players).every((p) => p.submittedRound === currentRound);
                    if (allSubmitted) {
                        await performCalculation(game.id, null, transaction, Object.assign(Object.assign({}, refreshedGame), { players }));
                    }
                    else {
                        transaction.update(gameDoc.ref, { players });
                    }
                }
            });
        }
    }
});
exports.saveDraft = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
    }
    const { gameId, decision } = request.data;
    if (!gameId || !decision) {
        throw new https_1.HttpsError('invalid-argument', 'Missing gameId or decision');
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
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        // If error is NOT FOUND, throw.
        console.error('saveDraft failed:', error);
        throw new https_1.HttpsError('internal', 'Failed to save draft');
    }
    return { success: true };
});
//# sourceMappingURL=index.js.map
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ region: "europe-west1" });
import { onSchedule } from "firebase-functions/v2/scheduler";
import { GameEngine } from './game-engine';
import { AiAgent } from './ai-agent';
import { Round } from './types';
import { generateRandomPassword } from './utils';

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
    const rounds = roundsSnap.docs.map(doc => doc.data() as Round);

    return {
        game: {
            id: game.id,
            status: game.status,
            currentRoundNumber: game.currentRoundNumber,
            settings: game.settings
        },
        playerState: {
            ...playerState,
            playerNumber: uid.startsWith('player-') ? uid.split('-')[2] : undefined,
            history: rounds
        },
        lastRound: rounds[rounds.length - 1]
    };
});

export const submitDecision = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
    const { gameId, decision } = request.data;
    const uid = request.auth.uid;

    if (!gameId || !decision) {
        throw new HttpsError('invalid-argument', 'Missing gameId or decision');
    }

    const gameRef = db.collection('games').doc(gameId);

    try {
        return await db.runTransaction(async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists) throw new HttpsError('not-found', 'Game not found');

            const game = gameDoc.data()!;
            const players = game.players || {};

            if (!players[uid]) throw new HttpsError('permission-denied', 'Not a player in this game');

            // Mark player as submitted for CURRENT round
            const currentRound = game.currentRoundNumber || 0;
            players[uid].submittedRound = currentRound;
            players[uid].pendingDecisions = decision;

            // Check if all HUMAN players have submitted
            const allHumanPlayers = Object.values(players).filter((p: any) => !p.isAi);
            const allSubmitted = allHumanPlayers.every((p: any) => p.submittedRound === currentRound);

            transaction.update(gameRef, {
                players,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            if (allSubmitted) {
                console.log(`All players submitted for round ${currentRound}. Calculating next round...`);
                const nextRound = await performCalculation(gameId, decision, transaction);
                return { status: 'calculated', nextRound };
            }

            return { status: 'submitted' };
        });
    } catch (error: any) {
        console.error('Error in submitDecision:', error);
        throw new HttpsError('internal', error.message || 'Internal Error');
    }
});

async function performCalculation(gameId: string, decision: any, transaction: admin.firestore.Transaction) {
    const gameRef = db.collection('games').doc(gameId);
    const roundsRef = gameRef.collection('rounds');

    // Get latest round
    const roundsSnap = await transaction.get(roundsRef.orderBy('number', 'desc').limit(1));
    const lastRoundDoc = roundsSnap.docs[0];
    const lastRound = lastRoundDoc ? lastRoundDoc.data() as Round : undefined;
    const nextRoundNumber = lastRound ? lastRound.number + 1 : 1;

    console.log(`Calculating round ${nextRoundNumber} for game ${gameId}`);

    // Calculate new state
    const events = {
        weather: Math.random() > 0.8 ? 'Drought' : (Math.random() < 0.2 ? 'Flood' : 'Normal'),
        vermin: Math.random() > 0.9 ? 'Beetle' : 'None'
    };

    const nextRound = GameEngine.calculateRound(nextRoundNumber, lastRound, decision, events);

    // Save new round
    const newRoundRef = roundsRef.doc(`round_${nextRoundNumber}`);
    transaction.set(newRoundRef, nextRound);

    // Update game state (current round pointer)
    transaction.update(gameRef, {
        currentRoundNumber: nextRoundNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Round ${nextRoundNumber} saved successfully`);
    return nextRound;
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

// --- Admin / Roles ---

export const impersonatePlayer = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated to create a game.');
    }

    if (request.auth.token['role'] !== 'admin') {
        // Fallback for development: allow specific UID or email?
        // throw new HttpsError('permission-denied', 'Only admins can impersonate.');
    }

    const { targetUid } = request.data;
    if (!targetUid) {
        throw new HttpsError('invalid-argument', 'Target UID required.');
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
    } catch (error: any) {
        console.error('Token creation error:', error);
        throw new HttpsError('internal', `Failed to create token: ${error.message}`);
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
        settings = { length: 10, difficulty: 'normal', playerLabel: 'Player' },
        config = { numPlayers: 1, numRounds: 10, numAi: 0 }, // Default config
        retentionDays = 90
    } = request.data;

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
    let gameCount = 0;

    if (userSnap.exists) {
        const userData = userSnap.data();
        userRole = userData?.role || 'pending';
        quota = userData?.quota || 5;
        gameCount = userData?.gameCount || 0;
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
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    if (userRole !== 'admin' && userRole !== 'superadmin') {
        throw new HttpsError('permission-denied', 'You must be an approved admin to create games.');
    }

    if (gameCount >= quota) {
        throw new HttpsError('resource-exhausted', `Game quota exceeded (${gameCount}/${quota}). Request an increase.`);
    }

    // Validate retention
    const validRetention = Math.min(Math.max(Number(retentionDays) || 90, 1), 365);

    const gameId = db.collection('games').doc().id;

    // Generate secrets for all players
    const numPlayers = config.numPlayers || 1;
    const playerSecrets: Record<string, { password: string }> = {};
    for (let i = 1; i <= numPlayers; i++) {
        playerSecrets[String(i)] = {
            password: generateRandomPassword(6)
        };
    }

    const newGame = {
        id: gameId,
        name: name || `Game ${gameId.substr(0, 6)}`,
        // password: finalPassword, // Removed global password
        hostUid: request.auth.uid,
        status: 'waiting',
        settings, // Keep old settings structure for compatibility if needed, or merge
        config,   // New explicit config
        players: {
            [request.auth.uid]: {
                uid: request.auth.uid,
                displayName: request.auth.token.name || 'Host',
                isAi: false,
                capital: 1000,
                currentRound: 0,
                history: []
            },
            // Initialize AI players if requested
            // Using player-GAMEID-N format to align with playerLogin
            ...Array(config.numAi || 0).fill(0).reduce((acc, _, i) => {
                const playerNumber = i + 1;
                const aiId = `player-${gameId}-${playerNumber}`;
                acc[aiId] = {
                    uid: aiId,
                    displayName: `AI Player ${playerNumber}`,
                    isAi: true,
                    capital: 1000,
                    currentRound: 0,
                    history: []
                };
                return acc;
            }, {} as any)
        },

        currentRoundNumber: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        retentionDays: validRetention,
        deletedAt: null,
        playerSecrets
    };

    await db.runTransaction(async (t) => {
        t.set(db.collection('games').doc(gameId), newGame);

        // Initialize Round 0
        const initialParcels = GameEngine.createInitialParcels();
        t.set(db.collection('games').doc(gameId).collection('rounds').doc('round_0'), {
            number: 0,
            decision: { machines: 0, organic: false, fertilizer: false, pesticide: false, organisms: false, parcels: {} },
            parcelsSnapshot: initialParcels
        });

        // Increment User Game Count
        if (userSnap.exists) { // Only increment if user doc exists (which it should for admins)
            t.update(userRef, { gameCount: admin.firestore.FieldValue.increment(1) });
        }
    });

    return {
        gameId,
        password: playerSecrets['1']?.password
    };
});

// --- User Management ---

export const submitOnboarding = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { firstName, lastName, explanation, institution, institutionLink } = request.data;
    const email = request.auth.token.email || '';

    // Check Banned Emails
    const bannedSnap = await db.collection('banned_emails').doc(email).get();
    if (bannedSnap.exists) {
        throw new HttpsError('permission-denied', 'This email is banned from registration.');
    }

    // Basic Validation
    if (!explanation || !institution || !firstName || !lastName) {
        throw new HttpsError('invalid-argument', 'Missing fields');
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

export const manageAdmin = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    // Super Admin Check
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();

    // Allow hardcoded superadmin for bootstrap
    const isSuper = (callerSnap.exists && callerSnap.data()?.role === 'superadmin') || request.auth.token.email === 'florian.feldhaus@gmail.com';

    if (!isSuper) {
        throw new HttpsError('permission-denied', 'Super Admins only');
    }

    const { targetUid, action, value } = request.data;
    if (!targetUid || !action) throw new HttpsError('invalid-argument', 'Missing args');

    const targetRef = db.collection('users').doc(targetUid);
    const updates: any = {};

    if (action === 'approve') {
        updates.role = 'admin';
        updates.status = 'active';
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
                    reason: 'Rejected by Super Admin'
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
                reason: 'Banned by Super Admin'
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
});

export const getUserStatus = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const userRef = db.collection('users').doc(request.auth.uid);
    const doc = await userRef.get();

    if (!doc.exists) {
        // Bootstrap Check
        if (request.auth.token.email === 'florian.feldhaus@gmail.com') {
            return { role: 'superadmin', status: 'active', quota: 999 };
        }
        return { role: 'new', status: 'unknown' };
    }

    return doc.data();
});

export const getSystemStats = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    // Super Check
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();
    const isSuper = (callerSnap.exists && callerSnap.data()?.role === 'superadmin') || request.auth.token.email === 'florian.feldhaus@gmail.com';

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
            active: totalGamesSnap.data().count - deletedGamesSnap.data().count
        },
        users: {
            total: totalUsersSnap.data().count,
            pending: pendingUsersSnap.data().count,
            admins: adminUsersSnap.data().count
        }
    };
});

export const getPendingUsers = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    // Super Check
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();
    const isSuper = (callerSnap.exists && callerSnap.data()?.role === 'superadmin') || request.auth.token.email === 'florian.feldhaus@gmail.com';

    if (!isSuper) throw new HttpsError('permission-denied', 'Super Admins only');

    const snap = await db.collection('users').where('role', '==', 'pending').get();
    return snap.docs.map(d => d.data());
});

export const getAllAdmins = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    // Super Check
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();
    const isSuper = (callerSnap.exists && callerSnap.data()?.role === 'superadmin') || request.auth.token.email === 'florian.feldhaus@gmail.com';

    if (!isSuper) throw new HttpsError('permission-denied', 'Super Admins only');

    const snap = await db.collection('users').where('role', 'in', ['admin', 'superadmin']).get();
    return snap.docs.map(d => d.data());
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
        const isSuper = (callerSnap.exists && callerSnap.data()?.role === 'superadmin') || request.auth.token.email === 'florian.feldhaus@gmail.com';

        if (!isSuper) {
            throw new HttpsError('permission-denied', 'Only Super Admins can view other users games.');
        }
        searchUid = targetUid;
    }

    // Return games hosted by the target user
    let query = db.collection('games')
        .where('hostUid', '==', searchUid);

    if (showDeleted) {
        query = query.where('deletedAt', '!=', null).orderBy('deletedAt', 'desc');
    } else {
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
                deletedAt: d.deletedAt ? d.deletedAt.toDate().toISOString() : null
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

export const updatePlayerType = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in');
    }

    const { gameId, playerNumber, type } = request.data;

    if (!gameId || !playerNumber || !type) {
        throw new HttpsError('invalid-argument', 'Missing arguments');
    }

    const gameRef = db.collection('games').doc(gameId);
    const uid = `player-${gameId}-${playerNumber}`;

    await db.runTransaction(async (t) => {
        const doc = await t.get(gameRef);
        if (!doc.exists) throw new HttpsError('not-found', 'Game not found');

        const game = doc.data()!;
        if (game.hostUid !== request.auth!.uid) {
            throw new HttpsError('permission-denied', 'Not your game');
        }

        const players = game.players || {};
        const existingPlayer = players[uid];

        if (type === 'ai') {
            players[uid] = {
                ...(existingPlayer || {}),
                uid: uid,
                displayName: existingPlayer?.displayName || `AI Player ${playerNumber}`,
                isAi: true,
                capital: existingPlayer?.capital ?? 1000,
                currentRound: existingPlayer?.currentRound ?? 0,
                history: existingPlayer?.history ?? []
            };
        } else {
            // Convert to Human
            if (existingPlayer) {
                players[uid].isAi = false;
                players[uid].displayName = `Player ${playerNumber}`;
            } else {
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

        t.update(gameRef, { players });
    });

    return { success: true };
});

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
    const isSuper = (callerSnap.exists && callerSnap.data()?.role === 'superadmin') || request.auth.token.email === 'florian.feldhaus@gmail.com';

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
                        status: 'deleted'
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

export const dailyGamePurge = onSchedule('every 24 hours', async (event) => {
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
    const playerNumber = Object.keys(playerSecrets).find(key => playerSecrets[key]?.password === password);

    if (!playerNumber) {
        throw new HttpsError('permission-denied', 'Incorrect PIN');
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

    return AiAgent.makeDecision(level, lastRound);
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
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error: any) {
        // If error is NOT FOUND, throw.
        console.error('saveDraft failed:', error);
        throw new HttpsError('internal', 'Failed to save draft');
    }

    return { success: true };
});

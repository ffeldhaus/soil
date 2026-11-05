import { GoogleGenAI } from '@google/genai';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { AiAgent } from './ai-agent';
import { GAME_CONSTANTS, GEMINI_MODEL } from './constants';
import {
  buildFeedbackNotificationEmail,
  buildWeeklyDigestEmail,
  sanitizeOptionalFeedbackEmail,
  sendFeedbackReplyEmailIfPresent,
  summarizeWeeklyCloudGames,
  summarizeWeeklyFeedback,
  summarizeWeeklyResearchGames,
} from './digest-feedback.helpers';
import { GameEngine } from './game-engine';
import { mailService } from './mail.service';
import {
  buildPublicResearchDataset,
  checkPublicRateLimit,
  handleResearchApiHttpRequest,
  handleResearchMcpHttpRequest,
  sanitizeResearchGameForPublic,
} from './research.service';
import { aggregateTelemetryStats, handleTelemetryHttpRequest } from './telemetry.service';
import type { CropType, Round, RoundDecision, WeatherType } from './types';
import { generateRandomPassword } from './utils';

const DEFAULT_ORIGIN = 'https://soil.app';
const ALLOWED_ORIGINS = new Set([DEFAULT_ORIGIN, 'https://soil--soil-602ea.europe-west4.hosted.app']);

export function sanitizeOrigin(origin?: string): string {
  if (!origin || typeof origin !== 'string') return DEFAULT_ORIGIN;
  const trimmed = origin.trim().replace(/\/+$/, '');
  if (ALLOWED_ORIGINS.has(trimmed)) return trimmed;
  if (process.env.FUNCTIONS_EMULATOR === 'true' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(trimmed)) {
    return trimmed;
  }
  return DEFAULT_ORIGIN;
}

export function isTestEmail(email?: string | null): boolean {
  if (!email) return false;
  return /(\+test|@example\.com$|^test@|^e2e@)/i.test(email.trim());
}

function countHumanRoundDecisions(rounds: any[]): { total: number; nonFallow: number } {
  let total = 0;
  let nonFallow = 0;
  for (const r of rounds) {
    if (!r || r.number <= 0 || !r.decision?.parcels || typeof r.decision.parcels !== 'object') continue;
    for (const crop of Object.values(r.decision.parcels)) {
      total++;
      if (crop && crop !== 'Fallow') {
        nonFallow++;
      }
    }
  }
  return { total, nonFallow };
}

function isFallowClickThroughGame(game: any, allRounds?: Record<string, any[]>): boolean {
  if (!allRounds || typeof allRounds !== 'object') return false;
  let totalHumanParcelDecisions = 0;
  let nonFallowCount = 0;
  for (const uid of Object.keys(allRounds)) {
    if (game.players?.[uid]?.isAi) continue;
    const { total, nonFallow } = countHumanRoundDecisions(allRounds[uid] || []);
    totalHumanParcelDecisions += total;
    nonFallowCount += nonFallow;
  }
  return totalHumanParcelDecisions >= 40 && nonFallowCount === 0;
}

export function isTestOrDegenerateGame(game: any, allRounds?: Record<string, any[]>): boolean {
  if (!game) return true;
  if (game.isTest === true || game.config?.isTest === true) return true;
  if (game.hostUid === 'test-admin-uid' || isTestEmail(game.hostEmail)) return true;
  if (/^(Research E2E|E2E Test|Cypress)/i.test(String(game.name || '').trim())) return true;

  // Filter out 100%-Fallow click-through test games where human parcel decisions exist
  // (at least 1 full round of 40 parcels) and zero actual crops were ever planted.
  return isFallowClickThroughGame(game, allRounds);
}

export async function deleteGamePlayerAuthAccounts(gameId: string, maxPlayersOrGameData: number | any = 10) {
  const maxPlayers =
    typeof maxPlayersOrGameData === 'number'
      ? maxPlayersOrGameData
      : Number(maxPlayersOrGameData?.config?.numPlayers || 10);
  const uids: string[] = [];
  for (let i = 1; i <= Math.min(20, Math.max(1, maxPlayers)); i++) {
    uids.push(`player-${gameId}-${i}`);
  }
  try {
    await admin.auth().deleteUsers(uids);
  } catch (e) {
    console.warn(`Failed to clean up player auth accounts for game ${gameId}:`, e);
  }
}

export function enforceCallableRateLimit(
  request: { rawRequest?: any; auth?: any } | undefined,
  action: string,
  limit: number,
): void {
  const ip =
    request?.rawRequest?.ip ||
    request?.rawRequest?.headers?.['x-forwarded-for']?.split(',')?.[0]?.trim() ||
    request?.auth?.uid ||
    'callable';
  const rate = checkPublicRateLimit(`${action}:${ip}`, limit, 60_000);
  if (!rate.allowed) {
    throw new HttpsError('resource-exhausted', 'Rate limit exceeded. Please try again in a minute.');
  }
}

setGlobalOptions({
  region: 'europe-west4',
  serviceAccount: 'firebase-app-hosting-compute@soil-602ea.iam.gserviceaccount.com',
});

admin.initializeApp();
export const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

let genAiClient: GoogleGenAI | null = null;

function getGenAiClient(): GoogleGenAI {
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({
      vertexai: true,
      project: 'soil-602ea',
      location: 'europe-west4',
    });
  }
  return genAiClient;
}

// --- HTTP Callable Functions for Game Logic ---

// --- Sync and Game State ---

function buildMigratedUidMap(game: any, uid: string, targetGameId: string): Record<string, string> {
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
  return uidMap;
}

function buildMigratedPlayers(game: any, uidMap: Record<string, string>, hostUid: string): Record<string, any> {
  const newPlayers: Record<string, any> = {};
  for (const oldUid in game.players) {
    const newUid = uidMap[oldUid];
    const p = game.players[oldUid];
    newPlayers[newUid] = {
      ...p,
      uid: newUid,
      hostUid: newUid === hostUid ? hostUid : undefined,
      joinedAt: Timestamp.now(),
      history: p.history.map((h: any) => ({
        ...h,
        parcelsSnapshot: [],
      })),
    };
  }
  return newPlayers;
}

function writeMigratedRoundsToTransaction(
  t: admin.firestore.Transaction,
  targetGameId: string,
  startRound: number,
  currentRound: number,
  allRounds: Record<string, any[]>,
  uidMap: Record<string, string>,
): void {
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
}

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

  // 2. Map UIDs & Prepare Game Document
  const uidMap = buildMigratedUidMap(game, uid, targetGameId);
  const newPlayers = buildMigratedPlayers(game, uidMap, uid);

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
    writeMigratedRoundsToTransaction(t, targetGameId, startRound, game.currentRoundNumber || 0, allRounds, uidMap);
  });

  return { success: true, gameId: targetGameId, status: startRound === 0 ? 'created' : 'updated' };
});

// --- System Analysis and Balancing ---

async function incrementGameAnalysisCounter() {
  const metadataRef = db.collection('system_metadata').doc('analysis');
  await db.runTransaction(async (t) => {
    const doc = await t.get(metadataRef);
    const count = (doc.data()?.gameCount || 0) + 1;
    t.set(metadataRef, { gameCount: count }, { merge: true });

    if (count > 0 && count % 100 === 0) {
      // Trigger background analysis (we don't wait for it here to avoid blocking)
      // In a real production environment, we might use a Task Queue or another trigger.
      // For now, we just acknowledge the threshold.
      // biome-ignore lint/suspicious/noConsole: System trigger log
      console.log(`Analysis threshold reached: ${count} games. Triggering analysis.`);
    }
  });
}

function sanitizeResearchDecision(decision: any): any {
  if (!decision) return undefined;
  return {
    organic: !!decision.organic,
    fertilizer: !!decision.fertilizer,
    pesticide: !!decision.pesticide,
    organisms: !!decision.organisms,
    parcels: typeof decision.parcels === 'object' ? decision.parcels : {},
  };
}

function sanitizeResearchExpenses(expenses: any): any {
  if (!expenses) return undefined;
  return {
    seeds: Number(expenses.seeds || 0),
    labor: Number(expenses.labor || 0),
    running: Number(expenses.running || 0),
    investments: Number(expenses.investments || 0),
    total: Number(expenses.total || 0),
  };
}

function sanitizeResearchEvents(events: any): { weather: string; vermin: string[] } {
  if (!events) return { weather: 'Normal', vermin: [] };
  return {
    weather: String(events.weather || 'Normal'),
    vermin: Array.isArray(events.vermin) ? events.vermin.slice(0, 10) : [],
  };
}

function sanitizeResearchHistoryResult(result: any): any {
  if (!result) return undefined;
  return {
    profit: Number(result.profit || 0),
    capital: Number(result.capital || 0),
    income: Number(result.income || 0),
    subsidies: Number(result.subsidies || 0),
    expenses: sanitizeResearchExpenses(result.expenses),
    events: sanitizeResearchEvents(result.events),
    harvestSummary: typeof result.harvestSummary === 'object' ? result.harvestSummary : {},
  };
}

function buildAnonymizedPlayersForResearch(
  players: Record<string, any>,
  targetGameId: string,
): { anonymizedPlayers: Record<string, any>; uidMap: Record<string, string> } {
  const anonymizedPlayers: Record<string, any> = {};
  const uidMap: Record<string, string> = {};

  for (const oldUid in players) {
    const p = players[oldUid];
    const suffix = p.playerNumber || oldUid.split('-').pop();
    const newUid = `player-${targetGameId}-${suffix}`;
    uidMap[oldUid] = newUid;

    anonymizedPlayers[newUid] = {
      uid: newUid,
      displayName: `Team ${suffix}`,
      isAi: !!p.isAi,
      aiLevel: p.aiLevel,
      playerNumber: Number(p.playerNumber),
      capital: Number(p.capital || 0),
      currentRound: Number(p.currentRound || 0),
      avgSoil: Number(p.avgSoil || 0),
      avgNutrition: Number(p.avgNutrition || 0),
      history: (p.history || []).slice(0, 100).map((h: any) => ({
        number: Number(h.number),
        avgSoil: Number(h.avgSoil || 0),
        avgNutrition: Number(h.avgNutrition || 0),
        decision: sanitizeResearchDecision(h.decision),
        result: sanitizeResearchHistoryResult(h.result),
        parcelsSnapshot: [],
      })),
    };
  }
  return { anonymizedPlayers, uidMap };
}

function sanitizeResearchRoundSnapshot(round: any): any {
  return {
    number: Number(round.number),
    avgSoil: Number(round.avgSoil || 0),
    avgNutrition: Number(round.avgNutrition || 0),
    decision: sanitizeResearchDecision(round.decision),
    result: round.result
      ? {
          profit: Number(round.result.profit || 0),
          capital: Number(round.result.capital || 0),
          income: Number(round.result.income || 0),
          subsidies: Number(round.result.subsidies || 0),
          expenses: round.result.expenses,
          events: round.result.events,
          harvestSummary: round.result.harvestSummary,
        }
      : undefined,
    parcelsSnapshot: Array.isArray(round.parcelsSnapshot)
      ? round.parcelsSnapshot.slice(0, 100).map((p: any) => ({
          index: Number(p.index),
          crop: String(p.crop),
          soil: Number(p.soil || 0),
          nutrition: Number(p.nutrition || 0),
          yield: Number(p.yield || 0),
          harvestRating: p.harvestRating,
        }))
      : [],
  };
}

function writeResearchRoundsToTransaction(
  t: admin.firestore.Transaction,
  targetGameId: string,
  currentRound: number,
  resolvedRounds: Record<string, any[]>,
  uidMap: Record<string, string>,
): void {
  for (let r = 0; r <= currentRound; r++) {
    const playerData: Record<string, any> = {};
    let roundEvents = { weather: 'Normal', vermin: [] };

    for (const oldUid in resolvedRounds) {
      const newUid = uidMap[oldUid];
      const round = resolvedRounds[oldUid][r];
      if (!round) continue;
      playerData[newUid] = sanitizeResearchRoundSnapshot(round);
      if (round.result?.events) {
        roundEvents = {
          weather: String(round.result.events.weather || 'Normal'),
          vermin: Array.isArray(round.result.events.vermin) ? round.result.events.vermin.slice(0, 10) : [],
        };
      }
    }

    t.set(db.collection('research_games').doc(targetGameId).collection('rounds').doc(`round_${r}`), {
      number: r,
      playerData,
      events: roundEvents,
      createdAt: Timestamp.now(),
    });
  }
}

async function fetchCloudRoundsForResearch(oldGameId: string): Promise<Record<string, any[]>> {
  const resolvedRounds: Record<string, any[]> = {};
  const roundsSnap = await db.collection('games').doc(oldGameId).collection('rounds').get();
  for (const doc of roundsSnap.docs) {
    const data = doc.data();
    const roundNum = data.number;
    for (const uid in data.playerData) {
      if (!resolvedRounds[uid]) resolvedRounds[uid] = [];
      resolvedRounds[uid][roundNum] = data.playerData[uid];
    }
  }
  return resolvedRounds;
}

function buildResearchGameDoc(
  game: any,
  targetGameId: string,
  oldGameId: string,
  anonymizedPlayers: Record<string, any>,
): any {
  const resolvedCreatedAt =
    typeof game.createdAt === 'string'
      ? Timestamp.fromDate(new Date(game.createdAt))
      : game.createdAt || Timestamp.now();

  return {
    id: targetGameId,
    name: 'Anonymized Game',
    status: String(game.status || 'finished'),
    currentRoundNumber: Math.min(100, Number(game.currentRoundNumber || 0)),
    settings: {
      length: Math.min(100, Number(game.settings?.length || GAME_CONSTANTS.DEFAULT_ROUNDS)),
      difficulty: String(game.settings?.difficulty || 'normal'),
      playerLabel: String(game.settings?.playerLabel || 'Player').substring(0, 50),
    },
    config: {
      numPlayers: Math.min(20, Number(game.config?.numPlayers || 1)),
      numRounds: Math.min(100, Number(game.config?.numRounds || GAME_CONSTANTS.DEFAULT_ROUNDS)),
      numAi: Math.min(20, Number(game.config?.numAi || 0)),
      advancedPricingEnabled: !!game.config?.advancedPricingEnabled,
    },
    players: anonymizedPlayers,
    updatedAt: Timestamp.now(),
    createdAt: resolvedCreatedAt,
    migratedFrom: oldGameId,
    isResearchData: true,
  };
}

/**
 * Anonymizes and uploads a finished game to the research_games collection.
 * Works for both local games (with allRounds provided) and cloud games (rounds fetched from DB).
 */
export async function internalAnonymizeAndUploadForResearch(game: any, allRounds?: Record<string, any[]>) {
  if (isTestOrDegenerateGame(game, allRounds)) {
    return { success: true, status: 'skipped_test_data' };
  }

  const oldGameId = game.id;
  const existingSnap = await db.collection('research_games').where('migratedFrom', '==', oldGameId).limit(1).get();
  if (!existingSnap.empty) {
    return { success: true, gameId: existingSnap.docs[0].id, status: 'already_uploaded' };
  }

  const targetDocRef = db.collection('research_games').doc(`research_${oldGameId}`);
  const targetGameId = targetDocRef.id || `research_${oldGameId}`;

  const resolvedRounds = allRounds || (await fetchCloudRoundsForResearch(oldGameId));
  if (!allRounds && isTestOrDegenerateGame(game, resolvedRounds)) {
    return { success: true, status: 'skipped_test_data' };
  }

  const { anonymizedPlayers, uidMap } = buildAnonymizedPlayersForResearch(game.players || {}, targetGameId);
  const gameDoc = buildResearchGameDoc(game, targetGameId, oldGameId, anonymizedPlayers);

  await db.runTransaction(async (t) => {
    t.set(db.collection('research_games').doc(targetGameId), gameDoc);
    const currentRound = Math.min(100, game.currentRoundNumber || 0);
    writeResearchRoundsToTransaction(t, targetGameId, currentRound, resolvedRounds, uidMap);
  });

  await incrementGameAnalysisCounter();
  return { success: true, gameId: targetGameId, status: 'uploaded' };
}

export const analyzeSystemBalance = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  // Super Admin Check
  const callerRef = db.collection('users').doc(request.auth.uid);
  const callerSnap = await callerRef.get();
  const isSuper =
    (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
    request.auth.token.email === 'florian.feldhaus@gmail.com';

  if (!isSuper) throw new HttpsError('permission-denied', 'Super-Administratoren only');

  // 1. Fetch current categories and metadata
  const categoriesSnap = await db.collection('game_categories').get();
  const existingCategories = categoriesSnap.docs.map((d) => d.data().name);

  // 2. Fetch a sample of recent games (e.g., last 100 research games)
  const gamesSnap = await db.collection('research_games').orderBy('updatedAt', 'desc').limit(100).get();
  const gameData = gamesSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: d.id,
      rounds: d.currentRoundNumber,
      players: Object.values(d.players || {}).map((p: any) => ({
        capital: p.capital,
        avgSoil: p.avgSoil,
        avgNutrition: p.avgNutrition,
        // history summary for strategy analysis
        history: (p.history || []).map((h: any) => ({
          round: h.number,
          decision: {
            organic: h.decision?.organic,
            fertilizer: h.decision?.fertilizer,
            pesticide: h.decision?.pesticide,
            organisms: h.decision?.organisms,
            crops: Object.values(h.decision?.parcels || {}).reduce((acc: any, crop: any) => {
              acc[crop] = (acc[crop] || 0) + 1;
              return acc;
            }, {}),
          },
          profit: h.result?.profit,
        })),
      })),
    };
  });

  const prompt = `
    Analyze the following dataset of ${gameData.length} games from the "SOIL" agricultural management game.
    
    Task 1: Clustering and Strategies
    Review the player strategies. Cluster them into logical groups. 
    Use these existing categories if they fit: ${existingCategories.join(', ')}.
    If you find distinct new strategies, describe them and give them a name.
    Every 100 games, we refine these descriptions to be more accurate based on actual player behavior.

    Task 2: Balancing and Gameplay Issues
    Identify any issues in the game mechanics:
    - Significant losses (players going bankrupt too easily).
    - Too high capital gains (economy is too easy).
    - Extremes in soil quality or nutrition (too high/low).
    - Crop balance: Are some crops too powerful? Too weak? Never used?
    - Systemic issues: Do certain combinations of inputs (fertilizer, organic, etc.) lead to degenerate playstyles?

    Game Data: ${JSON.stringify(gameData)}

    Provide a JSON response with:
    - "strategies": Array of objects { name, description, typicalMetrics: { capital, soil, nutrition }, keyDecisions }.
    - "balancingReport": {
        summary: string,
        issues: Array of { severity: 'low'|'medium'|'high', description, suggestion },
        cropAnalysis: Array of { crop, usageFrequency, performanceAssessment }
      }
  `;

  try {
    const result = await getGenAiClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            strategies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  typicalMetrics: {
                    type: 'object',
                    properties: {
                      capital: { type: 'number' },
                      soil: { type: 'number' },
                      nutrition: { type: 'number' },
                    },
                  },
                  keyDecisions: { type: 'string' },
                },
                required: ['name', 'description'],
              },
            },
            balancingReport: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                issues: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                      description: { type: 'string' },
                      suggestion: { type: 'string' },
                    },
                  },
                },
                cropAnalysis: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      crop: { type: 'string' },
                      usageFrequency: { type: 'string' },
                      performanceAssessment: { type: 'string' },
                    },
                  },
                },
              },
              required: ['summary', 'issues', 'cropAnalysis'],
            },
          },
          required: ['strategies', 'balancingReport'],
        },
      },
    });

    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) throw new Error('No response from Gemini');

    const analysis = JSON.parse(responseText);

    // Save insight
    const insightId = Timestamp.now().toMillis().toString();
    await db
      .collection('system_insights')
      .doc(insightId)
      .set({
        ...analysis,
        createdAt: Timestamp.now(),
        gameCount: gameData.length,
      });

    // Update categories if new ones found
    for (const strat of analysis.strategies) {
      if (!existingCategories.includes(strat.name)) {
        await db.collection('game_categories').add({
          name: strat.name,
          description: strat.description,
          addedAt: Timestamp.now(),
          isAiGenerated: true,
        });
      }
    }

    return { success: true, insightId, analysis };
  } catch (error: any) {
    console.error('System analysis failed:', error);
    throw new HttpsError('internal', `Analysis failed: ${error.message}`);
  }
});

export const getSystemInsights = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  const callerRef = db.collection('users').doc(request.auth.uid);
  const callerSnap = await callerRef.get();
  const isSuper =
    (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
    request.auth.token.email === 'florian.feldhaus@gmail.com';

  if (!isSuper) throw new HttpsError('permission-denied', 'Super-Administratoren only');

  const snap = await db.collection('system_insights').orderBy('createdAt', 'desc').limit(10).get();
  return snap.docs.map((d) => d.data());
});

export async function internalUploadFinishedGame(data: any, request?: { rawRequest?: any; auth?: any }) {
  enforceCallableRateLimit(request, 'uploadFinishedGame', 10);
  const { gameData } = data || {};
  if (!gameData || !gameData.game || !gameData.allRounds) {
    throw new HttpsError('invalid-argument', 'Missing gameData');
  }

  const { game, allRounds } = gameData;

  // 0. Respect Opt-Out
  if (game.config?.analyticsEnabled === false) {
    return { success: true, status: 'opted_out' };
  }

  // 1. Basic validation
  if (!game.id || !String(game.id).startsWith('local-')) {
    throw new HttpsError('invalid-argument', 'Only local games can be uploaded via this endpoint');
  }

  // Prevent "Large Payload" attacks by checking semantic limits early
  const numPlayers = Object.keys(game.players || {}).length;
  if (numPlayers === 0 || numPlayers > 10) {
    throw new HttpsError('invalid-argument', 'Invalid player count (max 10)');
  }

  const roundLimit = game.settings?.length || GAME_CONSTANTS.DEFAULT_ROUNDS;
  if (roundLimit > 100) {
    throw new HttpsError('invalid-argument', 'Invalid round limit (max 100)');
  }

  if (game.currentRoundNumber < roundLimit && game.status !== 'finished') {
    throw new HttpsError('failed-precondition', 'Only finished games can be uploaded via this endpoint');
  }

  // 2. Extra safety for local uploads: verify allRounds structure
  if (typeof allRounds !== 'object' || Object.keys(allRounds).length === 0) {
    throw new HttpsError('invalid-argument', 'Invalid allRounds structure');
  }

  // internalAnonymizeAndUploadForResearch now handles strict sanitization of fields
  return await internalAnonymizeAndUploadForResearch(game, allRounds);
}

export const uploadFinishedGame = onCall(async (request) => {
  return await internalUploadFinishedGame(request.data, request);
});

async function resolveGameDocument(gameId: string): Promise<{
  gameRef: admin.firestore.DocumentReference;
  gameSnap: admin.firestore.DocumentSnapshot;
  isResearchGame: boolean;
}> {
  const isResearchId = String(gameId).startsWith('research_');

  if (isResearchId) {
    const researchRef = db.collection('research_games').doc(gameId);
    const researchSnap = await researchRef.get();
    if (researchSnap.exists) {
      return { gameRef: researchRef, gameSnap: researchSnap, isResearchGame: true };
    }
    const normalRef = db.collection('games').doc(gameId);
    const normalSnap = await normalRef.get();
    return { gameRef: normalRef, gameSnap: normalSnap, isResearchGame: false };
  }

  const normalRef = db.collection('games').doc(gameId);
  const normalSnap = await normalRef.get();
  if (normalSnap.exists) {
    return { gameRef: normalRef, gameSnap: normalSnap, isResearchGame: false };
  }

  const researchRef = db.collection('research_games').doc(gameId);
  const researchSnap = await researchRef.get();
  return { gameRef: researchRef, gameSnap: researchSnap, isResearchGame: researchSnap.exists };
}

async function fetchPlayerRoundSnapshot(
  gameRef: admin.firestore.DocumentReference,
  roundNum: number,
  playerUid?: string,
): Promise<Round | undefined> {
  if (roundNum < 0 || !playerUid) return undefined;
  const roundSnap = await gameRef.collection('rounds').doc(`round_${roundNum}`).get();
  if (!roundSnap.exists) return undefined;
  const roundData = roundSnap.data();
  if (roundData?.playerData?.[playerUid]) {
    return roundData.playerData[playerUid];
  }
  return roundNum === 0 ? (roundData as Round) : undefined;
}

async function isCallerSuperAdmin(auth?: { uid?: string; token?: { email?: string } }): Promise<boolean> {
  if (!auth?.uid) return false;
  if (auth.token?.email === 'florian.feldhaus@gmail.com') return true;
  const callerSnap = await db.collection('users').doc(auth.uid).get();
  return callerSnap.exists && callerSnap.data()?.role === 'superadmin';
}

function isCallerHostOfGame(game: any, callerUid?: string): boolean {
  if (!game || !callerUid) return false;
  return game.hostUid === callerUid || game.adminUid === callerUid || game.createdBy === callerUid;
}

function sanitizePlayersForCaller(
  players: Record<string, any>,
  authorizedUid: string,
  canSeeAllDrafts: boolean,
): Record<string, any> {
  if (canSeeAllDrafts) return players;
  const sanitized: Record<string, any> = {};
  for (const [pUid, pData] of Object.entries(players)) {
    if (!pData || pUid === authorizedUid) {
      sanitized[pUid] = pData;
      continue;
    }
    const { pendingDecisions: _omitted, ...rest } = pData;
    sanitized[pUid] = rest;
  }
  return sanitized;
}

function verifyGamePlayerReadAuthorization(
  game: any,
  callerUid: string,
  isHost: boolean,
  isSuper: boolean,
  targetUid?: string,
): string {
  if (targetUid && targetUid !== callerUid) {
    if (!isHost && !isSuper) {
      throw new HttpsError('permission-denied', 'Access denied');
    }
    if (!game.players?.[targetUid]) {
      throw new HttpsError('not-found', 'Player not found in this game');
    }
    return targetUid;
  }

  if (!game.players?.[callerUid] && !isHost && !isSuper) {
    throw new HttpsError('permission-denied', 'Access denied');
  }

  if (game.players?.[callerUid]) {
    return callerUid;
  }

  const hostPlayerKey = Object.keys(game.players || {}).find((k) => game.players[k]?.hostUid === callerUid);
  return hostPlayerKey || Object.keys(game.players || {})[0] || callerUid;
}

async function getAuthenticatedGameState(
  gameRef: admin.firestore.DocumentReference,
  gameSnap: admin.firestore.DocumentSnapshot,
  request: { auth?: any },
  targetUid?: string,
) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  if (!gameSnap.exists) throw new HttpsError('not-found', 'Game not found');

  const callerUid = request.auth.uid;
  const isSuper = await isCallerSuperAdmin(request.auth);
  const game = gameSnap.data()!;
  const isHost = isCallerHostOfGame(game, callerUid);

  const finalUid = verifyGamePlayerReadAuthorization(game, callerUid, isHost, isSuper, targetUid);
  const finalPlayerState = game.players?.[finalUid];
  const lastRound = await fetchPlayerRoundSnapshot(gameRef, game.currentRoundNumber || 0, finalUid);
  const sanitizedPlayers = sanitizePlayersForCaller(game.players || {}, finalUid, isHost || isSuper);

  return {
    game: {
      id: game.id,
      name: game.name,
      status: game.status,
      currentRoundNumber: game.currentRoundNumber,
      settings: game.settings,
      players: sanitizedPlayers,
      config: game.config,
      createdAt: game.createdAt?.toDate?.()?.toISOString() || game.createdAt,
    },
    playerState: finalPlayerState
      ? {
          ...finalPlayerState,
          playerNumber: finalUid.startsWith('player-') ? finalUid.split('-')[2] : undefined,
        }
      : null,
    lastRound,
  };
}

export async function internalGetGameState(request: { data?: any; auth?: any }) {
  const { gameId, targetUid } = request.data || {};
  if (!gameId) throw new HttpsError('invalid-argument', 'Missing gameId');

  const { gameRef, gameSnap, isResearchGame } = await resolveGameDocument(gameId);

  if (!isResearchGame) {
    return await getAuthenticatedGameState(gameRef, gameSnap, request, targetUid);
  }

  // Public anonymized research game (read-only, no auth required, strips migratedFrom)
  const rawGame = gameSnap.data()!;
  const sanitizedGame = sanitizeResearchGameForPublic({ id: gameSnap.id || rawGame.id || gameId, ...rawGame });
  const playerKeys = Object.keys(sanitizedGame.players || {});
  const requestedUid = targetUid || request.auth?.uid;
  const finalUid = requestedUid && sanitizedGame.players?.[requestedUid] ? requestedUid : playerKeys[0];
  const finalPlayerState = finalUid ? sanitizedGame.players?.[finalUid] : null;
  const lastRound = await fetchPlayerRoundSnapshot(gameRef, sanitizedGame.currentRoundNumber || 0, finalUid);

  return {
    game: sanitizedGame,
    playerState: finalPlayerState
      ? {
          ...finalPlayerState,
          playerNumber:
            finalPlayerState.playerNumber ?? (finalUid.startsWith('player-') ? finalUid.split('-').pop() : undefined),
        }
      : null,
    lastRound,
  };
}

export const getGameState = onCall(async (request) => {
  return await internalGetGameState(request);
});

async function extractPlayerRoundFromDoc(
  gameRef: admin.firestore.DocumentReference,
  roundNumber: number,
  uid?: string,
) {
  const roundSnap = await gameRef.collection('rounds').doc(`round_${roundNumber}`).get();
  if (!roundSnap.exists) throw new HttpsError('not-found', 'Round data not found');

  const data = roundSnap.data();
  if (uid && data?.playerData?.[uid]) return data.playerData[uid];
  if (roundNumber === 0) return data;
  throw new HttpsError('not-found', 'No data for player in this round');
}

async function resolveAuthorizedRoundPlayerUid(
  gameSnap: admin.firestore.DocumentSnapshot,
  request: { auth?: any },
  targetUid?: string,
): Promise<string> {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  if (!gameSnap.exists) throw new HttpsError('not-found', 'Game not found');

  const callerUid = request.auth.uid;
  const isSuper = await isCallerSuperAdmin(request.auth);
  const game = gameSnap.data()!;
  const isHost = isCallerHostOfGame(game, callerUid);

  return verifyGamePlayerReadAuthorization(game, callerUid, isHost, isSuper, targetUid);
}

export async function internalGetRoundData(request: { data?: any; auth?: any }) {
  const { gameId, roundNumber, targetUid } = request.data || {};
  if (!gameId || roundNumber === undefined) throw new HttpsError('invalid-argument', 'Missing gameId or roundNumber');

  const { gameRef, gameSnap, isResearchGame } = await resolveGameDocument(gameId);

  if (!isResearchGame) {
    const uid = await resolveAuthorizedRoundPlayerUid(gameSnap, request, targetUid);
    return await extractPlayerRoundFromDoc(gameRef, roundNumber, uid);
  }

  // Public anonymized research game round lookup
  const game = gameSnap.data()!;
  const playerKeys = Object.keys(game.players || {});
  const requestedUid = targetUid || request.auth?.uid;
  const uid = requestedUid && game.players?.[requestedUid] ? requestedUid : playerKeys[0];

  return await extractPlayerRoundFromDoc(gameRef, roundNumber, uid);
}

export const getRoundData = onCall(async (request) => {
  return await internalGetRoundData(request);
});

export async function internalGetResearchGames(request: { data?: any; auth?: any; rawRequest?: any }) {
  const ip =
    request.rawRequest?.ip ||
    request.rawRequest?.headers?.['x-forwarded-for']?.split(',')?.[0]?.trim() ||
    request.auth?.uid ||
    'callable';
  const rate = checkPublicRateLimit(`callable:${ip}`, 60, 60_000);
  if (!rate.allowed) {
    throw new HttpsError('resource-exhausted', 'Rate limit exceeded. Please try again in a minute.');
  }

  const { page = 1, pageSize = 20, difficulty, sourceType, organicOnly } = request.data || {};
  return await buildPublicResearchDataset(db, {
    page: Number(page || 1),
    pageSize: Number(pageSize || 20),
    difficulty,
    sourceType,
    organicOnly: !!organicOnly,
  });
}

export const getResearchGames = onCall(async (request) => {
  return await internalGetResearchGames(request);
});

export const getPublicResearchDataset = onCall(async (request) => {
  return await internalGetResearchGames(request);
});

export const researchApi = onRequest({ cors: true }, async (req, res) => {
  await handleResearchApiHttpRequest(db, req, res);
});

export const researchMcp = onRequest({ cors: true }, async (req, res) => {
  await handleResearchMcpHttpRequest(db, req, res);
});

export const recordTelemetry = onRequest({ cors: false, invoker: 'public' }, async (req, res) => {
  await handleTelemetryHttpRequest(req, res, db);
});

export function buildDefaultContinuationDecision(player: any, prevRoundData?: Round): RoundDecision {
  const draft = player?.pendingDecisions;
  const lastHistoryRound =
    Array.isArray(player?.history) && player.history.length > 0 ? player.history[player.history.length - 1] : undefined;
  const baseParcels: Record<number, CropType> = {};
  for (let i = 0; i < 40; i++) {
    const prevCrop = prevRoundData?.parcelsSnapshot?.[i]?.crop || lastHistoryRound?.decision?.parcels?.[i] || 'Fallow';
    baseParcels[i] = prevCrop as CropType;
  }

  if (draft && typeof draft === 'object' && draft.parcels && Object.keys(draft.parcels).length > 0) {
    return {
      machines: Number(draft.machines || 0),
      organic: Boolean(draft.organic),
      fertilizer: Boolean(draft.fertilizer),
      pesticide: Boolean(draft.pesticide),
      organisms: Boolean(draft.organisms),
      parcels: { ...baseParcels, ...draft.parcels },
      ...(draft.priceFixing ? { priceFixing: draft.priceFixing } : {}),
    };
  }

  return {
    machines: 0,
    organic: Boolean(prevRoundData?.decision?.organic ?? lastHistoryRound?.decision?.organic ?? false),
    fertilizer: false,
    pesticide: false,
    organisms: false,
    parcels: baseParcels,
  };
}

function populateMissingDecisionsForForceAdvance(
  players: Record<string, any>,
  currentRound: number,
  prevRoundGlobalData: any,
): void {
  for (const uid of Object.keys(players)) {
    const p = players[uid];
    if (p.submittedRound !== undefined && p.submittedRound >= currentRound && p.pendingDecisions) {
      continue;
    }
    const prevRoundData = resolvePlayerPrevRoundData(prevRoundGlobalData, uid, currentRound);
    const lastHistoryRound =
      Array.isArray(p.history) && p.history.length > 0 ? p.history[p.history.length - 1] : undefined;
    if (p.isAi) {
      p.pendingDecisions = AiAgent.makeDecision((p.aiLevel || 'middle') as any, prevRoundData || lastHistoryRound, uid);
    } else {
      p.pendingDecisions = buildDefaultContinuationDecision(p, prevRoundData);
    }
    p.submittedRound = currentRound;
  }
}

export async function internalForceAdvanceRound(request: { data?: any; auth?: any }) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  const { gameId } = request.data || {};
  if (!gameId) throw new HttpsError('invalid-argument', 'Missing gameId');

  const callerUid = request.auth.uid;
  const isSuper = await isCallerSuperAdmin(request.auth);
  const gameRef = db.collection('games').doc(gameId);
  let gameWasFinished = false;

  const result = await db.runTransaction(async (transaction) => {
    const gameDoc = await transaction.get(gameRef);
    if (!gameDoc.exists) throw new HttpsError('not-found', 'Game not found');
    const game = gameDoc.data()!;

    if (!isCallerHostOfGame(game, callerUid) && !isSuper) {
      throw new HttpsError('permission-denied', 'Only the game host or superadmin can force-advance the round');
    }

    const currentRound = game.currentRoundNumber || 0;
    const roundLimit = game.settings?.length || GAME_CONSTANTS.DEFAULT_ROUNDS;
    if (currentRound >= roundLimit) {
      throw new HttpsError('failed-precondition', 'Game has reached the round limit.');
    }

    const prevRoundRef = gameRef.collection('rounds').doc(`round_${currentRound}`);
    const prevRoundSnap = await transaction.get(prevRoundRef);
    const prevRoundGlobalData = prevRoundSnap.exists ? prevRoundSnap.data() : undefined;

    const players = game.players || {};
    populateMissingDecisionsForForceAdvance(players, currentRound, prevRoundGlobalData);

    const calcResult = await performCalculation(gameId, {}, transaction, { ...game, players }, prevRoundGlobalData);
    gameWasFinished = !!calcResult?.isFinished;
    return {
      status: 'calculated',
      number: calcResult?.number,
      isFinished: gameWasFinished,
      playerRounds: calcResult?.playerRounds,
    };
  });

  if (gameWasFinished) {
    const gameSnap = await gameRef.get();
    const gameData = gameSnap.data();
    if (gameData && gameData.config?.analyticsEnabled !== false) {
      internalAnonymizeAndUploadForResearch(gameData).catch((err) =>
        console.error('Failed to auto-upload cloud game for research (forceAdvanceRound):', err),
      );
    }
  }

  return result;
}

export const forceAdvanceRound = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    return await internalForceAdvanceRound(request);
  },
);

async function runForceCalculationInSubmit(
  transaction: admin.firestore.Transaction,
  gameRef: admin.firestore.DocumentReference,
  gameId: string,
  game: any,
  players: Record<string, any>,
  currentRound: number,
  uid: string,
  decision: any,
): Promise<{ status: string; nextRound?: Round; isFinished?: boolean } | null> {
  const prevRoundSnap = await transaction.get(gameRef.collection('rounds').doc(`round_${currentRound}`));
  const prevRoundGlobalData = prevRoundSnap.exists ? prevRoundSnap.data() : undefined;
  populateMissingDecisionsForForceAdvance(players, currentRound, prevRoundGlobalData);
  const calcResult = await performCalculation(gameId, decision, transaction, { ...game, players }, prevRoundGlobalData);
  if (!calcResult) return null;
  return {
    status: 'calculated',
    nextRound: calcResult.playerRounds[uid] || Object.values(calcResult.playerRounds)[0],
    isFinished: !!calcResult.isFinished,
  };
}

async function executeDecisionSubmissionTransaction(
  transaction: admin.firestore.Transaction,
  gameRef: admin.firestore.DocumentReference,
  gameId: string,
  uid: string,
  decision: any,
  forceAdvance: boolean,
  isSuper: boolean,
): Promise<{ status: string; nextRound?: Round; isFinished?: boolean }> {
  const gameDoc = await transaction.get(gameRef);
  if (!gameDoc.exists) throw new HttpsError('not-found', 'Game not found');
  const game = gameDoc.data()!;

  const players = game.players || {};
  const canForce = Boolean(forceAdvance && (isCallerHostOfGame(game, uid) || isSuper));
  if (!players[uid] && !canForce) {
    throw new HttpsError('permission-denied', `Not a player in this game: ${uid}`);
  }

  const currentRound = game.currentRoundNumber || 0;
  const roundLimit = game.settings?.length || GAME_CONSTANTS.DEFAULT_ROUNDS;
  if (currentRound >= roundLimit) {
    throw new HttpsError('failed-precondition', 'Game has reached the round limit.');
  }

  if (players[uid]) {
    players[uid].submittedRound = currentRound;
    players[uid].pendingDecisions = decision;
  }

  if (canForce) {
    const forced = await runForceCalculationInSubmit(
      transaction,
      gameRef,
      gameId,
      game,
      players,
      currentRound,
      uid,
      decision,
    );
    if (forced) return forced;
  }

  const updatedPlayers = (await internalProcessAiTurns(gameId, transaction, { ...game, players })) || players;
  const calculationResults = await checkAndPerformCalculation(
    gameId,
    transaction,
    { ...game, players: updatedPlayers },
    uid,
    decision,
  );
  if (calculationResults) {
    return {
      status: 'calculated',
      nextRound: calculationResults.playerRounds[uid],
      isFinished: !!calculationResults.isFinished,
    };
  }

  transaction.update(gameRef, { players: updatedPlayers, updatedAt: Timestamp.now() });
  return { status: 'submitted', isFinished: false };
}

async function uploadFinishedCloudGameIfEligible(gameRef: admin.firestore.DocumentReference): Promise<void> {
  const gameSnap = await gameRef.get();
  const gameData = gameSnap.data();
  if (gameData && gameData.config?.analyticsEnabled !== false) {
    internalAnonymizeAndUploadForResearch(gameData).catch((err) =>
      console.error('Failed to auto-upload cloud game for research:', err),
    );
  }
}

export const submitDecision = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
    const { gameId, decision, forceAdvance } = request.data || {};
    if (forceAdvance && !decision) {
      return await internalForceAdvanceRound(request);
    }
    if (!gameId || !decision) {
      throw new HttpsError('invalid-argument', 'Missing gameId or decision');
    }

    const gameRef = db.collection('games').doc(gameId);
    const isSuper = forceAdvance ? await isCallerSuperAdmin(request.auth) : false;

    try {
      const txResult = await db.runTransaction((transaction) =>
        executeDecisionSubmissionTransaction(
          transaction,
          gameRef,
          gameId,
          request.auth!.uid,
          decision,
          !!forceAdvance,
          isSuper,
        ),
      );
      if (txResult.isFinished) {
        await uploadFinishedCloudGameIfEligible(gameRef);
      }
      return txResult.status === 'calculated'
        ? { status: 'calculated', nextRound: txResult.nextRound }
        : { status: 'submitted' };
    } catch (error: any) {
      if (error instanceof HttpsError) throw error;
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

function resolvePlayerPrevRoundData(
  prevRoundGlobalData: any,
  uid: string,
  currentRoundNumber: number,
): Round | undefined {
  if (!prevRoundGlobalData) return undefined;
  if (prevRoundGlobalData.playerData?.[uid]) return prevRoundGlobalData.playerData[uid];
  if (currentRoundNumber === 0) return prevRoundGlobalData as Round;
  return undefined;
}

function calculateDryRunTotalYields(
  players: Record<string, any>,
  prevRoundGlobalData: any,
  currentRoundNumber: number,
  nextRoundNumber: number,
  fallbackDecision: any,
  events: { weather: WeatherType; vermin: string[] },
  roundLimit: number,
  difficulty: 'easy' | 'normal' | 'hard',
  upcomingWeather: WeatherType,
): Record<string, number> {
  const totalYields: Record<string, number> = {};
  for (const uid of Object.keys(players)) {
    const player = players[uid];
    const playerDecision = player.pendingDecisions || fallbackDecision;
    const prevRoundData = resolvePlayerPrevRoundData(prevRoundGlobalData, uid, currentRoundNumber);

    const tempRound = GameEngine.calculateRound(nextRoundNumber, prevRoundData, playerDecision, events, 0, roundLimit, {
      difficulty,
      nextWeather: upcomingWeather,
    });

    const harvest = tempRound.result?.harvestSummary || {};
    Object.entries(harvest).forEach(([crop, amount]) => {
      totalYields[crop] = (totalYields[crop] || 0) + (amount as number);
    });
  }
  return totalYields;
}

function calculateDynamicMarketPrices(
  totalYields: Record<string, number>,
  numPlayers: number,
): Record<string, { organic: number; conventional: number }> {
  const marketPrices: Record<string, { organic: number; conventional: number }> = {};

  Object.keys(GAME_CONSTANTS.CROPS).forEach((crop) => {
    const cropConfig = GAME_CONSTANTS.CROPS[crop];
    if (!cropConfig || crop === 'Fallow' || crop === 'Grass') return;

    const totalExpectedYield = cropConfig.baseYield * 40 * numPlayers;
    const actualYield = totalYields[crop] || 0;

    let priceFactor = 1.0;
    if (totalExpectedYield > 0 && actualYield > 0) {
      const yieldRatio = actualYield / totalExpectedYield;
      priceFactor = Math.max(0.7, Math.min(1.3, 1.0 + (1.0 - yieldRatio) * 0.5));
    }

    marketPrices[crop] = {
      organic: Math.round(cropConfig.marketValue.organic * priceFactor * 10) / 10,
      conventional: Math.round(cropConfig.marketValue.conventional * priceFactor * 10) / 10,
    };
  });
  return marketPrices;
}

function updatePlayerWithCalculatedRound(player: any, nextRound: Round, nextRoundNumber: number): void {
  const lightweightRound: Round = {
    ...nextRound,
    parcelsSnapshot: [],
  };

  player.history = player.history || [];
  player.history.push(lightweightRound);
  player.currentRound = nextRoundNumber;
  player.capital = nextRound.result?.capital;
  player.avgSoil = nextRound.avgSoil;
  player.avgNutrition = nextRound.avgNutrition;
  player.sustainabilityScore = nextRound.result?.sustainabilityScore;
  player.insolvent = nextRound.result?.insolvent;
  const mergedStickers = new Set([...(player.unlockedStickers || []), ...(nextRound.result?.unlockedStickers || [])]);
  player.unlockedStickers = Array.from(mergedStickers);
  (player as any).pendingDecisions = undefined;
}

function computeAllPlayerRounds(
  players: Record<string, any>,
  prevRoundGlobalData: any,
  currentRound: number,
  nextRoundNumber: number,
  fallbackDecision: any,
  events: { weather: WeatherType; vermin: string[] },
  roundLimit: number,
  difficulty: 'easy' | 'normal' | 'hard',
  upcomingWeather: WeatherType,
  marketPrices?: Record<string, { organic: number; conventional: number }>,
): Record<string, Round> {
  const allPlayerRounds: Record<string, Round> = {};
  for (const uid of Object.keys(players)) {
    const player = players[uid];
    const playerDecision = player.pendingDecisions || fallbackDecision;
    const prevRoundData = resolvePlayerPrevRoundData(prevRoundGlobalData, uid, currentRound);
    const currentCapital = prevRoundData?.result?.capital ?? player.capital ?? 100000;

    const nextRound = GameEngine.calculateRound(
      nextRoundNumber,
      prevRoundData,
      playerDecision,
      events,
      currentCapital,
      roundLimit,
      { marketPrices, difficulty, nextWeather: upcomingWeather },
    );

    allPlayerRounds[uid] = nextRound;
    updatePlayerWithCalculatedRound(player, nextRound, nextRoundNumber);
  }
  return allPlayerRounds;
}

async function performCalculation(
  gameId: string,
  decision: any,
  transaction: admin.firestore.Transaction,
  preloadedGame?: any,
  preloadedPrevRoundGlobalData?: any,
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
  const difficulty = (game.settings?.difficulty || 'normal') as 'easy' | 'normal' | 'hard';

  let prevRoundGlobalData = preloadedPrevRoundGlobalData;
  if (prevRoundGlobalData === undefined) {
    const prevRoundRef = gameRef.collection('rounds').doc(`round_${currentRound}`);
    const prevRoundSnap = await transaction.get(prevRoundRef);
    prevRoundGlobalData = prevRoundSnap.exists ? prevRoundSnap.data() : undefined;
  }

  const firstPlayerUid = Object.keys(players)[0];
  const prevRoundForWeather = resolvePlayerPrevRoundData(prevRoundGlobalData, firstPlayerUid, currentRound);

  const events = GameEngine.rollRoundEvents(nextRoundNumber, roundLimit, difficulty, prevRoundForWeather?.nextWeather);
  const upcomingWeather = GameEngine.rollWeather(nextRoundNumber + 1, roundLimit, difficulty);

  const totalYields = calculateDryRunTotalYields(
    players,
    prevRoundGlobalData,
    currentRound,
    nextRoundNumber,
    decision,
    events,
    roundLimit,
    difficulty,
    upcomingWeather,
  );

  const marketPrices = game.config?.advancedPricingEnabled
    ? calculateDynamicMarketPrices(totalYields, Object.keys(players).length)
    : undefined;

  const allPlayerRounds = computeAllPlayerRounds(
    players,
    prevRoundGlobalData,
    currentRound,
    nextRoundNumber,
    decision,
    events,
    roundLimit,
    difficulty,
    upcomingWeather,
    marketPrices,
  );

  transaction.set(gameRef.collection('rounds').doc(`round_${nextRoundNumber}`), {
    number: nextRoundNumber,
    playerData: allPlayerRounds,
    events,
    createdAt: Timestamp.now(),
  });

  const isFinished = nextRoundNumber >= roundLimit;
  const nextStatus = isFinished ? 'finished' : game.status === 'waiting' ? 'in_progress' : game.status;
  transaction.update(gameRef, {
    currentRoundNumber: nextRoundNumber,
    status: nextStatus,
    players,
    updatedAt: Timestamp.now(),
  });
  return { number: nextRoundNumber, playerRounds: allPlayerRounds, isFinished };
}

export const calculateNextRound = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const { gameId, decision } = request.data;
  if (!gameId || !decision) {
    throw new HttpsError('invalid-argument', 'Missing gameId or decision');
  }

  const callerUid = request.auth.uid;
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const isSuper =
    (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
    request.auth.token.email === 'florian.feldhaus@gmail.com';

  let gameWasFinished = false;
  try {
    const result = await db.runTransaction(async (transaction) => {
      const gameDoc = await transaction.get(db.collection('games').doc(gameId));
      if (!gameDoc.exists) {
        throw new HttpsError('not-found', 'Game not found');
      }
      const game = gameDoc.data()!;
      const isParticipant = game.hostUid === callerUid || !!game.players?.[callerUid];
      if (!isParticipant && !isSuper) {
        throw new HttpsError('permission-denied', 'Not authorized to calculate rounds for this game');
      }

      const calcResult = await performCalculation(gameId, decision, transaction, game);
      gameWasFinished = !!calcResult?.isFinished;
      return calcResult;
    });

    if (gameWasFinished) {
      const gameSnap = await db.collection('games').doc(gameId).get();
      const gameData = gameSnap.data();
      if (gameData && gameData.config?.analyticsEnabled !== false) {
        internalAnonymizeAndUploadForResearch(gameData).catch((err) =>
          console.error('Failed to auto-upload cloud game for research (calculateNextRound):', err),
        );
      }
    }

    return result;
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    console.error('Error in calculateNextRound:', error);
    throw new HttpsError('internal', error.message || 'Internal Error');
  }
});

export const setAdminRole = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

  const callerSnap = await db.collection('users').doc(request.auth.uid).get();
  const isSuper =
    (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
    request.auth.token.email === 'florian.feldhaus@gmail.com';

  if (!isSuper) {
    throw new HttpsError('permission-denied', 'Super-Administratoren only');
  }

  const targetUid = request.data?.targetUid || request.auth.uid;
  await admin.auth().setCustomUserClaims(targetUid, { role: 'admin' });
  return { success: true };
});

async function resolveCreatorRoleAndQuota(
  uid: string,
  token: any,
  userRef: admin.firestore.DocumentReference,
  userSnap: admin.firestore.DocumentSnapshot,
): Promise<{ userRole: string; quota: number }> {
  if (userSnap.exists) {
    const userData = userSnap.data();
    return {
      userRole: userData?.role || 'player',
      quota: userData?.quota || 5,
    };
  }
  if (token.email === 'florian.feldhaus@gmail.com') {
    await userRef.set({
      uid,
      email: token.email,
      role: 'superadmin',
      status: 'active',
      quota: 999,
      gameCount: 0,
      createdAt: Timestamp.now(),
    });
    return { userRole: 'superadmin', quota: 999 };
  }
  if (token.role === 'guest') {
    return { userRole: 'guest', quota: 100 };
  }
  return { userRole: token.role, quota: 5 };
}

function buildInitialPlayersMap(
  gameId: string,
  hostUid: string,
  numPlayers: number,
  numAi: number,
  playerLabel: string,
  aiLevel?: string,
): Record<string, any> {
  const players: Record<string, any> = {};
  const hostPlayerUid = `player-${gameId}-1`;
  players[hostPlayerUid] = {
    uid: hostPlayerUid,
    displayName: `${playerLabel} 1`,
    isAi: false,
    playerNumber: 1,
    capital: 100000,
    currentRound: 0,
    history: [],
    joinedAt: Timestamp.now(),
    hostUid,
  };

  for (let i = 2; i <= numPlayers; i++) {
    const pUid = `player-${gameId}-${i}`;
    const isAi = i > numPlayers - numAi;
    players[pUid] = {
      uid: pUid,
      displayName: `${playerLabel} ${i}`,
      isAi,
      playerNumber: i,
      aiLevel: isAi ? aiLevel || 'middle' : undefined,
      capital: 100000,
      currentRound: 0,
      history: [],
    };
  }
  return players;
}

function initializeRoundZeroPlayerData(newGame: any, difficulty: 'easy' | 'normal' | 'hard'): Record<string, any> {
  const initialForecast = GameEngine.generateWeatherForecast(1, 'Normal', difficulty);
  const playerData: Record<string, any> = {};
  const playerKeys = Object.keys(newGame.players);

  for (let idx = 0; idx < playerKeys.length; idx++) {
    const uid = playerKeys[idx];
    const initialParcels = GameEngine.createInitialParcels(difficulty, idx);
    const startSoil = Math.round(initialParcels.reduce((sum, p) => sum + p.soil, 0) / initialParcels.length);
    const startNutrition = Math.round(initialParcels.reduce((sum, p) => sum + p.nutrition, 0) / initialParcels.length);
    const startScore = GameEngine.calculateSustainabilityScore(100000, startSoil);

    newGame.players[uid].avgSoil = startSoil;
    newGame.players[uid].avgNutrition = startNutrition;
    newGame.players[uid].sustainabilityScore = startScore;
    newGame.players[uid].insolvent = false;
    newGame.players[uid].unlockedStickers = [];
    newGame.players[uid].history = [
      {
        number: 0,
        parcelsSnapshot: [],
        avgSoil: startSoil,
        avgNutrition: startNutrition,
        nextWeather: 'Normal',
        weatherForecast: initialForecast,
      },
    ];
    playerData[uid] = {
      number: 0,
      parcelsSnapshot: initialParcels,
      avgSoil: startSoil,
      avgNutrition: startNutrition,
      nextWeather: 'Normal',
      weatherForecast: initialForecast,
    };
  }
  return playerData;
}

export const createGame = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const {
    name,
    settings = { length: GAME_CONSTANTS.DEFAULT_ROUNDS, difficulty: 'normal', playerLabel: 'Player' },
    config = { numPlayers: 1, numRounds: GAME_CONSTANTS.DEFAULT_ROUNDS, numAi: 0, advancedPricingEnabled: false },
    retentionDays = 90,
  } = request.data;

  const numRounds = Math.min(50, Math.max(5, config.numRounds || GAME_CONSTANTS.DEFAULT_ROUNDS));
  config.numRounds = numRounds;
  settings.length = numRounds;

  const numPlayers = Math.min(10, Math.max(1, config.numPlayers || 1));
  config.numPlayers = numPlayers;

  const uid = request.auth.uid;
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const { userRole, quota } = await resolveCreatorRoleAndQuota(uid, request.auth.token, userRef, userSnap);

  const isLocalGame = config.numPlayers - config.numAi === 1;
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

  const validRetention = Math.min(Math.max(Number(retentionDays) || 90, 1), 365);
  const gameId = db.collection('games').doc().id;

  if (userRole === 'guest') {
    config.numAi = numPlayers - 1;
  }
  const numAi = Math.min(numPlayers - 1, Math.max(0, config.numAi || 0));
  config.numAi = numAi;

  const playerSecrets: Record<string, { password: string }> = {};
  for (let i = 1; i <= numPlayers; i++) {
    playerSecrets[String(i)] = { password: generateRandomPassword(4) };
  }

  const players = buildInitialPlayersMap(gameId, uid, numPlayers, numAi, settings.playerLabel, config.aiLevel);

  const newGame = {
    id: gameId,
    name: name || `Game ${gameId.substr(0, 6)}`,
    hostUid: uid,
    hostEmail: request.auth.token.email || undefined,
    hostRole: userRole,
    isTest: isTestEmail(request.auth.token.email) || !!config?.isTest || !!request.data?.isTest,
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
    const difficulty = (settings.difficulty || 'normal') as 'easy' | 'normal' | 'hard';
    const playerData = initializeRoundZeroPlayerData(newGame, difficulty);

    await internalProcessAiTurns(gameId, t, newGame);
    t.set(db.collection('games').doc(gameId), newGame);

    await t.set(db.collection('games').doc(gameId).collection('rounds').doc('round_0'), {
      number: 0,
      playerData,
      createdAt: Timestamp.now(),
    });

    if (userSnap.exists) {
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
      const decision = AiAgent.makeDecision((p.aiLevel || 'middle') as any, lastRound, uid);
      p.submittedRound = currentRound;
      p.pendingDecisions = decision;
    }
  }

  return players;
}

// --- User Management ---

function validateOnboardingInput(
  uid: string,
  role: string | undefined,
  email: string,
  firstName: unknown,
  lastName: unknown,
  rawData: unknown,
): { cleanFirst: string; cleanLast: string } {
  if (!email || uid.startsWith('player-') || role === 'player') {
    throw new HttpsError('permission-denied', 'A valid registered email account is required for onboarding.');
  }
  const cleanFirst = String(firstName || '')
    .trim()
    .slice(0, 100);
  const cleanLast = String(lastName || '')
    .trim()
    .slice(0, 100);
  if (!cleanFirst || !cleanLast) {
    console.warn(`submitOnboarding: Missing fields for ${email}.`, rawData);
    throw new HttpsError('invalid-argument', 'Missing fields');
  }
  return { cleanFirst, cleanLast };
}

export const submitOnboarding = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { firstName, lastName } = request.data || {};
    const email = (request.auth.token.email || '').trim();
    const { cleanFirst, cleanLast } = validateOnboardingInput(
      request.auth.uid,
      request.auth.token.role,
      email,
      firstName,
      lastName,
      request.data,
    );

    const bannedSnap = await db.collection('banned_emails').doc(email).get();
    if (bannedSnap.exists) {
      console.warn(`submitOnboarding: Email ${email} is banned.`);
      throw new HttpsError('permission-denied', 'This email is banned from registration.');
    }

    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);
    const existingSnap = await userRef.get();
    const existingData = existingSnap.data();
    if (existingSnap.exists && existingData?.role === 'banned') {
      throw new HttpsError('permission-denied', 'Account is banned.');
    }

    const userData = {
      uid,
      email,
      firstName: cleanFirst,
      lastName: cleanLast,
      displayName: `${cleanFirst} ${cleanLast}`,
      role: existingData?.role === 'superadmin' ? 'superadmin' : 'admin',
      status: 'active',
      quota: existingData?.quota ?? 5,
      gameCount: existingData?.gameCount ?? 0,
      createdAt: existingData?.createdAt || Timestamp.now(),
    };

    await userRef.set(userData, { merge: true });

    if (!isTestEmail(email)) {
      try {
        await mailService.sendAdminNewRegistrationNotification('florian.feldhaus@gmail.com', userData);
      } catch (e) {
        console.error('submitOnboarding: Failed to send admin notification', e);
      }
    }

    return { success: true };
  },
);

async function cascadeDeleteAdminUser(targetRef: admin.firestore.DocumentReference, targetUid: string): Promise<void> {
  const gamesSnapshot = await db.collection('games').where('hostUid', '==', targetUid).get();
  for (const gameDoc of gamesSnapshot.docs) {
    const gameData = gameDoc.data();
    await db.recursiveDelete(gameDoc.ref);
    await deleteGamePlayerAuthAccounts(gameDoc.id, gameData);
  }
  await db.recursiveDelete(targetRef);
  try {
    await admin.auth().deleteUser(targetUid);
  } catch (e) {
    console.warn('Failed to delete auth user, might already be gone', e);
  }
}

export const manageAdmin = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
    if (!(await isCallerSuperAdmin(request.auth))) {
      throw new HttpsError('permission-denied', 'System-Administratoren only');
    }

    const { targetUid, action, value } = request.data;
    if (!targetUid || !action) throw new HttpsError('invalid-argument', 'Missing args');

    const targetRef = db.collection('users').doc(targetUid);
    if (action === 'delete') {
      await cascadeDeleteAdminUser(targetRef, targetUid);
      return { success: true };
    }

    const updates: any = {};
    if (action === 'setQuota') {
      updates.quota = Number(value);
    } else if (action === 'ban') {
      updates.status = 'banned';
      updates.role = 'banned';
      const targetDoc = await targetRef.get();
      const targetEmail = targetDoc.data()?.email;
      if (targetEmail) {
        await db.collection('banned_emails').doc(targetEmail).set({
          bannedAt: Timestamp.now(),
          bannedBy: request.auth.uid,
          reason: 'Banned by System-Administrator',
        });
      }
    }

    await targetRef.update(updates);
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
  const telemetry = await aggregateTelemetryStats(db);

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
    telemetry,
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

  const { page = 1, pageSize = 10, showDeleted = false, targetUid, adminUid } = request.data;
  const requestedUid = targetUid || adminUid;
  const offset = (page - 1) * pageSize;

  let searchUid = request.auth.uid;

  // Super Admin Override
  if (requestedUid && requestedUid !== request.auth.uid) {
    const callerRef = db.collection('users').doc(request.auth.uid);
    const callerSnap = await callerRef.get();
    const isSuper =
      (callerSnap.exists && callerSnap.data()?.role === 'superadmin') ||
      request.auth.token.email === 'florian.feldhaus@gmail.com';

    if (!isSuper) {
      throw new HttpsError('permission-denied', 'Only System-Administratoren can view other users games.');
    }
    searchUid = requestedUid;
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

function buildUpdatedPlayerEntry(
  existingPlayer: any,
  uid: string,
  playerNumber: number,
  type: string,
  aiLevel?: string,
): any {
  if (type === 'ai') {
    return {
      ...(existingPlayer || {}),
      uid,
      displayName: existingPlayer?.displayName || `KI Team ${playerNumber}`,
      isAi: true,
      playerNumber,
      aiLevel: aiLevel || 'middle',
      capital: existingPlayer?.capital ?? 100000,
      currentRound: existingPlayer?.currentRound ?? 0,
      history: existingPlayer?.history ?? [],
    };
  }
  if (existingPlayer) {
    return {
      ...existingPlayer,
      isAi: false,
      aiLevel: undefined,
      displayName: `Team ${playerNumber}`,
      playerNumber,
    };
  }
  return {
    uid,
    displayName: `Team ${playerNumber}`,
    isAi: false,
    playerNumber,
    capital: 100000,
    currentRound: 0,
    history: [],
  };
}

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
      const [doc, callerSnap] = await Promise.all([t.get(gameRef), t.get(callerRef)]);
      if (!doc.exists) throw new HttpsError('not-found', 'Game not found');

      const game = doc.data()!;
      const isSuper =
        callerSnap.exists &&
        (callerSnap.data()?.role === 'superadmin' || request.auth?.token.email === 'florian.feldhaus@gmail.com');
      if (game.hostUid !== request.auth?.uid && !isSuper) {
        throw new HttpsError('permission-denied', 'Not your game');
      }

      const players = game.players || {};
      players[uid] = buildUpdatedPlayerEntry(players[uid], uid, playerNumber, type, aiLevel);

      if (type === 'ai') {
        const updatedPlayers = (await internalProcessAiTurns(gameId, t, { ...game, players })) || players;
        const calculationPerformed = await checkAndPerformCalculation(gameId, t, { ...game, players: updatedPlayers });
        if (!calculationPerformed) {
          t.update(gameRef, { players: updatedPlayers, updatedAt: Timestamp.now() });
        }
      } else {
        t.update(gameRef, { players, updatedAt: Timestamp.now() });
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

  const isSuper = await isCallerSuperAdmin(request.auth);
  let batch = db.batch();
  let batchCount = 0;
  const maxBatch = 500;

  for (const gameId of gameIds) {
    const gameRef = db.collection('games').doc(gameId);
    const doc = await gameRef.get();
    if (!doc.exists) continue;

    const isOwner = doc.data()?.hostUid === request.auth.uid;
    if (!isOwner && !isSuper) {
      console.warn(`Skipping delete for ${gameId}: Not owner and not system-administrator.`);
      continue;
    }

    if (force) {
      await db.recursiveDelete(gameRef);
      await deleteGamePlayerAuthAccounts(gameId, doc.data()?.config?.numPlayers || 10);
      continue;
    }

    batch.update(gameRef, { deletedAt: Timestamp.now(), status: 'deleted' });
    batchCount++;
    if (batchCount >= maxBatch) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
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

  let batch = db.batch();
  let batchCount = 0;

  for (const gameId of gameIds) {
    const gameRef = db.collection('games').doc(gameId);
    const doc = await gameRef.get();
    if (doc.exists && doc.data()?.hostUid === request.auth.uid) {
      batch.update(gameRef, { deletedAt: null, status: 'waiting' });
      batchCount++;
      if (batchCount >= 500) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { success: true };
});

async function archiveGameForResearchIfEligible(data: any, docId: string, contextLabel: string): Promise<void> {
  if ((data.currentRoundNumber || 0) < 1 || data.config?.analyticsEnabled === false) return;
  try {
    await internalAnonymizeAndUploadForResearch(data);
  } catch (err) {
    console.error(`Failed to archive ${contextLabel} game ${docId} for research:`, err);
  }
}

async function softDeleteExpiredActiveGames(now: Timestamp, nowMillis: number, oneDayMs: number): Promise<void> {
  const activeGamesSnap = await db.collection('games').where('deletedAt', '==', null).get();
  let softDeleteBatch = db.batch();
  let softDelCount = 0;

  for (const doc of activeGamesSnap.docs) {
    const data = doc.data();
    const retentionDays = data.retentionDays || 90;
    const lastPlayed = (data.updatedAt || data.createdAt).toMillis();
    const expiresAt = lastPlayed + retentionDays * oneDayMs;

    if (nowMillis > expiresAt) {
      await archiveGameForResearchIfEligible(data, doc.id, 'expired');
      softDeleteBatch.update(doc.ref, { deletedAt: now, status: 'expired' });
      softDelCount++;
      if (softDelCount >= 500) {
        await softDeleteBatch.commit();
        softDeleteBatch = db.batch();
        softDelCount = 0;
      }
    }
  }

  if (softDelCount > 0) {
    await softDeleteBatch.commit();
  }
}

async function hardPurgeTrashGames(purgeThreshold: Timestamp): Promise<void> {
  const trashSnap = await db.collection('games').where('deletedAt', '<', purgeThreshold).get();
  for (const doc of trashSnap.docs) {
    const data = doc.data();
    await archiveGameForResearchIfEligible(data, doc.id, 'purged');
    await db.recursiveDelete(doc.ref);
    await deleteGamePlayerAuthAccounts(doc.id, data.config?.numPlayers || 10);
  }
}

async function purgeUnverifiedAdminUsers(nowMillis: number, oneDayMs: number): Promise<void> {
  const adminUsersSnap = await db.collection('users').where('role', '==', 'admin').get();
  for (const doc of adminUsersSnap.docs) {
    const createdAt = doc.data().createdAt?.toMillis() || 0;
    if (nowMillis - createdAt <= oneDayMs) continue;

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

// europe-west4 does not support Cloud Scheduler, so we use europe-west3 for scheduled functions
export const dailyGamePurge = onSchedule({ schedule: 'every 24 hours', region: 'europe-west3' }, async (_event) => {
  const now = Timestamp.now();
  const nowMillis = now.toMillis();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const thirtyDaysMs = 30 * oneDayMs;

  await softDeleteExpiredActiveGames(now, nowMillis, oneDayMs);
  await hardPurgeTrashGames(Timestamp.fromMillis(nowMillis - thirtyDaysMs));
  await purgeUnverifiedAdminUsers(nowMillis, oneDayMs);
});

export async function internalPlayerLogin(request: { data?: any; rawRequest?: any; auth?: any }) {
  enforceCallableRateLimit(request, 'playerLogin', 15);
  const { gameId, password } = request.data || {};
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
}

export const playerLogin = onCall(async (request) => {
  return await internalPlayerLogin(request);
});

export const triggerAiTurn = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  const { gameId, level = 'rotation' } = request.data || {};
  if (!gameId) throw new HttpsError('invalid-argument', 'Missing gameId');

  const gameRef = db.collection('games').doc(gameId);
  const gameSnap = await gameRef.get();
  if (!gameSnap.exists) throw new HttpsError('not-found', 'Game not found');
  const game = gameSnap.data()!;
  const callerUid = request.auth.uid;
  if (game.hostUid !== callerUid && !game.players?.[callerUid]) {
    throw new HttpsError('permission-denied', 'Not authorized for this game');
  }

  const roundsRef = gameRef.collection('rounds');
  const roundsSnap = await roundsRef.orderBy('number', 'desc').limit(1).get();
  const lastRound = roundsSnap.docs[0]?.data() as Round | undefined;

  return AiAgent.makeDecision(level as any, lastRound);
});

async function runFeedbackGeminiAnalysis(
  feedbackRef: admin.firestore.DocumentReference,
  cleanCategory: string,
  cleanRating: number,
  cleanComment: string,
): Promise<any> {
  try {
    const prompt = `
        Analyze the following feedback from a user of the SOIL agricultural simulation game.
        Category: ${cleanCategory}
        Rating: ${cleanRating}/5
        Comment: ${cleanComment}

        Provide a JSON response with the following fields:
        - summary: A concise summary of the feedback.
        - suggestedActions: A list of 2-3 actionable steps for the development team.
        - sentiment: One of 'positive', 'neutral', 'negative'.
      `;

    const result = await getGenAiClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (responseText) {
      const analysis = JSON.parse(responseText);
      await feedbackRef.update({ aiAnalysis: analysis, updatedAt: Timestamp.now() });
      return analysis;
    }
  } catch (error) {
    console.error('Gemini analysis failed:', error);
  }
  return undefined;
}

async function notifySuperAdminsOfFeedback(
  cleanCategory: string,
  cleanRating: number,
  cleanComment: string,
  aiAnalysis?: any,
  cleanEmail?: string,
): Promise<void> {
  const superAdminsSnap = await db.collection('users').where('role', '==', 'superadmin').get();
  const superAdminEmails = superAdminsSnap.docs.map((doc) => doc.data().email).filter((e) => !!e);
  if (!superAdminEmails.includes('florian.feldhaus@gmail.com')) {
    superAdminEmails.push('florian.feldhaus@gmail.com');
  }

  const { subject, text, html } = buildFeedbackNotificationEmail(
    cleanCategory,
    cleanRating,
    cleanComment,
    aiAnalysis,
    cleanEmail,
  );
  for (const adminEmail of superAdminEmails) {
    try {
      await mailService.sendEmail({ to: adminEmail, subject, text, html });
    } catch (e) {
      console.error(`Failed to notify super admin ${adminEmail}:`, e);
    }
  }
}

export async function internalSubmitFeedback(
  data: any,
  auth?: { uid?: string; token?: Record<string, any> },
  rawRequest?: any,
): Promise<{ success: boolean; status?: string }> {
  enforceCallableRateLimit({ rawRequest, auth }, 'submitFeedback', 5);
  const { category, rating, comment, email, isTest } = data || {};
  if (!category || rating === undefined) {
    throw new HttpsError('invalid-argument', 'Missing feedback fields');
  }

  const cleanCategory = String(category).trim().slice(0, 50);
  const cleanRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 1)));
  const cleanComment = String(comment || '')
    .trim()
    .slice(0, 2000);
  const cleanEmail = sanitizeOptionalFeedbackEmail(email);

  if (!cleanCategory) {
    throw new HttpsError('invalid-argument', 'Missing feedback category');
  }

  const callerEmail = auth?.token?.email;
  const isTestPayload =
    isTest === true ||
    isTestEmail(callerEmail) ||
    (cleanEmail !== undefined && isTestEmail(cleanEmail)) ||
    /^(E2E|Cypress Test)/i.test(cleanComment);
  if (isTestPayload) {
    return { success: true, status: 'skipped_test_data' };
  }

  const feedbackId = db.collection('feedback').doc().id;
  const feedbackRef = db.collection('feedback').doc(feedbackId);
  const feedbackData: any = {
    id: feedbackId,
    category: cleanCategory,
    rating: cleanRating,
    comment: cleanComment,
    status: 'new',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  if (cleanEmail) {
    feedbackData.userEmail = cleanEmail;
    feedbackData.userName = String(auth?.token?.name || cleanEmail.split('@')[0]).slice(0, 100);
  }

  await feedbackRef.set(feedbackData);
  feedbackData.aiAnalysis =
    cleanComment.length >= 3
      ? await runFeedbackGeminiAnalysis(feedbackRef, cleanCategory, cleanRating, cleanComment)
      : null;
  await notifySuperAdminsOfFeedback(cleanCategory, cleanRating, cleanComment, feedbackData.aiAnalysis, cleanEmail);

  return { success: true };
}

export const submitFeedback = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => internalSubmitFeedback(request.data, request.auth, request.rawRequest),
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

function forcePendingPlayerDecisions(players: Record<string, any>, currentRound: number): boolean {
  let logicNeedsCalc = false;
  for (const uid in players) {
    const p = players[uid];
    if (p.submittedRound === undefined || p.submittedRound < currentRound) {
      const lastRound = p.history && p.history.length > 0 ? p.history[p.history.length - 1] : undefined;
      const aiLevel = p.isAi ? p.aiLevel || 'middle' : 'middle';
      p.submittedRound = currentRound;
      p.pendingDecisions = AiAgent.makeDecision(aiLevel as any, lastRound, uid);
      logicNeedsCalc = true;
    }
  }
  return logicNeedsCalc;
}

async function processExpiredGameDeadline(gameDoc: admin.firestore.QueryDocumentSnapshot, currentRound: number) {
  let gameWasFinished = false;
  const game = gameDoc.data();

  await db.runTransaction(async (transaction) => {
    const refreshedGameDoc = await transaction.get(gameDoc.ref);
    const refreshedGame = refreshedGameDoc.data();
    if (!refreshedGame || refreshedGame.status !== 'in_progress') return;

    const players = refreshedGame.players || {};
    if (!forcePendingPlayerDecisions(players, currentRound)) return;

    const allSubmitted = Object.values(players).every((p: any) => p.submittedRound === currentRound);
    if (allSubmitted) {
      const calcResult = await performCalculation(game.id, null, transaction, { ...refreshedGame, players });
      gameWasFinished = !!calcResult?.isFinished;
    } else {
      transaction.update(gameDoc.ref, { players });
    }
  });

  if (gameWasFinished) {
    const gameSnap = await gameDoc.ref.get();
    const gameData = gameSnap.data();
    if (gameData && gameData.config?.analyticsEnabled !== false) {
      internalAnonymizeAndUploadForResearch(gameData).catch((err) =>
        console.error('Failed to auto-upload cloud game for research (processDeadlines):', err),
      );
    }
  }
}

// europe-west4 does not support Cloud Scheduler, so we use europe-west3 for scheduled functions
export const processDeadlines = onSchedule({ schedule: 'every 1 minutes', region: 'europe-west3' }, async (_event) => {
  const nowMillis = Timestamp.now().toMillis();
  const activeGames = await db.collection('games').where('status', '==', 'in_progress').get();

  for (const gameDoc of activeGames.docs) {
    const game = gameDoc.data();
    const currentRound = game.currentRoundNumber;
    const deadline = game.roundDeadlines?.[currentRound];

    if (deadline && deadline.toMillis() < nowMillis) {
      await processExpiredGameDeadline(gameDoc, currentRound);
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
  const uid = request.auth.uid;

  try {
    const gameSnap = await gameRef.get();
    if (!gameSnap.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }
    const gameData = gameSnap.data()!;
    if (!gameData.players?.[uid]) {
      throw new HttpsError('permission-denied', 'Not a player in this game');
    }

    const fieldPath = `players.${uid}.pendingDecisions`;
    await gameRef.update({
      [fieldPath]: decision,
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
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

    const safeOrigin = sanitizeOrigin(origin);
    const loginLink = `${safeOrigin}/game-login?gameId=${encodeURIComponent(gameId)}&pin=${encodeURIComponent(secret.password)}`;

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

    const safeOrigin = sanitizeOrigin(origin);
    const link = await admin.auth().generateEmailVerificationLink(email, {
      url: `${safeOrigin}/admin/login?email=${encodeURIComponent(email)}&verified=true`,
    });

    await mailService.sendVerificationEmail(email, link);
    return { success: true };
  },
);

export async function internalSendPasswordResetEmail(request: { data?: any; rawRequest?: any; auth?: any }) {
  enforceCallableRateLimit(request, 'sendPasswordResetEmail', 5);
  const { email, origin } = request.data || {};
  if (!email) throw new HttpsError('invalid-argument', 'Email is required');

  const safeOrigin = sanitizeOrigin(origin);
  const link = await admin.auth().generatePasswordResetLink(email, {
    url: `${safeOrigin}/admin/login?email=${encodeURIComponent(email)}`,
  });

  await mailService.sendPasswordResetEmail(email, link);
  return { success: true };
}

export const sendPasswordResetEmail = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    return await internalSendPasswordResetEmail(request);
  },
);

export const manageFeedback = onCall(
  { secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
    if (!(await isCallerSuperAdmin(request.auth))) {
      throw new HttpsError('permission-denied', 'Super-Administratoren only');
    }

    const { feedbackId, action, value } = request.data;
    if (!feedbackId || !action) throw new HttpsError('invalid-argument', 'Missing feedbackId or action');

    const feedbackRef = db.collection('feedback').doc(feedbackId);
    const feedbackSnap = await feedbackRef.get();
    if (!feedbackSnap.exists) throw new HttpsError('not-found', 'Feedback not found');

    const feedback = feedbackSnap.data() as any;
    const updates: any = { updatedAt: Timestamp.now() };

    if (action === 'reply') {
      const response = value?.response;
      if (!response) throw new HttpsError('invalid-argument', 'Missing reply response');
      updates.status = 'replied';
      updates.adminResponse = response;
      await sendFeedbackReplyEmailIfPresent(feedback, response);
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
      {
        name: 'Integrated Farming',
        description: 'Sustainable balanced approach with moderate tech and crop rotation.',
      },
      {
        name: 'Organic Right',
        description: 'Profitable organic rotation using beneficial organisms and high-value crops.',
      },
      {
        name: 'Organic Wrong',
        description: 'Organic approach failing due to poor rotation or monoculture (e.g. only Potatoes).',
      },
      {
        name: 'Conventional Right',
        description: 'Sustainable conventional approach with optimized synthetic inputs and rotation.',
      },
      {
        name: 'Conventional Wrong',
        description: 'Intensive conventional approach with constant pesticides and fertilizer, often monoculture.',
      },
      {
        name: 'Resource Miser',
        description: 'Minimalist strategy with zero investment in machines or inputs, usually low-yield.',
      },
    ];
    // Seed categories
    const batch = db.batch();
    for (const cat of initialCategories) {
      batch.set(db.collection('game_categories').doc(), cat);
    }
    await batch.commit();
    return initialCategories.map((c) => c.name);
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
    Analyze the following game data for a player in the "SOIL" agricultural management game.
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
    const result = await getGenAiClient().models.generateContent({
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

export const deleteAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in to delete your account');
  }

  const uid = request.auth.uid;

  try {
    // 1. Delete all games hosted by this user
    const gamesSnapshot = await db.collection('games').where('hostUid', '==', uid).get();
    for (const gameDoc of gamesSnapshot.docs) {
      const gameData = gameDoc.data();
      // Use recursiveDelete to ensure all subcollections (like rounds) are also deleted
      await db.recursiveDelete(gameDoc.ref);
      await deleteGamePlayerAuthAccounts(gameDoc.id, gameData);
    }

    // 2. Delete the user document
    const userRef = db.collection('users').doc(uid);
    await db.recursiveDelete(userRef);

    // 3. Delete the Firebase Auth user
    await admin.auth().deleteUser(uid);

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting account:', error);
    throw new HttpsError('internal', error.message || 'Failed to delete account');
  }
});

// --- Weekly Activity & Feedback Digest ---

export async function sendWeeklyActivityDigest(): Promise<{
  gamesLast7d: number;
  researchGamesLast7d: number;
  feedbackLast7d: number;
}> {
  const cutoffMillis = Timestamp.now().toMillis() - 7 * 24 * 60 * 60 * 1000;

  const [researchSnap, gamesSnap, feedbackSnap, pendingUsersSnap, superAdminsSnap] = await Promise.all([
    db.collection('research_games').get(),
    db.collection('games').get(),
    db.collection('feedback').get(),
    db.collection('users').where('status', '==', 'pending').get(),
    db.collection('users').where('role', '==', 'superadmin').get(),
  ]);

  const researchStats = summarizeWeeklyResearchGames(researchSnap.docs, cutoffMillis);
  const cloudStats = summarizeWeeklyCloudGames(gamesSnap.docs, cutoffMillis);
  const feedbackStats = summarizeWeeklyFeedback(feedbackSnap.docs, cutoffMillis);
  const pendingEducators = pendingUsersSnap.docs.length;

  const superAdminEmails = superAdminsSnap.docs.map((doc) => doc.data()?.email).filter((e): e is string => !!e);
  if (!superAdminEmails.includes('florian.feldhaus@gmail.com')) {
    superAdminEmails.push('florian.feldhaus@gmail.com');
  }

  const { subject, text, html } = buildWeeklyDigestEmail(researchStats, cloudStats, feedbackStats, pendingEducators);
  for (const adminEmail of superAdminEmails) {
    try {
      await mailService.sendEmail({ to: adminEmail, subject, text, html });
    } catch (err) {
      console.error(`Failed to send weekly activity digest to ${adminEmail}:`, err);
    }
  }

  return {
    gamesLast7d: cloudStats.gamesLast7d,
    researchGamesLast7d: researchStats.researchGamesLast7d,
    feedbackLast7d: feedbackStats.recentFeedback.length,
  };
}

// europe-west4 does not support Cloud Scheduler, so scheduled triggers run in europe-west3 (Frankfurt)
export const weeklyActivityDigest = onSchedule(
  {
    schedule: 'every monday 08:00',
    timeZone: 'Europe/Berlin',
    region: 'europe-west3',
    secrets: ['GMAIL_SERVICE_ACCOUNT_EMAIL', 'GMAIL_IMPERSONATED_USER'],
  },
  async (_event) => {
    await sendWeeklyActivityDigest();
  },
);

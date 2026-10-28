import type * as admin from 'firebase-admin';
import { CONTRACT_DEFINITIONS, GAME_CONSTANTS, STICKER_DEFINITIONS } from './constants';
import { GameEngine } from './game-engine';

export interface PublicResearchPlayer {
  uid: string;
  displayName: string;
  isAi: boolean;
  aiLevel?: 'elementary' | 'middle' | 'high';
  playerNumber: number;
  capital: number;
  currentRound: number;
  avgSoil: number;
  avgNutrition: number;
  sustainabilityScore: number;
  history: any[];
}

export interface PublicResearchGame {
  id: string;
  name: string;
  status: 'finished';
  currentRoundNumber: number;
  settings: {
    length: number;
    difficulty: 'easy' | 'normal' | 'hard';
    playerLabel: string;
  };
  config: {
    numPlayers: number;
    numRounds: number;
    numAi: number;
    advancedPricingEnabled: boolean;
  };
  sourceType: 'cloud' | 'local';
  createdAt: string;
  updatedAt: string;
  players: Record<string, PublicResearchPlayer>;
}

export interface PublicResearchSummary {
  totalGames: number;
  totalHumanPlayers: number;
  totalAiPlayers: number;
  totalRoundsPlayed: number;
  avgFinalCapital: number;
  avgFinalSoil: number;
  avgFinalNutrition: number;
  avgSustainabilityScore: number;
  organicDecisionShare: number;
  fertilizerDecisionShare: number;
  pesticideDecisionShare: number;
  organismsDecisionShare: number;
  cropShares: Record<string, number>;
  difficultyBreakdown: {
    easy: number;
    normal: number;
    hard: number;
  };
  sourceBreakdown: {
    local: number;
    cloud: number;
  };
}

export interface PublicResearchDatasetOptions {
  page?: number;
  pageSize?: number;
  difficulty?: 'easy' | 'normal' | 'hard';
  sourceType?: 'local' | 'cloud';
  organicOnly?: boolean;
  maxSampleSize?: number;
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

export function checkPublicRateLimit(
  ip: string,
  limit = 60,
  windowMs = 60_000,
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = ip || 'unknown';
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  entry.count += 1;
  const allowed = entry.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

export function toIsoString(val: any): string {
  if (!val) return new Date(0).toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch {
      return new Date(0).toISOString();
    }
  }
  if (typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  return String(val);
}

/**
 * Strictly sanitizes a `research_games` document for public consumption.
 * Explicitly strips internal provenance fields (`migratedFrom`) and enforces schema limits.
 */
export function sanitizeResearchGameForPublic(gameDoc: any): PublicResearchGame {
  const rawId = String(gameDoc?.id || '');
  const id = rawId.startsWith('research_') ? rawId : rawId ? `research_${rawId}` : 'research_unknown';

  const rawMigratedFrom = String(gameDoc?.migratedFrom || '');
  const rawPlayers = gameDoc?.players && typeof gameDoc.players === 'object' ? gameDoc.players : {};
  const numPlayers = Math.min(
    20,
    Math.max(1, Number(gameDoc?.config?.numPlayers || Object.keys(rawPlayers).length || 1)),
  );
  const numRounds = Math.min(
    100,
    Math.max(1, Number(gameDoc?.config?.numRounds || gameDoc?.settings?.length || GAME_CONSTANTS.DEFAULT_ROUNDS)),
  );
  const numAi = Math.min(20, Math.max(0, Number(gameDoc?.config?.numAi || 0)));

  let sourceType: 'cloud' | 'local';
  if (gameDoc?.sourceType === 'local' || gameDoc?.sourceType === 'cloud') {
    sourceType = gameDoc.sourceType;
  } else if (rawMigratedFrom) {
    sourceType = rawMigratedFrom.startsWith('local-') ? 'local' : 'cloud';
  } else if (rawId.startsWith('research_local-') || rawId.startsWith('local-')) {
    sourceType = 'local';
  } else {
    sourceType = numPlayers > 1 ? 'cloud' : 'local';
  }

  const rawDiff = String(gameDoc?.settings?.difficulty || 'normal');
  const difficulty: 'easy' | 'normal' | 'hard' =
    rawDiff === 'easy' || rawDiff === 'normal' || rawDiff === 'hard' ? rawDiff : 'normal';

  const sanitizedPlayers: Record<string, PublicResearchPlayer> = {};
  const playerKeys = Object.keys(rawPlayers);

  playerKeys.forEach((key, idx) => {
    const p = rawPlayers[key] || {};
    const playerNumber = Number(p.playerNumber || idx + 1);
    const safeUid = key.startsWith('player-') ? key : `player-${id}-${playerNumber}`;
    const capital = Number(p.capital || 0);
    const avgSoil = Number(p.avgSoil ?? 0);
    const avgNutrition = Number(p.avgNutrition ?? 0);
    const sustainabilityScore =
      typeof p.sustainabilityScore === 'number'
        ? Math.round(p.sustainabilityScore * 10) / 10
        : GameEngine.calculateSustainabilityScore(capital, avgSoil);

    const history = Array.isArray(p.history)
      ? p.history.slice(0, 101).map((h: any) => ({
          number: Number(h?.number ?? 0),
          avgSoil: Number(h?.avgSoil ?? 0),
          avgNutrition: Number(h?.avgNutrition ?? 0),
          decision: h?.decision
            ? {
                machines: Number(h.decision.machines || 0),
                organic: !!h.decision.organic,
                fertilizer: !!h.decision.fertilizer,
                pesticide: !!h.decision.pesticide,
                organisms: !!h.decision.organisms,
                parcels: typeof h.decision.parcels === 'object' && h.decision.parcels ? h.decision.parcels : {},
              }
            : undefined,
          result: h?.result
            ? {
                profit: Number(h.result.profit || 0),
                capital: Number(h.result.capital || 0),
                income: Number(h.result.income || 0),
                subsidies: Number(h.result.subsidies || 0),
                expenses: h.result.expenses
                  ? {
                      seeds: Number(h.result.expenses.seeds || 0),
                      labor: Number(h.result.expenses.labor || 0),
                      running: Number(h.result.expenses.running || 0),
                      investments: Number(h.result.expenses.investments || 0),
                      total: Number(h.result.expenses.total || 0),
                    }
                  : undefined,
                events: h.result.events
                  ? {
                      weather: String(h.result.events.weather || 'Normal'),
                      vermin: Array.isArray(h.result.events.vermin) ? h.result.events.vermin.slice(0, 10) : [],
                    }
                  : { weather: 'Normal', vermin: [] },
                harvestSummary:
                  typeof h.result.harvestSummary === 'object' && h.result.harvestSummary ? h.result.harvestSummary : {},
              }
            : undefined,
          parcelsSnapshot: Array.isArray(h?.parcelsSnapshot) ? h.parcelsSnapshot : [],
        }))
      : [];

    const playerObj: PublicResearchPlayer = {
      uid: safeUid,
      displayName: `Team ${playerNumber}`,
      isAi: !!p.isAi,
      playerNumber,
      capital,
      currentRound: Number(p.currentRound || 0),
      avgSoil,
      avgNutrition,
      sustainabilityScore,
      history,
    };
    if (p.aiLevel === 'elementary' || p.aiLevel === 'middle' || p.aiLevel === 'high') {
      playerObj.aiLevel = p.aiLevel;
    }
    sanitizedPlayers[safeUid] = playerObj;
  });

  const createdAt = toIsoString(gameDoc?.createdAt);
  const updatedAt = toIsoString(gameDoc?.updatedAt || gameDoc?.createdAt);

  return {
    id,
    name: 'Anonymized Game',
    status: 'finished',
    currentRoundNumber: Math.min(100, Math.max(0, Number(gameDoc?.currentRoundNumber || 0))),
    settings: {
      length: Math.min(100, Math.max(1, Number(gameDoc?.settings?.length || numRounds))),
      difficulty,
      playerLabel: String(gameDoc?.settings?.playerLabel || 'Player').substring(0, 50),
    },
    config: {
      numPlayers,
      numRounds,
      numAi,
      advancedPricingEnabled: !!gameDoc?.config?.advancedPricingEnabled,
    },
    sourceType,
    createdAt,
    updatedAt,
    players: sanitizedPlayers,
  };
}

export function isPredominantlyOrganicGame(game: PublicResearchGame): boolean {
  let humanDecisionCount = 0;
  let organicDecisionCount = 0;

  for (const player of Object.values(game.players || {})) {
    if (player.isAi) continue;
    for (const round of player.history || []) {
      if (round && round.number > 0 && round.decision) {
        humanDecisionCount += 1;
        if (round.decision.organic) {
          organicDecisionCount += 1;
        }
      }
    }
  }

  return humanDecisionCount > 0 && organicDecisionCount / humanDecisionCount >= 0.5;
}

export function computeResearchSummary(games: PublicResearchGame[]): PublicResearchSummary {
  const difficultyBreakdown = { easy: 0, normal: 0, hard: 0 };
  const sourceBreakdown = { local: 0, cloud: 0 };
  const cropCounts: Record<string, number> = {};
  Object.keys(GAME_CONSTANTS.CROPS).forEach((crop) => {
    cropCounts[crop] = 0;
  });

  let totalHumanPlayers = 0;
  let totalAiPlayers = 0;
  let totalRoundsPlayed = 0;

  let sumHumanCapital = 0;
  let sumHumanSoil = 0;
  let sumHumanNutrition = 0;
  let sumHumanSustainability = 0;

  let totalHumanRoundDecisions = 0;
  let organicRoundDecisions = 0;
  let fertilizerRoundDecisions = 0;
  let pesticideRoundDecisions = 0;
  let organismsRoundDecisions = 0;
  let totalParcelDecisions = 0;

  for (const g of games) {
    const diff = g.settings?.difficulty || 'normal';
    if (diff === 'easy' || diff === 'normal' || diff === 'hard') {
      difficultyBreakdown[diff] += 1;
    } else {
      difficultyBreakdown.normal += 1;
    }

    if (g.sourceType === 'cloud') {
      sourceBreakdown.cloud += 1;
    } else {
      sourceBreakdown.local += 1;
    }

    totalRoundsPlayed += Number(g.currentRoundNumber || 0);

    for (const p of Object.values(g.players || {})) {
      if (p.isAi) {
        totalAiPlayers += 1;
        continue;
      }

      totalHumanPlayers += 1;
      sumHumanCapital += Number(p.capital || 0);
      sumHumanSoil += Number(p.avgSoil || 0);
      sumHumanNutrition += Number(p.avgNutrition || 0);
      sumHumanSustainability += Number(
        typeof p.sustainabilityScore === 'number'
          ? p.sustainabilityScore
          : GameEngine.calculateSustainabilityScore(Number(p.capital || 0), Number(p.avgSoil || 0)),
      );

      for (const h of p.history || []) {
        if (!h || Number(h.number || 0) <= 0 || !h.decision) continue;
        totalHumanRoundDecisions += 1;
        if (h.decision.organic) organicRoundDecisions += 1;
        if (h.decision.fertilizer) fertilizerRoundDecisions += 1;
        if (h.decision.pesticide) pesticideRoundDecisions += 1;
        if (h.decision.organisms) organismsRoundDecisions += 1;

        const parcels = h.decision.parcels || {};
        for (const crop of Object.values(parcels)) {
          const cropKey = String(crop || 'Fallow');
          cropCounts[cropKey] = (cropCounts[cropKey] || 0) + 1;
          totalParcelDecisions += 1;
        }
      }
    }
  }

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
  const avg = (sum: number, den: number, decimals = 1) => {
    if (den <= 0) return 0;
    const factor = 10 ** decimals;
    return Math.round((sum / den) * factor) / factor;
  };

  const cropShares: Record<string, number> = {};
  for (const [crop, count] of Object.entries(cropCounts)) {
    cropShares[crop] = pct(count, totalParcelDecisions);
  }

  return {
    totalGames: games.length,
    totalHumanPlayers,
    totalAiPlayers,
    totalRoundsPlayed,
    avgFinalCapital: avg(sumHumanCapital, totalHumanPlayers, 0),
    avgFinalSoil: avg(sumHumanSoil, totalHumanPlayers, 1),
    avgFinalNutrition: avg(sumHumanNutrition, totalHumanPlayers, 1),
    avgSustainabilityScore: avg(sumHumanSustainability, totalHumanPlayers, 1),
    organicDecisionShare: pct(organicRoundDecisions, totalHumanRoundDecisions),
    fertilizerDecisionShare: pct(fertilizerRoundDecisions, totalHumanRoundDecisions),
    pesticideDecisionShare: pct(pesticideRoundDecisions, totalHumanRoundDecisions),
    organismsDecisionShare: pct(organismsRoundDecisions, totalHumanRoundDecisions),
    cropShares,
    difficultyBreakdown,
    sourceBreakdown,
  };
}

export async function buildPublicResearchDataset(
  db: admin.firestore.Firestore,
  options: PublicResearchDatasetOptions = {},
) {
  const page = Math.max(1, Number(options.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize || 20)));
  const maxSampleSize = Math.min(500, Math.max(pageSize, Number(options.maxSampleSize || 200)));

  const gamesQuery = db.collection('research_games').orderBy('updatedAt', 'desc').limit(maxSampleSize);
  const gamesSnap = await gamesQuery.get();

  const allSanitized: PublicResearchGame[] = (gamesSnap.docs || []).map((doc) => {
    const raw = doc.data() || {};
    return sanitizeResearchGameForPublic({ id: doc.id || raw.id, ...raw });
  });

  const filtered = allSanitized.filter((g) => {
    if (options.difficulty && g.settings.difficulty !== options.difficulty) {
      return false;
    }
    if (options.sourceType && g.sourceType !== options.sourceType) {
      return false;
    }
    if (options.organicOnly && !isPredominantlyOrganicGame(g)) {
      return false;
    }
    return true;
  });

  const summary = computeResearchSummary(filtered);
  const offset = (page - 1) * pageSize;
  const pagedGames = filtered.slice(offset, offset + pageSize);

  let latestInsight: any = null;
  try {
    const insightCollection = db.collection('system_insights');
    if (insightCollection && typeof insightCollection.orderBy === 'function') {
      const insightSnap = await insightCollection.orderBy('createdAt', 'desc').limit(1).get();
      if (insightSnap && !insightSnap.empty && insightSnap.docs?.length > 0) {
        const d = insightSnap.docs[0].data() || {};
        latestInsight = {
          strategies: Array.isArray(d.strategies) ? d.strategies : [],
          balancingReport: d.balancingReport || null,
          gameCount: Number(d.gameCount || 0),
          createdAt: toIsoString(d.createdAt),
        };
      }
    }
  } catch {
    latestInsight = null;
  }

  return {
    games: pagedGames,
    total: filtered.length,
    pagination: {
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    },
    summary,
    latestInsight,
  };
}

export async function getPublicResearchGameWithRounds(
  db: admin.firestore.Firestore,
  gameId: string,
  includeRounds = true,
): Promise<{ game: PublicResearchGame; rounds: any[] } | null> {
  const cleanId = String(gameId || '').trim();
  if (!cleanId) return null;

  let gameRef = db.collection('research_games').doc(cleanId);
  let gameSnap = await gameRef.get();

  if (!gameSnap.exists && !cleanId.startsWith('research_')) {
    gameRef = db.collection('research_games').doc(`research_${cleanId}`);
    gameSnap = await gameRef.get();
  }

  if (!gameSnap.exists) return null;

  const rawGame = gameSnap.data() || {};
  const game = sanitizeResearchGameForPublic({ id: gameSnap.id || rawGame.id || cleanId, ...rawGame });

  let rounds: any[] = [];
  if (includeRounds && typeof gameRef.collection === 'function') {
    const roundsSnap = await gameRef.collection('rounds').get();
    rounds = (roundsSnap.docs || [])
      .map((doc) => {
        const d = doc.data() || {};
        return {
          number: Number(d.number ?? 0),
          events: d.events
            ? {
                weather: String(d.events.weather || 'Normal'),
                vermin: Array.isArray(d.events.vermin) ? d.events.vermin : [],
              }
            : { weather: 'Normal', vermin: [] },
          playerData: d.playerData || {},
        };
      })
      .sort((a, b) => a.number - b.number);
  }

  return { game, rounds };
}

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const CSV_COLUMNS = [
  'gameId',
  'sourceType',
  'difficulty',
  'totalRounds',
  'playerUid',
  'displayName',
  'isAi',
  'roundNumber',
  'organic',
  'fertilizer',
  'pesticide',
  'organisms',
  'profit',
  'capital',
  'income',
  'subsidies',
  'expensesTotal',
  'avgSoil',
  'avgNutrition',
  'weather',
  'vermin',
  'wheatParcels',
  'cornParcels',
  'potatoParcels',
  'beetParcels',
  'barleyParcels',
  'oatParcels',
  'ryeParcels',
  'fieldbeanParcels',
  'rapeseedParcels',
  'peaParcels',
  'grassParcels',
  'fallowParcels',
] as const;

export function formatResearchGamesAsCsv(rawGames: any[]): string {
  const lines: string[] = [CSV_COLUMNS.join(',')];

  for (const rawGame of rawGames || []) {
    const game = rawGame?.sourceType ? (rawGame as PublicResearchGame) : sanitizeResearchGameForPublic(rawGame);
    const players = Object.values(game.players || {});

    for (const player of players) {
      const sortedHistory = [...(player.history || [])].sort((a, b) => Number(a.number || 0) - Number(b.number || 0));

      for (const h of sortedHistory) {
        const parcels = h?.decision?.parcels || {};
        const cropCounts: Record<string, number> = {
          Wheat: 0,
          Corn: 0,
          Potato: 0,
          Beet: 0,
          Barley: 0,
          Oat: 0,
          Rye: 0,
          Fieldbean: 0,
          Rapeseed: 0,
          Pea: 0,
          Grass: 0,
          Fallow: 0,
        };

        for (const crop of Object.values(parcels)) {
          const c = String(crop || 'Fallow');
          cropCounts[c] = (cropCounts[c] || 0) + 1;
        }

        const verminList = Array.isArray(h?.result?.events?.vermin) ? h.result.events.vermin.join(';') : '';

        const rowValues = [
          game.id,
          game.sourceType,
          game.settings?.difficulty || 'normal',
          game.currentRoundNumber,
          player.uid,
          player.displayName,
          player.isAi,
          Number(h?.number ?? 0),
          !!h?.decision?.organic,
          !!h?.decision?.fertilizer,
          !!h?.decision?.pesticide,
          !!h?.decision?.organisms,
          Number(h?.result?.profit ?? 0),
          Number(h?.result?.capital ?? player.capital ?? 0),
          Number(h?.result?.income ?? 0),
          Number(h?.result?.subsidies ?? 0),
          Number(h?.result?.expenses?.total ?? 0),
          Number(h?.avgSoil ?? 0),
          Number(h?.avgNutrition ?? 0),
          String(h?.result?.events?.weather || 'Normal'),
          verminList,
          cropCounts.Wheat,
          cropCounts.Corn,
          cropCounts.Potato,
          cropCounts.Beet,
          cropCounts.Barley,
          cropCounts.Oat,
          cropCounts.Rye,
          cropCounts.Fieldbean,
          cropCounts.Rapeseed,
          cropCounts.Pea,
          cropCounts.Grass,
          cropCounts.Fallow,
        ];

        lines.push(rowValues.map(escapeCsvField).join(','));
      }
    }
  }

  return lines.join('\n');
}

export const MCP_TOOLS = [
  {
    name: 'get_research_summary',
    description:
      'Returns aggregated telemetry statistics, crop share percentages, organic/conventional input shares, and latest AI strategy clusters across all anonymized SOIL games.',
    inputSchema: {
      type: 'object',
      properties: {
        difficulty: {
          type: 'string',
          enum: ['easy', 'normal', 'hard'],
          description: 'Optional filter by game difficulty.',
        },
        sourceType: {
          type: 'string',
          enum: ['local', 'cloud'],
          description: 'Optional filter by game origin (local single-player vs. cloud multiplayer).',
        },
        organicOnly: {
          type: 'boolean',
          description: 'If true, only include games where human players farmed organically in >=50% of rounds.',
        },
      },
    },
  },
  {
    name: 'list_research_games',
    description:
      'Lists anonymized finished SOIL games with summary player outcomes and optional filters for difficulty, sourceType, and organic farming.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of games to return (1-100, default 20).',
        },
        offset: {
          type: 'number',
          description: 'Zero-based pagination offset (default 0).',
        },
        difficulty: {
          type: 'string',
          enum: ['easy', 'normal', 'hard'],
        },
        sourceType: {
          type: 'string',
          enum: ['local', 'cloud'],
        },
        organicOnly: {
          type: 'boolean',
        },
      },
    },
  },
  {
    name: 'get_research_game_trajectory',
    description:
      'Returns full round-by-round decisions, yields, soil/nutrition trajectories, and parcel snapshots for a specific anonymized research gameId.',
    inputSchema: {
      type: 'object',
      properties: {
        gameId: {
          type: 'string',
          description: 'The anonymized game ID (e.g. "research_local-123").',
        },
      },
      required: ['gameId'],
    },
  },
  {
    name: 'get_game_constants_and_sources',
    description:
      'Returns SOIL scientific agronomic simulation constants (crop parameters, soil/nutrition formulas, weather/vermin effects, subsidies, and regional contracts).',
    inputSchema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['all', 'crops', 'soil', 'nutrition', 'weather', 'vermin', 'contracts'],
          description: 'Optional section of GAME_CONSTANTS to retrieve (default: "all").',
        },
      },
    },
  },
];

export const MCP_RESOURCES = [
  {
    uri: 'soil://research/summary',
    name: 'SOIL Public Research Summary',
    description:
      'Aggregated telemetry metrics, crop distribution, and AI strategy clusters across anonymized SOIL games.',
    mimeType: 'application/json',
  },
  {
    uri: 'soil://research/constants',
    name: 'SOIL Agronomic Simulation Constants',
    description:
      'Complete scientific simulation parameters, crop yields, soil/nutrition dynamics, and regional contracts.',
    mimeType: 'application/json',
  },
];

export function getMcpServerMetadata() {
  return {
    name: 'soil-research-mcp',
    version: '1.0.0',
    protocolVersion: '2024-11-05',
    description:
      'Public read-only Model Context Protocol (MCP) server for anonymized SOIL agricultural simulation research data.',
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false },
    },
    tools: MCP_TOOLS,
    resources: MCP_RESOURCES,
  };
}

async function executeMcpToolCall(db: admin.firestore.Firestore, id: any, params: any): Promise<any> {
  const toolName = String(params?.name || '');
  const args = params?.arguments && typeof params.arguments === 'object' ? params.arguments : {};

  if (toolName === 'get_research_summary') {
    const dataset = await buildPublicResearchDataset(db, {
      page: 1,
      pageSize: 10,
      difficulty: args.difficulty,
      sourceType: args.sourceType,
      organicOnly: !!args.organicOnly,
    });
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ summary: dataset.summary, latestInsight: dataset.latestInsight }, null, 2),
          },
        ],
        isError: false,
      },
    };
  }

  if (toolName === 'list_research_games') {
    const limit = Math.min(100, Math.max(1, Number(args.limit || 20)));
    const offset = Math.max(0, Number(args.offset || 0));
    const page = Math.floor(offset / limit) + 1;
    const dataset = await buildPublicResearchDataset(db, {
      page,
      pageSize: limit,
      difficulty: args.difficulty,
      sourceType: args.sourceType,
      organicOnly: !!args.organicOnly,
    });
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ total: dataset.total, limit, offset, games: dataset.games }, null, 2),
          },
        ],
        isError: false,
      },
    };
  }

  if (toolName === 'get_research_game_trajectory') {
    const gameId = String(args.gameId || '').trim();
    if (!gameId) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result: {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Missing required argument: gameId' }) }],
          isError: true,
        },
      };
    }
    const data = await getPublicResearchGameWithRounds(db, gameId, true);
    if (!data) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result: {
          content: [{ type: 'text', text: JSON.stringify({ error: `Research game not found: ${gameId}` }) }],
          isError: true,
        },
      };
    }
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        isError: false,
      },
    };
  }

  if (toolName === 'get_game_constants_and_sources') {
    const section = String(args.section || 'all');
    const sectionMap: Record<string, any> = {
      crops: { crops: GAME_CONSTANTS.CROPS },
      soil: { soil: GAME_CONSTANTS.SOIL },
      nutrition: { nutrition: GAME_CONSTANTS.NUTRITION },
      weather: { weatherEffects: GAME_CONSTANTS.WEATHER_EFFECTS },
      vermin: { verminEffects: GAME_CONSTANTS.VERMIN_EFFECTS },
      contracts: { contracts: CONTRACT_DEFINITIONS },
    };
    const payload = sectionMap[section] || {
      constants: GAME_CONSTANTS,
      contracts: CONTRACT_DEFINITIONS,
      stickers: STICKER_DEFINITIONS,
    };
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        isError: false,
      },
    };
  }

  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code: -32601, message: `Unknown tool: ${toolName}` },
  };
}

async function executeMcpResourceRead(db: admin.firestore.Firestore, id: any, params: any): Promise<any> {
  const uri = String(params?.uri || '');
  if (uri === 'soil://research/summary') {
    const dataset = await buildPublicResearchDataset(db, { page: 1, pageSize: 10 });
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ summary: dataset.summary, latestInsight: dataset.latestInsight }, null, 2),
          },
        ],
      },
    };
  }
  if (uri === 'soil://research/constants') {
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ constants: GAME_CONSTANTS, contracts: CONTRACT_DEFINITIONS }, null, 2),
          },
        ],
      },
    };
  }
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code: -32602, message: `Unknown resource URI: ${uri}` },
  };
}

export async function executeMcpSingleRequest(db: admin.firestore.Firestore, rpc: any): Promise<any | null> {
  if (!rpc || typeof rpc !== 'object' || rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') {
    return {
      jsonrpc: '2.0',
      id: rpc?.id ?? null,
      error: { code: -32600, message: 'Invalid JSON-RPC 2.0 Request' },
    };
  }

  const { id, method, params = {} } = rpc;
  const isNotification = id === undefined;

  if (method === 'notifications/initialized' || method.startsWith('notifications/')) {
    return null;
  }

  try {
    switch (method) {
      case 'initialize': {
        const requestedVersion = String(params?.protocolVersion || '2024-11-05');
        const protocolVersion = requestedVersion === '2025-03-26' ? '2025-03-26' : '2024-11-05';
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          result: {
            protocolVersion,
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
            },
            serverInfo: {
              name: 'soil-research-mcp',
              version: '1.0.0',
            },
          },
        };
      }

      case 'ping':
        return { jsonrpc: '2.0', id: id ?? null, result: {} };

      case 'tools/list':
        return { jsonrpc: '2.0', id: id ?? null, result: { tools: MCP_TOOLS } };

      case 'tools/call':
        return await executeMcpToolCall(db, id, params);

      case 'resources/list':
        return { jsonrpc: '2.0', id: id ?? null, result: { resources: MCP_RESOURCES } };

      case 'resources/read':
        return await executeMcpResourceRead(db, id, params);

      default:
        if (isNotification) return null;
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
    }
  } catch (err: any) {
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      error: { code: -32603, message: err?.message || 'Internal MCP server error' },
    };
  }
}

export async function processMcpJsonRpc(db: admin.firestore.Firestore, body: any): Promise<any | null> {
  if (Array.isArray(body)) {
    if (body.length === 0) {
      return {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Empty JSON-RPC batch' },
      };
    }
    const results = await Promise.all(body.map((item) => executeMcpSingleRequest(db, item)));
    const filtered = results.filter((r) => r !== null);
    return filtered.length > 0 ? filtered : null;
  }
  return await executeMcpSingleRequest(db, body);
}

function extractClientIp(req: any): string {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return String(req?.ip || req?.socket?.remoteAddress || 'unknown');
}

export async function handleResearchApiHttpRequest(db: admin.firestore.Firestore, req: any, res: any): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed. Only GET requests are supported.' });
    return;
  }

  const ip = extractClientIp(req);
  const rate = checkPublicRateLimit(`api:${ip}`, 60, 60_000);
  if (typeof res.setHeader === 'function') {
    res.setHeader('X-RateLimit-Limit', '60');
    res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  }
  if (!rate.allowed) {
    res.status(429).json({ error: 'Too Many Requests. Rate limit is 60 requests per minute.' });
    return;
  }

  if (typeof res.setHeader === 'function') {
    res.setHeader('Cache-Control', 'public, max-age=60');
  }

  try {
    const query = req.query || {};
    const pathStr = String(req.path || req.url || '');
    const pathGameMatch = /\/games\/([^/?#]+)/.exec(pathStr);
    const gameId = String(query.gameId || pathGameMatch?.[1] || '').trim();

    if (gameId) {
      const includeRounds = query.includeRounds !== 'false' && query.includeRounds !== '0';
      const data = await getPublicResearchGameWithRounds(db, gameId, includeRounds);
      if (!data) {
        res.status(404).json({ error: `Research game not found: ${gameId}` });
        return;
      }
      res.status(200).json(data);
      return;
    }

    const rawDiff = String(query.difficulty || '');
    const difficulty =
      rawDiff === 'easy' || rawDiff === 'normal' || rawDiff === 'hard'
        ? (rawDiff as 'easy' | 'normal' | 'hard')
        : undefined;
    const rawSource = String(query.sourceType || '');
    const sourceType = rawSource === 'local' || rawSource === 'cloud' ? (rawSource as 'local' | 'cloud') : undefined;
    const organicOnly = query.organicOnly === 'true' || query.organicOnly === '1' || query.organicOnly === true;

    const isCsv = String(query.format || '').toLowerCase() === 'csv' || pathStr.endsWith('.csv');
    if (isCsv) {
      const dataset = await buildPublicResearchDataset(db, {
        page: 1,
        pageSize: 100,
        maxSampleSize: 200,
        difficulty,
        sourceType,
        organicOnly,
      });
      const csv = formatResearchGamesAsCsv(dataset.games);
      if (typeof res.setHeader === 'function') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="soil-research-data.csv"');
      }
      res.status(200).send(csv);
      return;
    }

    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || query.limit || 20)));
    const dataset = await buildPublicResearchDataset(db, {
      page,
      pageSize,
      difficulty,
      sourceType,
      organicOnly,
    });

    res.status(200).json(dataset);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}

export async function handleResearchMcpHttpRequest(db: admin.firestore.Firestore, req: any, res: any): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const ip = extractClientIp(req);
  const rate = checkPublicRateLimit(`mcp:${ip}`, 60, 60_000);
  if (typeof res.setHeader === 'function') {
    res.setHeader('X-RateLimit-Limit', '60');
    res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  }
  if (!rate.allowed) {
    res.status(429).json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32000, message: 'Rate limit exceeded (60 req/min)' },
    });
    return;
  }

  if (req.method === 'GET') {
    if (typeof res.setHeader === 'function') {
      res.setHeader('Cache-Control', 'public, max-age=60');
    }
    res.status(200).json(getMcpServerMetadata());
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Method Not Allowed. Use POST for JSON-RPC 2.0 or GET for metadata.' },
    });
    return;
  }

  let parsedBody = req.body;
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      res.status(400).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: Invalid JSON payload' },
      });
      return;
    }
  }

  const rpcResponse = await processMcpJsonRpc(db, parsedBody);
  if (rpcResponse === null) {
    res.status(202).send('');
    return;
  }

  res.status(200).json(rpcResponse);
}

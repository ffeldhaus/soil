export type CropType =
  | 'Fieldbean'
  | 'Barley'
  | 'Oat'
  | 'Potato'
  | 'Corn'
  | 'Rye'
  | 'Wheat'
  | 'Beet'
  | 'Rapeseed'
  | 'Pea'
  | 'Fallow'
  | 'Grass';

export type WeatherType = 'Normal' | 'Drought' | 'LateFrost' | 'HeatWave' | 'Flood' | 'Storm';

export interface WeatherForecast {
  hintText: string;
  likelyWeathers: WeatherType[];
  confidence: 'exact' | 'tendency' | 'uncertain';
}

export interface RegionalContract {
  id: string;
  name: string;
  description: string;
  reward: number;
}

export interface CollectibleSticker {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: 'soil' | 'economy' | 'resilience' | 'mastery';
  icon: string;
  image?: string;
  rarity: 'bronze' | 'silver' | 'gold';
}
// Grass corresponds to 'Tiere' (Animals) usage in original game or similar fallow with animals.
// Original map: 'Ackerbohne' -> Fieldbean, 'Gerste' -> Barley, 'Hafer' -> Oat, 'Kartoffel' -> Potato, 'Mais' -> Corn, 'Roggen' -> Rye, 'Weizen' -> Wheat, 'Zuckerruebe' -> Beet. 'Brachland' -> Fallow. 'Tiere' -> Animals (Grass).

export interface ParcelRoundFactors {
  baseYield: number;
  soilFactor: number; // e.g. 0.95 (multiplier)
  nutritionFactor: number; // e.g. 1.02 (multiplier)
  weatherFactor: number; // e.g. 0.75 (multiplier)
  pestFactor: number; // e.g. 0.70 (multiplier)
  machineBonus: number; // e.g. 0.12 (+12%)
  organicFactor: number; // e.g. 0.40 or 1.0
  soilDelta: {
    cropRotation: number;
    humusRecovery: number;
    machineCompaction: number;
    fertilizerImpact: number;
    pesticideImpact: number;
    organismsImpact: number;
    weatherErosion: number;
    total: number;
  };
  nutritionDelta: {
    cropUptake: number;
    fertilizerAdd: number;
    leaching: number;
    total: number;
  };
}

export interface Parcel {
  index: number; // 0-39
  crop: CropType;
  soil: number; // 0-100? approx 80 start
  nutrition: number; // 0-100? approx 80 start
  yield?: number; // Result of the harvest
  harvestRating?: 'very_high' | 'high' | 'moderate' | 'low' | 'very_low' | 'none';
  factors?: ParcelRoundFactors;
}

export interface RoundDecision {
  machines: number; // Investment or usage level
  organic: boolean;
  fertilizer: boolean;
  pesticide: boolean;
  organisms: boolean; // Beneficial organisms
  parcels: Record<number, CropType>; // Map parcel index to chosen crop
  priceFixing?: Record<string, boolean>; // Map CropType to boolean
}

export interface RoundResult {
  profit: number;
  capital: number;
  harvestSummary: Record<CropType, number>; // Total yield per crop
  expenses: {
    seeds: number;
    labor: number; // mechanical/machines
    running: number;
    investments: number;
    overdraftInterest?: number;
    total: number;
  };
  income: number;
  subsidies?: number;
  contractBonus?: number;
  overdraftInterest?: number;
  sustainabilityScore?: number;
  insolvent?: boolean;
  unlockedStickers?: string[];
  marketPrices?: Record<string, number>;
  events: {
    weather: string;
    vermin: string[];
  };
  bioSiegel?: boolean;
  machineRealLevel?: number;
}

export interface Round {
  number: number;
  decision: RoundDecision;
  result?: RoundResult;
  parcelsSnapshot: Parcel[]; // State of parcels AFTER the round calculation
  avgSoil?: number;
  avgNutrition?: number;
  nextWeather?: WeatherType;
  weatherForecast?: WeatherForecast;
  activeContract?: RegionalContract;
}

export interface PlayerState {
  uid: string;
  displayName: string;
  isAi: boolean;
  aiLevel?: 'elementary' | 'middle' | 'high';
  capital: number;
  currentRound: number;
  submittedRound?: number; // Last round submitted by this player
  pendingDecisions?: RoundDecision;
  history: Round[]; // Store full history
  avgSoil?: number;
  avgNutrition?: number;
  sustainabilityScore?: number;
  insolvent?: boolean;
  unlockedStickers?: string[];
  playerNumber?: number;
}

export type GameStatus = 'waiting' | 'in_progress' | 'finished' | 'deleted' | 'expired';

export interface GameSettings {
  length: number; // Number of rounds
  difficulty: 'easy' | 'normal' | 'hard';
  playerLabel?: string; // e.g. 'Player', 'Team', 'Farmers'
}

export interface GameConfig {
  numPlayers: number;
  numRounds: number;
  numAi: number;
  advancedPricingEnabled?: boolean;
  analyticsEnabled?: boolean;
  advisorEnabled?: boolean;
  seed?: string;
  challengeTargetScore?: number;
  challengeTargetName?: string;
}

export interface GameEvaluation {
  playStyle: string;
  analysis: string;
  improvements: string[];
  evaluatedAt: { seconds: number; nanoseconds: number } | Date;
}

export interface Game {
  id: string;
  name: string;
  password?: string;
  hostUid: string;
  status: GameStatus;
  settings: GameSettings;
  config: GameConfig;
  players: Record<string, PlayerState>; // Keyed by UID
  currentRoundNumber: number;
  createdAt: { seconds: number; nanoseconds: number } | Date; // Firestore Timestamp or Date
  updatedAt?: { seconds: number; nanoseconds: number } | Date;
  deletedAt?: { seconds: number; nanoseconds: number } | Date | null;
  uploadedAt?: { seconds: number; nanoseconds: number } | Date | null;
  playerSecrets?: Record<string, { password: string }>;
  roundDeadlines?: Record<number, { seconds: number; nanoseconds: number } | Date>;
  evaluations?: Record<string, GameEvaluation>;
  sourceType?: 'local' | 'cloud';
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

export interface ResearchInsightStrategy {
  name: string;
  description: string;
  typicalMetrics?: {
    capital?: number;
    soil?: number;
    nutrition?: number;
  };
  keyDecisions?: string;
}

export interface PublicResearchInsight {
  strategies: ResearchInsightStrategy[];
  balancingReport?: {
    summary?: string;
    issues?: Array<{ severity: 'low' | 'medium' | 'high'; description: string; suggestion: string }>;
    cropAnalysis?: Array<{ crop: string; usageFrequency: string; performanceAssessment: string }>;
  } | null;
  gameCount?: number;
  createdAt?: string;
}

export interface PublicResearchDatasetResponse {
  games: Game[];
  total: number;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary?: PublicResearchSummary;
  latestInsight?: PublicResearchInsight | null;
}

export interface UserStatus {
  uid: string;
  role: 'admin' | 'superadmin' | 'player' | 'new' | 'banned';
  status: 'active' | 'banned';
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: { seconds: number; nanoseconds: number } | Date | string;
  onboarding?: {
    explanation: string;
    institution: string;
    institutionLink: string;
  };
}

export interface Feedback {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  category: 'interface' | 'mechanics' | 'improvements' | 'suggestions' | 'documentation' | 'other';
  rating: number; // 0-5
  comment: string;
  aiAnalysis?: {
    summary: string;
    suggestedActions: string[];
    sentiment: string;
  };
  status: 'new' | 'replied' | 'resolved' | 'rejected';
  adminResponse?: string;
  externalReference?: string; // e.g. GitHub issue link
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
}

export interface TelemetryDailyEntry {
  date: string;
  totalViews: number;
  webViews: number;
  pwaViews: number;
  routes: Record<string, number>;
  events: Record<string, number>;
  referrers: Record<string, number>;
}

export interface TelemetryHourlyEntry {
  hour: string;
  totalViews: number;
  webViews: number;
  pwaViews: number;
  routes: Record<string, number>;
  events: Record<string, number>;
  referrers: Record<string, number>;
}

export interface TelemetryStats {
  viewsToday: number;
  viewsLast24h?: number;
  viewsLast7d: number;
  viewsLast30d: number;
  viewsTotal: number;
  pwaViewsTotal: number;
  webViewsTotal: number;
  routes: Record<string, number>;
  events: Record<string, number>;
  referrers: Record<string, number>;
  dailySeries?: TelemetryDailyEntry[];
  firstRecordedDate?: string | null;
  hourlySeries?: TelemetryHourlyEntry[];
  firstRecordedHour?: string | null;
}

export interface SystemStats {
  games: {
    total: number;
    active: number;
    deleted: number;
  };
  users: {
    total: number;
    admins: number;
    rejected?: number;
    banned: number;
  };
  telemetry?: TelemetryStats;
}

export interface KnownBacklinkEntry {
  id: string;
  name: string;
  organization: string;
  domain: string;
  listingUrl: string;
  status: 'live' | 'pending';
  submittedAt: string;
  publishedAt?: string;
  seoType: 'dofollow' | '302-dofollow' | 'nofollow' | 'pending';
  referrerBehavior: 'transmitted' | 'suppressed_noreferrer' | 'pending';
  note?: string;
}

export interface BacklinkCheckResult {
  id: string;
  ok: boolean;
  httpStatus: number | null;
  linksToSoil: boolean;
  checkedAt: string;
  error?: string;
}

export interface BacklinkStatusResponse {
  results: BacklinkCheckResult[];
  checkedAt: string;
}

export const KNOWN_BACKLINKS: readonly KnownBacklinkEntry[] = [
  {
    id: 'bpb',
    name: 'Datenbank Planspiele',
    organization: 'Bundeszentrale für politische Bildung (bpb)',
    domain: 'bpb.de',
    listingUrl:
      'https://www.bpb.de/lernen/angebote/planspiele/datenbank-planspiele/583068/soil-online-planspiel-simulation-fuer-bne-und-nachhaltige-landwirtschaft/',
    status: 'live',
    submittedAt: '2026-11-04',
    publishedAt: '2026-11-16',
    seoType: 'dofollow',
    referrerBehavior: 'suppressed_noreferrer',
    note: 'Verlinkt /, /manual und /info; setzt rel="noopener noreferrer".',
  },
  {
    id: 'globaleslernen',
    name: 'Portal Globales Lernen',
    organization: 'EWIK / Welthaus Bielefeld',
    domain: 'globaleslernen.de',
    listingUrl:
      'https://www.globaleslernen.de/de/bildungsangebote/multimediales/soil-online-planspiel-simulation-zu-landwirtschaft-bodenfruchtbarkeit-und-nachhaltigkeit-bne',
    status: 'live',
    submittedAt: '2026-11-04',
    publishedAt: '2026-11-05',
    seoType: 'dofollow',
    referrerBehavior: 'suppressed_noreferrer',
    note: 'Inkl. November-Newsletter; Drupal extlink.js setzt rel="noopener noreferrer".',
  },
  {
    id: 'hubbs',
    name: 'HubbS – Landesbildungsserver (SODIX 30188)',
    organization: 'FWU Institut für Film und Bild',
    domain: 'hubbs.schule',
    listingUrl: 'https://hubbs.schule/mediathek/online-planspiel-simulation-fuer-bne-und-nachhaltige-landwirtschaft',
    status: 'live',
    submittedAt: '2026-11-06',
    publishedAt: '2026-11-12',
    seoType: '302-dofollow',
    referrerBehavior: 'transmitted',
    note: 'Weiterleitung via /sodix/proxy-file/30188/0 (HTTP 302); Detail-<h1> startet aktuell ohne „SOIL“.',
  },
  {
    id: 'github',
    name: 'GitHub Repository (ffeldhaus/soil)',
    organization: 'GitHub',
    domain: 'github.com',
    listingUrl: 'https://github.com/ffeldhaus/soil',
    status: 'live',
    submittedAt: '2026-10-20',
    publishedAt: '2026-10-20',
    seoType: 'nofollow',
    referrerBehavior: 'transmitted',
    note: 'Verlinkt /, /manual, /info, /research und /admin im Profil und README.',
  },
  {
    id: 'youtube',
    name: 'YouTube-Kanal & Trailer',
    organization: 'YouTube',
    domain: 'youtube.com',
    listingUrl: 'https://www.youtube.com/watch?v=xCmZUGcyVLM',
    status: 'live',
    submittedAt: '2026-10-29',
    publishedAt: '2026-10-29',
    seoType: 'nofollow',
    referrerBehavior: 'suppressed_noreferrer',
    note: 'Videobeschreibung verlinkt /, /manual, /info, /research und /admin mit rel="nofollow noreferrer".',
  },
  {
    id: 'bne-portal',
    name: 'BNE-Portal – Bildungsmaterialien',
    organization: 'DLR Projektträger / BMBF',
    domain: 'bne-portal.de',
    listingUrl: 'https://www.bne-portal.de/',
    status: 'pending',
    submittedAt: '2026-11-04',
    seoType: 'pending',
    referrerBehavior: 'pending',
    note: 'Eingereicht inkl. Bildrechteformular an DLR-Koordinierungsstelle; in Redaktionsprüfung.',
  },
];

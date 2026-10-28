import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  type AfterViewInit,
  ChangeDetectorRef,
  Component,
  type ElementRef,
  inject,
  type OnInit,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GameEngine } from '../game/engine/game-engine';
import { GameService } from '../game/game.service';
import { GAME_CONSTANTS } from '../game-constants';
import type { Game, PlayerState, PublicResearchInsight, PublicResearchSummary } from '../types';

export interface CropShareRow {
  key: string;
  label: string;
  share: number;
}

@Component({
  selector: 'app-research',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './research.html',
  styleUrl: './research.scss',
})
export class ResearchComponent implements OnInit, AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gameService = inject(GameService);
  private cdr = inject(ChangeDetectorRef);

  scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');

  isLoading = false;
  errorMessage = '';

  filterDifficulty: '' | 'easy' | 'normal' | 'hard' = '';
  filterSourceType: '' | 'local' | 'cloud' = '';
  filterOrganicOnly = false;

  researchGames: Game[] = [];
  totalGames = 0;
  summary: PublicResearchSummary | null = null;
  latestInsight: PublicResearchInsight | null = null;

  expandedGameIds = new Set<string>();
  copiedKey: string | null = null;

  readonly apiEndpoint = 'https://europe-west4-soil-602ea.cloudfunctions.net/researchApi';
  readonly mcpEndpoint = 'https://europe-west4-soil-602ea.cloudfunctions.net/researchMcp';

  readonly mcpConfigJson = JSON.stringify(
    {
      mcpServers: {
        'soil-research': {
          url: 'https://europe-west4-soil-602ea.cloudfunctions.net/researchMcp',
        },
      },
    },
    null,
    2,
  );

  readonly mcpTools = [
    {
      name: 'get_research_summary',
      args: 'difficulty?, sourceType?, organicOnly?',
      description:
        'Aggregierte Kennzahlen, Anbauverteilung, Betriebsmittelquoten und aktuelle empirische Strategie-Cluster.',
    },
    {
      name: 'list_research_games',
      args: 'limit?, offset?, difficulty?, sourceType?, organicOnly?',
      description: 'Paginierte Liste anonymisierter abgeschlossener Spiele inklusive Team-Ergebnissen.',
    },
    {
      name: 'get_research_game_trajectory',
      args: 'gameId (erforderlich)',
      description:
        'Vollständiger Rundenverlauf eines anonymisierten Spiels (Entscheidungen, Erträge, Boden/Nährstoffe, Parzellen).',
    },
    {
      name: 'get_game_constants_and_sources',
      args: 'section? ("all" | "crops" | "soil" | "nutrition" | "weather" | "vermin" | "contracts")',
      description: 'Wissenschaftlich hinterlegte Simulationsparameter und agronomische Modellkonstanten von SOIL.',
    },
  ];

  private readonly cropLabels: Record<string, string> = {
    Wheat: 'Weizen',
    Potato: 'Kartoffel',
    Fieldbean: 'Ackerbohne',
    Pea: 'Erbse',
    Rapeseed: 'Raps',
    Beet: 'Zuckerrübe',
    Barley: 'Gerste',
    Rye: 'Roggen',
    Oat: 'Hafer',
    Corn: 'Mais',
    Grass: 'Tiere / Grünland',
    Fallow: 'Brachland',
  };

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadDataset();
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.route.fragment.subscribe((fragment) => {
        if (fragment) {
          this.scrollToFragment(fragment);
        } else {
          this.scrollContainer()?.nativeElement.scrollTo?.({ top: 0, behavior: 'smooth' });
        }
      });
    }
  }

  async loadDataset() {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const res = await this.gameService.getResearchGames(1, 50, {
        difficulty: this.filterDifficulty || undefined,
        sourceType: this.filterSourceType || undefined,
        organicOnly: this.filterOrganicOnly || undefined,
      });

      this.researchGames = res.games || [];
      this.totalGames = typeof res.total === 'number' ? res.total : this.researchGames.length;
      this.summary = res.summary || this.computeFallbackSummary(this.researchGames);
      this.latestInsight = res.latestInsight || null;

      if (this.researchGames.length > 0 && this.expandedGameIds.size === 0) {
        this.expandedGameIds.add(this.researchGames[0].id);
      }
    } catch (_err) {
      this.errorMessage = 'Forschungsdaten konnten derzeit nicht geladen werden.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  onFilterChange() {
    this.loadDataset();
  }

  resetFilters() {
    this.filterDifficulty = '';
    this.filterSourceType = '';
    this.filterOrganicOnly = false;
    this.loadDataset();
  }

  get cropShareRows(): CropShareRow[] {
    const shares = this.summary?.cropShares || {};
    return Object.keys(this.cropLabels)
      .map((key) => ({
        key,
        label: this.cropLabels[key] || key,
        share: Number(shares[key] ?? 0),
      }))
      .sort((a, b) => b.share - a.share);
  }

  getCropLabel(cropKey: string): string {
    return this.cropLabels[cropKey] || cropKey;
  }

  getDifficultyLabel(difficulty?: string): string {
    if (difficulty === 'easy') return 'Einsteiger';
    if (difficulty === 'hard') return 'Profi';
    return 'Standard';
  }

  getSourceLabel(game: Game): string {
    if (game.sourceType === 'cloud') return 'Cloud';
    if (game.sourceType === 'local') return 'Lokal';
    return game.id.includes('local-') ? 'Lokal' : 'Cloud';
  }

  getHumanPlayers(game: Game): PlayerState[] {
    const all = Object.values(game.players || {});
    const humans = all.filter((p) => !p.isAi);
    return humans.length > 0 ? humans : all;
  }

  getAllPlayers(game: Game): PlayerState[] {
    return Object.values(game.players || {}).sort((a, b) => (a.playerNumber || 0) - (b.playerNumber || 0));
  }

  getGameAvgSoil(game: Game): number {
    const players = this.getHumanPlayers(game);
    if (players.length === 0) return 0;
    const sum = players.reduce((acc, p) => acc + Number(p.avgSoil ?? 0), 0);
    return Math.round((sum / players.length) * 10) / 10;
  }

  getGameAvgCapital(game: Game): number {
    const players = this.getHumanPlayers(game);
    if (players.length === 0) return 0;
    const sum = players.reduce((acc, p) => acc + Number(p.capital ?? 0), 0);
    return Math.round(sum / players.length);
  }

  getPlayerSustainabilityScore(player: PlayerState): number {
    if (typeof player.sustainabilityScore === 'number') {
      return Math.round(player.sustainabilityScore * 10) / 10;
    }
    return GameEngine.calculateSustainabilityScore(Number(player.capital || 0), Number(player.avgSoil || 0));
  }

  getPlayerOrganicShare(player: PlayerState): number {
    const rounds = (player.history || []).filter((r) => r && r.number > 0 && r.decision);
    if (rounds.length === 0) return 0;
    const organicCount = rounds.filter((r) => r.decision?.organic).length;
    return Math.round((organicCount / rounds.length) * 100);
  }

  toggleGameExpansion(gameId: string) {
    if (this.expandedGameIds.has(gameId)) {
      this.expandedGameIds.delete(gameId);
    } else {
      this.expandedGameIds.add(gameId);
    }
  }

  isGameExpanded(gameId: string): boolean {
    return this.expandedGameIds.has(gameId);
  }

  inspectGame(gameId: string, playerUid: string) {
    this.router.navigate(['/game'], {
      queryParams: {
        gameId,
        playerUid,
        viewOnly: 'true',
      },
    });
  }

  exportCsv() {
    const csv = this.buildCsvString(this.researchGames);
    this.triggerDownload(csv, 'soil-research-data.csv', 'text/csv;charset=utf-8');
  }

  exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      filters: {
        difficulty: this.filterDifficulty || 'all',
        sourceType: this.filterSourceType || 'all',
        organicOnly: this.filterOrganicOnly,
      },
      summary: this.summary,
      latestInsight: this.latestInsight,
      total: this.totalGames,
      games: this.researchGames,
    };
    this.triggerDownload(JSON.stringify(payload, null, 2), 'soil-research-data.json', 'application/json');
  }

  async copySnippet(key: string, text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      this.copiedKey = key;
      this.cdr.detectChanges();
      setTimeout(() => {
        if (this.copiedKey === key) {
          this.copiedKey = null;
          this.cdr.detectChanges();
        }
      }, 2000);
    }
  }

  scrollToFragment(fragment: string) {
    if (!fragment) return;
    const attemptScroll = () => {
      const element = document.getElementById(fragment);
      const container = this.scrollContainer()?.nativeElement;
      if (element && container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const relativeTop = elementRect.top - containerRect.top;
        container.scrollTo?.({
          top: container.scrollTop + relativeTop - 72,
          behavior: 'smooth',
        });
        return true;
      }
      return false;
    };
    if (!attemptScroll()) {
      setTimeout(attemptScroll, 100);
    }
  }

  buildCsvString(games: Game[]): string {
    const columns = [
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
    ];

    const escapeField = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const lines = [columns.join(',')];
    for (const game of games) {
      const sourceType = this.getSourceLabel(game) === 'Lokal' ? 'local' : 'cloud';
      const difficulty = game.settings?.difficulty || 'normal';
      for (const player of this.getAllPlayers(game)) {
        const sortedHistory = [...(player.history || [])].sort((a, b) => Number(a.number || 0) - Number(b.number || 0));
        for (const h of sortedHistory) {
          const parcels = h?.decision?.parcels || {};
          const counts: Record<string, number> = {
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
            counts[c] = (counts[c] || 0) + 1;
          }
          const vermin = Array.isArray(h?.result?.events?.vermin) ? h.result.events.vermin.join(';') : '';
          const row = [
            game.id,
            sourceType,
            difficulty,
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
            vermin,
            counts.Wheat,
            counts.Corn,
            counts.Potato,
            counts.Beet,
            counts.Barley,
            counts.Oat,
            counts.Rye,
            counts.Fieldbean,
            counts.Rapeseed,
            counts.Pea,
            counts.Grass,
            counts.Fallow,
          ];
          lines.push(row.map(escapeField).join(','));
        }
      }
    }
    return lines.join('\n');
  }

  private triggerDownload(content: string, filename: string, mimeType: string) {
    if (!isPlatformBrowser(this.platformId) || typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private computeFallbackSummary(games: Game[]): PublicResearchSummary {
    const cropCounts: Record<string, number> = {};
    Object.keys(GAME_CONSTANTS.CROPS).forEach((c) => {
      cropCounts[c] = 0;
    });

    let totalHumans = 0;
    let totalAi = 0;
    let totalRounds = 0;
    let sumCap = 0;
    let sumSoil = 0;
    let sumNutr = 0;
    let sumSust = 0;
    let totalDecisions = 0;
    let orgCount = 0;
    let fertCount = 0;
    let pestCount = 0;
    let orgsCount = 0;
    let totalParcels = 0;

    for (const g of games) {
      totalRounds += Number(g.currentRoundNumber || 0);
      for (const p of Object.values(g.players || {})) {
        if (p.isAi) {
          totalAi += 1;
          continue;
        }
        totalHumans += 1;
        sumCap += Number(p.capital || 0);
        sumSoil += Number(p.avgSoil || 0);
        sumNutr += Number(p.avgNutrition || 0);
        sumSust += this.getPlayerSustainabilityScore(p);

        for (const h of p.history || []) {
          if (!h || Number(h.number || 0) <= 0 || !h.decision) continue;
          totalDecisions += 1;
          if (h.decision.organic) orgCount += 1;
          if (h.decision.fertilizer) fertCount += 1;
          if (h.decision.pesticide) pestCount += 1;
          if (h.decision.organisms) orgsCount += 1;
          for (const crop of Object.values(h.decision.parcels || {})) {
            const c = String(crop || 'Fallow');
            cropCounts[c] = (cropCounts[c] || 0) + 1;
            totalParcels += 1;
          }
        }
      }
    }

    const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
    const cropShares: Record<string, number> = {};
    for (const [k, v] of Object.entries(cropCounts)) {
      cropShares[k] = pct(v, totalParcels);
    }

    return {
      totalGames: games.length,
      totalHumanPlayers: totalHumans,
      totalAiPlayers: totalAi,
      totalRoundsPlayed: totalRounds,
      avgFinalCapital: totalHumans > 0 ? Math.round(sumCap / totalHumans) : 0,
      avgFinalSoil: totalHumans > 0 ? Math.round((sumSoil / totalHumans) * 10) / 10 : 0,
      avgFinalNutrition: totalHumans > 0 ? Math.round((sumNutr / totalHumans) * 10) / 10 : 0,
      avgSustainabilityScore: totalHumans > 0 ? Math.round((sumSust / totalHumans) * 10) / 10 : 0,
      organicDecisionShare: pct(orgCount, totalDecisions),
      fertilizerDecisionShare: pct(fertCount, totalDecisions),
      pesticideDecisionShare: pct(pestCount, totalDecisions),
      organismsDecisionShare: pct(orgsCount, totalDecisions),
      cropShares,
      difficultyBreakdown: { easy: 0, normal: games.length, hard: 0 },
      sourceBreakdown: { local: games.length, cloud: 0 },
    };
  }
}

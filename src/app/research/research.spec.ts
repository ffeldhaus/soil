import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GameService } from '../game/game.service';
import type { PublicResearchDatasetResponse } from '../types';
import { ResearchComponent } from './research';

describe('ResearchComponent', () => {
  let component: ResearchComponent;
  let fixture: ComponentFixture<ResearchComponent>;
  let mockDataset: PublicResearchDatasetResponse;
  let getResearchGamesSpy: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(async () => {
    mockDataset = {
      total: 2,
      games: [
        {
          id: 'research_local-1',
          name: 'Anonymized Game',
          hostUid: 'anonymized',
          status: 'finished',
          sourceType: 'local',
          currentRoundNumber: 8,
          config: { numPlayers: 1, numRounds: 8, numAi: 0 },
          settings: { length: 8, difficulty: 'normal', playerLabel: 'Team' },
          createdAt: new Date('2026-03-10T10:00:00Z'),
          players: {
            'player-research_local-1-1': {
              uid: 'player-research_local-1-1',
              displayName: 'Team 1',
              isAi: false,
              playerNumber: 1,
              capital: 124500,
              currentRound: 8,
              avgSoil: 103.4,
              avgNutrition: 101.2,
              sustainabilityScore: 86.5,
              history: [
                {
                  number: 1,
                  avgSoil: 101,
                  avgNutrition: 100,
                  decision: {
                    machines: 1,
                    organic: true,
                    fertilizer: false,
                    pesticide: false,
                    organisms: true,
                    parcels: { 0: 'Wheat', 1: 'Fieldbean' },
                  },
                  result: {
                    profit: 3200,
                    capital: 103200,
                    income: 8200,
                    subsidies: 1500,
                    expenses: { seeds: 1000, labor: 2000, running: 1000, investments: 1000, total: 5000 },
                    harvestSummary: {} as any,
                    events: { weather: 'Normal', vermin: [] },
                  },
                  parcelsSnapshot: [],
                },
              ],
            },
          },
        },
        {
          id: 'research_cloud-2',
          name: 'Anonymized Game',
          hostUid: 'anonymized',
          status: 'finished',
          sourceType: 'cloud',
          currentRoundNumber: 10,
          config: { numPlayers: 2, numRounds: 10, numAi: 0 },
          settings: { length: 10, difficulty: 'hard', playerLabel: 'Team' },
          createdAt: new Date('2026-03-12T10:00:00Z'),
          players: {
            'player-research_cloud-2-1': {
              uid: 'player-research_cloud-2-1',
              displayName: 'Team 1',
              isAi: false,
              playerNumber: 1,
              capital: 138200,
              currentRound: 10,
              avgSoil: 94.8,
              avgNutrition: 99.1,
              sustainabilityScore: 81.0,
              history: [],
            },
          },
        },
      ],
      summary: {
        totalGames: 2,
        totalHumanPlayers: 2,
        totalAiPlayers: 0,
        totalRoundsPlayed: 18,
        avgFinalCapital: 131350,
        avgFinalSoil: 99.1,
        avgFinalNutrition: 100.2,
        avgSustainabilityScore: 83.8,
        organicDecisionShare: 64.3,
        fertilizerDecisionShare: 35.7,
        pesticideDecisionShare: 21.4,
        organismsDecisionShare: 57.1,
        cropShares: {
          Wheat: 25.0,
          Fieldbean: 15.0,
          Potato: 12.0,
        },
        difficultyBreakdown: { easy: 0, normal: 1, hard: 1 },
        sourceBreakdown: { local: 1, cloud: 1 },
      },
      latestInsight: {
        strategies: [
          {
            name: 'Regenerative Fruchtfolge',
            description: 'Kombiniert Leguminosen und Bio-Landbau für Bodenaufbau.',
            typicalMetrics: { capital: 129800, soil: 104.5, nutrition: 102.6 },
            keyDecisions: 'Bio-Landbau aktiv, Nützlinge',
          },
        ],
        gameCount: 2,
      },
    };

    getResearchGamesSpy = vi.fn().mockResolvedValue(mockDataset);

    await TestBed.configureTestingModule({
      imports: [ResearchComponent],
      providers: [
        provideRouter([]),
        {
          provide: GameService,
          useValue: {
            getResearchGames: getResearchGamesSpy,
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ResearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create and load public research dataset on init', () => {
    expect(component).toBeTruthy();
    expect(getResearchGamesSpy).toHaveBeenCalledWith(1, 50, {
      difficulty: undefined,
      sourceType: undefined,
      organicOnly: undefined,
    });
    expect(component.researchGames.length).toBe(2);
    expect(component.summary?.totalGames).toBe(2);
  });

  it('should render summary metrics, strategy clusters, games table, and API/MCP documentation', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="research-heading"]')?.textContent).toContain('Offene Forschungsdaten');
    expect(el.querySelector('[data-testid="metric-total-games"]')?.textContent?.trim()).toBe('2');
    expect(el.querySelector('[data-testid="metric-total-rounds"]')?.textContent?.trim()).toBe('18');
    expect(el.querySelector('[data-testid="research-strategy-clusters"]')?.textContent).toContain(
      'Regenerative Fruchtfolge',
    );
    expect(el.querySelector('[data-testid="research-games-table"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="research-api-mcp-section"]')?.textContent).toContain(
      'get_research_game_trajectory',
    );
  });

  it('should pass filter criteria when filters change', async () => {
    component.filterDifficulty = 'normal';
    component.filterSourceType = 'local';
    component.filterOrganicOnly = true;
    await component.loadDataset();

    expect(getResearchGamesSpy).toHaveBeenLastCalledWith(1, 50, {
      difficulty: 'normal',
      sourceType: 'local',
      organicOnly: true,
    });
  });

  it('should navigate to read-only board replay when inspectGame is called', () => {
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.inspectGame('research_local-1', 'player-research_local-1-1');

    expect(navSpy).toHaveBeenCalledWith(['/game'], {
      queryParams: {
        gameId: 'research_local-1',
        playerUid: 'player-research_local-1-1',
        viewOnly: 'true',
      },
    });
  });

  it('should build valid CSV string for anonymized games without PII', () => {
    const csv = component.buildCsvString(component.researchGames);
    const lines = csv.split('\n');
    expect(lines.length).toBe(2); // Header + 1 round row
    expect(lines[0]).toContain('gameId,sourceType,difficulty,totalRounds,playerUid,displayName');
    expect(lines[1]).toContain('research_local-1,local,normal,8,player-research_local-1-1,Team 1');
  });
});

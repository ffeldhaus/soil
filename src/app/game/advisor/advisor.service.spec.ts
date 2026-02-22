import { TestBed } from '@angular/core/testing';
import type { Parcel, Round } from '../../types';
import { AdvisorService } from './advisor.service';

describe('AdvisorService', () => {
  let service: AdvisorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdvisorService);
  });

  const createMockParcel = (overrides: Partial<Parcel> = {}): Parcel => ({
    index: 0,
    crop: 'Wheat',
    soil: 80,
    nutrition: 80,
    yield: 100,
    ...overrides,
  });

  const createMockRound = (number: number, parcels: Parcel[], profit = 1000): Round => ({
    number,
    decision: { parcels: {} } as any,
    parcelsSnapshot: parcels,
    result: {
      profit,
      capital: 10000,
      harvestSummary: { Wheat: parcels.reduce((sum, p) => sum + (p.yield || 0), 0) } as any,
      expenses: { seeds: 0, labor: 0, running: 0, investments: 0, total: 0 },
      income: 2000,
      events: { weather: 'Normal', vermin: [] },
    },
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect critical soil quality', () => {
    const parcels = Array(40)
      .fill(null)
      .map(() => createMockParcel({ soil: 50 }));
    const round = createMockRound(1, parcels);
    const insights = service.getInsights(round);

    const soilInsight = insights.find((i) => i.type === 'soil' && i.level === 'danger');
    expect(soilInsight).toBeTruthy();
    expect(soilInsight?.title).toBe('Kritische Bodenqualität');
  });

  it('should detect decreasing soil quality', () => {
    const prevParcels = Array(40)
      .fill(null)
      .map(() => createMockParcel({ soil: 80 }));
    const currParcels = Array(40)
      .fill(null)
      .map(() => createMockParcel({ soil: 70 }));

    const prevRound = createMockRound(1, prevParcels);
    const currRound = createMockRound(2, currParcels);

    const insights = service.getInsights(currRound, prevRound);
    const soilInsight = insights.find((i) => i.type === 'soil' && i.level === 'warning');
    expect(soilInsight).toBeTruthy();
    expect(soilInsight?.message).toContain('verschlechtert');
  });

  it('should detect nutrient deficiency', () => {
    const parcels = Array(40)
      .fill(null)
      .map(() => createMockParcel({ nutrition: 20 }));
    const round = createMockRound(1, parcels);
    const insights = service.getInsights(round);

    const nutritionInsight = insights.find((i) => i.type === 'nutrition' && i.level === 'danger');
    expect(nutritionInsight).toBeTruthy();
    expect(nutritionInsight?.title).toBe('Nährstoffmangel');
  });

  it('should detect over-fertilization', () => {
    const parcels = Array(40)
      .fill(null)
      .map(() => createMockParcel({ nutrition: 250 }));
    const round = createMockRound(1, parcels);
    const insights = service.getInsights(round);

    const nutritionInsight = insights.find((i) => i.type === 'nutrition' && i.level === 'warning');
    expect(nutritionInsight).toBeTruthy();
    expect(nutritionInsight?.title).toBe('Überdüngung');
  });

  it('should detect harvest failure', () => {
    const parcels = Array(40)
      .fill(null)
      .map(() => createMockParcel({ crop: 'Wheat', yield: 0 }));
    const round = createMockRound(1, parcels);
    if (round.result) round.result.harvestSummary = { Wheat: 0 } as any;

    const insights = service.getInsights(round);
    const harvestInsight = insights.find((i) => i.type === 'harvest' && i.level === 'danger');
    expect(harvestInsight).toBeTruthy();
    expect(harvestInsight?.title).toBe('Ernteausfall');
  });

  it('should detect financial loss', () => {
    const parcels = Array(40)
      .fill(null)
      .map(() => createMockParcel());
    const round = createMockRound(1, parcels, -6000);

    const insights = service.getInsights(round);
    const financeInsight = insights.find((i) => i.type === 'finance' && i.level === 'warning');
    expect(financeInsight).toBeTruthy();
    expect(financeInsight?.title).toBe('Hoher Verlust');
  });

  it('should use different messages for soil quality based on context', () => {
    const parcels = Array(40)
      .fill(null)
      .map(() => createMockParcel({ soil: 50 }));
    const round = createMockRound(1, parcels);

    const resultInsights = service.getInsights(round, undefined, 'result');
    const resultSoil = resultInsights.find((i) => i.type === 'soil');
    expect(resultSoil?.message).toContain('nach dieser Runde');

    const nextRoundInsights = service.getInsights(round, undefined, 'next_round');
    const nextRoundSoil = nextRoundInsights.find((i) => i.type === 'soil');
    expect(nextRoundSoil?.message).toContain('starten mit einer sehr schlechten');
  });
});

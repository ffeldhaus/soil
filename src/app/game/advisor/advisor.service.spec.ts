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

  it('should diagnose exact causal yield limiter from parcel.factors', () => {
    const parcels = Array(10)
      .fill(null)
      .map((_, i) =>
        createMockParcel({
          index: i,
          crop: 'Potato',
          yield: 120,
          factors: {
            baseYield: 250,
            soilFactor: 0.98,
            nutritionFactor: 1.0,
            weatherFactor: 0.95,
            pestFactor: 0.5,
            machineBonus: 0.04,
            organicFactor: 1.0,
            soilDelta: {
              cropRotation: -2,
              humusRecovery: 0,
              machineCompaction: -0.2,
              fertilizerImpact: 0,
              pesticideImpact: 0,
              organismsImpact: 0,
              weatherErosion: 0,
              total: -2.2,
            },
            nutritionDelta: {
              cropUptake: -20,
              fertilizerAdd: 0,
              leaching: 0,
              total: -20,
            },
          },
        }),
      );
    const round = createMockRound(1, parcels);
    if (round.result) {
      round.result.harvestSummary = { Potato: 1200 } as any;
    }

    const insights = service.getInsights(round);
    const harvestInsight = insights.find((i) => i.type === 'harvest');
    expect(harvestInsight).toBeTruthy();
    expect(harvestInsight?.message).toContain('Schädlingsbefall war der Hauptgrund');
    expect(harvestInsight?.message).toContain('50 Prozent');
  });

  it('should add positive feedback for crop diversity and balanced nutrition in result context', () => {
    const parcels = [
      createMockParcel({ index: 0, crop: 'Wheat', nutrition: 90 }),
      createMockParcel({ index: 1, crop: 'Barley', nutrition: 95 }),
      createMockParcel({ index: 2, crop: 'Fieldbean', nutrition: 100 }),
    ];
    const round = createMockRound(1, parcels, 2500);

    const insights = service.getInsights(round, undefined, 'result');
    const diversityInsight = insights.find((i) => i.title === 'Starke Artenvielfalt');
    const nutritionInsight = insights.find((i) => i.title === 'Ausgewogene Nährstoffbilanz');

    expect(diversityInsight).toBeTruthy();
    expect(diversityInsight?.level).toBe('info');
    expect(nutritionInsight).toBeTruthy();
    expect(nutritionInsight?.level).toBe('info');

    const nextRoundInsights = service.getInsights(round, undefined, 'next_round');
    expect(nextRoundInsights.find((i) => i.title === 'Starke Artenvielfalt')).toBeUndefined();
    expect(nextRoundInsights.find((i) => i.title === 'Ausgewogene Nährstoffbilanz')).toBeUndefined();
  });

  it('should consolidate multiple crops with the same weather yield limiter into one insight', () => {
    const createFactors = (weatherFactor: number, pestFactor = 1.0) => ({
      baseYield: 100,
      soilFactor: 1.0,
      nutritionFactor: 1.0,
      weatherFactor,
      pestFactor,
      machineBonus: 0,
      organicFactor: 1.0,
      soilDelta: {
        cropRotation: 0,
        humusRecovery: 0,
        machineCompaction: 0,
        fertilizerImpact: 0,
        pesticideImpact: 0,
        organismsImpact: 0,
        weatherErosion: 0,
        total: 0,
      },
      nutritionDelta: {
        cropUptake: 0,
        fertilizerAdd: 0,
        leaching: 0,
        total: 0,
      },
    });

    const parcels: Parcel[] = [
      createMockParcel({ index: 0, crop: 'Potato', factors: createFactors(0.85 - 0.001) }), // ~15% loss
      createMockParcel({ index: 1, crop: 'Wheat', factors: createFactors(0.85 - 0.001) }), // ~15% loss
      createMockParcel({ index: 2, crop: 'Pea', factors: createFactors(0.75) }), // 25% loss
    ];
    const round = createMockRound(1, parcels);
    if (round.result) {
      round.result.harvestSummary = {
        Potato: 200, // baseYield 250 -> 0.8 relativeYield
        Wheat: 85, // baseYield 100 -> 0.85 relativeYield
        Pea: 45, // baseYield 60 -> 0.75 relativeYield
      } as any;
    }

    const insights = service.getInsights(round);
    const harvestLossInsights = insights.filter((i) => i.type === 'harvest' && i.title !== 'Starke Artenvielfalt');
    expect(harvestLossInsights.length).toBe(1);
    expect(harvestLossInsights[0].level).toBe('warning');
    expect(harvestLossInsights[0].title).toBe('Wetterbedingte Ertragsverluste');
    expect(harvestLossInsights[0].message).toBe(
      'Ungünstige Witterung hat den Ertrag bei Kartoffel (−15 %), Weizen (−15 %) und Erbse (−25 %) gemindert.',
    );
    expect(harvestLossInsights[0].hint).toContain('Humusgehalt');
  });

  it('should consolidate multiple crops with pest loss and escalate to danger if any crop has <50% relative yield', () => {
    const createPestFactors = (pestFactor: number) => ({
      baseYield: 100,
      soilFactor: 1.0,
      nutritionFactor: 1.0,
      weatherFactor: 1.0,
      pestFactor,
      machineBonus: 0,
      organicFactor: 1.0,
      soilDelta: {
        cropRotation: 0,
        humusRecovery: 0,
        machineCompaction: 0,
        fertilizerImpact: 0,
        pesticideImpact: 0,
        organismsImpact: 0,
        weatherErosion: 0,
        total: 0,
      },
      nutritionDelta: {
        cropUptake: 0,
        fertilizerAdd: 0,
        leaching: 0,
        total: 0,
      },
    });

    const parcels: Parcel[] = [
      createMockParcel({ index: 0, crop: 'Potato', factors: createPestFactors(0.45) }),
      createMockParcel({ index: 1, crop: 'Wheat', factors: createPestFactors(0.7) }),
    ];
    const round = createMockRound(1, parcels);
    if (round.result) {
      round.result.harvestSummary = {
        Potato: 110, // baseYield 250 -> 0.44 (< 0.5)
        Wheat: 70, // baseYield 100 -> 0.7
      } as any;
    }

    const insights = service.getInsights(round);
    const pestInsights = insights.filter(
      (i) => i.type === 'harvest' && i.title === 'Ertragsverluste durch Schädlingsbefall',
    );
    expect(pestInsights.length).toBe(1);
    expect(pestInsights[0].level).toBe('danger');
    expect(pestInsights[0].message).toBe(
      'Schädlingsbefall hat den Ertrag bei Kartoffel (−55 %) und Weizen (−30 %) gemindert.',
    );
    expect(pestInsights[0].hint).toContain('Nützlinge');
  });
});

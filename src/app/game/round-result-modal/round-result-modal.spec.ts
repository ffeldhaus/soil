import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { Round } from '../../types';
import { RoundResultModal } from './round-result-modal';

describe('RoundResultModal', () => {
  let component: RoundResultModal;
  let fixture: ComponentFixture<RoundResultModal>;

  const mockRound: Round = {
    number: 1,
    decision: {
      machines: 0,
      organic: false,
      fertilizer: false,
      pesticide: false,
      organisms: false,
      parcels: {},
    },
    result: {
      profit: 500,
      capital: 1500,
      bioSiegel: true,
      events: {
        weather: 'Normal',
        vermin: [],
      },
      harvestSummary: {} as any,
      expenses: {
        seeds: 0,
        labor: 0,
        running: 0,
        investments: 0,
        total: 0,
      },
      income: 500,
      machineRealLevel: 4,
    },
    parcelsSnapshot: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoundResultModal],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RoundResultModal);
    component = fixture.componentInstance;
    component.round = mockRound;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return correct values from getters', () => {
    expect(component.profit).toBe(500);
    expect(component.capital).toBe(1500);
    expect(component.bioSiegel).toBe(true);
    expect(component.events?.weather).toBe('Normal');
    expect(component.machineLevel).toBe(4);
  });

  it('should emit resultClosed on onClose', () => {
    const spy = vi.spyOn(component.resultClosed, 'emit');
    component.onClose();
    expect(spy).toHaveBeenCalled();
  });

  it('should translate weather', () => {
    expect(component.t('Normal')).toBe('Normal');
  });

  it('should map unlocked stickers and render leaderboard and financial extras', () => {
    const f = TestBed.createComponent(RoundResultModal);
    const comp = f.componentInstance;
    comp.round = {
      ...mockRound,
      result: {
        ...mockRound.result!,
        contractBonus: 3500,
        overdraftInterest: 1200,
        insolvent: true,
        unlockedStickers: ['humus-pionier', 'vertrags-partner'],
      },
    };
    comp.leaderboard = [
      {
        uid: 'p1',
        name: 'Hof 1',
        score: 1120,
        prevScore: 1050,
        rank: 1,
        prevRank: 2,
        rankDelta: 1,
        capital: 120000,
        avgSoil: 104,
        isCurrentPlayer: true,
      },
    ];
    f.detectChanges();

    const stickers = comp.getUnlockedStickerDetails();
    expect(stickers.length).toBe(2);
    expect(stickers[0].id).toBe('humus-pionier');
    expect(comp.contractBonus).toBe(3500);
    expect(comp.overdraftInterest).toBe(1200);
    expect(comp.insolvent).toBe(true);

    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="insolvency-banner"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="contract-bonus-row"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="overdraft-interest-row"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="unlocked-stickers-section"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="round-leaderboard"]')).toBeTruthy();
  });
});

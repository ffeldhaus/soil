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
});

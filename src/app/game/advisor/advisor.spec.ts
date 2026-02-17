import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import type { Round } from '../../types';
import { GameAdvisorComponent } from './advisor';
import { type AdvisorInsight, AdvisorService } from './advisor.service';

describe('GameAdvisorComponent', () => {
  let component: GameAdvisorComponent;
  let fixture: ComponentFixture<GameAdvisorComponent>;
  let advisorServiceMock: any;

  const mockRound: Round = {
    number: 1,
    decision: { parcels: {} } as any,
    parcelsSnapshot: [],
    result: {
      profit: 1000,
      capital: 10000,
      harvestSummary: {} as any,
      expenses: { seeds: 0, labor: 0, running: 0, investments: 0, total: 0 },
      income: 2000,
      events: { weather: 'Normal', vermin: [] },
    },
  };

  beforeEach(async () => {
    advisorServiceMock = {
      getInsights: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GameAdvisorComponent],
      providers: [{ provide: AdvisorService, useValue: advisorServiceMock }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(GameAdvisorComponent);
    component = fixture.componentInstance;

    component.currentRound = mockRound;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display insights when enabled and available', () => {
    const mockInsights: AdvisorInsight[] = [
      { type: 'soil', level: 'warning', title: 'Test Title', message: 'Test Message' },
    ];
    advisorServiceMock.getInsights.mockReturnValue(mockInsights);
    component.enabled = true;

    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Test Title');
    expect(element.textContent).toContain('Test Message');
    // Using a more robust check for the container presence
    expect(element.querySelector('h3')?.textContent).toContain('Berater');
  });

  it('should not display insights when disabled', () => {
    const mockInsights: AdvisorInsight[] = [
      { type: 'soil', level: 'warning', title: 'Test Title', message: 'Test Message' },
    ];
    advisorServiceMock.getInsights.mockReturnValue(mockInsights);
    component.enabled = false;

    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.bg-gray-800')).toBeFalsy();
  });

  it('should dismiss insights when close button clicked', () => {
    const mockInsights: AdvisorInsight[] = [
      { type: 'soil', level: 'warning', title: 'Test Title', message: 'Test Message' },
    ];
    advisorServiceMock.getInsights.mockReturnValue(mockInsights);
    component.enabled = true;
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector('button');
    closeButton.click();
    fixture.detectChanges();

    expect(component.dismissed).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h3')).toBeFalsy();
  });
});

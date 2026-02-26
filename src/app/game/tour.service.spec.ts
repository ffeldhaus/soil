import { TestBed } from '@angular/core/testing';
import { ShepherdService } from 'angular-shepherd';
import { vi } from 'vitest';
import { TourService } from './tour.service';

describe('TourService', () => {
  let service: TourService;
  let shepherdServiceMock: any;
  let eventHandlers: Record<string, Function>;

  beforeEach(() => {
    eventHandlers = {};

    shepherdServiceMock = {
      addSteps: vi.fn(),
      start: vi.fn(),
      cancel: vi.fn(),
      tourObject: {
        on: vi.fn((event: string, callback: Function) => {
          eventHandlers[event] = callback;
        }),
      },
    };

    TestBed.configureTestingModule({
      providers: [TourService, { provide: ShepherdService, useValue: shepherdServiceMock }],
    });
    service = TestBed.inject(TourService);
    localStorage.clear();

    // Mock document.querySelector/querySelectorAll to test attachTo.element functions
    vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector.includes('desktop-overlays') || selector.includes('weather-pests')) {
        const el = document.createElement('div');
        el.style.display = 'block';
        return el;
      }
      return null;
    });
    vi.spyOn(document, 'querySelectorAll').mockImplementation((selector: string) => {
      const el = document.createElement('div');
      el.style.display = 'block';
      return [el] as any;
    });
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => {
      return { display: (el as HTMLElement).style.display || 'block' } as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check if tour was seen', () => {
    expect(service.isTourSeen()).toBeFalsy();
    service.markTourAsSeen();
    expect(service.isTourSeen()).toBeTruthy();
  });

  it('should check if tour is disabled', () => {
    expect(service.isTourDisabled()).toBeFalsy();
    service.setTourDisabled(true);
    expect(service.isTourDisabled()).toBeTruthy();
    service.setTourDisabled(false);
    expect(service.isTourDisabled()).toBeFalsy();
  });

  it('should not start the tour if disabled', () => {
    service.setTourDisabled(true);
    service.startTour();
    expect(shepherdServiceMock.addSteps).not.toHaveBeenCalled();
    expect(shepherdServiceMock.start).not.toHaveBeenCalled();
  });

  it('should reset the tour', () => {
    service.markTourAsSeen();
    expect(service.isTourSeen()).toBeTruthy();
    service.resetTour();
    expect(service.isTourSeen()).toBeFalsy();
  });

  describe('Tour Initialization & Steps Execution', () => {
    it('should initialize steps and handle events', () => {
      service.startTour();

      expect(shepherdServiceMock.addSteps).toHaveBeenCalled();
      const steps = shepherdServiceMock.addSteps.mock.calls[0][0];

      // Test "Nicht mehr anzeigen" button actions on the first step
      const firstStep = steps.find((s: any) => s.id === 'welcome');
      const disableButton = firstStep.buttons.find((b: any) => b.text === 'Nicht mehr anzeigen');
      disableButton.action();

      expect(service.isTourDisabled()).toBeTruthy();
      expect(shepherdServiceMock.cancel).toHaveBeenCalled();

      // Test event handlers
      let stepShowId = '';
      service.stepShow$.subscribe((id) => (stepShowId = id));

      // Trigger 'complete'
      eventHandlers.complete();
      expect(service.isTourSeen()).toBeTruthy();
      expect(stepShowId).toBe('tour-finished');

      // Trigger 'cancel'
      eventHandlers.cancel();
      expect(stepShowId).toBe('tour-cancelled');

      // Trigger 'show'
      eventHandlers.show({ step: { id: 'test-step' } });
      expect(stepShowId).toBe('test-step');
    });

    it('should handle attachTo.element as functions in specific steps', async () => {
      service.startTour();
      const steps = shepherdServiceMock.addSteps.mock.calls[0][0];

      const overlaysStep = steps.find((s: any) => s.id === 'overlays');
      if (typeof overlaysStep.attachTo.element === 'function') {
        const el = overlaysStep.attachTo.element();
        expect(el).toBeTruthy();
      }

      const weatherStep = steps.find((s: any) => s.id === 'weather');
      if (typeof weatherStep.attachTo.element === 'function') {
        const el = weatherStep.attachTo.element();
        expect(el).toBeTruthy();
      }
      if (weatherStep.beforeShowPromise) {
        await weatherStep.beforeShowPromise();
      }

      const nextRoundStep = steps.find((s: any) => s.id === 'next-round');
      if (typeof nextRoundStep.attachTo.element === 'function') {
        const el = nextRoundStep.attachTo.element();
        expect(el).toBeTruthy();
      }

      const plantingModalStep = steps.find((s: any) => s.id === 'planting-modal');
      if (plantingModalStep.beforeShowPromise) {
        await plantingModalStep.beforeShowPromise();
      }
    });

    it('should handle hidden elements in attachTo correctly', () => {
      vi.spyOn(document, 'querySelector').mockImplementation(() => null);
      vi.spyOn(document, 'querySelectorAll').mockImplementation(() => [] as any);

      service.startTour();
      const steps = shepherdServiceMock.addSteps.mock.calls[0][0];

      const overlaysStep = steps.find((s: any) => s.id === 'overlays');
      expect(overlaysStep.attachTo.element()).toBeNull();

      const weatherStep = steps.find((s: any) => s.id === 'weather');
      expect(weatherStep.attachTo.element()).toBeNull();

      const nextRoundStep = steps.find((s: any) => s.id === 'next-round');
      expect(nextRoundStep.attachTo.element()).toBeUndefined();
    });
  });
});

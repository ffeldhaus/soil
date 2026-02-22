import { TestBed } from '@angular/core/testing';
import { ShepherdService } from 'angular-shepherd';
import { vi } from 'vitest';
import { TourService } from './tour.service';

describe('TourService', () => {
  let service: TourService;
  let shepherdServiceMock: any;

  beforeEach(() => {
    shepherdServiceMock = {
      addSteps: vi.fn(),
      start: vi.fn(),
      tourObject: {
        on: vi.fn(),
      },
    };

    TestBed.configureTestingModule({
      providers: [TourService, { provide: ShepherdService, useValue: shepherdServiceMock }],
    });
    service = TestBed.inject(TourService);
    localStorage.clear();
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

  it('should start the tour if not disabled', () => {
    service.startTour();
    expect(shepherdServiceMock.addSteps).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'welcome' }),
        expect.objectContaining({ id: 'select-parcel' }),
        expect.objectContaining({ id: 'planting-modal' }),
        expect.objectContaining({ id: 'next-round' }),
      ]),
    );
    const steps = shepherdServiceMock.addSteps.mock.calls[0][0];
    expect(steps.length).toBe(11);
    expect(shepherdServiceMock.start).toHaveBeenCalled();
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
});

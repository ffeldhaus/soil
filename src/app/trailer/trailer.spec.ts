import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { TelemetryService } from '../shared/telemetry.service';
import { Trailer } from './trailer';

describe('Trailer', () => {
  let component: Trailer;
  let fixture: ComponentFixture<Trailer>;
  let telemetryMock: { trackEvent: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    telemetryMock = {
      trackEvent: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Trailer],
      providers: [provideRouter([]), { provide: TelemetryService, useValue: telemetryMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(Trailer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render the video element unconditionally on initial render', () => {
    expect(component).toBeTruthy();
    expect(telemetryMock.trackEvent).toHaveBeenCalledWith('trailer_opened');

    const videoEl = fixture.nativeElement.querySelector(
      'video[data-testid="trailer-video"]',
    ) as HTMLVideoElement | null;
    expect(videoEl).toBeTruthy();
    expect(videoEl?.getAttribute('src')).toBe('/assets/video/soil-trailer.mp4');
    expect(videoEl?.getAttribute('poster')).toBe('/SOIL-screenshot.png');
  });

  it('should navigate back to / when closeTrailer() is called', () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const mockEvent = new MouseEvent('click');
    const preventSpy = vi.spyOn(mockEvent, 'preventDefault');

    component.closeTrailer(mockEvent);

    expect(preventSpy).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/']);
  });
});

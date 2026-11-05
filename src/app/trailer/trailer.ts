import { isPlatformBrowser } from '@angular/common';
import {
  type AfterViewInit,
  Component,
  type ElementRef,
  HostListener,
  inject,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TelemetryService } from '../shared/telemetry.service';

@Component({
  selector: 'app-trailer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './trailer.html',
})
export class Trailer implements AfterViewInit {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private telemetry = inject(TelemetryService);

  @ViewChild('videoPlayer') videoPlayer?: ElementRef<HTMLVideoElement>;

  private enteredFullscreen = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.telemetry.trackEvent('trailer_opened');

    const video = this.videoPlayer?.nativeElement;
    if (!video) return;

    if (typeof video.play === 'function') {
      video.play()?.catch(() => {});
    }
    if (typeof video.requestFullscreen === 'function') {
      video
        .requestFullscreen()
        ?.then(() => {
          this.enteredFullscreen = true;
        })
        .catch(() => {});
    }
  }

  closeTrailer(event?: Event): void {
    event?.preventDefault();
    if (isPlatformBrowser(this.platformId)) {
      const video = this.videoPlayer?.nativeElement;
      if (video && typeof video.pause === 'function' && !video.paused) {
        video.pause();
      }
      if (
        typeof document !== 'undefined' &&
        document.fullscreenElement &&
        typeof document.exitFullscreen === 'function'
      ) {
        document.exitFullscreen()?.catch(() => {});
      }
    }
    this.router.navigate(['/']);
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    if (!isPlatformBrowser(this.platformId) || typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      this.enteredFullscreen = true;
    } else if (this.enteredFullscreen) {
      this.enteredFullscreen = false;
      this.closeTrailer();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeTrailer();
  }
}

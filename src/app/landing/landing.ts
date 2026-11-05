import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, HostListener, inject, isDevMode, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { GameService } from '../game/game.service';
import { TelemetryService } from '../shared/telemetry.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.html',
})
export class Landing {
  private auth = inject(AuthService);
  private gameService = inject(GameService);
  private telemetry = inject(TelemetryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  year = new Date().getFullYear();
  showTestMode = isDevMode();
  isStartingGame = false;
  showTrailerModal = false;

  challengeSeed: string | null = null;
  challengeDifficulty: 'easy' | 'normal' | 'hard' = 'normal';
  challengeRounds = 10;
  challengeTargetScore?: number;
  challengeTargetName?: string;

  constructor() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const seed = typeof params.challenge === 'string' ? params.challenge.trim().toUpperCase().slice(0, 12) : '';
      this.challengeSeed = seed || null;
      const diff = params.difficulty;
      this.challengeDifficulty = diff === 'easy' || diff === 'normal' || diff === 'hard' ? diff : 'normal';
      const parsedRounds = parseInt(params.rounds, 10);
      this.challengeRounds =
        Number.isFinite(parsedRounds) && parsedRounds >= 3 && parsedRounds <= 30 ? parsedRounds : 10;
      const parsedTargetScore = parseInt(params.targetScore, 10);
      this.challengeTargetScore = Number.isFinite(parsedTargetScore) ? parsedTargetScore : undefined;
      this.challengeTargetName =
        typeof params.targetName === 'string' && params.targetName.trim()
          ? params.targetName.trim().slice(0, 40)
          : undefined;
    });
  }

  scrollToInfo() {
    const element = document.getElementById('info-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  openTrailer() {
    this.telemetry.trackEvent('trailer_opened');
    this.showTrailerModal = true;
    this.cdr.detectChanges();
    if (!isPlatformBrowser(this.platformId)) return;
    const video = document.querySelector('[data-testid="trailer-video"]') as HTMLVideoElement | null;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
      if (video.requestFullscreen) {
        video.requestFullscreen().catch(() => {});
      } else if ('webkitEnterFullscreen' in video && typeof (video as any).webkitEnterFullscreen === 'function') {
        (video as any).webkitEnterFullscreen();
      }
    }
  }

  closeTrailer() {
    if (isPlatformBrowser(this.platformId)) {
      const video = document.querySelector('[data-testid="trailer-video"]') as HTMLVideoElement | null;
      if (video && !video.paused) {
        video.pause();
      }
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
    this.showTrailerModal = false;
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange() {
    if (this.showTrailerModal && isPlatformBrowser(this.platformId) && !document.fullscreenElement) {
      this.closeTrailer();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.showTrailerModal) {
      this.closeTrailer();
    }
  }

  async startQuickGame() {
    if (this.isStartingGame) return;
    this.isStartingGame = true;
    this.telemetry.trackEvent('quick_game_started');
    try {
      const result = await this.gameService.createGame(`Hof ${new Date().toLocaleDateString('de-DE')}`, {
        numPlayers: 4,
        numRounds: this.challengeSeed ? this.challengeRounds : 10,
        numAi: 3,
        aiLevel: 'middle',
        difficulty: this.challengeSeed ? this.challengeDifficulty : 'normal',
        playerLabel: 'Team',
        advancedPricingEnabled: true,
        analyticsEnabled: true,
        advisorEnabled: true,
        ...(this.challengeSeed
          ? {
              seed: this.challengeSeed,
              ...(this.challengeTargetScore !== undefined ? { challengeTargetScore: this.challengeTargetScore } : {}),
              ...(this.challengeTargetName ? { challengeTargetName: this.challengeTargetName } : {}),
            }
          : {}),
      });
      if (result.password) {
        await this.auth.loginAsPlayer(result.gameId, result.password);
      }
      await this.router.navigate(['/game']);
    } catch (err) {
      console.error('Quick play failed:', err);
      await this.router.navigate(['/admin']);
    } finally {
      this.isStartingGame = false;
    }
  }

  async playAsGuest() {
    try {
      await this.auth.signInAsGuest();
      this.router.navigate(['/game']);
    } catch (err) {
      console.error('Guest login failed:', err);
    }
  }

  enableTestMode(role: string) {
    localStorage.setItem('soil_test_mode', 'true');
    localStorage.setItem('soil_test_role', role);
    alert(`Test Mode enabled as ${role}. Please log in now.`);
    window.location.reload();
  }
}

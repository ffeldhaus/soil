import { ChangeDetectorRef, Component, inject, NgZone, type OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { first } from 'rxjs/operators';

import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-player-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LanguageSwitcherComponent],
  template: `
    <div
      class="min-h-screen relative flex items-center justify-center bg-gray-900 text-gray-100 font-sans p-6 overflow-hidden portrait:p-0"
    >
      <!-- Language Switcher -->
      <div class="absolute top-6 right-6 z-[100]">
        <app-language-switcher></app-language-switcher>
      </div>

      <!-- Background Image with Overlay -->
      <div class="absolute inset-0 z-0">
        <picture>
          <source srcset="assets/bauernhof-portrait-hd.webp" media="(orientation: portrait)" />
          <img
            src="assets/bauernhof-landscape-hd.webp"
            alt="Farm Background"
            class="w-full h-full object-cover object-center opacity-30"
          />
        </picture>
        <div
          class="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90 backdrop-blur-[2px]"
        ></div>
      </div>

      <div
        class="relative z-10 w-full max-w-md bg-gray-800/80 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-gray-700 portrait:max-w-none portrait:rounded-none portrait:border-x-0 portrait:bg-gray-800"
      >
        <h2 class="text-3xl font-bold text-center mb-8 text-emerald-400">
          <ng-container i18n="Main Heading|Title of the player login page@@playerLogin.title">Spiel beitreten</ng-container>
        </h2>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit($event)" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2"
              ><ng-container i18n="Form Label|Label for the game ID input@@playerLogin.gameId">Spiel-ID</ng-container></label
            >
            <input
              formControlName="gameId"
              type="text"
              autocomplete="username"
              data-testid="player-login-gameid"
              class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white uppercase"
              placeholder="Game ID"
              [placeholder]="t('playerLogin.placeholder.gameId')"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2"
              ><ng-container i18n="Form Label|Label for the player PIN input@@playerLogin.pin">PIN</ng-container></label
            >
            <input
              formControlName="password"
              type="password"
              autocomplete="current-password"
              data-testid="player-login-pin"
              class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white uppercase"
              placeholder="Unique Player PIN"
              [placeholder]="t('playerLogin.placeholder.pin')"
            />
          </div>

          <button
            type="submit"
            [disabled]="loginForm.invalid || isLoading"
            data-testid="player-login-submit"
            class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition transform active:scale-95 shadow-lg"
          >
            @if (isLoading) {
              <ng-container>{{ t('playerLogin.enteringGame') }}</ng-container>
            } @else {
              <ng-container i18n="Action Label|Button to enter the game@@playerLogin.startGame">Spiel starten</ng-container>
            }
          </button>
        </form>

        <div class="mt-8 pt-6 border-t border-gray-700 text-center space-y-4">
          <a routerLink="/" class="text-gray-400 hover:text-white text-sm transition">{{
            t('playerLogin.backToHome')
          }}</a>
        </div>
      </div>

      <!-- Error Modal -->
      @if (showErrorModal) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in portrait:p-0"
          (click)="closeModal()"
        >
          <div
            class="bg-gray-800 border border-red-500/50 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative portrait:rounded-none portrait:max-w-none portrait:h-full portrait:justify-center"
            (click)="$event.stopPropagation()"
          >
            <div class="flex flex-col items-center text-center gap-4">
              <div class="p-3 bg-red-900/30 rounded-full text-red-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-bold text-white mb-2">{{ t('playerLogin.error.title') }}</h3>
                <p class="text-gray-300">{{ errorMessage }}</p>
              </div>
              <button
                (click)="closeModal()"
                class="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"
              >
                {{ t('playerLogin.error.retry') }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class PlayerLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  t(key: string): string {
    const translations: Record<string, string> = {
      'playerLogin.placeholder.gameId': $localize`:Form Placeholder|Placeholder for game ID@@playerLogin.placeholder.gameId:Game ID`,
      'playerLogin.placeholder.pin': $localize`:Form Placeholder|Placeholder for player PIN@@playerLogin.placeholder.pin:Unique Player PIN`,
      'playerLogin.enteringGame': $localize`:Loading State|Text shown while entering the game@@playerLogin.enteringGame:Betrete Spiel...`,
      'playerLogin.backToHome': $localize`:Action Label|Link to return to home page@@playerLogin.backToHome:Zurück zur Startseite`,
      'playerLogin.error.title': $localize`:Heading|Title for login error modal@@playerLogin.error.title:Anmeldung fehlgeschlagen`,
      'playerLogin.error.retry': $localize`:Action Label|Button to retry login@@playerLogin.error.retry:Erneut versuchen`,
    };
    return translations[key] || key;
  }

  loginForm = this.fb.group({
    gameId: ['', [Validators.required, Validators.minLength(20)]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  private autoSubmitted = false;
  isLoading = false;
  showErrorModal = false;
  errorMessage = '';
  private isSubmitting = false;

  async ngOnInit() {
    this.authService.user$.pipe(first()).subscribe((user) => {
      if (user?.uid.startsWith('player-')) {
        this.router.navigate(['/game'], { replaceUrl: true });
        return;
      }

      this.route.queryParams.pipe(first()).subscribe(async (params) => {
        const { gameId, pin } = params;
        if (gameId && pin) {
          this.loginForm.patchValue({ gameId, password: pin });
          const gId = this.loginForm.get('gameId');
          const pass = this.loginForm.get('password');
          gId?.markAsTouched();
          gId?.markAsDirty();
          pass?.markAsTouched();
          pass?.markAsDirty();
          this.cdr.detectChanges();

          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              if (this.autoSubmitted) return;
              this.ngZone.run(() => {
                if (!this.showErrorModal) {
                  this.autoSubmitted = true;
                  this.onSubmit();
                }
              });
            }, 1000);
          });
        }
      });
    });
  }

  async onSubmit(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.isSubmitting) return;
    if (this.loginForm.invalid) {
      console.warn('Form invalid, skipping submission:', this.loginForm.errors);
      return;
    }

    this.isSubmitting = true;
    this.isLoading = true;
    this.errorMessage = '';
    this.showErrorModal = false;
    this.cdr.detectChanges();

    const { gameId, password } = this.loginForm.value;
    if (!gameId || !password) return;

    try {
      await this.authService.loginAsPlayer(gameId, password);
      await this.router.navigate(['/game'], { replaceUrl: true });
    } catch (err: unknown) {
      console.error('Login failed:', err);
      this.errorMessage = (err as Error).message || 'playerLogin.error.msg';
      this.showErrorModal = true;
    } finally {
      this.isLoading = false;
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  closeModal() {
    this.showErrorModal = false;
  }
}
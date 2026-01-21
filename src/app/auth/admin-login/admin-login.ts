import { ChangeDetectorRef, Component, inject, type OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen relative bg-gray-900 text-gray-100 font-sans overflow-hidden flex flex-col">
      <!-- Navigation Bar -->
      <nav
        class="bg-gray-900/95 border-b border-gray-700 backdrop-blur shadow-lg px-6 py-1 fixed top-0 left-0 right-0 z-50 flex items-center justify-between shrink-0 h-10 print:hidden"
      >
        <div class="flex items-center gap-4">
          <h1 class="text-xl font-bold font-sans text-emerald-500 tracking-wider">SOIL</h1>
        </div>

        <div class="flex items-center gap-3">
          @defer (hydrate on interaction) {
            <app-language-switcher></app-language-switcher>
          }

          <a
            routerLink="/"
            class="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition w-10 h-10 flex items-center justify-center"
            title="Back to Landing Page"
            i18n-title="Action Label|Tooltip to go back to landing page@@nav.backToLanding"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </a>
        </div>
      </nav>

      <div class="flex-1 relative flex items-center justify-center p-6 portrait:p-0">
        <!-- Background Image -->
        <div class="fixed inset-0 h-screen w-screen z-0 pointer-events-none">
          <picture>
            <source srcset="assets/images/bauernhof-portrait-dunkel.webp" media="(orientation: portrait)" />
            <img
              src="assets/images/bauernhof-landscape-dunkel.webp"
              alt="Farm Background"
              fetchpriority="high"
              class="w-full h-full object-cover portrait:object-center landscape:object-center"
            />
          </picture>
        </div>

        <div
          class="relative z-10 w-full max-w-md bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-gray-700 portrait:max-w-none portrait:rounded-none portrait:border-x-0"
        >
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-emerald-400 mb-2" i18n="@@adminLogin.title">Anmeldung für Lehrkräfte</h1>
            <p class="text-gray-400" i18n="@@adminLogin.subtitle">Zugang zum Soil-Dashboard</p>
          </div>

          @if (successMessage) {
            <div
              class="mb-6 p-3 bg-emerald-900/50 border border-emerald-500 rounded text-emerald-200 text-sm text-center"
            >
              {{ successMessage }}
            </div>
          }

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2" i18n="@@adminLogin.email">E-Mail</label>
              <input
                formControlName="email"
                type="email"
                autocomplete="email"
                class="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white"
                [placeholder]="t('adminLogin.placeholder.email')"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-gray-400" i18n="@@adminLogin.password">Passwort</label>
                <button
                  type="button"
                  (click)="forgotPassword()"
                  class="text-xs text-emerald-400 hover:text-emerald-300 transition"
                >
                  {{ t('adminLogin.forgotPassword') }}
                </button>
              </div>
              <div class="relative">
                <input
                  formControlName="password"
                  [type]="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  class="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  (click)="togglePassword()"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition p-1"
                  [title]="showPassword ? 'Hide password' : 'Show password'"
                >
                  @if (showPassword) {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              [disabled]="loginForm.invalid || isLoading"
              class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition transform active:scale-95 shadow-lg"
            >
              @if (isLoading) {
                <ng-container i18n="@@adminLogin.loggingIn">Anmeldung läuft...</ng-container>
              } @else {
                <ng-container i18n="@@adminLogin.loginButton">Anmelden</ng-container>
              }
            </button>
          </form>

          <div class="mt-8 pt-6 border-t border-gray-700 text-center space-y-4">
            <button
              (click)="loginWithGoogle()"
              class="w-full py-3 bg-white text-gray-700 font-bold rounded-lg hover:bg-gray-100 flex items-center justify-center gap-3 transition shadow-md"
            >
              <!-- Google G Icon -->
              <svg class="w-5 h-5" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                ></path>
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                ></path>
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                ></path>
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                ></path>
              </svg>
              <span i18n="@@adminLogin.googleSignIn">Mit Google anmelden</span>
            </button>

            <button
              (click)="loginWithApple()"
              class="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-900 flex items-center justify-center gap-3 transition shadow-md"
            >
              <!-- Apple Logo -->
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 172 172">
                <path d="M127.35156,104.78125 C127.140625,83.984375 144.175781,73.800781 145.019531,73.285156 C135.410156,59.273438 120.484375,57.257812 115.226562,57.039062 C102.613281,55.765625 90.621094,64.492188 84.222656,64.492188 C77.824219,64.492188 67.925781,57.214844 57.347656,57.410156 C43.46875,57.613281 30.730469,65.464844 23.582031,77.894531 C9.085938,103.058594 19.867188,140.238281 33.921875,160.523438 C40.800781,170.4375 48.972656,181.542969 59.710938,181.144531 C69.945312,180.746094 73.847656,174.527344 86.257812,174.527344 C98.667969,174.527344 102.167969,181.144531 113.007812,180.941406 C124.234375,180.746094 131.25,170.832031 138.109375,160.917969 C146.035156,149.339844 149.320312,138.15625 149.5,137.59375 C149.128906,137.433594 127.5625,129.085938 127.35156,104.78125 Z M105.742188,40.910156 C111.382812,34.09375 115.179688,24.636719 114.136719,15.214844 C106.050781,15.539062 96.265625,20.597656 90.460938,27.359375 C85.253906,33.371094 80.703125,42.992188 81.933594,52.226562 C90.960938,52.925781 100.101562,47.726562 105.742188,40.910156 Z"></path>
              </svg>
              <span i18n="@@adminLogin.appleSignIn">Mit Apple anmelden</span>
            </button>
            <p class="text-sm text-gray-500">
              <ng-container i18n="@@adminLogin.noAccount">Noch kein Konto?</ng-container>&nbsp;<a
                routerLink="/admin/register"
                class="text-emerald-400 hover:underline"
                i18n="@@adminLogin.registerLink"
                >Hier registrieren</a
              >
            </p>
          </div>
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
                <h3 class="text-xl font-bold text-white mb-2" i18n="@@adminLogin.error.title">
                  Anmeldung fehlgeschlagen
                </h3>
                <p class="text-gray-300">{{ errorMessage }}</p>
              </div>
              <button
                (click)="closeModal()"
                class="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"
                i18n="@@adminLogin.error.retry"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminLoginComponent implements OnInit {
  t(key: string): string {
    const translations: Record<string, string> = {
      'adminLogin.placeholder.email': $localize`:@@adminLogin.placeholder.email:admin@schule.de`,
      'adminLogin.forgotPassword': $localize`:@@adminLogin.forgotPassword:Passwort vergessen?`,
      'adminLogin.resetEmailSent': $localize`:@@adminLogin.resetEmailSent:E-Mail zum Zurücksetzen des Passworts wurde gesendet.`,
      'adminLogin.resetEmailError': $localize`:@@adminLogin.resetEmailError:Fehler beim Senden der E-Mail zum Zurücksetzen des Passworts.`,
    };
    return translations[key] || key;
  }
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isLoading = false;
  showErrorModal = false;
  showPassword = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit() {
    this.auth.user$.subscribe((user) => {
      if (user) {
        this.router.navigate(['/admin']);
      }
    });
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.loginForm.patchValue({ email });
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.showErrorModal = false;
    this.cdr.detectChanges();

    const { email, password } = this.loginForm.value;
    if (!email || !password) return;

    try {
      await this.auth.loginWithEmail(email, password);
      this.router.navigate(['/admin']);
    } catch (err: unknown) {
      console.error(err);
      this.errorMessage = $localize`:@@adminLogin.error.failed:Anmeldung fehlgeschlagen`;
      this.showErrorModal = true;
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loginWithGoogle() {
    try {
      await this.auth.loginWithGoogle();
      this.router.navigate(['/admin']);
    } catch (err: unknown) {
      console.error(err);
      this.errorMessage = $localize`:@@adminLogin.error.failed:Anmeldung fehlgeschlagen`;
      this.showErrorModal = true;
      this.cdr.detectChanges();
    }
  }

  async loginWithApple() {
    try {
      await this.auth.loginWithApple();
      this.router.navigate(['/admin']);
    } catch (err: unknown) {
      console.error(err);
      this.errorMessage = $localize`:@@adminLogin.error.failed:Anmeldung fehlgeschlagen`;
      this.showErrorModal = true;
      this.cdr.detectChanges();
    }
  }

  async forgotPassword() {
    const email = this.loginForm.get('email')?.value;
    if (!email) {
      this.errorMessage = $localize`:@@adminLogin.error.emailRequired:Bitte geben Sie Ihre E-Mail-Adresse ein.`;
      this.showErrorModal = true;
      this.cdr.detectChanges();
      return;
    }

    try {
      await this.auth.sendPasswordResetEmail(email);
      this.successMessage = this.t('adminLogin.resetEmailSent');
      this.cdr.detectChanges();
    } catch (err: unknown) {
      console.error(err);
      this.errorMessage = this.t('adminLogin.resetEmailError');
      this.showErrorModal = true;
      this.cdr.detectChanges();
    }
  }

  closeModal() {
    this.showErrorModal = false;
  }
}

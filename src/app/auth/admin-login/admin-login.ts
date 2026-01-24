import { ChangeDetectorRef, Component, inject, type OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
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
          }

          <a
            routerLink="/"
            class="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition w-10 h-10 flex items-center justify-center"
            title="Back to Landing Page"

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
              alt=""
              fetchpriority="high"
              class="w-full h-full object-cover portrait:object-center landscape:object-center"
            />
          </picture>
        </div>

        <div
          class="relative z-10 w-full max-w-md bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-gray-700 portrait:max-w-none portrait:rounded-none portrait:border-x-0"
        >
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-emerald-400 mb-2">Anmeldung</h1>
            <p class="text-gray-400">Zugang zum Soil-Dashboard</p>
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
              <label class="block text-sm font-medium text-gray-400 mb-2">E-Mail</label>
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
                <label class="block text-sm font-medium text-gray-400">Passwort</label>
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
                <ng-container>Anmeldung läuft...</ng-container>
              } @else {
                <ng-container>Anmelden</ng-container>
              }
            </button>
          </form>

          <div class="mt-8 pt-6 border-t border-gray-700 text-center space-y-4">
            <button (click)="loginWithGoogle()" class="gsi-material-button google-style focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">
              <div class="gsi-material-button-state"></div>
              <div class="gsi-material-button-content-wrapper">
                <div class="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style="display: block; width: 100%; height: 100%;">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <div class="gsi-material-button-contents">Mit Google anmelden</div>
              </div>
            </button>

            <button (click)="loginWithApple()" class="gsi-material-button apple-style focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">
              <div class="gsi-material-button-state"></div>
              <div class="gsi-material-button-content-wrapper">
                <div class="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 44" style="display: block; width: 100%; height: 100%; transform: scale(1.5);">
                    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                      <path d="M12.2337427,16.9879688 C12.8896607,16.9879688 13.7118677,16.5445313 14.2014966,15.9532812 C14.6449341,15.4174609 14.968274,14.6691602 14.968274,13.9208594 C14.968274,13.8192383 14.9590357,13.7176172 14.9405591,13.6344727 C14.2107349,13.6621875 13.3330982,14.1241016 12.8065162,14.7430664 C12.3907935,15.2142188 12.012024,15.9532812 12.012024,16.7108203 C12.012024,16.8216797 12.0305005,16.9325391 12.0397388,16.9694922 C12.0859302,16.9787305 12.1598365,16.9879688 12.2337427,16.9879688 Z M9.92417241,28.1662891 C10.8202857,28.1662891 11.2175318,27.5658008 12.3353638,27.5658008 C13.4716724,27.5658008 13.721106,28.1478125 14.7188404,28.1478125 C15.6980982,28.1478125 16.3540162,27.2424609 16.972981,26.3555859 C17.6658521,25.339375 17.9522388,24.3416406 17.9707154,24.2954492 C17.9060474,24.2769727 16.0306763,23.5101953 16.0306763,21.3576758 C16.0306763,19.491543 17.5088013,18.6508594 17.5919459,18.5861914 C16.612688,17.1819727 15.1253248,17.1450195 14.7188404,17.1450195 C13.6194849,17.1450195 12.7233716,17.8101758 12.1598365,17.8101758 C11.5501099,17.8101758 10.7463794,17.1819727 9.79483648,17.1819727 C7.98413335,17.1819727 6.14571538,18.6785742 6.14571538,21.5054883 C6.14571538,23.2607617 6.8293482,25.1176563 7.67003179,26.3186328 C8.39061773,27.3348438 9.01882085,28.1662891 9.92417241,28.1662891 Z" fill="white" fill-rule="nonzero"></path>
                    </g>
                  </svg>
                </div>
                <div class="gsi-material-button-contents">Mit Apple anmelden</div>
              </div>
            </button>
            <p class="text-sm text-gray-500">
              <ng-container>Noch kein Konto?</ng-container>&nbsp;<a
                routerLink="/admin/register"
                class="text-emerald-400 hover:underline"

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
                <h3 class="text-xl font-bold text-white mb-2">
                  Anmeldung fehlgeschlagen
                </h3>
                <p class="text-gray-300">{{ errorMessage }}</p>
              </div>
              <button
                (click)="closeModal()"
                class="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"

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
      'adminLogin.placeholder.email': 'admin@schule.de',
      'adminLogin.forgotPassword': 'Passwort vergessen?',
      'adminLogin.resetEmailSent': 'E-Mail zum Zurücksetzen des Passworts wurde gesendet.',
      'adminLogin.resetEmailError': 'Fehler beim Senden der E-Mail zum Zurücksetzen des Passworts.',
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
      if (user && !user.isAnonymous) {
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
      this.errorMessage = 'Anmeldung fehlgeschlagen';
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
      this.errorMessage = 'Anmeldung fehlgeschlagen';
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
      this.errorMessage = 'Anmeldung fehlgeschlagen';
      this.showErrorModal = true;
      this.cdr.detectChanges();
    }
  }

  async forgotPassword() {
    const email = this.loginForm.get('email')?.value;
    if (!email) {
      this.errorMessage = 'Bitte geben Sie Ihre E-Mail-Adresse ein.';
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

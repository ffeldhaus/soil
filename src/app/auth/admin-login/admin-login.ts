import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen relative flex items-center justify-center bg-gray-900 portrait:p-0">
      <!-- Language Switcher -->
      <div class="absolute top-6 right-6 z-[100]">
        <app-language-switcher></app-language-switcher>
      </div>

      <!-- Background Image with Overlay -->
      <div class="absolute inset-0 z-0 portrait:hidden">
        <img
          src="assets/bauernhof.jpg"
          alt="Farm Background"
          class="w-full h-full object-cover object-center opacity-30"
        />
        <div
          class="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90 backdrop-blur-[2px]"
        ></div>
      </div>

      <div
        class="relative z-10 w-full max-w-md bg-gray-800/80 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-gray-700 portrait:max-w-none portrait:rounded-none portrait:border-x-0 portrait:bg-gray-800"
      >
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-emerald-400 mb-2" i18n="@@adminLogin.title">Admin-Anmeldung</h1>
          <p class="text-gray-400" i18n="@@adminLogin.subtitle">Zugang zur Soil-Steuerzentrale</p>
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
            <input
              formControlName="password"
              type="password"
              autocomplete="current-password"
              class="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white"
              placeholder="••••••••"
            />
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
          <p class="text-sm text-gray-500">
            <ng-container i18n="@@adminLogin.noAccount">Noch kein Konto?</ng-container>&nbsp;<a
              routerLink="/admin/register"
              class="text-emerald-400 hover:underline"
              i18n="@@adminLogin.registerLink"
              >Hier registrieren</a
            >
          </p>
          <div class="pt-2">
            <a
              routerLink="/"
              class="text-gray-400 hover:text-white text-sm transition flex items-center justify-center gap-2"
              i18n="@@adminLogin.backToHome"
              >← Zurück zur Startseite</a
            >
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

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isLoading = false;
  showErrorModal = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit() {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.loginForm.patchValue({ email });
    }
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.showErrorModal = false;

    const { email, password } = this.loginForm.value;
    try {
      await this.auth.loginWithEmail(email!, password!);
      this.router.navigate(['/admin']);
    } catch (err: any) {
      console.error(err);
      this.errorMessage = $localize`:@@adminLogin.error.failed:Anmeldung fehlgeschlagen`;
      this.showErrorModal = true;
    } finally {
      this.isLoading = false;
    }
  }

  async loginWithGoogle() {
    try {
      await this.auth.loginWithGoogle();
      this.router.navigate(['/admin']);
    } catch (err: any) {
      console.error(err);
      this.errorMessage = $localize`:@@adminLogin.error.failed:Anmeldung fehlgeschlagen`;
      this.showErrorModal = true;
    }
  }

  async forgotPassword() {
    const email = this.loginForm.get('email')?.value;
    if (!email) {
      this.errorMessage = $localize`:@@adminLogin.error.emailRequired:Bitte geben Sie Ihre E-Mail-Adresse ein.`;
      this.showErrorModal = true;
      return;
    }

    try {
      await this.auth.sendPasswordResetEmail(email);
      this.successMessage = this.t('adminLogin.resetEmailSent');
    } catch (err: any) {
      console.error(err);
      this.errorMessage = this.t('adminLogin.resetEmailError');
      this.showErrorModal = true;
    }
  }

  closeModal() {
    this.showErrorModal = false;
  }
}

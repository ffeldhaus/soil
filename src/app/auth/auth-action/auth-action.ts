import { ChangeDetectorRef, Component, inject, type OnInit } from '@angular/core';
import { Auth, applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from '@angular/fire/auth';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-action',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  template: `
    <div
      class="min-h-screen relative font-sans text-gray-100 overflow-hidden flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
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

      <div class="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="text-center mb-8">
          <h1
            class="text-5xl font-sans font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-100 to-emerald-200 drop-shadow-2xl tracking-tight mb-4"
          >
            SOIL
          </h1>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-white">
            {{ title }}
          </h2>
        </div>

        <div
          class="bg-gray-800/40 backdrop-blur-md border border-white/10 py-8 px-4 shadow-2xl rounded-3xl sm:px-10 text-center"
        >
          @if (status === 'loading') {
            <div class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400 mb-4"></div>
              <p class="text-gray-300">Verarbeitung läuft...</p>
            </div>
          }

          @if (status === 'resetPassword') {
            <form [formGroup]="resetForm" (ngSubmit)="onResetPassword()" class="space-y-6 text-left py-4">
              <div>
                <p class="text-sm text-gray-300 mb-6">
                  Geben Sie ein neues Passwort für <strong>{{ resetEmail }}</strong> ein.
                </p>
                <label for="password" class="block text-sm font-medium text-gray-300 mb-2">Neues Passwort</label>
                <input
                  id="password"
                  formControlName="password"
                  type="password"
                  autocomplete="new-password"
                  required
                  class="appearance-none block w-full px-4 py-3 bg-gray-900/50 border border-white/10 rounded-xl shadow-sm placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent sm:text-sm transition-all"
                />
                @if (resetForm.get('password')?.touched && resetForm.get('password')?.invalid) {
                  <p class="mt-2 text-sm text-red-400">Das Passwort muss mindestens 6 Zeichen lang sein.</p>
                }
              </div>

              <button
                type="submit"
                [disabled]="resetForm.invalid || isSubmitting"
                class="group relative inline-flex items-center justify-center w-full px-8 py-4 bg-emerald-800 hover:bg-emerald-700 disabled:bg-gray-700 text-white text-lg font-bold rounded-2xl shadow-[0_0_20px_rgba(6,95,70,0.4)] transition-all transform hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,95,70,0.6)] overflow-hidden disabled:transform-none disabled:shadow-none"
              >
                @if (isSubmitting) {
                  <span class="relative z-10">Wird gespeichert...</span>
                } @else {
                  <span class="relative z-10">Passwort speichern</span>
                }
              </button>
            </form>
          }

          @if (status === 'success') {
            @if (mode === 'verifyEmail') {
              <div class="py-4">
                <div class="rounded-2xl bg-emerald-900/30 border border-emerald-500/20 p-4 mb-6">
                  <div class="flex items-center justify-center">
                    <div class="flex-shrink-0">
                      <svg class="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div class="ml-3">
                      <p class="text-sm font-medium text-emerald-200">
                        Ihre E-Mail-Adresse wurde verifiziert.
                      </p>
                    </div>
                  </div>
                </div>

                <h3 class="text-xl font-semibold text-white mb-4">Wie geht es weiter?</h3>

                <p class="text-gray-300 mb-6 leading-relaxed">
                  Ihre Registrierung als Lehrkraft wird nun von uns geprüft. Sobald Ihr Konto freigeschaltet wurde,
                  informieren wir Sie per E-Mail.
                </p>

                <div class="space-y-6">
                  <p class="text-sm text-emerald-300/70">
                    Dies dauert in der Regel weniger als 24 Stunden.
                  </p>

                  <a
                    routerLink="/"
                    class="group relative inline-flex items-center justify-center w-full px-8 py-4 bg-emerald-800 hover:bg-emerald-700 text-white text-lg font-bold rounded-2xl shadow-[0_0_20px_rgba(6,95,70,0.4)] transition-all transform hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,95,70,0.6)] overflow-hidden"

                  >
                    <span class="relative z-10">Zur Startseite</span>
                  </a>
                </div>
              </div>
            } @else {
              <div class="text-center py-8">
                <div class="rounded-2xl bg-emerald-900/30 border border-emerald-500/20 p-4 mb-6">
                  <div class="flex items-center justify-center">
                    <svg class="h-6 w-6 text-emerald-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="text-sm font-medium text-emerald-200">
                      {{ successMessage }}
                    </p>
                  </div>
                </div>
                <a
                  routerLink="/admin/login"
                  class="group relative inline-flex items-center justify-center w-full px-8 py-4 bg-emerald-800 hover:bg-emerald-700 text-white text-lg font-bold rounded-2xl shadow-[0_0_20px_rgba(6,95,70,0.4)] transition-all transform hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,95,70,0.6)] overflow-hidden"

                >
                  <span class="relative z-10">Zum Login</span>
                </a>
              </div>
            }
          }

          @if (status === 'error') {
            <div class="text-center py-8">
              <div class="rounded-2xl bg-red-900/30 border border-red-500/20 p-4 mb-6">
                <div class="flex items-center justify-center">
                  <svg class="h-6 w-6 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-sm font-medium text-red-200">
                    {{ errorMessage }}
                  </p>
                </div>
              </div>
              <a
                routerLink="/"
                class="group relative inline-flex items-center justify-center w-full px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 overflow-hidden"

              >
                <span class="relative z-10">Zurück zur Startseite</span>
              </a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AuthActionComponent implements OnInit {
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);

  mode = '';
  oobCode = '';
  status: 'loading' | 'success' | 'error' | 'resetPassword' = 'loading';
  title = 'Auth Action';
  successMessage = '';
  errorMessage = '';
  resetEmail = '';
  isSubmitting = false;

  resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.mode = params.mode;
      this.oobCode = params.oobCode;

      if (!this.mode || !this.oobCode) {
        this.status = 'error';
        this.errorMessage = 'Ungültiger Link.';
        return;
      }

      switch (this.mode) {
        case 'verifyEmail':
          this.handleVerifyEmail();
          break;
        case 'resetPassword':
          this.handleResetPassword();
          break;
        default:
          this.status = 'error';
          this.errorMessage = 'Unbekannte Aktion.';
      }
    });
  }

  private async handleVerifyEmail() {
    this.title = 'E-Mail-Verifizierung';
    try {
      await applyActionCode(this.auth, this.oobCode);
      this.status = 'success';
      this.successMessage = 'Ihre E-Mail-Adresse wurde erfolgreich verifiziert.';
      this.cdr.detectChanges();
      // No redirect, we show the onboarding info here!
    } catch (error: unknown) {
      console.error('Email verification error:', error);
      this.status = 'error';
      this.errorMessage = 'Der Verifizierungslink ist ungültig oder abgelaufen.';
      this.cdr.detectChanges();
    }
  }

  private async handleResetPassword() {
    this.title = 'Passwort zurücksetzen';
    try {
      this.resetEmail = await verifyPasswordResetCode(this.auth, this.oobCode);
      this.status = 'resetPassword';
      this.cdr.detectChanges();
    } catch (error: unknown) {
      console.error('Password reset code error:', error);
      this.status = 'error';
      this.errorMessage = 'Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.';
      this.cdr.detectChanges();
    }
  }

  async onResetPassword() {
    if (this.resetForm.invalid) return;

    this.isSubmitting = true;
    this.cdr.detectChanges();

    try {
      const newPassword = this.resetForm.get('password')?.value;
      if (!newPassword) throw new Error('Password is required');

      await confirmPasswordReset(this.auth, this.oobCode, newPassword);
      this.status = 'success';
      this.successMessage = 'Ihr Passwort wurde erfolgreich zurückgesetzt. Sie können sich nun anmelden.';
      this.cdr.detectChanges();
    } catch (error: unknown) {
      console.error('Confirm password reset error:', error);
      this.errorMessage = 'Fehler beim Zurücksetzen des Passworts. Bitte versuchen Sie es erneut.';
      this.status = 'error';
      this.cdr.detectChanges();
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }
}

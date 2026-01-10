import { ChangeDetectorRef, Component, inject, type OnInit } from '@angular/core';
import { Auth, applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from '@angular/fire/auth';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-action',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {{ title }}
        </h2>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          @if (status === 'loading') {
            <div class="text-center">
              <p i18n="Status Message|Indicates processing is in progress@@authAction.loading">Verarbeitung läuft...</p>
            </div>
          }

          @if (status === 'resetPassword') {
            <form [formGroup]="resetForm" (ngSubmit)="onResetPassword()" class="space-y-6">
              <div>
                <p class="text-sm text-gray-600 mb-4" i18n="Instruction|Instruction for resetting the password@@authAction.resetPassword.instruction">
                  Geben Sie ein neues Passwort für <strong>{{ resetEmail }}</strong> ein.
                </p>
                <label for="password" class="block text-sm font-medium text-gray-700" i18n="Form Label|Label for the new password input@@authAction.resetPassword.label">Neues Passwort</label>
                <div class="mt-1">
                  <input
                    id="password"
                    formControlName="password"
                    type="password"
                    autocomplete="new-password"
                    required
                    class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                @if (resetForm.get('password')?.touched && resetForm.get('password')?.invalid) {
                  <p class="mt-2 text-sm text-red-600" i18n="Form Error|Requirement for minimum password length@@authAction.resetPassword.error.minLength">Das Passwort muss mindestens 6 Zeichen lang sein.</p>
                }
              </div>

              <div>
                <button
                  type="submit"
                  [disabled]="resetForm.invalid || isSubmitting"
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  @if (isSubmitting) {
                    <ng-container i18n="Status Message|Indicates the new password is being saved@@authAction.resetPassword.saving">Wird gespeichert...</ng-container>
                  } @else {
                    <ng-container i18n="Action Label|Button to save the new password@@authAction.resetPassword.saveButton">Passwort speichern</ng-container>
                  }
                </button>
              </div>
            </form>
          }

          @if (status === 'success') {
            <div class="text-center">
              <div class="rounded-md bg-green-50 p-4 mb-4">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-green-800">
                      {{ successMessage }}
                    </p>
                  </div>
                </div>
              </div>
              <a routerLink="/admin/login" class="text-indigo-600 hover:text-indigo-500 font-medium" i18n="Action Label|Link to return to login page@@authAction.toLogin">
                Zum Login
              </a>
            </div>
          }

          @if (status === 'error') {
            <div class="text-center">
              <div class="rounded-md bg-red-50 p-4 mb-4">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-red-800">
                      {{ errorMessage }}
                    </p>
                  </div>
                </div>
              </div>
              <a routerLink="/" class="text-indigo-600 hover:text-indigo-500 font-medium" i18n="Action Label|Link to return to home page@@authAction.backToHome">
                Zurück zur Startseite
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
  private router = inject(Router);
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
        this.errorMessage = $localize`:Error Message|Link is invalid because of missing parameters@@authAction.error.invalidParams:Ungültiger Link.`;
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
          this.errorMessage = $localize`:Error Message|Action requested is unknown@@authAction.error.unknownMode:Unbekannte Aktion.`;
      }
    });
  }

  private async handleVerifyEmail() {
    this.title = $localize`:Heading|Title for email verification action@@authAction.verifyEmail.title:E-Mail-Verifizierung`;
    try {
      await applyActionCode(this.auth, this.oobCode);
      this.status = 'success';
      this.successMessage = $localize`:Success Message|Notification that email was verified@@authAction.verifyEmail.success:Ihre E-Mail-Adresse wurde erfolgreich verifiziert.`;
      this.cdr.detectChanges();

      // Redirect to onboarding after a short delay
      setTimeout(() => {
        this.router.navigate(['/onboarding']);
      }, 3000);
    } catch (error: unknown) {
      console.error('Email verification error:', error);
      this.status = 'error';
      this.errorMessage = $localize`:Error Message|Email verification link is invalid or expired@@authAction.verifyEmail.error:Der Verifizierungslink ist ungültig oder abgelaufen.`;
      this.cdr.detectChanges();
    }
  }

  private async handleResetPassword() {
    this.title = $localize`:Heading|Title for password reset action@@authAction.resetPassword.title:Passwort zurücksetzen`;
    try {
      this.resetEmail = await verifyPasswordResetCode(this.auth, this.oobCode);
      this.status = 'resetPassword';
      this.cdr.detectChanges();
    } catch (error: unknown) {
      console.error('Password reset code error:', error);
      this.status = 'error';
      this.errorMessage = $localize`:Error Message|Password reset link is invalid or expired@@authAction.resetPassword.error:Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.`;
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
      this.successMessage = $localize`:Success Message|Notification that password was reset@@authAction.resetPassword.success:Ihr Passwort wurde erfolgreich zurückgesetzt. Sie können sich nun anmelden.`;
      this.cdr.detectChanges();
    } catch (error: unknown) {
      console.error('Confirm password reset error:', error);
      this.errorMessage = $localize`:Error Message|Password reset failed@@authAction.resetPassword.confirmError:Fehler beim Zurücksetzen des Passworts. Bitte versuchen Sie es erneut.`;
      this.status = 'error';
      this.cdr.detectChanges();
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }
}

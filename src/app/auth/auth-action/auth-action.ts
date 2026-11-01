import { ChangeDetectorRef, Component, DestroyRef, inject, type OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { Auth } from 'firebase/auth';
import { applyActionCode, checkActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { FIREBASE_AUTH } from '../../firebase.config';

@Component({
  selector: 'app-auth-action',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './auth-action.html',
})
export class AuthActionComponent implements OnInit {
  private auth = inject(FIREBASE_AUTH) as Auth;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

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
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
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
      const info = await checkActionCode(this.auth, this.oobCode);
      await applyActionCode(this.auth, this.oobCode);

      // Successfully verified, redirect to login with email prefilled
      this.router.navigate(['/admin/login'], {
        queryParams: {
          email: info.data.email,
          verified: 'true',
        },
      });
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
      this.successMessage = 'Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich nun anmelden.';
      this.cdr.detectChanges();
    } catch (error: unknown) {
      console.error('Confirm password reset error:', error);
      this.errorMessage = 'Fehler beim Zurücksetzen des Passworts. Bitte versuche es erneut.';
      this.status = 'error';
      this.cdr.detectChanges();
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }
}

import { ChangeDetectorRef, Component, DestroyRef, inject, type OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { BackButtonComponent } from '../../shared/back-button/back-button';
import { getCapacitorPlatform, isNativeCapacitorApp } from '../../shared/capacitor-env';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BackButtonComponent],
  templateUrl: './admin-login.html',
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
  private destroyRef = inject(DestroyRef);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isLoading = false;
  showErrorModal = false;
  showPassword = false;
  errorMessage = '';
  successMessage = '';
  showGoogleLogin = !isNativeCapacitorApp();
  showAppleLogin = !isNativeCapacitorApp() || getCapacitorPlatform() === 'ios';

  ngOnInit() {
    this.auth.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      if (user && !user.isAnonymous) {
        this.router.navigate(['/admin']);
      }
    });
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.loginForm.patchValue({ email });
    }
    const verified = this.route.snapshot.queryParamMap.get('verified');
    if (verified === 'true') {
      this.successMessage = 'E-Mail-Adresse erfolgreich verifiziert. Du kannst dich nun anmelden.';
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
      this.errorMessage = 'Bitte gib deine E-Mail-Adresse ein.';
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

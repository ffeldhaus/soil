import { ChangeDetectorRef, Component, DestroyRef, inject, type OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { User } from 'firebase/auth';

import { GameService } from '../../game/game.service';
import { BackButtonComponent } from '../../shared/back-button/back-button';
import { getCapacitorPlatform, isNativeCapacitorApp } from '../../shared/capacitor-env';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BackButtonComponent],
  templateUrl: './admin-register.html',
})
export class AdminRegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
  });

  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showErrorModal = false;
  showPassword = false;
  isGoogleUser = false;
  isAppleProvider = false;
  showGoogleLogin = !isNativeCapacitorApp();
  showAppleLogin = !isNativeCapacitorApp() || getCapacitorPlatform() === 'ios';
  currentUser: User | null = null;

  t(key: string): string {
    const translations: Record<string, string> = {
      'adminRegister.signedInAs': 'Angemeldet als',
      'adminRegister.viaGoogle': 'über Google',
      'adminRegister.viaApple': 'über Apple',
      'adminRegister.completeApp': 'Bitte vervollständige deinen Antrag',
      'adminRegister.firstName': 'Vorname',
      'adminRegister.placeholder.firstName': 'Max',
      'adminRegister.lastName': 'Nachname',
      'adminRegister.placeholder.lastName': 'Mustermann',
      'adminRegister.email': 'E-Mail-Adresse',
      'adminRegister.placeholder.email': 'admin@schule.de',
      'adminRegister.error.email': 'Bitte gib eine gültige E-Mail-Adresse ein',
      'adminRegister.password': 'Passwort',
      'adminRegister.placeholder.password': 'Mindestens 6 Zeichen',
      'adminRegister.error.password': 'Das Passwort muss mindestens 6 Zeichen lang sein',
      'adminRegister.error.required': 'Dieses Feld ist ein Pflichtfeld',
      'adminRegister.success.verificationSent':
        'Registrierung erfolgreich! Bitte prüfe deine E-Mails, um deine E-Mail-Adresse zu bestätigen.',
      'adminRegister.error.title': 'Registrierung fehlgeschlagen',
      'adminRegister.error.retry': 'Erneut versuchen',
      'adminRegister.error.offline': 'Registrierung ist nur im Online-Modus möglich.',
    };
    return translations[key] || key;
  }

  ngOnInit() {
    this.authService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      if (!user) return;
      this.currentUser = user;
      this.isGoogleUser = user.providerData.some((p) => p.providerId === 'google.com' || p.providerId === 'apple.com');
      this.isAppleProvider = user.providerData.some((p) => p.providerId === 'apple.com');

      if (this.isGoogleUser) {
        this.populateOAuthUser(user);
      }
    });
  }

  private populateOAuthUser(user: User) {
    const hasStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    const names = (user.displayName || '').trim().split(/\s+/).filter(Boolean);
    const firstName = names[0] || (hasStorage ? window.localStorage.getItem('soil_oauth_first_name') || '' : '');
    const lastName =
      names.slice(1).join(' ') || (hasStorage ? window.localStorage.getItem('soil_oauth_last_name') || '' : '');
    this.registerForm.get('firstName')?.setValue(firstName);
    this.registerForm.get('lastName')?.setValue(lastName);
    this.registerForm.get('email')?.setValue(user.email || '');
    this.registerForm.get('password')?.setValue('OAUTH_AUTH_PLACEHOLDER');
    this.registerForm.get('email')?.disable();
    this.registerForm.get('password')?.disable();
    this.cdr.detectChanges();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (this.registerForm.invalid) return;

    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      this.errorMessage = this.t('adminRegister.error.offline');
      this.showErrorModal = true;
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.showErrorModal = false;
    this.cdr.detectChanges();

    try {
      const formData = this.registerForm.getRawValue();

      if (!this.isGoogleUser) {
        await this.authService.registerWithEmail(formData.email as string, formData.password as string);
        await this.authService.sendVerificationEmail();
        this.successMessage = this.t('adminRegister.success.verificationSent');
        this.cdr.detectChanges();
      }

      await this.gameService.submitOnboarding({
        firstName: formData.firstName as string,
        lastName: formData.lastName as string,
        explanation: 'Simplified registration',
        institution: 'N/A',
      });

      if (!this.isGoogleUser) {
        // Stay on page to show success message if email verification is needed
        this.isLoading = false;
        this.cdr.detectChanges();
        return;
      }

      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.removeItem('soil_oauth_first_name');
        window.localStorage.removeItem('soil_oauth_last_name');
      }

      // OAuth users are already verified, show success and redirect to admin console after a brief delay
      this.successMessage = this.t('adminRegister.success.verificationSent').replace(
        ' Bitte prüfe deine E-Mails, um deine E-Mail-Adresse zu bestätigen.',
        '',
      );
      this.isLoading = false;
      this.cdr.detectChanges();
      setTimeout(() => this.router.navigate(['/admin']), 1500);
    } catch (error: unknown) {
      console.error('Registration error:', error);
      this.errorMessage = (error as Error).message || 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.';
      this.showErrorModal = true;
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  closeModal() {
    this.showErrorModal = false;
  }

  async loginWithGoogle() {
    try {
      await this.authService.loginWithGoogle();
    } catch (err: unknown) {
      console.error(err);
      this.errorMessage = 'Anmeldung fehlgeschlagen';
      this.showErrorModal = true;
      this.cdr.detectChanges();
    }
  }

  async loginWithApple() {
    try {
      await this.authService.loginWithApple();
    } catch (err: unknown) {
      console.error(err);
      this.errorMessage = 'Anmeldung fehlgeschlagen';
      this.showErrorModal = true;
      this.cdr.detectChanges();
    }
  }
}

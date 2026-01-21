import { ChangeDetectorRef, Component, inject, type OnInit } from '@angular/core';
import type { User } from '@angular/fire/auth';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { GameService } from '../../game/game.service';
import { LanguageService } from '../../services/language.service';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LanguageSwitcherComponent],
  templateUrl: './admin-register.html',
})
export class AdminRegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private languageService = inject(LanguageService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    institution: ['', Validators.required],
    institutionLink: ['', [Validators.required, Validators.pattern('https?://.+')]],
    explanation: ['', [Validators.required, Validators.minLength(20)]],
  });

  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showErrorModal = false;
  showPassword = false;
  isGoogleUser = false;
  currentUser: User | null = null;

  t(key: string): string {
    const translations: Record<string, string> = {
      'adminRegister.signedInAs': $localize`:Status Message|Indicates who the user is signed in as@@adminRegister.signedInAs:Angemeldet als`,
      'adminRegister.viaGoogle': $localize`:Status Message|Indicates the authentication provider@@adminRegister.viaGoogle:über Google`,
      'adminRegister.completeApp': $localize`:Instruction|Request to complete the registration application@@adminRegister.completeApp:Bitte vervollständigen Sie Ihren Antrag`,
      'adminRegister.firstName': $localize`:Form Label|Label for first name input@@adminRegister.firstName:Vorname`,
      'adminRegister.placeholder.firstName': $localize`:Form Placeholder|Placeholder for first name@@adminRegister.placeholder.firstName:Max`,
      'adminRegister.lastName': $localize`:Form Label|Label for last name input@@adminRegister.lastName:Nachname`,
      'adminRegister.placeholder.lastName': $localize`:Form Placeholder|Placeholder for last name@@adminRegister.placeholder.lastName:Mustermann`,
      'adminRegister.email': $localize`:Form Label|Label for email input@@adminRegister.email:E-Mail-Adresse`,
      'adminRegister.placeholder.email': $localize`:Form Placeholder|Placeholder for email address@@adminRegister.placeholder.email:admin@schule.de`,
      'adminRegister.error.email': $localize`:Error Message|Error shown for invalid email@@adminRegister.error.email:Bitte geben Sie eine gültige E-Mail-Adresse ein`,
      'adminRegister.password': $localize`:Form Label|Label for password input@@adminRegister.password:Passwort`,
      'adminRegister.placeholder.password': $localize`:Form Placeholder|Placeholder for password field@@adminRegister.placeholder.password:Mindestens 6 Zeichen`,
      'adminRegister.error.password': $localize`:Error Message|Error shown for short password@@adminRegister.error.password:Das Passwort muss mindestens 6 Zeichen lang sein`,
      'adminRegister.institution': $localize`:Form Label|Label for school or institution name@@adminRegister.institution:Institution / Schule`,
      'adminRegister.placeholder.institution': $localize`:Form Placeholder|Placeholder for school name@@adminRegister.placeholder.institution:z.B. Humboldt Gymnasium`,
      'adminRegister.website': $localize`:Form Label|Label for institution website URL@@adminRegister.website:Website der Institution`,
      'adminRegister.placeholder.website': $localize`:Form Placeholder|Placeholder for institution website@@adminRegister.placeholder.website:https://schule.de`,
      'adminRegister.explanation': $localize`:Form Label|Label for usage explanation textarea@@adminRegister.explanation:Warum möchten Sie SOIL nutzen?`,
      'adminRegister.placeholder.explanation': $localize`:Form Placeholder|Placeholder for usage explanation@@adminRegister.placeholder.explanation:Beschreiben Sie kurz Ihren geplanten Einsatz im Unterricht`,
      'adminRegister.success.verificationSent': $localize`:Success Message|Notification that registration was successful and account verification is pending@@adminRegister.success.verificationSent:Registrierung erfolgreich! Ihr Antrag wird nun geprüft. Bitte prüfen Sie Ihre E-Mails, um Ihre E-Mail-Adresse zu bestätigen.`,
      'adminRegister.error.title': $localize`:Heading|Title for registration error modal@@adminRegister.error.title:Registrierung fehlgeschlagen`,
      'adminRegister.error.retry': $localize`:Action Label|Button to retry registration@@adminRegister.error.retry:Erneut versuchen`,
    };
    return translations[key] || key;
  }

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      if (user) {
        this.currentUser = user;
        this.isGoogleUser = user.providerData.some((p) => p.providerId === 'google.com');

        if (!user.isAnonymous) {
          this.router.navigate(['/admin']);
          return;
        }

        if (this.isGoogleUser) {
          const names = (user.displayName || '').split(' ');
          this.registerForm.get('firstName')?.setValue(names[0] || '');
          this.registerForm.get('lastName')?.setValue(names.slice(1).join(' ') || '');
          this.registerForm.get('email')?.setValue(user.email || '');
          this.registerForm.get('password')?.setValue('GOOGLE_AUTH_PLACEHOLDER');
          this.registerForm.get('email')?.disable();
          this.registerForm.get('password')?.disable();
        }
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (this.registerForm.invalid) return;

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
        institution: formData.institution as string,
        institutionLink: formData.institutionLink as string,
        explanation: formData.explanation as string,
        lang: this.languageService.currentLang,
      });

      if (!this.isGoogleUser) {
        // Stay on page to show success message if email verification is needed
        this.isLoading = false;
        this.cdr.detectChanges();
        return;
      }

      // Google users are already verified, show success and maybe redirect to home after a delay
      this.successMessage = this.t('adminRegister.success.verificationSent').replace(
        ' Bitte prüfen Sie Ihre E-Mails, um Ihre E-Mail-Adresse zu bestätigen.',
        '',
      );
      this.isLoading = false;
      this.cdr.detectChanges();
      setTimeout(() => this.router.navigate(['/']), 5000);
    } catch (error: unknown) {
      console.error('Registration error:', error);
      this.errorMessage =
        (error as Error).message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
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
      this.errorMessage = $localize`:@@adminRegister.error.failed:Anmeldung fehlgeschlagen`;
      this.showErrorModal = true;
      this.cdr.detectChanges();
    }
  }

  async loginWithApple() {
    try {
      await this.authService.loginWithApple();
    } catch (err: unknown) {
      console.error(err);
      this.errorMessage = $localize`:@@adminRegister.error.failed:Anmeldung fehlgeschlagen`;
      this.showErrorModal = true;
      this.cdr.detectChanges();
    }
  }
}

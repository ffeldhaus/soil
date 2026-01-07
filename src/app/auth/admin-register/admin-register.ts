import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { GameService } from '../../game/game.service';
import { LanguageService } from '../../services/language.service';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LanguageSwitcherComponent],
  templateUrl: './admin-register.html',
})
export class AdminRegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private languageService = inject(LanguageService);
  private router = inject(Router);

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
  isGoogleUser = false;
  currentUser: any = null;

  t(key: string): string {
    const translations: Record<string, string> = {
      'adminRegister.signedInAs': $localize`:@@adminRegister.signedInAs:Angemeldet als`,
      'adminRegister.viaGoogle': $localize`:@@adminRegister.viaGoogle:über Google`,
      'adminRegister.completeApp': $localize`:@@adminRegister.completeApp:Bitte vervollständigen Sie Ihren Antrag`,
      'adminRegister.firstName': $localize`:@@adminRegister.firstName:Vorname`,
      'adminRegister.placeholder.firstName': $localize`:@@adminRegister.placeholder.firstName:Max`,
      'adminRegister.lastName': $localize`:@@adminRegister.lastName:Nachname`,
      'adminRegister.placeholder.lastName': $localize`:@@adminRegister.placeholder.lastName:Mustermann`,
      'adminRegister.email': $localize`:@@adminRegister.email:E-Mail-Adresse`,
      'adminRegister.placeholder.email': $localize`:@@adminRegister.placeholder.email:admin@schule.de`,
      'adminRegister.error.email': $localize`:@@adminRegister.error.email:Bitte geben Sie eine gültige E-Mail-Adresse ein`,
      'adminRegister.password': $localize`:@@adminRegister.password:Passwort`,
      'adminRegister.placeholder.password': $localize`:@@adminRegister.placeholder.password:Mindestens 6 Zeichen`,
      'adminRegister.error.password': $localize`:@@adminRegister.error.password:Das Passwort muss mindestens 6 Zeichen lang sein`,
      'adminRegister.institution': $localize`:@@adminRegister.institution:Institution / Schule`,
      'adminRegister.placeholder.institution': $localize`:@@adminRegister.placeholder.institution:z.B. Humboldt Gymnasium`,
      'adminRegister.website': $localize`:@@adminRegister.website:Website der Institution`,
      'adminRegister.placeholder.website': $localize`:@@adminRegister.placeholder.website:https://schule.de`,
      'adminRegister.explanation': $localize`:@@adminRegister.explanation:Warum möchten Sie SOIL nutzen?`,
      'adminRegister.placeholder.explanation': $localize`:@@adminRegister.placeholder.explanation:Beschreiben Sie kurz Ihren geplanten Einsatz im Unterricht`,
      'adminRegister.success.verificationSent': $localize`:@@adminRegister.success.verificationSent:Registrierung erfolgreich! Bitte prüfen Sie Ihre E-Mails, um Ihr Konto zu verifizieren.`,
    };
    return translations[key] || key;
  }

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      if (user) {
        this.currentUser = user;
        this.isGoogleUser = user.providerData.some((p) => p.providerId === 'google.com');

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

  async onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      const formData = this.registerForm.getRawValue();

      if (!this.isGoogleUser) {
        await this.authService.registerWithEmail(formData.email!, formData.password!);
        await this.authService.sendVerificationEmail();
        this.successMessage = this.t('adminRegister.success.verificationSent');
      }

      await this.gameService.submitOnboarding({
        firstName: formData.firstName!,
        lastName: formData.lastName!,
        institution: formData.institution!,
        institutionLink: formData.institutionLink!,
        explanation: formData.explanation!,
        lang: this.languageService.currentLang,
      });

      if (!this.isGoogleUser) {
        // Stay on page to show success message if email verification is needed
        this.isLoading = false;
        return;
      }

      this.router.navigate(['/admin/dashboard']);
    } catch (error: any) {
      console.error('Registration error:', error);
      this.errorMessage = error.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
    } finally {
      this.isLoading = false;
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { GameService } from '../../game/game.service';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LanguageSwitcherComponent],
  template: `
    <div
      class="min-h-screen relative flex items-center justify-center bg-gray-900 text-gray-100 font-sans p-6 overflow-hidden"
    >
      <!-- Language Switcher -->
      <div class="absolute top-6 right-6 z-[100]">
        <app-language-switcher></app-language-switcher>
      </div>

      <!-- Background Image with Overlay -->
      <div class="absolute inset-0 z-0">
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
        class="relative z-10 w-full max-w-md bg-gray-800/80 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-gray-700 my-8"
      >
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-emerald-400 mb-2">
            <ng-container i18n="@@adminRegister.title">Admin-Registrierung</ng-container>
          </h1>
          <p class="text-gray-400">
            <ng-container i18n="@@adminRegister.subtitle">Treten Sie der SOIL-Community bei</ng-container>
          </p>
        </div>

        <h2 class="text-xl font-bold text-center mb-6 text-white" *ngIf="isGoogleUser">
          <ng-container i18n="@@adminRegister.completeTitle">Registrierung abschließen</ng-container>
        </h2>

        <div
          *ngIf="isGoogleUser"
          class="mb-6 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg text-center text-gray-100"
        >
          <p class="text-blue-200 text-sm">
            {{ t('adminRegister.signedInAs') }}
            <span class="font-bold text-white">{{ currentUser?.email }}</span>
            <ng-container>{{ t('adminRegister.viaGoogle') }}</ng-container
            >.
          </p>
          <p class="text-xs text-gray-400 mt-1">{{ t('adminRegister.completeApp') }}</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <div
            *ngIf="errorMessage"
            class="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm text-center"
          >
            {{ errorMessage }}
          </div>

          <!-- Email/Password Section (Hidden for Google Users) -->
          <div *ngIf="!isGoogleUser" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">{{ t('adminRegister.email') }}</label>
              <input
                formControlName="email"
                type="email"
                autocomplete="email"
                class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white"
                placeholder="admin@school.edu"
                [placeholder]="'adminRegister.placeholder.email'"
              />
              <div
                *ngIf="registerForm.get('email')?.touched && registerForm.get('email')?.invalid"
                class="text-red-400 text-xs mt-1"
              >
                {{ t('adminRegister.error.email') }}
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">{{ t('adminRegister.password') }}</label>
              <input
                formControlName="password"
                type="password"
                autocomplete="new-password"
                class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white"
                placeholder="Minimum 6 characters"
                [placeholder]="'adminRegister.placeholder.password'"
              />
              <div
                *ngIf="registerForm.get('password')?.touched && registerForm.get('password')?.invalid"
                class="text-red-400 text-xs mt-1"
              >
                {{ t('adminRegister.error.password') }}
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">{{
                t('adminRegister.confirmPassword')
              }}</label>
              <input
                formControlName="confirmPassword"
                type="password"
                autocomplete="new-password"
                class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white"
                placeholder="Confirm Password"
                [placeholder]="'adminRegister.placeholder.confirmPassword'"
              />
              <div
                *ngIf="registerForm.errors?.['mismatch'] && registerForm.get('confirmPassword')?.touched"
                class="text-red-400 text-xs mt-1"
              >
                {{ t('adminRegister.error.mismatch') }}
              </div>
            </div>
          </div>

          <!-- Personal Details -->
          <div class="pt-4 border-t border-gray-700">
            <h3 class="text-lg font-bold text-emerald-400 mb-4">{{ t('adminRegister.personalDetails') }}</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2"
                  >{{ t('adminRegister.firstName') }} <span class="text-red-400">*</span></label
                >
                <input
                  formControlName="firstName"
                  type="text"
                  autocomplete="given-name"
                  class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white"
                  placeholder="John"
                  [placeholder]="'adminRegister.placeholder.firstName'"
                />
                <div
                  *ngIf="registerForm.get('firstName')?.touched && registerForm.get('firstName')?.invalid"
                  class="text-red-400 text-xs mt-1"
                >
                  {{ t('adminRegister.error.required') }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2"
                  >{{ t('adminRegister.lastName') }} <span class="text-red-400">*</span></label
                >
                <input
                  formControlName="lastName"
                  type="text"
                  autocomplete="family-name"
                  class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white"
                  placeholder="Doe"
                  [placeholder]="'adminRegister.placeholder.lastName'"
                />
                <div
                  *ngIf="registerForm.get('lastName')?.touched && registerForm.get('lastName')?.invalid"
                  class="text-red-400 text-xs mt-1"
                >
                  {{ t('adminRegister.error.required') }}
                </div>
              </div>
            </div>
          </div>

          <!-- Application Details -->
          <div class="pt-4 border-t border-gray-700">
            <h3 class="text-lg font-bold text-emerald-400 mb-4">{{ t('adminRegister.appDetails') }}</h3>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2"
                  >{{ t('adminRegister.institution') }} <span class="text-red-400">*</span></label
                >
                <input
                  formControlName="institution"
                  type="text"
                  class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white"
                  placeholder="e.g. University of Berlin"
                  [placeholder]="'adminRegister.placeholder.institution'"
                />
                <div
                  *ngIf="registerForm.get('institution')?.touched && registerForm.get('institution')?.invalid"
                  class="text-red-400 text-xs mt-1"
                >
                  {{ t('adminRegister.error.required') }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2"
                  >{{ t('adminRegister.institutionLink') }} <span class="text-red-400">*</span></label
                >
                <input
                  formControlName="institutionLink"
                  type="url"
                  class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white"
                  placeholder="https://..."
                  [placeholder]="'adminRegister.placeholder.institutionLink'"
                />
                <div
                  *ngIf="registerForm.get('institutionLink')?.touched && registerForm.get('institutionLink')?.invalid"
                  class="text-red-400 text-xs mt-1"
                >
                  {{ t('adminRegister.error.url') }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2"
                  >{{ t('adminRegister.explanation') }} <span class="text-red-400">*</span></label
                >
                <textarea
                  formControlName="explanation"
                  rows="3"
                  class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white"
                  placeholder="Brief explanation (min 10 chars)..."
                  [placeholder]="'adminRegister.placeholder.explanation'"
                ></textarea>
                <div
                  *ngIf="registerForm.get('explanation')?.touched && registerForm.get('explanation')?.invalid"
                  class="text-red-400 text-xs mt-1"
                >
                  {{ t('adminRegister.error.explanation') }}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            [disabled]="registerForm.invalid || isLoading"
            class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition transform active:scale-95 shadow-lg"
          >
            <ng-container *ngIf="isLoading">{{ t('adminRegister.creatingAccount') }}</ng-container>
            <ng-container *ngIf="!isLoading">
              <ng-container *ngIf="isGoogleUser">{{ t('adminRegister.btn.complete') }}</ng-container>
              <ng-container *ngIf="!isGoogleUser">{{ t('adminRegister.btn.register') }}</ng-container>
            </ng-container>
          </button>
        </form>

        <div class="mt-8 pt-6 border-t border-gray-700 text-center space-y-4">
          <p class="text-sm text-gray-500">
            <ng-container>{{ t('adminRegister.alreadyAccount') }}</ng-container
            >&nbsp;<a routerLink="/admin/login" class="text-emerald-400 hover:underline">{{
              'adminRegister.loginLink'
            }}</a>
          </p>
          <a routerLink="/" class="text-gray-400 hover:text-white text-sm transition block">{{
            'adminRegister.backToHome'
          }}</a>
        </div>
      </div>
    </div>
  `,
})
export class AdminRegisterComponent {
  t(key: string): string {
    return $localize`:@@${key}:${key}`;
  }
  t(key: string): string {
    return $localize`:@@${key}:${key}`;
  }
  private fb = inject(FormBuilder);
  authentication = inject(AuthService);
  gameService = inject(GameService);
  router = inject(Router);

  registerForm = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      institution: ['', [Validators.required, Validators.minLength(3)]],
      institutionLink: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      explanation: ['', [Validators.required, Validators.minLength(10)]],
    },
    { validators: this.passwordMatchValidator },
  );

  isLoading = false;
  errorMessage = '';
  isGoogleUser = false;
  currentUser: any = null;

  constructor() {
    // Check if user is already logged in (e.g. via Google from Dashboard redirect)
    this.authentication.user$.subscribe((user) => {
      if (user) {
        this.isGoogleUser = true;
        this.currentUser = user;

        // Remove Email/Password validations
        this.registerForm.get('email')?.clearValidators();
        this.registerForm.get('email')?.updateValueAndValidity();
        this.registerForm.get('password')?.clearValidators();
        this.registerForm.get('password')?.updateValueAndValidity();
        this.registerForm.get('confirmPassword')?.clearValidators();
        this.registerForm.get('confirmPassword')?.updateValueAndValidity();

        // Try to pre-fill names
        if (user.displayName) {
          const parts = user.displayName.split(' ');
          if (parts.length > 0) this.registerForm.get('firstName')?.setValue(parts[0]);
          if (parts.length > 1) this.registerForm.get('lastName')?.setValue(parts.slice(1).join(' '));
        }
      }
    });
  }

  passwordMatchValidator(g: any) {
    // Skip if Google User
    if (!g.get('password')?.validator) return null;
    return g.get('password')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password, firstName, lastName, institution, institutionLink, explanation } = this.registerForm.value;
    try {
      if (!this.isGoogleUser) {
        await this.authentication.registerWithEmail(email!, password!);
      }

      // Submit onboarding details (now works for both Auth methods)
      // Note: If Google User, Auth Service already has the user.
      // If Email/Pass, registerWithEmail logs them in.

      // We might need to update Display Name for Email users too?
      if (!this.isGoogleUser) {
        await this.authentication.updateDisplayName(`${firstName} ${lastName}`);
      }

      await this.gameService.submitOnboarding({
        firstName: firstName!,
        lastName: lastName!,
        institution: institution!,
        institutionLink: institutionLink!,
        explanation: explanation!,
      });

      // Navigate to dashboard (which should redirect to pending)
      this.router.navigate(['/admin']);
    } catch (err: any) {
      console.error(err);
      this.errorMessage = err.message || 'adminRegister.error.failed';
    } finally {
      this.isLoading = false;
    }
  }
}

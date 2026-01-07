import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { applyActionCode } from 'firebase/auth';

@Component({
  selector: 'app-auth-action',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {{ title }}
        </h2>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div *ngIf="status === 'loading'" class="text-center">
            <p i18n>Verarbeitung läuft...</p>
          </div>

          <div *ngIf="status === 'success'" class="text-center">
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
            <a routerLink="/" class="text-indigo-600 hover:text-indigo-500 font-medium" i18n> Zur Startseite </a>
          </div>

          <div *ngIf="status === 'error'" class="text-center">
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
            <a routerLink="/" class="text-indigo-600 hover:text-indigo-500 font-medium" i18n> Zurück zur Startseite </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AuthActionComponent implements OnInit {
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  mode = '';
  oobCode = '';
  status: 'loading' | 'success' | 'error' = 'loading';
  title = 'Auth Action';
  successMessage = '';
  errorMessage = '';

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.mode = params['mode'];
      this.oobCode = params['oobCode'];

      if (!this.mode || !this.oobCode) {
        this.status = 'error';
        this.errorMessage = $localize`:@@authAction.error.invalidParams:Ungültiger Link.`;
        return;
      }

      switch (this.mode) {
        case 'verifyEmail':
          this.handleVerifyEmail();
          break;
        case 'resetPassword':
          // Redirect to a dedicated reset password page or handle here
          this.router.navigate(['/admin/login'], { queryParams: params });
          break;
        default:
          this.status = 'error';
          this.errorMessage = $localize`:@@authAction.error.unknownMode:Unbekannte Aktion.`;
      }
    });
  }

  private async handleVerifyEmail() {
    this.title = $localize`:@@authAction.verifyEmail.title:E-Mail-Verifizierung`;
    try {
      await applyActionCode(this.auth, this.oobCode);
      this.status = 'success';
      this.successMessage = $localize`:@@authAction.verifyEmail.success:Ihre E-Mail-Adresse wurde erfolgreich verifiziert.`;

      // Redirect to onboarding after a short delay
      setTimeout(() => {
        this.router.navigate(['/onboarding']);
      }, 3000);
    } catch (error: any) {
      console.error('Email verification error:', error);
      this.status = 'error';
      this.errorMessage = $localize`:@@authAction.verifyEmail.error:Der Verifizierungslink ist ungültig oder abgelaufen.`;
    }
  }
}

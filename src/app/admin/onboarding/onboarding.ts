import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900" i18n>Willkommen bei SOIL!</h2>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          <div class="rounded-md bg-blue-50 p-4 mb-6">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-blue-800" i18n>Ihre E-Mail-Adresse wurde verifiziert.</p>
              </div>
            </div>
          </div>

          <h3 class="text-lg font-medium text-gray-900 mb-4" i18n>Wie geht es weiter?</h3>

          <p class="text-gray-600 mb-6" i18n>
            Ihre Registrierung als Admin wird nun von uns geprüft. Sobald Ihr Konto freigeschaltet wurde, informieren
            wir Sie per E-Mail.
          </p>

          <div class="space-y-4">
            <p class="text-sm text-gray-500" i18n>Dies dauert in der Regel weniger als 24 Stunden.</p>

            <a
              routerLink="/"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              i18n
            >
              Zur Startseite
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class Onboarding {}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [RouterLink],
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
            alt="Farm Background"
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
          <h2 class="mt-6 text-center text-3xl font-extrabold text-white" i18n="@@onboarding.welcome">Willkommen!</h2>
        </div>

        <div
          class="bg-gray-800/40 backdrop-blur-md border border-white/10 py-8 px-4 shadow-2xl rounded-3xl sm:px-10 text-center"
        >
          <div class="rounded-2xl bg-emerald-900/30 border border-emerald-500/20 p-4 mb-6">
            <div class="flex items-center justify-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-emerald-200" i18n="@@onboarding.emailVerified">
                  Ihre E-Mail-Adresse wurde verifiziert.
                </p>
              </div>
            </div>
          </div>

          <h3 class="text-xl font-semibold text-white mb-4" i18n="@@onboarding.nextSteps">Wie geht es weiter?</h3>

          <p class="text-gray-300 mb-6 leading-relaxed" i18n="@@onboarding.checkingRegistration">
            Ihre Registrierung als Lehrkraft wird nun von uns geprüft. Sobald Ihr Konto freigeschaltet wurde,
            informieren wir Sie per E-Mail.
          </p>

          <div class="space-y-6">
            <p class="text-sm text-emerald-300/70" i18n="@@onboarding.usuallyLess24h">
              Dies dauert in der Regel weniger als 24 Stunden.
            </p>

            <a
              routerLink="/"
              class="group relative inline-flex items-center justify-center w-full px-8 py-4 bg-emerald-800 hover:bg-emerald-700 text-white text-lg font-bold rounded-2xl shadow-[0_0_20px_rgba(6,95,70,0.4)] transition-all transform hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,95,70,0.6)] overflow-hidden"
              i18n="@@onboarding.backToHome"
            >
              <span class="relative z-10">Zur Startseite</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class Onboarding {}

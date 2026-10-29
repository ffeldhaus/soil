import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div
      class="inline-flex items-stretch rounded-lg border border-gray-700 bg-gray-800 overflow-hidden text-xs sm:text-sm font-medium print:hidden"
    >
      <a
        routerLink="/"
        data-testid="home-logo-link"
        title="Zur Startseite"
        class="inline-flex items-center gap-2 px-3 py-2 text-emerald-400 hover:text-emerald-300 hover:bg-gray-700/80 font-bold tracking-wider transition-colors cursor-pointer"
      >
        <img src="favicon.svg" alt="" class="w-4 h-4 rounded-xs shrink-0" />
        <span>SOIL</span>
      </a>
      <div class="w-px bg-gray-700" aria-hidden="true"></div>
      <button
        type="button"
        data-testid="back-button"
        (click)="goBack()"
        class="inline-flex items-center gap-1.5 px-3 py-2 text-gray-200 hover:text-white hover:bg-gray-700/80 transition-colors cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>{{ label() }}</span>
      </button>
    </div>
  `,
})
export class BackButtonComponent {
  private location = inject(Location);
  private router = inject(Router);

  fallbackUrl = input<string>('/');
  label = input<string>('Zurück');

  goBack(): void {
    if (typeof window !== 'undefined' && (window.history.state?.navigationId ?? 0) > 1) {
      this.location.back();
      return;
    }
    this.router.navigateByUrl(this.fallbackUrl());
  }
}

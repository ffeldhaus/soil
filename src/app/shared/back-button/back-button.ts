import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-back-button',
  standalone: true,
  template: `
    <button
      type="button"
      data-testid="back-button"
      (click)="goBack()"
      class="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-lg border border-gray-700 transition-colors text-xs sm:text-sm font-medium cursor-pointer print:hidden"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>{{ label() }}</span>
    </button>
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

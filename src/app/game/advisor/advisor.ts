import { CommonModule } from '@angular/common';
import { Component, Input, inject, type OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Round } from '../../types';
import { type AdvisorInsight, AdvisorService } from './advisor.service';

@Component({
  selector: 'app-game-advisor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (enabled && insights.length > 0 && !dismissed) {
      <div class="bg-gray-800/80 border border-gray-700 rounded-xl p-4 my-4 animate-fade-in">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-emerald-400 font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Landwirtschaftlicher Berater
          </h3>
          <button (click)="dismissed = true" class="text-gray-300 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          @for (insight of insights; track insight.title) {
            <div class="border-l-2 pl-3 py-1" [ngClass]="{
              'border-blue-500 bg-blue-500/5': insight.level === 'info',
              'border-amber-500 bg-amber-500/5': insight.level === 'warning',
              'border-red-500 bg-red-500/5': insight.level === 'danger'
            }">
              <div class="flex items-center gap-2 mb-1">
                @if (insight.level === 'danger') { <span class="w-2 h-2 rounded-full bg-red-500 shrink-0" aria-hidden="true"></span> }
                @if (insight.level === 'warning') { <span class="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true"></span> }
                @if (insight.level === 'info') { <span class="w-2 h-2 rounded-full bg-blue-500 shrink-0" aria-hidden="true"></span> }
                <span class="font-bold text-sm text-white">{{ insight.title }}</span>
              </div>
              <p class="text-xs text-white mb-1">{{ insight.message }}</p>
              @if (insight.hint) {
                <p class="text-[10px] italic text-gray-200">Tipp: {{ insight.hint }}</p>
              }
            </div>
          }
        </div>

        <div class="mt-3 pt-3 border-t border-gray-700/50 flex justify-end">
          <a routerLink="/manual" target="_blank" class="text-[10px] uppercase tracking-widest text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-1">
            Details im Handbuch lesen
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    }
  `,
  styleUrl: './advisor.scss',
})
export class GameAdvisorComponent implements OnInit {
  @Input() currentRound!: Round;
  @Input() previousRound?: Round;
  @Input() context: 'result' | 'next_round' = 'result';
  @Input() enabled = true;

  private advisorService = inject(AdvisorService);

  insights: AdvisorInsight[] = [];
  dismissed = false;

  ngOnInit() {
    this.insights = this.advisorService.getInsights(this.currentRound, this.previousRound, this.context);
  }
}

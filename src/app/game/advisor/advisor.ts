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
            <span class="text-lg">💡</span>
            Landwirtschaftlicher Berater
          </h3>
          <button (click)="dismissed = true" class="text-gray-500 hover:text-gray-300 transition-colors">
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
                @if (insight.level === 'danger') { <span class="text-red-500">⚠️</span> }
                @if (insight.level === 'warning') { <span class="text-amber-500">🔸</span> }
                @if (insight.level === 'info') { <span class="text-blue-500">ℹ️</span> }
                <span class="font-bold text-sm text-gray-200">{{ insight.title }}</span>
              </div>
              <p class="text-xs text-gray-400 mb-1">{{ insight.message }}</p>
              @if (insight.hint) {
                <p class="text-[10px] italic text-gray-500">Tipp: {{ insight.hint }}</p>
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
  @Input() enabled = true;

  private advisorService = inject(AdvisorService);

  insights: AdvisorInsight[] = [];
  dismissed = false;

  ngOnInit() {
    this.insights = this.advisorService.getInsights(this.currentRound, this.previousRound);
  }
}

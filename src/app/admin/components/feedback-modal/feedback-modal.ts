import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      (click)="closeModal.emit()"
    >
      <div
        class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg w-full transform transition-all scale-100"
        (click)="$event.stopPropagation()"
      >
        <div class="flex justify-between items-center mb-6">
          <h2 i18n="@@feedback.title" class="text-2xl font-bold text-white font-serif">Feedback & Vorschläge</h2>
          <button (click)="closeModal.emit()" class="text-gray-400 hover:text-white transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form (submit)="submitFeedback()" #feedbackForm="ngForm" class="space-y-6">
          <!-- Category -->
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2" i18n="@@feedback.category">Kategorie</label>
            <select
              [(ngModel)]="feedback.category"
              name="category"
              required
              class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
            >
              <option value="interface" i18n="@@feedback.cat.interface">Benutzeroberfläche</option>
              <option value="mechanics" i18n="@@feedback.cat.mechanics">Spielmechanik</option>
              <option value="improvements" i18n="@@feedback.cat.improvements">Verbesserungen</option>
              <option value="suggestions" i18n="@@feedback.cat.suggestions">Neue Features</option>
              <option value="documentation" i18n="@@feedback.cat.documentation">Dokumentation/Handbuch</option>
              <option value="other" i18n="@@feedback.cat.other">Sonstiges</option>
            </select>
          </div>

          <!-- Rating -->
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2" i18n="@@feedback.rating">Bewertung</label>
            <div class="flex items-center gap-3">
              <button
                type="button"
                (click)="feedback.rating = 0"
                class="px-3 py-1 rounded bg-gray-800 text-xs text-gray-500 hover:text-white transition border border-gray-700"
                [class.bg-emerald-900]="feedback.rating === 0"
                [class.text-emerald-400]="feedback.rating === 0"
              >
                0
              </button>
              <div class="flex gap-1">
                <button
                  *ngFor="let star of [1, 2, 3, 4, 5]"
                  type="button"
                  (click)="feedback.rating = star"
                  class="transition-transform active:scale-90"
                >
                  <svg
                    class="w-8 h-8"
                    [class.text-yellow-500]="feedback.rating >= star"
                    [class.text-gray-600]="feedback.rating < star"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Comment -->
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2" i18n="@@feedback.comment">Dein Feedback</label>
            <textarea
              [(ngModel)]="feedback.comment"
              name="comment"
              required
              rows="4"
              i18n-placeholder="@@feedback.commentPlaceholder"
              placeholder="Erzähl uns mehr..."
              class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition resize-none"
            ></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <button
              type="button"
              (click)="closeModal.emit()"
              i18n="@@feedback.cancel"
              class="px-6 py-3 text-gray-400 hover:text-white transition font-medium"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              [disabled]="!feedbackForm.valid || isSubmitting"
              class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2"
            >
              <span *ngIf="!isSubmitting" i18n="@@feedback.submit">Feedback senden</span>
              <span *ngIf="isSubmitting" i18n="@@feedback.submitting">Wird gesendet...</span>
              <svg *ngIf="isSubmitting" class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class FeedbackModal {
  @Output() closeModal = new EventEmitter<void>();
  @Output() feedbackSubmit = new EventEmitter<any>();

  feedback = {
    category: 'interface',
    rating: 0,
    comment: '',
  };

  isSubmitting = false;

  submitFeedback() {
    this.isSubmitting = true;
    this.feedbackSubmit.emit(this.feedback);
  }
}

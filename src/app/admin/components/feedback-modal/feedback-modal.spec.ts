import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../auth/auth.service';
import type { FeedbackSubmission } from '../../../types';
import { FeedbackModal } from './feedback-modal';

describe('FeedbackModal', () => {
  let fixture: ComponentFixture<FeedbackModal>;
  let component: FeedbackModal;
  let authMock: { currentUser: { isAnonymous: boolean; email?: string | null } | null };

  beforeEach(async () => {
    authMock = { currentUser: null };

    await TestBed.configureTestingModule({
      imports: [FeedbackModal],
      providers: [{ provide: AuthService, useValue: authMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(FeedbackModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits selected category, rating, comment, and optional guest email', () => {
    const submitted: FeedbackSubmission[] = [];
    component.feedbackSubmit.subscribe((payload) => submitted.push(payload));

    component.feedback.category = 'bug';
    component.feedback.rating = 4;
    component.feedback.comment = 'Button auf Mobilgeräten abgeschnitten';
    component.guestEmail = 'lehrkraft@schule.de';
    fixture.detectChanges();

    component.submitFeedback();

    expect(submitted).toEqual([
      {
        category: 'bug',
        rating: 4,
        comment: 'Button auf Mobilgeräten abgeschnitten',
        email: 'lehrkraft@schule.de',
      },
    ]);
    // Parent controls isSubmitting so modal never stays stuck disabled on error
    expect(component.isSubmitting).toBe(false);
  });

  it('respects parent-driven isSubmitting and renders inline errorMessage while preserving input', () => {
    const emitSpy = vi.spyOn(component.feedbackSubmit, 'emit');
    component.feedback.comment = 'Wichtige Rückmeldung';
    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector('[data-testid="feedback-submit-btn"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
    component.submitFeedback();
    expect(emitSpy).not.toHaveBeenCalled();

    // Parent resets isSubmitting and passes inline error
    fixture.componentRef.setInput('isSubmitting', false);
    fixture.componentRef.setInput('errorMessage', 'Feedback konnte nicht gesendet werden.');
    fixture.detectChanges();

    expect(submitBtn.disabled).toBe(false);
    const errorEl = fixture.nativeElement.querySelector('[data-testid="feedback-modal-error"]') as HTMLElement;
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Feedback konnte nicht gesendet werden.');
    expect(component.feedback.comment).toBe('Wichtige Rückmeldung');
  });

  it('only includes logged-in email when opt-in checkbox is enabled', () => {
    authMock.currentUser = { isAnonymous: false, email: 'admin@soil.app' };
    fixture.detectChanges();

    const submitted: FeedbackSubmission[] = [];
    component.feedbackSubmit.subscribe((payload) => submitted.push(payload));

    component.includeUserEmail = true;
    component.submitFeedback();
    expect(submitted[0].email).toBe('admin@soil.app');

    component.includeUserEmail = false;
    component.submitFeedback();
    expect(submitted[1].email).toBeUndefined();
  });
});

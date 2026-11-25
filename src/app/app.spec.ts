import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { App } from './app';
import type { RouteSeoData } from './app.routes';
import { GameService } from './game/game.service';
import { TelemetryService } from './shared/telemetry.service';

@Component({ standalone: true, template: '<h1>Dummy</h1>' })
class DummyComponent {}

describe('App', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          {
            path: '',
            title: 'SOIL Start',
            data: {
              seo: {
                description: 'Landing description',
                canonicalPath: '/',
                jsonLd: { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'SOIL' },
              } satisfies RouteSeoData,
            },
            component: DummyComponent,
          },
          {
            path: 'impressum',
            title: 'Impressum – SOIL',
            data: {
              seo: {
                description: 'Impressum description',
                canonicalPath: '/impressum',
                robots: 'noindex, nofollow',
              } satisfies RouteSeoData,
            },
            component: DummyComponent,
          },
          {
            path: '**',
            title: 'Seite nicht gefunden (404) – SOIL Online-Planspiel',
            data: {
              seo: {
                description: '404 description',
                robots: 'noindex, nofollow',
              } satisfies RouteSeoData,
            },
            component: DummyComponent,
          },
        ]),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should sync route SEO metadata, canonical link, robots reset, and JSON-LD across navigations', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const meta = TestBed.inject(Meta);

    await router.navigateByUrl('/impressum');
    fixture.detectChanges();

    expect(meta.getTag('name="robots"')?.content).toBe('noindex, nofollow');
    expect(meta.getTag('name="description"')?.content).toBe('Impressum description');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://soil.app/impressum',
    );
    expect(document.head.querySelector('script#soil-jsonld')).toBeNull();

    await router.navigateByUrl('/');
    fixture.detectChanges();

    expect(meta.getTag('name="robots"')?.content).toBe('index, follow');
    expect(meta.getTag('name="description"')?.content).toBe('Landing description');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://soil.app/');
    expect(meta.getTag('property="og:url"')?.content).toBe('https://soil.app/');
    const jsonLdEl = document.head.querySelector('script#soil-jsonld');
    expect(jsonLdEl).not.toBeNull();
    expect(jsonLdEl?.textContent).toContain('SoftwareApplication');

    await router.navigateByUrl('/unknown-404-path');
    fixture.detectChanges();

    expect(meta.getTag('name="robots"')?.content).toBe('noindex, nofollow');
    expect(meta.getTag('name="description"')?.content).toBe('404 description');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(meta.getTag('property="og:url"')).toBeNull();
    expect(document.head.querySelector('script#soil-jsonld')).toBeNull();
  });

  it('should open global feedback modal from footer, emit telemetry, handle errors inline, and show toast on success', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const gameService = TestBed.inject(GameService);
    const telemetry = TestBed.inject(TelemetryService);

    const trackSpy = vi.spyOn(telemetry, 'trackEvent');
    const submitSpy = vi.spyOn(gameService, 'submitFeedback').mockRejectedValueOnce(new Error('Network error'));
    fixture.detectChanges();

    const footerBtn = fixture.nativeElement.querySelector('[data-testid="footer-feedback-btn"]') as HTMLButtonElement;
    expect(footerBtn).toBeTruthy();
    footerBtn.click();
    fixture.detectChanges();

    expect(app.showFeedbackModal).toBe(true);
    expect(trackSpy).toHaveBeenCalledWith('feedback_opened');

    await app.onFeedbackSubmit({ category: 'bug', rating: 3, comment: 'Fehler beim Speichern' });
    fixture.detectChanges();

    expect(app.isSubmittingFeedback).toBe(false);
    expect(app.showFeedbackModal).toBe(true);
    expect(app.feedbackErrorMessage).toContain('konnte nicht gesendet werden');
    expect(trackSpy).not.toHaveBeenCalledWith('feedback_submitted');

    submitSpy.mockResolvedValueOnce(undefined);
    await app.onFeedbackSubmit({ category: 'suggestions', rating: 5, comment: 'Klasse Spiel!' });
    fixture.detectChanges();

    expect(submitSpy).toHaveBeenLastCalledWith({ category: 'suggestions', rating: 5, comment: 'Klasse Spiel!' });
    expect(app.showFeedbackModal).toBe(false);
    expect(app.feedbackErrorMessage).toBeNull();
    expect(app.feedbackSuccessToast).toBe('Vielen Dank für dein Feedback!');
    expect(trackSpy).toHaveBeenCalledWith('feedback_submitted');
    expect(fixture.nativeElement.querySelector('[data-testid="global-feedback-toast"]')).toBeTruthy();
  });
});

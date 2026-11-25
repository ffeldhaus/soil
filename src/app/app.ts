import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, inject, type OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { type ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { FeedbackModal } from './admin/components/feedback-modal/feedback-modal';
import type { RouteSeoData } from './app.routes';
import { GameService } from './game/game.service';
import { SyncService } from './game/sync.service';
import { OfflineService } from './shared/offline.service';
import { TelemetryService } from './shared/telemetry.service';
import type { FeedbackSubmission } from './types';

const SITE_ORIGIN = 'https://soil.app';
const JSON_LD_SCRIPT_ID = 'soil-jsonld';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, FeedbackModal],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {
  protected syncService = inject(SyncService);
  protected offlineService = inject(OfflineService);
  protected gameService = inject(GameService);
  private telemetryService = inject(TelemetryService);
  private router = inject(Router);
  private meta = inject(Meta);
  private titleService = inject(Title);
  private doc = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  protected readonly title = signal('soil');
  version = (import.meta as { env: { APP_VERSION?: string } }).env.APP_VERSION || 'dev';

  showFeedbackModal = false;
  isSubmittingFeedback = false;
  feedbackErrorMessage: string | null = null;
  feedbackSuccessToast: string | null = null;
  private feedbackToastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    console.warn(`SOIL Version ${this.version}`);
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
      this.syncRouteSeo();
      this.telemetryService.trackPageView(this.router.url);
    });
    this.syncRouteSeo();
  }

  ngOnDestroy(): void {
    this.clearFeedbackToastTimer();
  }

  openFeedbackModal(): void {
    this.feedbackErrorMessage = null;
    this.showFeedbackModal = true;
    this.telemetryService.trackEvent('feedback_opened');
    this.cdr.markForCheck();
  }

  closeFeedbackModal(): void {
    this.showFeedbackModal = false;
    this.feedbackErrorMessage = null;
    this.isSubmittingFeedback = false;
    this.cdr.markForCheck();
  }

  async onFeedbackSubmit(payload: FeedbackSubmission): Promise<void> {
    this.isSubmittingFeedback = true;
    this.feedbackErrorMessage = null;
    this.cdr.markForCheck();
    try {
      await this.gameService.submitFeedback(payload);
      this.isSubmittingFeedback = false;
      this.showFeedbackModal = false;
      this.telemetryService.trackEvent('feedback_submitted');
      this.showFeedbackToast('Vielen Dank für dein Feedback!');
    } catch (error) {
      this.isSubmittingFeedback = false;
      console.error('Failed to submit feedback:', error);
      this.feedbackErrorMessage = 'Feedback konnte nicht gesendet werden. Bitte versuche es später erneut.';
    }
    this.cdr.markForCheck();
  }

  dismissFeedbackToast(): void {
    this.clearFeedbackToastTimer();
    this.feedbackSuccessToast = null;
    this.cdr.markForCheck();
  }

  private showFeedbackToast(message: string): void {
    this.clearFeedbackToastTimer();
    this.feedbackSuccessToast = message;
    if (isPlatformBrowser(this.platformId)) {
      this.feedbackToastTimer = setTimeout(() => {
        this.feedbackToastTimer = null;
        this.feedbackSuccessToast = null;
        this.cdr.markForCheck();
      }, 4500);
    }
  }

  private clearFeedbackToastTimer(): void {
    if (this.feedbackToastTimer !== null) {
      clearTimeout(this.feedbackToastTimer);
      this.feedbackToastTimer = null;
    }
  }

  private syncRouteSeo(): void {
    const snapshot = this.getDeepestSnapshot(this.router.routerState?.snapshot?.root);
    const seo = snapshot?.data?.seo as RouteSeoData | undefined;
    if (!seo) {
      return;
    }
    const pageTitle =
      typeof snapshot?.title === 'string' && snapshot.title.length > 0
        ? snapshot.title
        : this.titleService.getTitle() || 'SOIL – Interaktive Landwirtschaftssimulation';
    const canonicalUrl = seo.canonicalPath
      ? `${SITE_ORIGIN}${seo.canonicalPath === '/' ? '/' : seo.canonicalPath}`
      : undefined;

    this.applyMetaTags(pageTitle, seo, canonicalUrl);
    this.updateCanonicalLink(canonicalUrl);
    this.updateJsonLd(seo.jsonLd);
  }

  private getDeepestSnapshot(root?: ActivatedRouteSnapshot): ActivatedRouteSnapshot | undefined {
    let current = root;
    while (current?.firstChild) {
      current = current.firstChild;
    }
    return current;
  }

  private applyMetaTags(pageTitle: string, seo: RouteSeoData, canonicalUrl?: string): void {
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({ name: 'robots', content: seo.robots || 'index, follow' });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    if (canonicalUrl) {
      this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    } else {
      this.meta.removeTag("property='og:url'");
    }
    this.meta.updateTag({ property: 'og:type', content: seo.ogType || 'website' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
  }

  private updateCanonicalLink(canonicalUrl?: string): void {
    const head = this.doc?.head;
    if (!head) {
      return;
    }
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalUrl) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', canonicalUrl);
  }

  private updateJsonLd(jsonLd?: Record<string, unknown> | Record<string, unknown>[]): void {
    const head = this.doc?.head;
    if (!head) {
      return;
    }
    const existing = head.querySelector<HTMLScriptElement>(`script#${JSON_LD_SCRIPT_ID}`);
    if (!jsonLd) {
      existing?.remove();
      return;
    }
    const script = existing || this.doc.createElement('script');
    script.id = JSON_LD_SCRIPT_ID;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    if (!existing) {
      head.appendChild(script);
    }
  }
}

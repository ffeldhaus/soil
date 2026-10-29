import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { type ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import type { RouteSeoData } from './app.routes';
import { GameService } from './game/game.service';
import { SyncService } from './game/sync.service';
import { OfflineService } from './shared/offline.service';

const SITE_ORIGIN = 'https://soil.app';
const JSON_LD_SCRIPT_ID = 'soil-jsonld';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected syncService = inject(SyncService);
  protected offlineService = inject(OfflineService);
  protected gameService = inject(GameService);
  private router = inject(Router);
  private meta = inject(Meta);
  private titleService = inject(Title);
  private doc = inject(DOCUMENT);
  protected readonly title = signal('soil');
  version = (import.meta as { env: { APP_VERSION?: string } }).env.APP_VERSION || 'dev';

  constructor() {
    console.warn(`SOIL Version ${this.version}`);
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
      this.syncRouteSeo();
    });
    this.syncRouteSeo();
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
    const canonicalUrl = `${SITE_ORIGIN}${seo.canonicalPath === '/' ? '/' : seo.canonicalPath}`;

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

  private applyMetaTags(pageTitle: string, seo: RouteSeoData, canonicalUrl: string): void {
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({ name: 'robots', content: seo.robots || 'index, follow' });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:type', content: seo.ogType || 'website' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
  }

  private updateCanonicalLink(canonicalUrl: string): void {
    const head = this.doc?.head;
    if (!head) {
      return;
    }
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
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

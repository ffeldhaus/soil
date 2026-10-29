import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { App } from './app';
import type { RouteSeoData } from './app.routes';

@Component({ standalone: true, template: '<h1>Dummy</h1>' })
class DummyComponent {}

describe('App', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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
    const jsonLdEl = document.head.querySelector('script#soil-jsonld');
    expect(jsonLdEl).not.toBeNull();
    expect(jsonLdEl?.textContent).toContain('SoftwareApplication');
  });
});

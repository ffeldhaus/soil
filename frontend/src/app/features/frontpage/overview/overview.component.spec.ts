import { TestBed, ComponentFixture } from '@angular/core/testing';
import { OverviewComponent } from './overview.component';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { renderApplication, provideServerRendering } from '@angular/platform-server';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { LOCALE_ID, importProvidersFrom, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

// Assuming ngx-translate for i18n based on project structure
import { TranslateLoader, TranslateModule, TranslateService, MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

// Mock MissingTranslationHandler
export class MyMissingTranslationHandler implements MissingTranslationHandler {
  handle(params: MissingTranslationHandlerParams) {
    return `MISSING: ${params.key}`; // Return a distinctive string for missing keys
  }
}

// Mock TranslateLoader for testing
const translationsEn = {
  "overview.title": "Game Overview",
  "overview.description": "Understand how to play and manage the game.",
  "overview.paragraph1": "This game simulates farming decisions and their impacts.",
  "overview.paragraph2": "Players manage parcels, make choices, and see outcomes.",
  "overview.howToPlayTitle": "How to Play",
  "overview.playerInstructions": "Players can join existing games via the",
  "overview.loginButton": "Login page",
  "overview.adminInstructionsPart1": "Game administrators can create new games or manage existing ones after they",
  "overview.registerButton": "Register here",
  "overview.adminInstructionsPart2": "or log in."
};
const translationsDe = {
  "overview.title": "Spielübersicht",
  "overview.description": "Verstehen, wie man das Spiel spielt und verwaltet.",
  "overview.paragraph1": "Dieses Spiel simuliert landwirtschaftliche Entscheidungen und deren Auswirkungen.",
  "overview.paragraph2": "Spieler verwalten Parzellen, treffen Entscheidungen und sehen Ergebnisse.",
  "overview.howToPlayTitle": "Spielanleitung",
  "overview.playerInstructions": "Spieler können bestehenden Spielen beitreten über die",
  "overview.loginButton": "Login-Seite",
  "overview.adminInstructionsPart1": "Spielleiter können neue Spiele erstellen oder bestehende verwalten, nachdem sie sich",
  "overview.registerButton": "Hier registrieren",
  "overview.adminInstructionsPart2": "oder einloggen."
};

class MockTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<Record<string, string>> {
    if (lang === 'de') {
      return of(translationsDe);
    }
    return of(translationsEn);
  }
}

// Test host for routerLinks
@Component({ template: '' })
class DummyComponent {}

const testRoutes: Routes = [
  { path: 'overview', component: OverviewComponent },
  { path: 'login', component: DummyComponent }, // Mock for routerLink target
  { path: 'register', component: DummyComponent } // Mock for routerLink target
];


describe('OverviewComponent', () => {
  let fixture: ComponentFixture<OverviewComponent>;
  let component: OverviewComponent;
  let translateService: TranslateService;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        RouterTestingModule.withRoutes(testRoutes), // Provide routes for routerLink
        MatCardModule,
        MatButtonModule,
        OverviewComponent, // Import standalone component
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: MockTranslateLoader },
          missingTranslationHandler: { provide: MissingTranslationHandler, useClass: MyMissingTranslationHandler },
        })
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // { provide: LOCALE_ID, useValue: 'en' } // Default for client tests
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OverviewComponent);
    component = fixture.componentInstance;
    translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('en');
    translateService.use('en'); // Explicitly set language for each test or in beforeEach
    fixture.detectChanges(); // Initial detection
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title in English', () => {
    expect(compiled.querySelector('[data-testid="overview-title"]')?.textContent).toContain(translationsEn['overview.title']);
  });

  it('should display description in English', () => {
    expect(compiled.querySelector('[data-testid="overview-description"]')?.textContent).toContain(translationsEn['overview.description']);
  });

  it('should display paragraph1 in English', () => {
    expect(compiled.querySelector('[data-testid="overview-paragraph1"]')?.textContent).toContain(translationsEn['overview.paragraph1']);
  });

  it('should display paragraph2 in English', () => {
    expect(compiled.querySelector('[data-testid="overview-paragraph2"]')?.textContent).toContain(translationsEn['overview.paragraph2']);
  });
    
  it('should display howToPlayTitle in English', () => {
    expect(compiled.querySelector('[data-testid="overview-howToPlayTitle"]')?.textContent).toContain(translationsEn['overview.howToPlayTitle']);
  });

  it('should display playerInstructions and login link text in English', () => {
    const playerInstructionsElement = compiled.querySelector('[data-testid="overview-playerInstructions"]');
    expect(playerInstructionsElement?.textContent).toContain(translationsEn['overview.playerInstructions']);
    expect(playerInstructionsElement?.querySelector('a')?.textContent).toContain(translationsEn['overview.loginButton']);
    expect(playerInstructionsElement?.querySelector('a')?.getAttribute('routerLink')).toBe('../login');
  });

  it('should display adminInstructions and register link text in English', () => {
    const adminInstructionsElement = compiled.querySelector('[data-testid="overview-adminInstructions"]');
    expect(adminInstructionsElement?.textContent).toContain(translationsEn['overview.adminInstructionsPart1']);
    expect(adminInstructionsElement?.textContent).toContain(translationsEn['overview.adminInstructionsPart2']);
    expect(adminInstructionsElement?.querySelector('a')?.textContent).toContain(translationsEn['overview.registerButton']);
    expect(adminInstructionsElement?.querySelector('a')?.getAttribute('routerLink')).toBe('../register');
  });

  it('should display title in German when language is switched', () => {
    translateService.use('de');
    fixture.detectChanges();
    expect(compiled.querySelector('[data-testid="overview-title"]')?.textContent).toContain(translationsDe['overview.title']);
    expect(compiled.querySelector('[data-testid="overview-description"]')?.textContent).toContain(translationsDe['overview.description']);
  });
});

describe('OverviewComponent SSR i18n', () => {
  async function renderOverviewComponentForSsr(locale: string): Promise<string> {
    const html = await renderApplication(() => bootstrapApplication(OverviewComponent, {
        providers: [
            provideServerRendering(),
            importProvidersFrom(
              TranslateModule.forRoot({
                loader: { provide: TranslateLoader, useClass: MockTranslateLoader },
                missingTranslationHandler: { provide: MissingTranslationHandler, useClass: MyMissingTranslationHandler },
              }),
              MatCardModule, // Ensure Material modules are available for SSR if they affect rendering
              MatButtonModule
            ),
            { provide: LOCALE_ID, useValue: locale },
            provideRouter(testRoutes), // Provide routes for SSR context as well
            provideHttpClient(),
        ]
    }), {
        document: `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>SSR Test</title></head><body><app-overview></app-overview></body></html>`,
        url: '/overview', // Match a route that renders OverviewComponent
    });
    return html;
  }

  it('should render title and description in German on SSR (LOCALE_ID="de") without placeholders', async () => {
    const html = await renderOverviewComponentForSsr('de');
    expect(html).toContain(translationsDe['overview.title']);
    expect(html).toContain(translationsDe['overview.description']);
    expect(html).not.toContain('MISSING:');
    expect(html).not.toContain('overview.title'); // Check against raw key
  });

  it('should render title and description in English on SSR (LOCALE_ID="en") without placeholders', async () => {
    const html = await renderOverviewComponentForSsr('en');
    expect(html).toContain(translationsEn['overview.title']);
    expect(html).toContain(translationsEn['overview.description']);
    expect(html).not.toContain('MISSING:');
    expect(html).not.toContain('overview.title'); // Check against raw key
  });

  it('should render paragraph1 in German on SSR (LOCALE_ID="de")', async () => {
    const html = await renderOverviewComponentForSsr('de');
    expect(html).toContain(translationsDe['overview.paragraph1']);
    expect(html).not.toContain('MISSING:');
  });
  
  it('should render login button text in German on SSR (LOCALE_ID="de")', async () => {
    const html = await renderOverviewComponentForSsr('de');
    // This tests if the text within the link is translated
    expect(html).toContain(translationsDe['overview.loginButton']);
    expect(html).not.toContain('MISSING:');
  });

  it('should render register button text in German on SSR (LOCALE_ID="de")', async () => {
    const html = await renderOverviewComponentForSsr('de');
    expect(html).toContain(translationsDe['overview.registerButton']);
    expect(html).not.toContain('MISSING:');
  });
});
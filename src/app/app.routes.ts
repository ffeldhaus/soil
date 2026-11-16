/**
 * @fileoverview Canonical client/SSR route table and single source of truth for per-route SEO metadata,
 * `robots` directives, Schema.org JSON-LD graphs, and shared classroom FAQ copy (`INFO_FAQ_ITEMS`).
 *
 * Key invariants:
 * - Root `title` and `description` must match `src/index.html` and `public/site.webmanifest` (enforced by
 *   `seo-consistency.spec.ts`), and every indexable `canonicalPath` must appear in `sitemap.xml` and `robots.txt`.
 * - `/admin` and `/game` intentionally omit `canActivate` guards to support account-free local guest single-player;
 *   all multiplayer and super-admin operations are enforced server-side via Callable Cloud Functions.
 */

import type { Route, Routes } from '@angular/router';

export interface RouteSeoData {
  description: string;
  canonicalPath?: string;
  robots?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export interface InfoFaqItem {
  question: string;
  answer: string;
}

const CC_BY_LICENSE = 'https://creativecommons.org/licenses/by/4.0/';

const SOIL_CREATORS = [
  {
    '@type': 'Person',
    name: 'Dr. Nina Wolf',
  },
  {
    '@type': 'Person',
    name: 'Florian Feldhaus',
  },
];

const SOIL_WEBSITE = {
  '@type': 'WebSite',
  '@id': 'https://soil.app/#website',
  name: 'SOIL',
  url: 'https://soil.app/',
  inLanguage: 'de',
};

export const INFO_FAQ_ITEMS: readonly InfoFaqItem[] = [
  {
    question: 'Für welche Fächer und Bildungsstufen eignet sich das Planspiel SOIL?',
    answer:
      'SOIL eignet sich für weiterführende Schulen in allen 16 Bundesländern sowie für berufliche Schulen, die Hochschul- und Lehramtsausbildung und die außerschulische Bildungsarbeit. Das Planspiel passt besonders in den Fachunterricht in Geographie und Erdkunde, Biologie und Naturwissenschaften sowie Wirtschaft und Politik und lässt sich flexibel an Projekttagen zur Bildung für nachhaltige Entwicklung (BNE) einsetzen.',
  },
  {
    question: 'Wie unterscheiden sich die drei Schwierigkeitsgrade Einsteiger, Standard und Profi?',
    answer:
      'Die drei Stufen lassen sich unabhängig von der Jahrgangsstufe frei nach Vorwissen und Unterrichtsziel wählen: Die Stufe Einsteiger startet mit einheitlichen Bodenwerten von 100, verlässlicher Wettervorhersage und 0 % Überziehungszins. Die Stufe Standard ergänzt fünf unterschiedliche Boden-Zonen, saisonale Wettertrends, 6 % Überziehungszins und regionale Förderverträge. Die Stufe Profi fordert mit stark heterogenen Böden, zunehmendem Klimastress, 10 % Überziehungszins und einer Insolvenzgrenze ab -50.000 €.',
  },
  {
    question: 'Wie läuft eine Einzelstunde oder Doppelstunde im Unterricht praktisch ab?',
    answer:
      'Nach einer kurzen Einführung über die integrierte Spieltour starten die Lernenden ohne Registrierung im Einzelspieler-Modus oder treten per vierstelliger Team-PIN einer gemeinsamen Klassenrunde bei. Anschließend bewirtschaften sie ihren Hof allein oder in Kleingruppen über eine flexibel einstellbare Rundenanzahl (5 bis 20 Wirtschaftsjahre, typischerweise 30 bis 50 Minuten) mit einer kurzen Zwischenbilanz zur Spielmitte. Zum Abschluss werden die Rangliste für den zukunftsfähigen Hof sowie die Boden- und Kapitalverläufe gemeinsam ausgewertet.',
  },
  {
    question: 'Welche Themen aus BNE, Biologie, Geographie und Wirtschaft werden konkret simuliert?',
    answer:
      'Biologisch und ökologisch modelliert SOIL den Humusaufbau, den Nährstoffhaushalt, die Stickstofffixierung durch Leguminosen sowie die natürliche Regulierung von Schaderregern durch vielfältige Fruchtfolgen. Geographisch und wirtschaftlich stehen Standortfaktoren, Ertragsrisiken durch Extremwetter, reale Deckungsbeiträge nach KTBL sowie EU-Agrarförderungen und Öko-Regelungen im Mittelpunkt. So erleben die Lernenden unmittelbar, wie kurzfristige Gewinnmaximierung zur Bodendegradation führt und warum ökologische Pflege die Basis für dauerhaften wirtschaftlichen Erfolg bildet.',
  },
  {
    question: 'Ist SOIL kostenlos, werbefrei und DSGVO-konform ohne Schüler-Accounts nutzbar?',
    answer:
      'Ja, SOIL ist als freie Bildungsressource dauerhaft kostenlos, werbefrei und direkt im Browser sowie als App auf Tablets, Laptops und interaktiven Tafeln spielbar. Schülerinnen und Schüler benötigen kein Benutzerkonto und geben weder Namen noch E-Mail-Adressen ein. Einzelspieler-Runden laufen lokal auf dem Endgerät, während Mehrspieler-Klassenrunden über anonyme vierstellige Team-PINs auf europäischen Servern abgewickelt werden.',
  },
];

function createAuthActionRoute(path: string): Route {
  return {
    path,
    title: 'Konto-Aktion bestätigen – SOIL Online-Planspiel',
    data: {
      seo: {
        description:
          'Bestätigung von E-Mail-Verifizierungen, Passwort-Zurücksetzungen und Konto-Aktionen für Lehrkräfte im Online-Planspiel SOIL (https://soil.app).',
        canonicalPath: '/auth/action',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./auth/auth-action/auth-action').then((m) => m.AuthActionComponent),
  };
}

export const routes: Routes = [
  {
    path: '',
    title: 'SOIL: Online-Planspiel & Simulation für BNE im Unterricht',
    data: {
      seo: {
        description:
          'Kostenloses Online-Planspiel und interaktive Simulation für BNE, Biologie, Geographie und Wirtschaft (Klasse 5–13): Bewirtschafte online einen Bauernhof.',
        canonicalPath: '/',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            SOIL_WEBSITE,
            {
              '@type': 'SoftwareApplication',
              name: 'SOIL',
              alternateName: [
                'SOIL Planspiel BNE',
                'SOIL Online-Planspiel Landwirtschaft',
                'SOIL Landwirtschaftssimulation',
                'SOIL Simulation BNE',
              ],
              url: 'https://soil.app/',
              inLanguage: 'de',
              isAccessibleForFree: true,
              license: CC_BY_LICENSE,
              creator: SOIL_CREATORS,
              applicationCategory: ['EducationalApplication', 'GameApplication', 'Simulation'],
              operatingSystem: 'Web, iOS, Android',
              keywords:
                'Planspiel BNE, Planspiel BNE online, Online-Planspiel, Simulation, Landwirtschaftssimulation, Bildung für nachhaltige Entwicklung, BNE, Biologie, Geographie, Wirtschaft, Unterricht, Fruchtfolge, Bodenqualität',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'EUR',
              },
            },
            {
              '@type': 'LearningResource',
              name: 'SOIL – Online-Planspiel & Interaktive Landwirtschaftssimulation für BNE',
              alternateName: [
                'Planspiel BNE online',
                'SOIL Planspiel Landwirtschaft',
                'SOIL Simulation für den Unterricht',
              ],
              url: 'https://soil.app/',
              inLanguage: 'de',
              isAccessibleForFree: true,
              license: CC_BY_LICENSE,
              creator: SOIL_CREATORS,
              learningResourceType: ['Planspiel', 'Simulation', 'Educational Game'],
              educationalUse: ['Planspiel', 'Simulation', 'Unterricht', 'Projekttag BNE'],
              educationalLevel: ['Sekundarstufe I', 'Sekundarstufe II', 'Berufliche Bildung', 'Hochschule'],
              keywords:
                'Planspiel BNE, Planspiel BNE online, Online-Planspiel, Simulation, Landwirtschaftssimulation, Bildung für nachhaltige Entwicklung, Biologie, Geographie, Erdkunde, Wirtschaft',
              teaches: [
                'Bildung für nachhaltige Entwicklung (BNE)',
                'Nachhaltige Landwirtschaft',
                'Bodenqualität und Fruchtfolge',
                'Agrarökonomie',
              ],
            },
          ],
        },
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./landing/landing').then((m) => m.Landing),
  },
  {
    path: 'trailer',
    title: 'Trailer – SOIL Online-Planspiel & Simulation für BNE',
    data: {
      seo: {
        description:
          'Einminütiger Video-Trailer zum kostenlosen Online-Planspiel und der interaktiven Landwirtschaftssimulation SOIL für BNE, Biologie, Geographie und Wirtschaft.',
        canonicalPath: '/trailer',
        ogType: 'video.other',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: 'SOIL – Online-Planspiel & Interaktive Simulation über Landwirtschaft, Ökonomie und Nachhaltigkeit (BNE)',
          description:
            'Einminütiger Überblick über das kostenlose Online-Planspiel und die interaktive Landwirtschaftssimulation SOIL für BNE, Biologie, Geographie und Wirtschaft.',
          url: 'https://soil.app/trailer',
          thumbnailUrl: 'https://soil.app/SOIL-screenshot.png',
          uploadDate: '2026-10-30T14:00:00+01:00',
          duration: 'PT1M5S',
          contentUrl: 'https://soil.app/assets/video/soil-trailer.mp4',
          inLanguage: 'de',
          license: CC_BY_LICENSE,
        },
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./trailer/trailer').then((m) => m.Trailer),
  },
  {
    path: 'game',
    title: 'Spielbrett – SOIL Online-Planspiel & Simulation',
    data: {
      seo: {
        description:
          'Interaktives Spielbrett des Online-Planspiels und der Landwirtschaftssimulation SOIL für Fruchtfolge, Bodenqualität, Nährstoffe und Betriebswirtschaft.',
        canonicalPath: '/game',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./game/board/board').then((m) => m.Board),
  },
  {
    path: 'admin/login',
    title: 'Lehrkräfte-Anmeldung – SOIL Online-Planspiel',
    data: {
      seo: {
        description:
          'Anmeldung für Lehrkräfte und Spielleitungen bei SOIL zur Erstellung und Verwaltung von Multiplayer-Klassenrunden für den BNE- und Fachunterricht.',
        canonicalPath: '/admin/login',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./auth/admin-login/admin-login').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'admin/register',
    title: 'Lehrkräfte-Registrierung – SOIL Online-Planspiel',
    data: {
      seo: {
        description:
          'Kostenlose Registrierung für Lehrkräfte und Bildungseinrichtungen bei SOIL, um eigene Multiplayer-Klassenrunden mit Team-PINs im Unterricht zu leiten.',
        canonicalPath: '/admin/register',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./auth/admin-register/admin-register').then((m) => m.AdminRegisterComponent),
  },
  {
    path: 'admin/super',
    title: 'Systemverwaltung & Super-Admin – SOIL',
    data: {
      seo: {
        description:
          'Systemverwaltung und Super-Admin-Bereich für SOIL zur Freischaltung verifizierter Lehrkräfte-Konten sowie zur Auswertung von Spielen und Feedback.',
        canonicalPath: '/admin/super',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./admin/super-admin/super-admin').then((m) => m.SuperAdminComponent),
  },
  {
    path: 'admin',
    title: 'Spiele erstellen & verwalten – SOIL Online-Planspiel',
    data: {
      seo: {
        description:
          'Starte sofort ein Einzelspieler-Spiel gegen KI-Betriebe oder erstelle und verwalte Multiplayer-Runden von SOIL für Schulklassen und Seminare.',
        canonicalPath: '/admin',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./admin/dashboard/dashboard').then((m) => m.Dashboard),
  },
  createAuthActionRoute('auth/action'),
  createAuthActionRoute('_/auth/action'),
  createAuthActionRoute('__/auth/action'),
  {
    path: 'game-login',
    title: 'Spiel-Login mit Team-PIN – SOIL Online-Planspiel',
    data: {
      seo: {
        description:
          'Tritt einer laufenden SOIL-Klassenrunde im Unterricht direkt per Spiel-ID und vierstelliger Team-PIN bei – komplett ohne eigenes Schüler-Konto.',
        canonicalPath: '/game-login',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./auth/player-login/player-login').then((m) => m.PlayerLoginComponent),
  },
  {
    path: 'impressum',
    title: 'Impressum & Kontakt – SOIL Online-Planspiel',
    data: {
      seo: {
        description:
          'Impressum, Anbieterkennzeichnung und rechtliche Angaben zum kostenlosen Online-Planspiel und der Landwirtschaftssimulation SOIL (https://soil.app).',
        canonicalPath: '/impressum',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./impressum/impressum').then((m) => m.ImpressumComponent),
  },
  {
    path: 'privacy',
    title: 'Datenschutzerklärung – SOIL Online-Planspiel',
    data: {
      seo: {
        description:
          'Datenschutzerklärung und Informationen zur DSGVO-konformen, anonymen Datenverarbeitung ohne Schüler-Accounts im Online-Planspiel SOIL (soil.app).',
        canonicalPath: '/privacy',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./privacy/privacy').then((m) => m.PrivacyPolicyComponent),
  },
  {
    path: 'manual',
    title: 'Handbuch & Spielanleitung – SOIL Online-Planspiel',
    data: {
      seo: {
        description:
          'Spielanleitung zum Online-Planspiel SOIL: Kulturen, Fruchtfolge, Bodenqualität, Nährstoffe, Bio-Siegel, Regionalverträge und 3 Schwierigkeitsgrade.',
        canonicalPath: '/manual',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          name: 'SOIL Handbuch & Spielanleitung (Online-Planspiel & Simulation für BNE)',
          url: 'https://soil.app/manual',
          inLanguage: 'de',
          isAccessibleForFree: true,
          license: CC_BY_LICENSE,
          creator: SOIL_CREATORS,
          isPartOf: SOIL_WEBSITE,
        },
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./manual/manual').then((m) => m.ManualComponent),
  },
  {
    path: 'info',
    title: 'SOIL: Planspiel BNE im Unterricht, Lehrplan & Didaktik',
    data: {
      seo: {
        description:
          'Einsatz des Online-Planspiels SOIL im Unterricht (alle 16 Bundesländer) für BNE, Biologie, Geographie und Wirtschaft: Lehrplanbezug, Didaktik & FAQ.',
        canonicalPath: '/info',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'AboutPage',
              name: 'Planspiel BNE im Unterricht: Lehrplanbezug, Didaktik & Wissenschaftlicher Hintergrund – SOIL',
              url: 'https://soil.app/info',
              inLanguage: 'de',
              isAccessibleForFree: true,
              license: CC_BY_LICENSE,
              creator: SOIL_CREATORS,
            },
            {
              '@type': 'FAQPage',
              url: 'https://soil.app/info#faq',
              inLanguage: 'de',
              mainEntity: INFO_FAQ_ITEMS.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: item.answer,
                },
              })),
            },
          ],
        },
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./info/info').then((m) => m.InfoComponent),
  },
  {
    path: 'research',
    title: 'Offene Forschungsdaten & Spielverläufe – SOIL Simulation',
    data: {
      seo: {
        description:
          'Öffentlicher Forschungsdatensatz anonymisierter SOIL-Simulationsspiele mit REST/CSV-API und MCP-Server für Bildungsforschung, BNE und Agrarökonomie.',
        canonicalPath: '/research',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          name: 'SOIL Open Educational Simulation Dataset',
          description:
            'Anonymisierte Runden- und Parzellenverläufe aus dem Bildungsspiel SOIL zur Untersuchung von Entscheidungsverhalten in nachhaltiger Landwirtschaft.',
          url: 'https://soil.app/research',
          inLanguage: 'de',
          isAccessibleForFree: true,
          license: CC_BY_LICENSE,
          creator: SOIL_CREATORS,
          distribution: [
            {
              '@type': 'DataDownload',
              encodingFormat: 'application/json',
              contentUrl: 'https://soil.app/api/research',
            },
            {
              '@type': 'DataDownload',
              encodingFormat: 'text/csv',
              contentUrl: 'https://soil.app/api/research?format=csv',
            },
          ],
        },
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./research/research').then((m) => m.ResearchComponent),
  },
  {
    path: 'delete-account',
    title: 'Konto & Spieldaten löschen – SOIL Online-Planspiel',
    data: {
      seo: {
        description:
          'Lehrkräfte-Konto und lokal gespeicherte Spieldaten im Online-Planspiel und der Landwirtschaftssimulation SOIL (https://soil.app) dauerhaft löschen.',
        canonicalPath: '/delete-account',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./auth/delete-account/delete-account').then((m) => m.DeleteAccountComponent),
  },
  {
    path: '**',
    title: 'Seite nicht gefunden (404) – SOIL Online-Planspiel',
    data: {
      seo: {
        description:
          'Die angeforderte Seite wurde im Online-Planspiel SOIL nicht gefunden. Kehre zur Startseite zurück, um ein lokales oder Mehrspieler-Spiel zu starten.',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./not-found/not-found').then((m) => m.NotFoundComponent),
  },
];

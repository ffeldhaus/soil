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
    question: 'Für welche Schulfächer eignet sich SOIL als Unterrichtsmaterial?',
    answer:
      'Als kostenloses digitales Unterrichtsmaterial (OER) deckt SOIL zentrale Lehrplanthemen mehrerer Fächer ab: In Biologie stehen Ökosystem Boden, Humusaufbau, Nährstoffkreisläufe, Stickstofffixierung durch Leguminosen, Biodiversität und integrierter Pflanzenschutz im Fokus. In Erdkunde, Geografie bzw. Geographie behandelt das Planspiel den landwirtschaftlichen Strukturwandel, konventionellen vs. ökologischen Landbau, Standortfaktoren, Klimafolgen und Bodendegradation. Im Fach Wirtschaft und Politik erleben Lernende Betriebswirtschaft, Marktpreise, Deckungsbeiträge, EU-Subventionen sowie ökonomisch-ökologische Zielkonflikte – und verknüpfen alle Perspektiven fächerübergreifend im Sinne der Bildung für nachhaltige Entwicklung (BNE).',
  },
  {
    question: 'Für welche Schulformen und Bildungseinrichtungen ist SOIL konzipiert?',
    answer:
      'SOIL eignet sich für weiterführende Schulen in allen 16 Bundesländern sowie für Berufsschulen, die Hochschul- und Lehramtsausbildung und die außerschulische Bildungsarbeit. Über die frei wählbaren Schwierigkeitsgrade und Rundenzahlen lässt sich der Anspruch flexibel an Lerngruppe, Vorwissen und Unterrichtsziel anpassen.',
  },
  {
    question: 'Wie unterscheiden sich die drei Schwierigkeitsgrade Einsteiger, Standard und Profi?',
    answer:
      'Die drei Stufen lassen sich frei nach Vorwissen und Unterrichtsziel wählen: Die Stufe Einsteiger startet mit einheitlichen Bodenwerten von 100, verlässlicher Wettervorhersage und 0 % Überziehungszins. Die Stufe Standard ergänzt fünf unterschiedliche Boden-Zonen, saisonale Wettertrends, 6 % Überziehungszins und regionale Förderverträge. Die Stufe Profi fordert mit stark heterogenen Böden, zunehmendem Klimastress, 10 % Überziehungszins und einer Insolvenzgrenze ab -50.000 €.',
  },
  {
    question: 'Wie läuft eine Einzelstunde oder Doppelstunde im Unterricht praktisch ab?',
    answer:
      'Nach einer kurzen Einführung über die integrierte Spieltour starten die Lernenden ohne Registrierung im Einzelspieler-Modus oder treten per vierstelliger Team-PIN einer gemeinsamen Klassenrunde bei. Anschließend bewirtschaften sie ihren Hof allein oder in Kleingruppen über mehrere Runden bzw. Wirtschaftsjahre (flexibel einstellbar, typischerweise 30 bis 50 Minuten) mit einer kurzen Zwischenbilanz zur Spielmitte. Zum Abschluss werden die Rangliste für den zukunftsfähigen Hof sowie die Boden- und Kapitalverläufe gemeinsam ausgewertet.',
  },
  {
    question: 'Ist SOIL kostenlos, werbefrei und DSGVO-konform ohne Schüler-Accounts nutzbar?',
    answer:
      'Ja, SOIL ist als freie Bildungsressource (Open Educational Resource, CC BY 4.0) dauerhaft kostenlos, werbefrei und direkt im Browser sowie als App auf Tablets, Laptops und interaktiven Tafeln spielbar. Schülerinnen und Schüler benötigen kein Benutzerkonto und geben weder Namen noch E-Mail-Adressen ein. Einzelspieler-Runden laufen lokal auf dem Endgerät, während Mehrspieler-Klassenrunden über anonyme vierstellige Team-PINs auf europäischen Servern abgewickelt werden.',
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
    title: 'SOIL: Planspiel & Unterrichtsmaterial zu Landwirtschaft/BNE',
    data: {
      seo: {
        description:
          'Kostenloses Unterrichtsmaterial (OER) & Online-Planspiel zu Landwirtschaft und Bodenfruchtbarkeit für Biologie, Erdkunde, Geografie, Wirtschaft & BNE.',
        canonicalPath: '/',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            SOIL_WEBSITE,
            {
              '@type': 'SoftwareApplication',
              name: 'SOIL',
              alternateName: [
                'SOIL Unterrichtsmaterial',
                'SOIL Planspiel BNE',
                'SOIL Online-Planspiel Landwirtschaft',
                'SOIL Landwirtschaftssimulation',
              ],
              url: 'https://soil.app/',
              inLanguage: 'de',
              isAccessibleForFree: true,
              license: CC_BY_LICENSE,
              creator: SOIL_CREATORS,
              applicationCategory: ['EducationalApplication', 'GameApplication', 'Simulation'],
              operatingSystem: 'Web, iOS, Android',
              keywords:
                'Unterrichtsmaterial Biologie, Unterrichtsmaterial Erdkunde, Unterrichtsmaterial Geografie, Unterrichtsmaterial Geographie, Unterrichtsmaterial Wirtschaft, OER Unterrichtsmaterial, Planspiel BNE, Planspiel Landwirtschaft, Bodenfruchtbarkeit, Online-Planspiel, Landwirtschaftssimulation, Bildung für nachhaltige Entwicklung',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'EUR',
              },
            },
            {
              '@type': 'LearningResource',
              name: 'SOIL – Kostenloses Planspiel & Unterrichtsmaterial für Biologie, Erdkunde/Geografie & Wirtschaft (BNE)',
              alternateName: [
                'SOIL Unterrichtsmaterial Biologie, Erdkunde/Geografie & Wirtschaft',
                'Planspiel BNE online',
                'SOIL Planspiel Landwirtschaft',
                'SOIL OER Unterrichtsmaterial',
              ],
              url: 'https://soil.app/',
              inLanguage: 'de',
              isAccessibleForFree: true,
              license: CC_BY_LICENSE,
              creator: SOIL_CREATORS,
              learningResourceType: [
                'Simulation',
                'Educational Game',
                'Planspiel',
                'Unterrichtsmaterial',
                'Open Educational Resource (OER)',
              ],
              educationalUse: ['Unterricht', 'Gruppenarbeit', 'Einzelarbeit', 'Projekttag'],
              educationalLevel: [
                'Weiterführende Schulen',
                'Sekundarstufe I',
                'Sekundarstufe II',
                'Berufliche Bildung',
                'Hochschule',
              ],
              keywords: [
                'Unterrichtsmaterial Biologie',
                'Unterrichtsmaterial Erdkunde',
                'Unterrichtsmaterial Geografie',
                'Unterrichtsmaterial Geographie',
                'Unterrichtsmaterial Wirtschaft',
                'Planspiel BNE',
                'Planspiel Landwirtschaft',
                'Bodenfruchtbarkeit',
                'OER Unterrichtsmaterial',
              ],
              about: [
                'Biologie',
                'Erdkunde',
                'Geografie',
                'Geographie',
                'Wirtschaft',
                'Politik und Wirtschaft',
                'Bildung für nachhaltige Entwicklung (BNE)',
              ],
              teaches: [
                'Ökosystem Boden, Humusaufbau und Nährstoffkreisläufe (Biologie)',
                'Nachhaltige Landwirtschaft, Bodendegradation und Klimafolgen (Erdkunde / Geografie / Geographie)',
                'Agrarökonomie, Marktpreise, Subventionen und Zielkonflikte (Wirtschaft / Politik und Wirtschaft)',
                'Bildung für nachhaltige Entwicklung (BNE)',
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
    title: 'Video-Trailer – Planspiel & Unterrichtsmaterial SOIL (BNE)',
    data: {
      seo: {
        description:
          'Einminütiger Video-Trailer zum kostenlosen Online-Planspiel und OER-Unterrichtsmaterial SOIL für Biologie, Erdkunde / Geografie, Wirtschaft und BNE.',
        canonicalPath: '/trailer',
        ogType: 'video.other',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: 'SOIL – Online-Planspiel & Unterrichtsmaterial zu Landwirtschaft, Ökonomie und Nachhaltigkeit (BNE)',
          description:
            'Einminütiger Überblick über das kostenlose Online-Planspiel und OER-Unterrichtsmaterial SOIL für Biologie, Erdkunde / Geografie, Wirtschaft und BNE.',
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
          'Starte im Browser sofort ein Einzelspieler-Spiel gegen KI-Betriebe oder erstelle und verwalte Multiplayer-Klassenrunden von SOIL für Unterricht & Seminare.',
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
          'Begleitendes Handbuch & Unterrichtsmaterial zum Planspiel SOIL: Kulturen, Fruchtfolge, Bodenfruchtbarkeit, Nährstoffe, Bio-Siegel und Regionalverträge.',
        canonicalPath: '/manual',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          name: 'SOIL Handbuch, Spielanleitung & Begleitendes Unterrichtsmaterial (Online-Planspiel für BNE)',
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
    title: 'Unterrichtsmaterial Biologie, Erdkunde & Wirtschaft – SOIL',
    data: {
      seo: {
        description:
          'Kostenloses OER-Unterrichtsmaterial zum Planspiel SOIL: Lehrplanbezug aller 16 Bundesländer für Biologie, Erdkunde, Geografie, Wirtschaft, BNE und FAQ.',
        canonicalPath: '/info',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'AboutPage',
              name: 'Unterrichtsmaterial & Lehrplanbezug (Biologie, Erdkunde/Geografie, Wirtschaft, BNE) – SOIL',
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

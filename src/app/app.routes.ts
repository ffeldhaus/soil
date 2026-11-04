import type { Routes } from '@angular/router';

export interface RouteSeoData {
  description: string;
  canonicalPath: string;
  robots?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const baseRoutes: Routes = [
  {
    path: '',
    title: 'SOIL – Online-Planspiel & Simulation für BNE, Landwirtschaft & Nachhaltigkeit im Unterricht',
    data: {
      seo: {
        description:
          'SOIL ist ein kostenloses Online-Planspiel und eine interaktive Simulation für Bildung für nachhaltige Entwicklung (BNE), Biologie, Geographie und Wirtschaft. Lernende ab Klasse 5–13 steuern über zehn Runden online im Browser Fruchtfolge, Bodenqualität und Finanzen eines Bauernhofs.',
        canonicalPath: '/',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
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
              applicationCategory: ['EducationalApplication', 'GameApplication', 'Simulation'],
              operatingSystem: 'Web',
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
              learningResourceType: ['Planspiel', 'Simulation', 'Educational Game'],
              educationalUse: ['Planspiel', 'Simulation', 'Unterricht', 'Projekttag BNE'],
              keywords:
                'Planspiel BNE, Planspiel BNE online, Online-Planspiel, Simulation, Landwirtschaftssimulation, Bildung für nachhaltige Entwicklung, Biologie, Geographie, Erdkunde, Wirtschaft',
              teaches: [
                'Bildung für nachhaltige Entwicklung (BNE)',
                'Nachhaltige Landwirtschaft',
                'Bodenqualität und Fruchtfolge',
                'Agrarökonomie',
              ],
            },
            {
              '@type': 'VideoObject',
              name: 'SOIL – Online-Planspiel & Interaktive Simulation über Landwirtschaft, Ökonomie und Nachhaltigkeit (BNE)',
              description:
                'Einminütiger Überblick über das kostenlose Online-Planspiel und die interaktive Landwirtschaftssimulation SOIL für BNE, Biologie, Geographie und Wirtschaft.',
              thumbnailUrl: 'https://soil.app/SOIL-screenshot.png',
              uploadDate: '2026-10-30T14:00:00+01:00',
              duration: 'PT1M5S',
              contentUrl: 'https://soil.app/assets/video/soil-trailer.mp4',
              embedUrl: 'https://www.youtube.com/embed/xCmZUGcyVLM',
              inLanguage: 'de-DE',
            },
          ],
        },
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./landing/landing').then((m) => m.Landing),
  },
  {
    path: 'game',
    title: 'Spielbrett – SOIL',
    data: {
      seo: {
        description: 'Interaktives Spielbrett der SOIL Landwirtschaftssimulation.',
        canonicalPath: '/game',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./game/board/board').then((m) => m.Board),
  },
  {
    path: 'admin/login',
    title: 'Lehrkräfte-Anmeldung – SOIL',
    data: {
      seo: {
        description: 'Anmeldung für Lehrkräfte und Spielleitungen bei SOIL.',
        canonicalPath: '/admin/login',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./auth/admin-login/admin-login').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'admin/register',
    title: 'Lehrkräfte-Registrierung – SOIL',
    data: {
      seo: {
        description: 'Kostenlose Registrierung für Lehrkräfte und Bildungseinrichtungen bei SOIL.',
        canonicalPath: '/admin/register',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./auth/admin-register/admin-register').then((m) => m.AdminRegisterComponent),
  },
  {
    path: 'admin/super',
    title: 'Super-Admin – SOIL',
    data: {
      seo: {
        description: 'Systemverwaltung für SOIL.',
        canonicalPath: '/admin/super',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./admin/super-admin/super-admin').then((m) => m.SuperAdminComponent),
  },
  {
    path: 'admin',
    title: 'Spiele erstellen & verwalten – SOIL Landwirtschaftssimulation',
    data: {
      seo: {
        description:
          'Starte sofort ein Einzelspieler-Spiel gegen KI-Betriebe oder erstelle und verwalte Multiplayer-Runden von SOIL für Schulklassen und Seminare.',
        canonicalPath: '/admin',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./admin/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'auth/action',
    title: 'Konto-Aktion – SOIL',
    data: {
      seo: {
        description: 'Bestätigung von Konto-Aktionen bei SOIL.',
        canonicalPath: '/auth/action',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./auth/auth-action/auth-action').then((m) => m.AuthActionComponent),
  },
  {
    path: '_/auth/action',
    title: 'Konto-Aktion – SOIL',
    data: {
      seo: {
        description: 'Bestätigung von Konto-Aktionen bei SOIL.',
        canonicalPath: '/auth/action',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./auth/auth-action/auth-action').then((m) => m.AuthActionComponent),
  },
  {
    path: '__/auth/action',
    title: 'Konto-Aktion – SOIL',
    data: {
      seo: {
        description: 'Bestätigung von Konto-Aktionen bei SOIL.',
        canonicalPath: '/auth/action',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./auth/auth-action/auth-action').then((m) => m.AuthActionComponent),
  },
  {
    path: 'game-login',
    title: 'Spiel-Login mit PIN – SOIL',
    data: {
      seo: {
        description: 'Tritt einer laufenden SOIL-Spielrunde per Spiel-ID und PIN bei.',
        canonicalPath: '/game-login',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./auth/player-login/player-login').then((m) => m.PlayerLoginComponent),
  },
  {
    path: 'impressum',
    title: 'Impressum – SOIL',
    data: {
      seo: {
        description: 'Impressum und rechtliche Angaben zu SOIL (soil.app).',
        canonicalPath: '/impressum',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./impressum/impressum').then((m) => m.ImpressumComponent),
  },
  {
    path: 'privacy',
    title: 'Datenschutzerklärung – SOIL',
    data: {
      seo: {
        description:
          'Datenschutzerklärung und Informationen zur DSGVO-konformen Datenverarbeitung bei SOIL (soil.app).',
        canonicalPath: '/privacy',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./privacy/privacy').then((m) => m.PrivacyPolicyComponent),
  },
  {
    path: 'manual',
    title: 'Handbuch & Spielanleitung – SOIL Online-Planspiel & Landwirtschaftssimulation',
    data: {
      seo: {
        description:
          'Vollständiges Handbuch zum Online-Planspiel und zur Landwirtschaftssimulation SOIL: Spielmechanik, Kulturen, Fruchtfolge, Humus- und Nährstoffdynamik, Bio-Zertifizierung, regionale Lieferverträge und Schwierigkeitsgrade für den BNE-Unterricht.',
        canonicalPath: '/manual',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          name: 'SOIL Handbuch & Spielanleitung (Online-Planspiel & Simulation für BNE)',
          url: 'https://soil.app/manual',
          inLanguage: 'de',
          isPartOf: {
            '@type': 'WebSite',
            name: 'SOIL',
            url: 'https://soil.app/',
          },
        },
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./manual/manual').then((m) => m.ManualComponent),
  },
  {
    path: 'info',
    title: 'Planspiel BNE im Unterricht: Lehrplanbezug, Didaktik & Wissenschaft – SOIL Simulation',
    data: {
      seo: {
        description:
          'Kostenloses Online-Planspiel und Simulation für BNE im Unterricht der Klassen 5 bis 13 in allen 16 Bundesländern (Biologie, Geographie / Erdkunde, Wirtschaft), FAQ für Lehrkräfte, Dissertation von Dr. Nina Wolf an der TU Dortmund sowie KTBL- und BMEL-Datenquellen.',
        canonicalPath: '/info',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'AboutPage',
              name: 'Planspiel BNE im Unterricht: Lehrplanbezug, Didaktik & Wissenschaftlicher Hintergrund – SOIL',
              url: 'https://soil.app/info',
              inLanguage: 'de',
            },
            {
              '@type': 'FAQPage',
              url: 'https://soil.app/info#faq',
              inLanguage: 'de',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'Für welche Fächer und Klassenstufen eignet sich das Planspiel SOIL?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'SOIL ist für die Klassenstufen 5 bis 13 in allen 16 Bundesländern konzipiert. Das Planspiel eignet sich besonders für den Fachunterricht in Geographie und Erdkunde, Biologie und Naturwissenschaften sowie Wirtschaft und Politik. Darüber hinaus lässt es sich flexibel an Projekttagen zur Bildung für nachhaltige Entwicklung einsetzen.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Wie unterscheiden sich die drei Schwierigkeitsgrade für Unter-, Mittel- und Oberstufe?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Die Stufe Einsteiger für die Klassen 5 und 6 startet mit einheitlichen Bodenwerten von 100, verlässlicher Wettervorhersage und 0% Überziehungszins. Die Stufe Standard für die Klassen 7 bis 10 ergänzt fünf unterschiedliche Boden-Zonen, saisonale Wettertrends, 6% Überziehungszins und regionale Förderverträge. Die Stufe Profi für die Oberstufe fordert Lernende mit stark heterogenen Böden, zunehmendem Klimastress, 10% Überziehungszins und einer Insolvenzgrenze ab -50.000 €.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Wie läuft eine Einzelstunde oder Doppelstunde im Unterricht praktisch ab?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Nach einer zehnminütigen Einführung über die integrierte Spieltour starten die Lernenden ohne Registrierung im Einzelspieler-Modus oder treten per vierstelliger PIN einer gemeinsamen Klassenrunde bei. Anschließend bewirtschaften sie ihren Hof allein oder in Kleingruppen über zehn Spielrunden von insgesamt 30 bis 50 Minuten mit einer kurzen Zwischenbilanz nach Runde 5. Zum Abschluss werden die Rangliste für den zukunftsfähigen Hof sowie die Boden- und Kapitalverläufe gemeinsam ausgewertet.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Welche Themen aus BNE, Biologie, Geographie und Wirtschaft werden konkret simuliert?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Biologisch und ökologisch modelliert SOIL den Humusaufbau, den Nährstoffhaushalt, die Stickstofffixierung durch Leguminosen sowie die natürliche Regulierung von Schaderregern durch vielfältige Fruchtfolgen. Geographisch und wirtschaftlich stehen Standortfaktoren, Ertragsrisiken durch Extremwetter, reale Deckungsbeiträge nach KTBL sowie EU-Agrarförderungen und Öko-Regelungen im Mittelpunkt. So erleben die Lernenden unmittelbar, wie kurzfristige Gewinnmaximierung zur Bodendegradation führt und warum ökologische Pflege die Basis für dauerhaften wirtschaftlichen Erfolg bildet.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Ist SOIL kostenlos, werbefrei und DSGVO-konform ohne Schüler-Accounts nutzbar?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Ja, SOIL ist als freie Bildungsressource dauerhaft kostenlos, werbefrei und direkt im Browser auf Tablets, Laptops und interaktiven Tafeln spielbar. Schülerinnen und Schüler benötigen kein Benutzerkonto und geben weder Namen noch E-Mail-Adressen ein. Einzelspieler-Runden laufen lokal auf dem Endgerät, während Mehrspieler-Klassenrunden über anonyme vierstellige Team-PINs auf europäischen Servern abgewickelt werden.',
                  },
                },
              ],
            },
          ],
        },
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./info/info').then((m) => m.InfoComponent),
  },
  {
    path: 'research',
    title: 'Offene Forschungsdaten & Empirische Spielverläufe – SOIL Simulation',
    data: {
      seo: {
        description:
          'Öffentlicher Forschungsdatensatz anonymisierter SOIL-Simulationsspiele mit REST/CSV-API und Model Context Protocol Server für Bildungsforschung und Agrarökonomie.',
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
          license: 'https://creativecommons.org/licenses/by/4.0/',
          creator: {
            '@type': 'Organization',
            name: 'SOIL Projekt – Dr. Nina Wolf & Florian Feldhaus',
            url: 'https://soil.app/info',
          },
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
    title: 'Konto & Daten löschen – SOIL',
    data: {
      seo: {
        description: 'Konto und lokale Spieldaten bei SOIL löschen.',
        canonicalPath: '/delete-account',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./auth/delete-account/delete-account').then((m) => m.DeleteAccountComponent),
  },
  {
    path: '**',
    title: 'Seite nicht gefunden – SOIL',
    data: {
      seo: {
        description: 'Die angeforderte Seite wurde nicht gefunden.',
        canonicalPath: '/',
        robots: 'noindex, nofollow',
      } satisfies RouteSeoData,
    },
    loadComponent: () => import('./not-found/not-found').then((m) => m.NotFoundComponent),
  },
];

export const routes: Routes = baseRoutes;

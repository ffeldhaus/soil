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
    title: 'SOIL – Interaktive Landwirtschaftssimulation & Lernspiel für BNE, Biologie & Geographie',
    data: {
      seo: {
        description:
          'SOIL ist ein kostenloses Serious Game und Simulationsspiel für Bildung für nachhaltige Entwicklung (BNE), Biologie, Geographie und Wirtschaft. Lernende steuern über zehn Runden Fruchtfolge, Düngung, Pflanzenschutz und Finanzen eines Bauernhofs.',
        canonicalPath: '/',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'SoftwareApplication',
              name: 'SOIL',
              url: 'https://soil.app/',
              inLanguage: 'de',
              isAccessibleForFree: true,
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'EUR',
              },
            },
            {
              '@type': 'LearningResource',
              name: 'SOIL – Interaktive Landwirtschaftssimulation',
              url: 'https://soil.app/',
              inLanguage: 'de',
              isAccessibleForFree: true,
              educationalUse: ['Simulation', 'Planspiel', 'Unterricht'],
              teaches: [
                'Nachhaltige Landwirtschaft',
                'Bodenqualität und Fruchtfolge',
                'Bildung für nachhaltige Entwicklung (BNE)',
                'Agrarökonomie',
              ],
            },
            {
              '@type': 'VideoObject',
              name: 'SOIL – Interaktive Simulation über Landwirtschaft, Ökonomie und Nachhaltigkeit',
              description:
                'Einminütiger Überblick über die interaktive Landwirtschaftssimulation SOIL für BNE, Biologie, Geographie und Wirtschaft.',
              thumbnailUrl: 'https://soil.app/SOIL-screenshot.jpg',
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
    title: 'Handbuch & Spielanleitung – SOIL Landwirtschaftssimulation',
    data: {
      seo: {
        description:
          'Vollständiges Handbuch zu SOIL: Spielmechanik, Kulturen, Fruchtfolge, Humus- und Nährstoffdynamik, Bio-Zertifizierung, regionale Lieferverträge und Schwierigkeitsgrade für Unter-, Mittel- und Oberstufe.',
        canonicalPath: '/manual',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          name: 'SOIL Handbuch & Spielanleitung',
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
    title: 'Lehrplanbezug, BNE-Didaktik & Wissenschaftlicher Hintergrund – SOIL Landwirtschaftssimulation',
    data: {
      seo: {
        description:
          'Einsatz von SOIL im Unterricht (Klasse 5–13 in allen 16 Bundesländern für Geographie/Erdkunde, Biologie, Wirtschaft/Politik & BNE), FAQ für Lehrkräfte, Dissertation Dr. Nina Wolf (TU Dortmund) und KTBL-/BMEL-Datenquellen.',
        canonicalPath: '/info',
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'AboutPage',
              name: 'Lehrplanbezug, BNE-Didaktik & Wissenschaftlicher Hintergrund – SOIL',
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
                  name: 'Für welche Fächer und Jahrgangsstufen eignet sich das Planspiel SOIL laut den Lehrplänen der Bundesländer?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'SOIL ist für die Jahrgangsstufen 5 bis 13 (Unterstufe, Mittelstufe und gymnasiale Oberstufe) sowie für berufliche Schulen (Agrarwirtschaft) in allen 16 Bundesländern konzipiert. Es passt unmittelbar in den Unterricht der Fächer Geographie/Erdkunde, Biologie und Naturwissenschaften (NaWi, BNT, MNT), Wirtschaft/Politik/Sozialwissenschaften (WBS, WAT, PGW, PoWi, GRW, AWT) sowie in fächerübergreifende Projekttage zur Bildung für nachhaltige Entwicklung (BNE).',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Wie passen die drei Schwierigkeitsgrade zu Unterstufe (Kl. 5–6), Mittelstufe (Kl. 7–10) und Oberstufe (Kl. 11–13)?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Beim Erstellen eines Spiels wählst du zwischen drei didaktisch abgestuften Profilen: „Einsteiger / Unterstufe“ (Kl. 5–6) startet mit einheitlicher Bodenqualität (100) und Nährstoffen (100), verlässlicher Wettervorhersage und 0 % Überziehungszins. „Standard / Mittelstufe“ (Kl. 7–10) führt 5 realistische Boden-Zonen (88–112), saisonale Wettertrends, 6 % Dispozins und rotierende Regionalverträge ein. „Profi / Oberstufe“ (Kl. 11–13) bildet stark heterogene Böden (76–124), zunehmenden Klimastress, 10 % Überziehungszins und ein striktes Insolvenz-Limit ab -50.000 € ab.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Wie läuft eine Unterrichtsstunde (45 Min.) oder Doppelstunde (90 Min.) mit SOIL praktisch ab?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Eine Durchführung gliedert sich in drei Phasen: (1) Einstieg (ca. 10 Min.): Kurze Einführung über die interaktive Tour; Start entweder sofort ohne Anmeldung im Einzelspieler-Modus oder als Klassen-Multiplayer per 4-stelliger PIN bzw. QR-Code. (2) Simulationsphase (30–50 Min.): Die Lernenden bewirtschaften ihren Hof über 10 Runden (allein oder in Zweier-/Dreierteams) mit einer kurzen Zwischenreflexion nach Runde 5. (3) Debriefing & Auswertung (15–25 Min.): Gemeinsamer Vergleich der Rangliste („Zukunftsfähiger Hof“), der Boden- und Kapitalverläufe im Finanzbericht sowie Diskussion des Dust-Bowl-Syndroms.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Ist SOIL kostenlos, werbefrei und DSGVO-konform ohne Schüler-Accounts im Browser spielbar?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Ja. SOIL ist eine zu 100 % kostenlose und werbefreie Open Educational Resource (OER) und läuft direkt im Browser auf Tablets, Laptops, Smartphones und interaktiven Whiteboards. Lernende benötigen keinerlei eigenes Benutzerkonto und geben weder Namen noch E-Mail-Adressen ein: Einzelspieler-Partien laufen lokal im Browser, und Klassen-Mehrspielerrunden nutzen anonyme 4-stellige Team-PINs auf EU-Servern (europe-west4).',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Welche biologischen Lehrplaninhalte (Ökosystem Boden, Stickstoffkreislauf, Fruchtfolge, Pflanzenschutz) werden abgebildet?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Biologisch modelliert SOIL den Humusaufbau und -abbau (Bodenqualität), den mineralischen Nährstoffhaushalt nach dem Liebigschen Minimumgesetz sowie die biologische Stickstofffixierung durch Körnerleguminosen (Ackerbohne und Erbse in Symbiose mit Knöllchenbakterien). Zudem erleben die Lernenden Selbstunverträglichkeit und bodenbürtige Wurzelkrankheiten bei fehlenden Anbaupausen, die Dämpfung von Schaderregern durch vielfältige Fruchtfolgen (≤ 20 % Flächenanteil) im Vergleich zu Monokulturen sowie die Regeln des kontrolliert ökologischen Landbaus.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Welche Themen aus Geographie, Wirtschaft und Politik (Marktpreise, GAP-Subventionen, Strukturwandel, Dust-Bowl-Syndrom) lernen Schülerinnen und Schüler?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Aus geographischer und ökonomischer Sicht verknüpft SOIL reale Deckungsbeitragsrechnungen (Saatgut-, Dünger-, Pflanzenschutz-, Maschinen- und Arbeitskosten nach KTBL) mit der Gemeinsamen Agrarpolitik der EU (GAP-Basisprämie, Öko-Prämie, Öko-Regelungen ÖR 1a/2/6) und regionalen Lieferverträgen. Lernende erfahren das Dust-Bowl-Syndrom am eigenen Betrieb und vollziehen den Perspektivwechsel von kurzfristiger Gewinnmaximierung hin zu „Ökologie für Ökonomie“.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Auf welchen realen Datenquellen basiert die Simulation?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Alle agronomischen und ökonomischen Parameter in SOIL sind wissenschaftlich referenziert (sources.json): Erntemengen und Klimaschwankungen stammen vom Statistischen Bundesamt (Destatis) und dem BMEL-Erntebericht, Arbeitszeit- und Maschinenkosten vom KTBL, Markt- und Betriebsmittelpreise von AMI, Agrarheute, Ökolandbau.de und dem LfULG Sachsen, und Schaderreger- sowie Agrarumweltdaten vom Julius Kühn-Institut (JKI), ISIP, FLI und begutachteten Fachstudien.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Wie können Oberstufenkurse (W-Seminar, Seminarfach, Informatik, Geographie, Biologie) mit den offenen Forschungsdaten arbeiten?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Unter /research stellt SOIL einen streng anonymisierten Open-Data-Forschungsdatensatz abgeschlossener Simulationsspiele bereit. Oberstufenkurse können reale Spielverläufe im Browser inspizieren, als CSV- oder JSON-Datensatz über die REST-API (/api/research) für eigene statistische Auswertungen (z. B. in Python, R oder Tabellenkalkulationen) herunterladen oder über den offenen Model Context Protocol Server (/api/mcp) auswerten.',
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
          'Öffentlicher Forschungsdatensatz anonymisierter SOIL-Simulationsspiele mit REST/CSV-API und Model Context Protocol (MCP) Server für Bildungsforschung und Agrarökonomie.',
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
            name: 'SOIL Projekt (Dr. Nina Wolf & Florian Straub)',
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

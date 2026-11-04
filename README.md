# SOIL – Online-Planspiel & Simulation für BNE und nachhaltige Landwirtschaft

[![Live Application](https://img.shields.io/badge/Live_App-https%3A%2F%2Fsoil.app-059669)](https://soil.app/)
[![Content License: CC BY 4.0](https://img.shields.io/badge/OER_Inhalte_%26_Daten-CC_BY_4.0-2563eb)](https://creativecommons.org/licenses/by/4.0/deed.de)
[![Code License: Apache 2.0](https://img.shields.io/badge/Code_License-Apache_2.0-4b5563)](LICENSE.md)

**SOIL** ([https://soil.app/](https://soil.app/)) ist ein kostenloses, werbefreies **Online-Planspiel** und eine interaktive **Landwirtschaftssimulation** für die **Bildung für nachhaltige Entwicklung (BNE)** sowie den Fachunterricht in **Biologie, Geographie/Erdkunde und Wirtschaft/Politik** (Sekundarstufe I & II, Klassen 5 bis 13).

Schülerinnen und Schüler übernehmen allein oder in Teams die Bewirtschaftung eines landwirtschaftlichen Betriebs mit 40 Ackerparzellen über 10 bis 20 Produktionsjahre. Dabei erleben sie unmittelbar das Spannungsfeld zwischen kurzfristiger Gewinnmaximierung und langfristigem Erhalt der Bodenfruchtbarkeit.

---

## Direktlinks zur Anwendung & Dokumentation

- **Webanwendung & lokales Probespiel (ohne Login):** [https://soil.app/](https://soil.app/)
- **Handbuch & Spielanleitung (Kulturen, Fruchtfolge, Förderungen):** [https://soil.app/manual](https://soil.app/manual)
- **Lehrplanbezug, BNE-Didaktik & wissenschaftlicher Hintergrund:** [https://soil.app/info](https://soil.app/info)
- **Offener Forschungsdatensatz, REST/CSV-API & MCP-Server:** [https://soil.app/research](https://soil.app/research)
- **Spiele erstellen & verwalten (Einzelspieler & Klassenrunden):** [https://soil.app/admin](https://soil.app/admin)

---

## Didaktisches Konzept & Funktionen

- **Sofort im Browser spielbar (Zero-Install & DSGVO-konform):**
  - **Einzelspieler-Modus:** Läuft komplett lokal im Browser gegen konfigurierbare KI-Betriebe – ohne Registrierung und ohne Datenübertragung.
  - **Mehrspieler-Klassenrunden:** Lehrkräfte erstellen eine Spielrunde und teilen lediglich die Spiel-ID sowie 4-stellige Team-PINs aus. Schülerinnen und Schüler benötigen keine eigenen Benutzerkonten und geben weder Namen noch E-Mail-Adressen ein.
- **Drei didaktisch abgestufte Schwierigkeitsgrade:**
  - **Einsteiger (Klasse 5–6):** Einheitliche Startböden, verlässliche Wettervorhersage, 0 % Überziehungszins.
  - **Standard (Klasse 7–10):** 5 Boden-Zonen, saisonale Wettertrends, 6 % Überziehungszins, regionale Förderverträge.
  - **Profi (Oberstufe / Sek II):** Stark heterogene Böden, zunehmender Klimastress, 10 % Überziehungszins und Insolvenzgrenze ab −50.000 €.
- **Wissenschaftlich fundiertes Agrarmodell ([`sources.json`](sources.json)):**
  - 9 Kulturen (Weizen, Roggen, Gerste, Raps, Kartoffel, Mais, Zuckerrübe, Ackerbohne, Brache/Gründüngung) plus Blühstreifen.
  - Reale Deckungsbeiträge, Saatgut- und Betriebsmittelpreise nach KTBL-Richtwerten, EU-Agrarförderungen (GAP-Basisprämie, Öko-Regelungen, Junglandwirte-Förderung) und Bio-Zertifizierung.
  - Jeder Simulationsparameter in [`src/app/game-constants.ts`](src/app/game-constants.ts) wird automatisiert gegen begutachtete Primärliteratur in [`sources.json`](sources.json) validiert (`npm run verify-constants`).
- **Offene Bildungsforschung (Open Science):**
  - Vollständig anonymisierte Spielverläufe abgeschlossener Runden stehen unter [https://soil.app/research](https://soil.app/research), über die öffentliche JSON/CSV-API (`https://soil.app/api/research`) sowie über einen Model Context Protocol (MCP) Server (`https://soil.app/mcp`) unter `CC BY 4.0` bereit.

---

## Wissenschaftlicher Hintergrund

SOIL basiert auf dem am Lehrstuhl für Biomimetik / Didaktik der Biologie der **Technischen Universität Dortmund** von **Dr. Nina Wolf** entwickelten und empirisch evaluierten Planspiel zur Bildung für nachhaltige Entwicklung (Dissertation 2014; weiterführende Publikationen u. a. mit Prof. Dr. Dittmar Graf, Justus-Liebig-Universität Gießen). Alle Literaturquellen und Modellannahmen sind auf [https://soil.app/info](https://soil.app/info) dokumentiert.

---

## Tech Stack

- **Frontend & SSR/Prerendering:** Angular 21, TypeScript, Tailwind CSS v4, Express SSR (`src/server.ts`)
- **Backend & Cloud-Engine:** Firebase Cloud Functions v2 (Node.js 24, Region `europe-west4`), Cloud Firestore (`europe-west4`)
- **Qualitätssicherung:** Vitest (Frontend- & Backend-Unit-Tests, Agronomische Balancing-Simulationen), Cypress (End-to-End), Biome (Linting & Formatting), Lychee (Link-Checker)

---

## Lokale Entwicklung

### Voraussetzungen

- Node.js (v24 LTS)
- Firebase CLI (`npm install -g firebase-tools`)

### Installation & Start

Detaillierte Hinweise zur Einrichtung eines eigenen Firebase-Projekts befinden sich in [`SETUP.md`](SETUP.md) und [`DEVELOPMENT.md`](DEVELOPMENT.md).

```bash
# Abhängigkeiten installieren
npm install
npm --prefix functions install

# Lokalen Angular-Entwicklungsserver starten
npm start

# Wissenschaftliche Konstanten gegen sources.json prüfen
npm run verify-constants

# Unit-Tests (Frontend & Cloud Functions) ausführen
npm run test:unit
npm run test:functions
```

---

## Lizenz & OER-Weiternutzung (TULLU)

SOIL ist dual lizenziert als freie Bildungsressource (**Open Educational Resource, OER**) und **Open-Source-Software**:

1. **Inhalte, Texte, Handbuch, eigene Grafiken, Erklärvideo & offene Forschungsdaten:**  
   Lizenziert unter **[Creative Commons Namensnennung 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/deed.de)**.
   - **Titel:** SOIL – Online-Planspiel & Simulation für BNE und nachhaltige Landwirtschaft
   - **Urheber\*innen:** Dr. Nina Wolf & Florian Feldhaus
   - **Lizenz:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.de)
   - **Ursprungsort:** [https://soil.app/](https://soil.app/)
   - *Ausnahme:* Das im Handbuch zur Erläuterung der ökologischen Landwirtschaft dargestellte EU-Bio-Logo (`public/assets/icons/labels/Organic-Logo.svg`) ist ein offizielles Kennzeichen der Europäischen Union und von der CC-Lizenz ausgenommen.

2. **Quellcode der Software:**  
   Lizenziert unter der **[Apache License 2.0](LICENSE.md)**.

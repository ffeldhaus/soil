# Verlinkungen, Bildungsportale & OER-Verzeichnisse

Übersicht über bestätigte Backlinks, laufende Redaktionsprüfungen und offene Einreichungspotenziale für **SOIL** (`https://soil.app`). Die Live-Einträge werden zusätzlich in der System-Konsole unter `/admin/super` im Bereich **Zugriffe & Reichweite** überwacht.

## 1. Bestätigte Live-Verlinkungen

| Portal / Träger | URL | Aufnahmedatum | Verlinkte Routen | SEO-Linktyp | Referrer-Übertragung & Technische Hinweise |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Bundeszentrale für politische Bildung** (`bpb.de` – Datenbank Planspiele) | [Eintrag 583068](https://www.bpb.de/lernen/angebote/planspiele/datenbank-planspiele/583068/soil-online-planspiel-simulation-fuer-bne-und-nachhaltige-landwirtschaft/) | Eingereicht `04.11.2026`, freigeschaltet `16.11.2026` | `/`, `/manual`, `/info` | `dofollow` | Setzt `rel="noopener noreferrer"` → Klicks erscheinen in der Telemetrie unter `Direktaufruf`. |
| **Portal Globales Lernen** (`globaleslernen.de` / EWIK) | [Multimediales-Eintrag](https://www.globaleslernen.de/de/bildungsangebote/multimediales/soil-online-planspiel-simulation-zu-landwirtschaft-bodenfruchtbarkeit-und-nachhaltigkeit-bne) | Live seit `05.11.2026` (inkl. November-Newsletter) | `/` | `dofollow` | Drupal `extlink.js` setzt im Browser `rel="noopener noreferrer"` → Klicks mit aktiviertem JS erscheinen unter `Direktaufruf`. |
| **HubbS – Landesbildungsserver** (`hubbs.schule` / FWU, SODIX-ID `30188`) | [Mediathek-Eintrag](https://hubbs.schule/mediathek/online-planspiel-simulation-fuer-bne-und-nachhaltige-landwirtschaft) · [Anbieterprofil](https://hubbs.schule/Medienanbieter/soil) | Hochgeladen `06.11.2026`, live seit `12.11.2026` | `/` | `302` → `dofollow` | Button leitet intern über `/sodix/proxy-file/30188/0` per `HTTP 302` auf `https://soil.app/` weiter → Referrer `hubbs.schule` bleibt sichtbar. Hinweis: `<h1>` auf der Detailseite beginnt aktuell ohne `SOIL` vor `– Online-Planspiel…`. |
| **GitHub Repository** (`github.com`) | [ffeldhaus/soil](https://github.com/ffeldhaus/soil) | Fortlaufend | `/`, `/manual`, `/info`, `/research`, `/admin` | `rel="nofollow"` | Überträgt Referrer `github.com`. |
| **YouTube-Kanal & Trailer** (`youtube.com`) | [Trailer-Video](https://www.youtube.com/watch?v=xCmZUGcyVLM) | Fortlaufend | `/`, `/manual`, `/info`, `/research`, `/admin` | `rel="nofollow"` | Setzt `rel="nofollow noreferrer"` → Klicks erscheinen in der Telemetrie unter `Direktaufruf`. |

## 2. Eingereichte / Offene Prüfungen

- **BNE-Portal (`bne-portal.de`, DLR Projektträger)**: Eingereicht am `04.11.2026` inklusive Bildrechteformular (`koordinierung-bne@dlr.de`), Status: *In Redaktionsprüfung* (https://www.bne-portal.de/).
- **Apple App Store (`app.soil`) & Google Play (`app.soil.twa`)**: Native Capacitor-8-Apps (iOS/iPadOS via Xcode Cloud/App Store Connect sowie Android App Bundle in der Google Play Console) sind vorbereitet bzw. in der Store-Prüfung; öffentliche Store-Links werden hier erst nach Freischaltung der Store-Einträge ergänzt.

## 3. Offene OER- & Fachportal-Potenziale (Biologie, Erdkunde/Geografie, Wirtschaft, BNE)

- [ ] **WirLernenOnline** (https://wirlernenonline.de/) – Deutschsprachige OER-Suchmaschine (edu-sharing) für Biologie, Geografie, Wirtschaft und BNE; Indexierung der unter `CC BY 4.0` lizenzierten `LearningResource`-Metadaten anstoßen.
- [ ] **MUNDO – Offene Bildungsmediathek der Länder** (https://mundo.schule/) – Länderübergreifende Bildungsmediathek (FWU / Bundesländer); Übernahme über bestehenden SODIX-Datensatz (`30188`) prüfen bzw. redaktionell vorschlagen.
- [ ] **oekolandbau.de – Lehrermaterialien** (https://www.oekolandbau.de/) – Fachportal der Bundesanstalt für Landwirtschaft und Ernährung (BLE) für Unterrichtsmaterialien zu Bodenfruchtbarkeit, Fruchtfolge und ökologischem Landbau.
- [ ] **Deutscher Bildungsserver** (https://www.bildungsserver.de/) – Redaktionelle Fach- und BNE-Dossiers des DIPF für digitale Planspiele und Simulationen über mehrere Wirtschaftsjahre.
- [ ] **Umwelt im Unterricht** (https://www.umwelt-im-unterricht.de/) – Bildungsangebot des BMUV zu Boden-, Agrar- und Klimaschutzthemen; Aufnahme als interaktive Praxis-Simulation anfragen.
- [ ] **Zenodo** (https://zenodo.org/) – Wissenschaftliche Archivierung und persistente DOI-Vergabe über die bestehende GitHub-/Release-Metadatenstruktur (`CITATION.cff`, `codemeta.json`) zur Verknüpfung mit `/research`.

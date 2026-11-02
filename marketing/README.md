# SOIL – Marketing- & Unterrichtsmaterialien

Dieser Ordner enthält die Vorlagen, Generator-Skripte und druckfertigen **DIN-A4-Flyer (`2480 × 3508 px`, 300 DPI)** für den Einsatz von SOIL im Biologieunterricht (Sekundarstufe I & II).

## Enthaltene Dateien

- `SOIL-Flyer-Biologie-A4-hell.png` / `.jpg` — **Helle, tonersparende Druckvariante** (DIN A4 Hochformat, 300 DPI)
- `SOIL-Flyer-Biologie-A4-dunkel.png` / `.jpg` — **Dunkle Variante** im Erscheinungsbild der App (DIN A4 Hochformat, 300 DPI)
- `flyer-light.html` — HTML/CSS-Vorlage der hellen Druckvariante
- `flyer-dark.html` — HTML/CSS-Vorlage der dunklen Variante
- `generate-flyer.mjs` — Rendert beide Flyer-Varianten via Headless Chrome (`2480 × 3508 px`)
- `capture-screenshot.mjs` — Nimmt `public/SOIL-screenshot.jpg` (`1920 × 1377 px`) automatisiert aus dem aktuellen Produktions-Build (`dist/soil/browser`) neu auf

## Screenshot & Flyer aktualisieren

1. **Screenshot neu aufnehmen** (setzt einen aktuellen Produktions-Build voraus):
   ```bash
   npm run build
   node marketing/capture-screenshot.mjs
   ```

2. **Beide A4-Flyer-Varianten neu rendern**:
   ```bash
   node marketing/generate-flyer.mjs
   ```
   Optional kann ein eigener Screenshot übergeben werden:
   ```bash
   node marketing/generate-flyer.mjs --screenshot=/pfad/zum/screenshot.jpg
   ```


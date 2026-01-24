import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-manual-concept-card',
  standalone: true,
  imports: [],
  templateUrl: './manual-concept-card.html',
})
export class ManualConceptCardComponent {
  @Input() concept = '';
  @Input() index = 0;

  private icons = ['📏', '🐛', '🔄', '🧪', '🌦️', '📈', '💰', '🚜', '🌿'];

  get icon(): string {
    return this.icons[this.index] || '💡';
  }

  t(key: string): string {
    const translations: Record<string, string> = {
      'manual.concepts.units.title': 'Einheiten',
      'manual.concepts.units.text': 'Fläche in Hektar (ha), Ertrag in Dezitonnen (dt).',
      'manual.concepts.pest.title': 'Schädlinge',
      'manual.concepts.pest.text': 'Jede Pflanze hat spezifische natürliche Feinde.',
      'manual.concepts.rotation.title': 'Fruchtfolge',
      'manual.concepts.rotation.text':
        'Der Vorfruchtwert bestimmt die Bodengesundheit. Brachen helfen dem Boden, sich zu regenerieren.',
      'manual.concepts.requirements.title': 'Anforderungen',
      'manual.concepts.requirements.text':
        'Der Bedarf an Stickstoff (N), Phosphor (P) und Kalium (K) sowie der Bodenanspruch variieren je nach Kultur. Eine ausgewogene Nährstoffversorgung ist entscheidend für die Pflanzengesundheit und den Ertrag.',
      'manual.concepts.weather.title': 'Wetter',
      'manual.concepts.weather.text': 'Trockenheit, Kälte oder Nässe beeinflussen den Ertrag.',
      'manual.concepts.yield.title': 'Ertrag & Subventionen',
      'manual.concepts.yield.text':
        'Abhängig von Bodenqualität, Wetter und Bewirtschaftung. Zusätzlich zum Ernteverkauf erhältst du staatliche Flächenzahlungen (GAP) und ggf. eine Öko-Prämie.',
      'manual.concepts.price.title': 'Preise',
      'manual.concepts.price.text':
        'Marktpreise schwanken zwischen Konventionell und Bio. Im fortgeschrittenen Markt werden die Preise dynamisch durch das Angebot aller Spieler und die Nachfrage bestimmt.',
      'manual.concepts.subsidies.title': 'Subventionen',
      'manual.concepts.subsidies.text':
        'Staatliche Zahlungen (GAP) unterstützen die Landwirte. Bio-Betriebe erhalten zusätzliche Prämien.',
      'manual.concepts.machines.title': 'Maschinen',
      'manual.concepts.machines.text':
        'Reduzieren Arbeitskosten, aber verschlechtern den Boden und verfallen ohne Investition.',
      'manual.concepts.bio.title': 'Bio-Siegel',
      'manual.concepts.bio.text':
        'Das EU-Bio-Siegel wird nur vergeben, wenn konsequent auf synthetische Dünger und Pflanzenschutz verzichtet wird. Nur dann erhältst du die höheren Bio-Marktpreise und die Öko-Prämie. Tiere (Gras) sind für den organischen Dünger im Bio-Anbau essenziell.',
    };
    return translations[key] || key;
  }
}

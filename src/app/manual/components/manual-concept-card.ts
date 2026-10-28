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
      'manual.concepts.pest.title': 'Schädlinge & Seuchen',
      'manual.concepts.pest.text':
        'Jede Pflanze hat spezifische natürliche Feinde. Vielfältige Fruchtfolgen (≤ 8 Parzellen pro Kultur) dämpfen den Befallsdruck auf natürliche Weise, während große Monokulturen Ausbrüche verstärken. Hochinfektiöse Tierseuchen (ASP) belasten zudem die Tierhaltung durch strenge Auflagen.',
      'manual.concepts.rotation.title': 'Fruchtfolge',
      'manual.concepts.rotation.text':
        'Der Vorfruchtwert bestimmt die Bodengesundheit. Brachen helfen dem Boden, sich zu regenerieren.',
      'manual.concepts.requirements.title': 'Anforderungen',
      'manual.concepts.requirements.text':
        'Der Bedarf an Nährstoffen sowie der Bodenanspruch variieren je nach Kultur. Eine ausgewogene Versorgung ist entscheidend für Pflanzengesundheit und Ertrag.',
      'manual.concepts.weather.title': 'Wetter',
      'manual.concepts.weather.text':
        'Trockenheit, Hitzewellen, Kälte oder Starkregen beeinflussen Ertrag und Bodengüte. Tiere sind vom Wetter nicht direkt betroffen.',
      'manual.concepts.yield.title': 'Ertrag & Einkommen',
      'manual.concepts.yield.text':
        'Dein Ertrag hängt massiv von der Bodenqualität und der Nährstoffversorgung ab. <b>Schlechter Boden führt langfristig zu sinkenden Ernten und damit zu wirtschaftlichen Verlusten.</b> Zusätzlich zum Verkauf erhältst du GAP-Flächenzahlungen.',
      'manual.concepts.price.title': 'Preise',
      'manual.concepts.price.text':
        'Marktpreise schwanken zwischen Konventionell und Bio. Bio-Preise sind deutlich höher, um die geringeren Erträge auszugleichen. Im fortgeschrittenen Markt bestimmt das Gesamtangebot aller Spieler den Preis.',
      'manual.concepts.subsidies.title': 'Subventionen',
      'manual.concepts.subsidies.text':
        'Staatliche Zahlungen (GAP) unterstützen deinen Betrieb. Bio-Betriebe erhalten eine zusätzliche Öko-Prämie als Ausgleich für den Mehraufwand.',
      'manual.concepts.machines.title': 'Maschinen & Arbeit',
      'manual.concepts.machines.text':
        'Maschinen erhöhen durch modernste Technik deine Erträge, belasten aber durch ihr Gewicht die Bodenstruktur und erfordern regelmäßige hohe Investitionen sowie laufende Wartungskosten.',
      'manual.concepts.bio.title': 'Bio-Siegel',
      'manual.concepts.bio.text':
        'Das EU-Bio-Siegel wird nur vergeben, wenn konsequent auf synthetische Dünger und Pflanzenschutz verzichtet wird. Nur dann erhältst du die höheren Bio-Marktpreise und die Öko-Prämie. Tiere (Gras) sind für den organischen Dünger im Bio-Anbau essenziell.',
    };
    return translations[key] || key;
  }
}

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

  private icons = ['📏', '🐛', '🔄', '🧪', '🌦️', '📈', '💰', '🇪🇺', '🚜', '🌿'];

  get icon(): string {
    return this.icons[this.index] || '💡';
  }

  t(key: string): string {
    const translations: Record<string, string> = {
      'manual.concepts.units.title': $localize`:Concept Title|Title for measurement units section@@manual.concepts.units.title:Einheiten`,
      'manual.concepts.units.text': $localize`:Concept Text|Explanation of measurement units used in the game@@manual.concepts.units.text:Fläche in Hektar (ha), Ertrag in Dezitonnen (dt).`,
      'manual.concepts.pest.title': $localize`:Concept Title|Title for pests section@@manual.concepts.pest.title:Schädlinge`,
      'manual.concepts.pest.text': $localize`:Concept Text|Explanation of pests and their impact@@manual.concepts.pest.text:Jede Pflanze hat spezifische natürliche Feinde.`,
      'manual.concepts.rotation.title': $localize`:Concept Title|Title for crop rotation section@@manual.concepts.rotation.title:Fruchtfolge`,
      'manual.concepts.rotation.text': $localize`:Concept Text|Explanation of crop rotation and soil health@@manual.concepts.rotation.text:Der Vorfruchtwert bestimmt die Bodengesundheit. Brachen helfen dem Boden, sich zu regenerieren.`,
      'manual.concepts.requirements.title': $localize`:Concept Title|Title for plant requirements section@@manual.concepts.requirements.title:Anforderungen`,
      'manual.concepts.requirements.text': $localize`:Concept Text|Explanation of mineral and soil requirements for plants@@manual.concepts.requirements.text:Mineralienbedarf und Bodenanspruch variieren.`,
      'manual.concepts.weather.title': $localize`:Concept Title|Title for weather section@@manual.concepts.weather.title:Wetter`,
      'manual.concepts.weather.text': $localize`:Concept Text|Explanation of weather impacts on agriculture@@manual.concepts.weather.text:Trockenheit, Kälte oder Nässe beeinflussen den Ertrag.`,
      'manual.concepts.yield.title': $localize`:Concept Title|Title for yield section@@manual.concepts.yield.title:Ertrag`,
      'manual.concepts.yield.text': $localize`:Concept Text|Explanation of what determines the harvest yield@@manual.concepts.yield.text:Abhängig von Bodenqualität und Wetter.`,
      'manual.concepts.price.title': $localize`:Concept Title|Title for market prices section@@manual.concepts.price.title:Preise`,
      'manual.concepts.price.text': $localize`:Concept Text|Explanation of market price fluctuations@@manual.concepts.price.text:Marktpreise schwanken zwischen Konventionell und Bio. Im fortgeschrittenen Markt werden die Preise dynamisch durch das Angebot aller Spieler und die Nachfrage bestimmt.`,
      'manual.concepts.subsidies.title': $localize`:Concept Title|Title for subsidies section@@manual.concepts.subsidies.title:Subventionen`,
      'manual.concepts.subsidies.text': $localize`:Concept Text|Explanation of government subsidies@@manual.concepts.subsidies.text:Staatliche Zahlungen (GAP) unterstützen die Landwirte. Bio-Betriebe erhalten zusätzliche Prämien.`,
      'manual.concepts.machines.title': $localize`:Concept Title|Title for machinery section@@manual.concepts.machines.title:Maschinen`,
      'manual.concepts.machines.text': $localize`:Concept Text|Explanation of machinery benefits and drawbacks@@manual.concepts.machines.text:Reduzieren Arbeitskosten, aber verschlechtern den Boden und verfallen ohne Investition.`,
      'manual.concepts.bio.title': $localize`:Concept Title|Title for Bio-Siegel section@@manual.concepts.bio.title:Bio-Siegel`,
      'manual.concepts.bio.text': $localize`:Concept Text|Explanation of the organic logo and its requirements@@manual.concepts.bio.text:Das EU-Bio-Siegel wird nur vergeben, wenn konsequent auf synthetische Dünger und Pflanzenschutz verzichtet wird. Nur dann erhältst du die höheren Bio-Marktpreise und die Öko-Prämie. Tiere (Gras) sind für den organischen Dünger im Bio-Anbau essenziell.`,
    };
    return translations[key] || key;
  }
}

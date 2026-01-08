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

  private icons = ['📏', '🐛', '🔄', '🧪', '🌦️', '📈', '💰', '🚜'];

  get icon(): string {
    return this.icons[this.index] || '💡';
  }

  t(key: string): string {
    const translations: Record<string, string> = {
      'manual.concepts.units.title': $localize`:@@manual.concepts.units.title:Einheiten`,
      'manual.concepts.units.text': $localize`:@@manual.concepts.units.text:Fläche in Hektar (ha), Ertrag in Dezitonnen (dt).`,
      'manual.concepts.pest.title': $localize`:@@manual.concepts.pest.title:Schädlinge`,
      'manual.concepts.pest.text': $localize`:@@manual.concepts.pest.text:Jede Pflanze hat spezifische natürliche Feinde.`,
      'manual.concepts.rotation.title': $localize`:@@manual.concepts.rotation.title:Fruchtfolge`,
      'manual.concepts.rotation.text': $localize`:@@manual.concepts.rotation.text:Der Vorfruchtwert bestimmt die Bodengesundheit.`,
      'manual.concepts.requirements.title': $localize`:@@manual.concepts.requirements.title:Anforderungen`,
      'manual.concepts.requirements.text': $localize`:@@manual.concepts.requirements.text:Mineralienbedarf und Bodenanspruch variieren.`,
      'manual.concepts.weather.title': $localize`:@@manual.concepts.weather.title:Wetter`,
      'manual.concepts.weather.text': $localize`:@@manual.concepts.weather.text:Trockenheit, Kälte oder Nässe beeinflussen den Ertrag.`,
      'manual.concepts.yield.title': $localize`:@@manual.concepts.yield.title:Ertrag`,
      'manual.concepts.yield.text': $localize`:@@manual.concepts.yield.text:Abhängig von Bodenqualität und Wetter.`,
      'manual.concepts.price.title': $localize`:@@manual.concepts.price.title:Preise`,
      'manual.concepts.price.text': $localize`:@@manual.concepts.price.text:Marktpreise schwanken zwischen Konventionell und Bio.`,
      'manual.concepts.machines.title': $localize`:@@manual.concepts.machines.title:Maschinen`,
      'manual.concepts.machines.text': $localize`:@@manual.concepts.machines.text:Reduzieren Arbeitskosten, aber verschlechtern den Boden und verfallen ohne Investition.`,
    };
    return translations[key] || key;
  }
}

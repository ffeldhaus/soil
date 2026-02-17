import { Injectable } from '@angular/core';
import { GAME_CONSTANTS } from '../../game-constants';
import type { CropType, Parcel, Round } from '../../types';

export interface AdvisorInsight {
  type: 'soil' | 'nutrition' | 'harvest' | 'finance' | 'general';
  level: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  hint?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdvisorService {
  getInsights(currentRound: Round, previousRound?: Round): AdvisorInsight[] {
    const insights: AdvisorInsight[] = [];

    if (!currentRound.result) return insights;

    this.addHarvestInsights(insights, currentRound);
    this.addSoilInsights(insights, currentRound, previousRound);
    this.addNutritionInsights(insights, currentRound, previousRound);
    this.addFinancialInsights(insights, currentRound);

    return insights;
  }

  private addHarvestInsights(insights: AdvisorInsight[], round: Round) {
    const summary = round.result?.harvestSummary;
    if (!summary) return;

    const crops = Object.entries(summary).filter(([_, amount]) => amount > 0);
    if (crops.length === 0) {
      const activeParcels = round.parcelsSnapshot.filter((p) => p.crop !== 'Fallow' && p.crop !== 'Grass').length;
      if (activeParcels > 0) {
        insights.push({
          type: 'harvest',
          level: 'danger',
          title: 'Ernteausfall',
          message: 'Du hast keine Erträge erzielt, obwohl du Pflanzen angebaut hast.',
          hint: 'Überprüfe das Wetter und den Schädlingsbefall in der Rundenübersicht. Extreme Bedingungen können die Ernte vernichten.',
        });
      }
      return;
    }

    // Check for low yields relative to base yield
    for (const [crop, amount] of crops) {
      const config = GAME_CONSTANTS.CROPS[crop as CropType];
      if (!config) continue;

      const numParcels = round.parcelsSnapshot.filter((p) => p.crop === crop).length;
      if (numParcels === 0) continue;

      const avgYieldPerParcel = amount / numParcels;
      const relativeYield = avgYieldPerParcel / config.baseYield;

      if (relativeYield < 0.4 && !round.result?.bioSiegel) {
        insights.push({
          type: 'harvest',
          level: 'warning',
          title: `Geringer Ertrag: ${this.getCropName(crop as CropType)}`,
          message: `Der Ertrag bei ${this.getCropName(crop as CropType)} war sehr enttäuschend.`,
          hint: 'Schlechte Bodenqualität oder Nährstoffmangel könnten die Ursache sein. Auch Schädlinge mindern den Ertrag erheblich, wenn kein Pflanzenschutz eingesetzt wird.',
        });
      }
    }
  }

  private addSoilInsights(insights: AdvisorInsight[], current: Round, previous?: Round) {
    const currentAvgSoil = this.calculateAvgSoil(current.parcelsSnapshot);

    if (currentAvgSoil < GAME_CONSTANTS.SOIL.START * 0.8) {
      insights.push({
        type: 'soil',
        level: 'danger',
        title: 'Kritische Bodenqualität',
        message: 'Deine Bodenqualität ist auf einem gefährlich niedrigen Niveau.',
        hint: 'Monokulturen und intensiver Maschineneinsatz schaden dem Boden. Nutze Brachland oder Feldbohnen zur Regeneration. Siehe Handbuch Kapitel "Bodenqualität".',
      });
    }

    if (previous) {
      const prevAvgSoil = this.calculateAvgSoil(previous.parcelsSnapshot);
      const diff = currentAvgSoil - prevAvgSoil;

      if (diff < -5) {
        insights.push({
          type: 'soil',
          level: 'warning',
          title: 'Bodenqualität sinkt',
          message: 'Die Bodenqualität hat sich in dieser Runde deutlich verschlechtert.',
          hint: 'Hast du viele schwere Maschinen eingesetzt oder die Fruchtfolge missachtet? Manche Pflanzen wie Zuckerrüben sind besonders anspruchsvoll.',
        });
      } else if (diff > 2) {
        insights.push({
          type: 'soil',
          level: 'info',
          title: 'Bodenverbesserung',
          message: 'Gute Nachrichten! Deine Maßnahmen zur Bodenverbesserung zeigen Wirkung.',
          hint: 'Nachhaltige Bewirtschaftung zahlt sich langfristig durch stabilere Erträge aus.',
        });
      }
    }
  }

  private addNutritionInsights(insights: AdvisorInsight[], current: Round, previous?: Round) {
    const currentAvgNut = this.calculateAvgNutrition(current.parcelsSnapshot);

    if (currentAvgNut < GAME_CONSTANTS.NUTRITION.START * 0.5) {
      insights.push({
        type: 'nutrition',
        level: 'danger',
        title: 'Nährstoffmangel',
        message: 'Deine Felder sind ausgelaugt. Den Pflanzen fehlen wichtige Mineralstoffe.',
        hint: 'Ohne Nährstoffe wächst nichts. Setze Dünger ein oder integriere Viehhaltung (Gras/Tiere) für organischen Dünger. Auch Feldbohnen helfen.',
      });
    }

    if (previous) {
      const prevAvgNut = this.calculateAvgNutrition(previous.parcelsSnapshot);
      if (currentAvgNut < prevAvgNut && currentAvgNut < GAME_CONSTANTS.NUTRITION.START * 0.8) {
        const diff = prevAvgNut - currentAvgNut;
        if (diff > 10) {
          insights.push({
            type: 'nutrition',
            level: 'warning',
            title: 'Hoher Nährstoffverbrauch',
            message: 'Die letzte Ernte hat dem Boden sehr viele Nährstoffe entzogen.',
            hint: 'Starkzehrer wie Weizen oder Mais benötigen viel Nahrung. Achte darauf, dem Boden wieder Nährstoffe zuzuführen.',
          });
        }
      }
    }

    if (currentAvgNut > GAME_CONSTANTS.SOIL.NUTRITION_OVER_PENALTY_START) {
      insights.push({
        type: 'nutrition',
        level: 'warning',
        title: 'Überdüngung',
        message: 'Die Nährstoffwerte sind zu hoch. Das schadet der Bodenqualität.',
        hint: 'Zuviel Dünger ist kontraproduktiv. Er schadet den Bodenorganismen und mindert die Bodenqualität langfristig.',
      });
    }
  }

  private addFinancialInsights(insights: AdvisorInsight[], round: Round) {
    const profit = round.result?.profit ?? 0;
    if (profit < -2000) {
      insights.push({
        type: 'finance',
        level: 'warning',
        title: 'Hoher Verlust',
        message: 'Du hast in dieser Runde ein großes finanzielles Minus gemacht.',
        hint: 'Überprüfe deine Ausgaben für Maschineninvestitionen und Saatgut im Verhältnis zu den Erträgen. Manchmal ist weniger mehr.',
      });
    }
  }

  private calculateAvgSoil(parcels: Parcel[]): number {
    if (parcels.length === 0) return 0;
    return parcels.reduce((sum, p) => sum + p.soil, 0) / parcels.length;
  }

  private calculateAvgNutrition(parcels: Parcel[]): number {
    if (parcels.length === 0) return 0;
    return parcels.reduce((sum, p) => sum + p.nutrition, 0) / parcels.length;
  }

  private getCropName(crop: CropType): string {
    const names: Record<string, string> = {
      Wheat: 'Weizen',
      Barley: 'Gerste',
      Oat: 'Hafer',
      Potato: 'Kartoffel',
      Corn: 'Mais',
      Rye: 'Roggen',
      Beet: 'Zuckerrübe',
      Fieldbean: 'Ackerbohne',
      Rapeseed: 'Raps',
      Pea: 'Erbse',
      Fallow: 'Brachland',
      Grass: 'Gras/Tiere',
    };
    return names[crop] || crop;
  }
}

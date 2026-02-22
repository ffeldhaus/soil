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

export type AdvisorContext = 'result' | 'next_round';

@Injectable({
  providedIn: 'root',
})
export class AdvisorService {
  getInsights(currentRound: Round, previousRound?: Round, context: AdvisorContext = 'result'): AdvisorInsight[] {
    const insights: AdvisorInsight[] = [];

    if (!currentRound.result && context === 'result') return insights;

    this.addHarvestInsights(insights, currentRound, context);
    this.addSoilInsights(insights, currentRound, previousRound, context);
    this.addNutritionInsights(insights, currentRound, previousRound, context);
    this.addFinancialInsights(insights, currentRound, context);

    return insights;
  }

  private addHarvestInsights(insights: AdvisorInsight[], round: Round, context: AdvisorContext) {
    if (context !== 'result') return;

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
          hint: 'Extreme Wetterbedingungen oder massiver Schädlingsbefall haben deine Ernte vernichtet.',
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
          message: `Der Ertrag bei ${this.getCropName(crop as CropType)} war in dieser Runde sehr enttäuschend.`,
          hint: 'Schlechte Bodenqualität, Nährstoffmangel oder Schädlinge könnten die Ursache für dieses Ergebnis sein.',
        });
      }
    }
  }

  private addSoilInsights(
    insights: AdvisorInsight[],
    current: Round,
    previous: Round | undefined,
    context: AdvisorContext,
  ) {
    const currentAvgSoil = this.calculateAvgSoil(current.parcelsSnapshot);

    if (!Number.isNaN(currentAvgSoil) && currentAvgSoil < GAME_CONSTANTS.SOIL.START * 0.8) {
      insights.push({
        type: 'soil',
        level: 'danger',
        title: 'Kritische Bodenqualität',
        message:
          context === 'result'
            ? 'Deine Bodenqualität ist nach dieser Runde auf einem gefährlich niedrigen Niveau.'
            : 'Achtung: Deine Felder starten mit einer sehr schlechten Bodenqualität in diese Runde.',
        hint: 'Ein ausgelaugter Boden führt zu massiven Ernteverlusten und braucht lange zur Regeneration.',
      });
    }

    if (previous && context === 'result') {
      const prevAvgSoil = this.calculateAvgSoil(previous.parcelsSnapshot);
      if (!Number.isNaN(currentAvgSoil) && !Number.isNaN(prevAvgSoil)) {
        const diff = currentAvgSoil - prevAvgSoil;

        if (diff < -5) {
          insights.push({
            type: 'soil',
            level: 'warning',
            title: 'Bodenqualität sinkt',
            message: 'Die Bodenqualität hat sich durch deine Bewirtschaftung deutlich verschlechtert.',
            hint: 'Intensive Nutzung und schwere Maschinen setzen dem Boden zu.',
          });
        } else if (diff > 2) {
          insights.push({
            type: 'soil',
            level: 'info',
            title: 'Bodenverbesserung',
            message: 'Gute Nachrichten! Deine Maßnahmen zur Bodenverbesserung zeigen Wirkung.',
          });
        }
      }
    }
  }

  private addNutritionInsights(
    insights: AdvisorInsight[],
    current: Round,
    previous: Round | undefined,
    context: AdvisorContext,
  ) {
    const currentAvgNut = this.calculateAvgNutrition(current.parcelsSnapshot);

    if (!Number.isNaN(currentAvgNut) && currentAvgNut < GAME_CONSTANTS.NUTRITION.START * 0.5) {
      insights.push({
        type: 'nutrition',
        level: 'danger',
        title: 'Nährstoffmangel',
        message:
          context === 'result'
            ? 'Deine Felder sind nach der Ernte völlig ausgelaugt.'
            : 'Deine Felder weisen einen erheblichen Mangel an Mineralstoffen auf.',
        hint: 'Ohne ausreichende Nährstoffe können Pflanzen nicht gesund wachsen und bringen kaum Ertrag.',
      });
    }

    if (previous && context === 'result') {
      const prevAvgNut = this.calculateAvgNutrition(previous.parcelsSnapshot);
      if (!Number.isNaN(currentAvgNut) && !Number.isNaN(prevAvgNut)) {
        if (currentAvgNut < prevAvgNut && currentAvgNut < GAME_CONSTANTS.NUTRITION.START * 0.8) {
          const diff = prevAvgNut - currentAvgNut;
          if (diff > 10) {
            insights.push({
              type: 'nutrition',
              level: 'warning',
              title: 'Hoher Nährstoffverbrauch',
              message: 'Diese Runde hat dem Boden überdurchschnittlich viele Nährstoffe entzogen.',
              hint: 'Starkzehrer benötigen viel Nahrung. Achte auf den Nährstoffhaushalt deiner Flächen.',
            });
          }
        }
      }
    }

    if (!Number.isNaN(currentAvgNut) && currentAvgNut > GAME_CONSTANTS.SOIL.NUTRITION_OVER_PENALTY_START) {
      insights.push({
        type: 'nutrition',
        level: 'warning',
        title: 'Überdüngung',
        message: 'Die Nährstoffwerte sind aktuell zu hoch.',
        hint: 'Zuviel Dünger schadet den Bodenorganismen und mindert die Bodenqualität langfristig.',
      });
    }
  }

  private addFinancialInsights(insights: AdvisorInsight[], round: Round, context: AdvisorContext) {
    if (context !== 'result') return;

    const profit = round.result?.profit ?? 0;
    if (profit < -5000) {
      insights.push({
        type: 'finance',
        level: 'warning',
        title: 'Hoher Verlust',
        message: 'Du hast in dieser Runde ein massives finanzielles Minus gemacht.',
        hint: 'Hohe Investitionskosten standen in keinem gesunden Verhältnis zu den erzielten Erlösen.',
      });
    }
  }

  private calculateAvgSoil(parcels: Parcel[]): number {
    if (!parcels || parcels.length === 0) return Number.NaN;
    return parcels.reduce((sum, p) => sum + p.soil, 0) / parcels.length;
  }

  private calculateAvgNutrition(parcels: Parcel[]): number {
    if (!parcels || parcels.length === 0) return Number.NaN;
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

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

type HarvestLimiterKey = 'pest' | 'weather' | 'nutrition' | 'soil' | 'organic' | 'other';

interface CropHarvestLoss {
  key: HarvestLimiterKey;
  crop: CropType;
  cropName: string;
  lossPct: number;
  relativeYield: number;
  singleTitle: string;
  singleMessage: string;
  singleLevel: 'warning' | 'danger';
  hint: string;
}

const LIMITER_COPY: Record<
  Exclude<HarvestLimiterKey, 'other'>,
  {
    consolidatedTitle: string;
    consolidatedMessage: (cropList: string) => string;
    singleMessage: (cropName: string, severity: string) => string;
    hint: string;
  }
> = {
  pest: {
    consolidatedTitle: 'Ertragsverluste durch Schädlingsbefall',
    consolidatedMessage: (cropList) => `Schädlingsbefall hat den Ertrag bei ${cropList} gemindert.`,
    singleMessage: (cropName, severity) =>
      `Schädlingsbefall war der Hauptgrund für den Ertragsverlust bei ${cropName} und hat den Ertrag ${severity} reduziert.`,
    hint: 'Nützlinge, angepasster Pflanzenschutz oder eine vielfältige Fruchtfolge schützen gefährdete Kulturen.',
  },
  weather: {
    consolidatedTitle: 'Wetterbedingte Ertragsverluste',
    consolidatedMessage: (cropList) => `Ungünstige Witterung hat den Ertrag bei ${cropList} gemindert.`,
    singleMessage: (cropName, severity) =>
      `Ungünstige Witterung war der Hauptfaktor bei ${cropName} und hat den Ertrag ${severity} gemindert.`,
    hint: 'Ein hoher Humusgehalt puffert Wetterextreme ab und stabilisiert die Erträge.',
  },
  nutrition: {
    consolidatedTitle: 'Nährstoffbedingte Ertragsverluste',
    consolidatedMessage: (cropList) =>
      `Unzureichende oder unausgewogene Nährstoffversorgung hat den Ertrag bei ${cropList} gedrückt.`,
    singleMessage: (cropName, severity) =>
      `Unzureichende oder unausgewogene Nährstoffversorgung hat den Ertrag bei ${cropName} ${severity} gedrückt.`,
    hint: 'Passe die Düngung und den Anbau von Leguminosen gezielt an den Nährstoffbedarf der Kultur an.',
  },
  soil: {
    consolidatedTitle: 'Bodenbedingte Ertragsverluste',
    consolidatedMessage: (cropList) => `Geschwächte Bodenfruchtbarkeit hat den Ertrag bei ${cropList} verringert.`,
    singleMessage: (cropName, severity) =>
      `Geschwächte Bodenfruchtbarkeit hat den Ertrag bei ${cropName} ${severity} verringert.`,
    hint: 'Reduziere schwere Maschinen und baue bodenaufbauende Kulturen wie Ackerbohnen, Erbsen oder Weidegras an.',
  },
  organic: {
    consolidatedTitle: 'Umstellungsbedingte Ertragsverluste',
    consolidatedMessage: (cropList) =>
      `Die laufende Umstellung auf ökologischen Landbau mindert den vermarktbaren Ertrag bei ${cropList}.`,
    singleMessage: (cropName, severity) =>
      `Die laufende Umstellung auf ökologischen Landbau mindert den vermarktbaren Ertrag bei ${cropName} ${severity}.`,
    hint: 'Nach Abschluss der Umstellungsphase erhältst du das Bio-Siegel und höhere Verkaufspreise.',
  },
};

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
    this.addPositiveInsights(insights, currentRound, context);

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

    // Collect crop losses and group by primary limiter to avoid near-duplicate cards
    const groupedLosses = new Map<HarvestLimiterKey, CropHarvestLoss[]>();
    for (const [crop, amount] of crops) {
      const loss = this.collectCropHarvestLoss(round, crop as CropType, amount);
      if (!loss) continue;
      const existing = groupedLosses.get(loss.key);
      if (existing) {
        existing.push(loss);
      } else {
        groupedLosses.set(loss.key, [loss]);
      }
    }

    for (const [key, group] of groupedLosses) {
      insights.push(this.buildHarvestLossInsight(key, group));
    }
  }

  private buildHarvestLossInsight(key: HarvestLimiterKey, group: CropHarvestLoss[]): AdvisorInsight {
    if (group.length === 1) {
      const single = group[0];
      return {
        type: 'harvest',
        level: single.singleLevel,
        title: single.singleTitle,
        message: single.singleMessage,
        hint: single.hint,
      };
    }

    const level = group.some((item) => item.relativeYield < 0.5) ? 'danger' : 'warning';
    const cropList = this.formatCropLossList(group);
    if (key === 'other') {
      return {
        type: 'harvest',
        level,
        title: 'Geringe Erträge bei mehreren Kulturen',
        message: `Der Ertrag lag bei ${cropList} deutlich unter dem Basisertrag.`,
        hint: group[0].hint,
      };
    }

    const copy = LIMITER_COPY[key];
    return {
      type: 'harvest',
      level,
      title: copy.consolidatedTitle,
      message: copy.consolidatedMessage(cropList),
      hint: copy.hint,
    };
  }

  private collectCropHarvestLoss(round: Round, crop: CropType, amount: number): CropHarvestLoss | null {
    const config = GAME_CONSTANTS.CROPS[crop];
    if (!config) return null;

    const cropParcels = round.parcelsSnapshot.filter((p) => p.crop === crop);
    if (cropParcels.length === 0) return null;

    const relativeYield = amount / cropParcels.length / config.baseYield;
    const cropName = this.getCropName(crop);
    const worst = this.findWorstYieldLimiter(cropParcels);

    if (worst) {
      const lossPct = Math.round((1 - worst.value) * 100);
      const severity = this.getSeverityLabel(lossPct);
      const copy = LIMITER_COPY[worst.key];
      return {
        key: worst.key,
        crop,
        cropName,
        lossPct,
        relativeYield,
        singleTitle: `Ertragsverlust bei ${cropName}`,
        singleMessage: copy.singleMessage(cropName, severity),
        singleLevel: relativeYield < 0.5 ? 'danger' : 'warning',
        hint: copy.hint,
      };
    }

    if (relativeYield < 0.4 && !round.result?.bioSiegel) {
      return {
        key: 'other',
        crop,
        cropName,
        lossPct: Math.round((1 - relativeYield) * 100),
        relativeYield,
        singleTitle: `Geringer Ertrag: ${cropName}`,
        singleMessage: `Der Ertrag bei ${cropName} fiel deutlich unter den Basisertrag.`,
        singleLevel: 'warning',
        hint: 'Prüfe die Bodenqualität, die Nährstoffversorgung und mögliche Schädlinge auf diesen Parzellen.',
      };
    }

    return null;
  }

  private findWorstYieldLimiter(
    cropParcels: Parcel[],
  ): { key: Exclude<HarvestLimiterKey, 'other'>; value: number } | null {
    const withFactors = cropParcels.filter((p) => p.factors !== undefined);
    if (withFactors.length === 0) return null;

    const avgFactor = (selector: (p: Parcel) => number) =>
      withFactors.reduce((sum, p) => sum + selector(p), 0) / withFactors.length;

    const limiters: Array<{ key: Exclude<HarvestLimiterKey, 'other'>; value: number }> = [
      { key: 'pest', value: avgFactor((p) => p.factors!.pestFactor) },
      { key: 'weather', value: avgFactor((p) => p.factors!.weatherFactor) },
      { key: 'nutrition', value: avgFactor((p) => p.factors!.nutritionFactor) },
      { key: 'soil', value: avgFactor((p) => p.factors!.soilFactor) },
      { key: 'organic', value: avgFactor((p) => p.factors!.organicFactor) },
    ];

    limiters.sort((a, b) => a.value - b.value);
    const worst = limiters[0];
    if (!worst || worst.value >= 0.85) return null;
    return worst;
  }

  private getSeverityLabel(lossPct: number): 'gering' | 'mäßig' | 'stark' {
    if (lossPct >= 30) return 'stark';
    if (lossPct >= 15) return 'mäßig';
    return 'gering';
  }

  private formatCropLossList(items: CropHarvestLoss[]): string {
    const formatted = items.map((item) => `${item.cropName} (${this.getSeverityLabel(item.lossPct)})`);
    if (formatted.length <= 1) return formatted[0] ?? '';
    if (formatted.length === 2) return `${formatted[0]} und ${formatted[1]}`;
    return `${formatted.slice(0, -1).join(', ')} und ${formatted[formatted.length - 1]}`;
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

  private isRapidNutritionDepletion(currentAvgNut: number, prevAvgNut: number): boolean {
    if (Number.isNaN(prevAvgNut)) return false;
    return (
      currentAvgNut < prevAvgNut &&
      currentAvgNut < GAME_CONSTANTS.NUTRITION.START * 0.8 &&
      prevAvgNut - currentAvgNut > 10
    );
  }

  private addNutritionInsights(
    insights: AdvisorInsight[],
    current: Round,
    previous: Round | undefined,
    context: AdvisorContext,
  ) {
    const currentAvgNut = this.calculateAvgNutrition(current.parcelsSnapshot);
    if (Number.isNaN(currentAvgNut)) return;

    if (currentAvgNut < GAME_CONSTANTS.NUTRITION.START * 0.5) {
      insights.push({
        type: 'nutrition',
        level: 'danger',
        title: 'Nährstoffmangel',
        message:
          context === 'result'
            ? 'Deine Felder sind nach der Ernte völlig ausgelaugt.'
            : 'Deine Felder weisen einen erheblichen Mangel an Nährstoffen auf.',
        hint: 'Ohne ausreichende Nährstoffe können Pflanzen nicht gesund wachsen und bringen kaum Ertrag.',
      });
    }

    if (previous && context === 'result') {
      const prevAvgNut = this.calculateAvgNutrition(previous.parcelsSnapshot);
      if (this.isRapidNutritionDepletion(currentAvgNut, prevAvgNut)) {
        insights.push({
          type: 'nutrition',
          level: 'warning',
          title: 'Hoher Nährstoffverbrauch',
          message: 'Diese Runde hat dem Boden überdurchschnittlich viele Nährstoffe entzogen.',
          hint: 'Starkzehrer benötigen viel Nahrung. Achte auf den Nährstoffhaushalt deiner Flächen.',
        });
      }
    }

    if (currentAvgNut > GAME_CONSTANTS.SOIL.NUTRITION_OVER_PENALTY_START) {
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

  private addPositiveInsights(insights: AdvisorInsight[], round: Round, context: AdvisorContext) {
    if (context !== 'result' || !round.result) return;

    const distinctNonFallowCrops = new Set(round.parcelsSnapshot.filter((p) => p.crop !== 'Fallow').map((p) => p.crop));
    const parcelsWithFactors = round.parcelsSnapshot.filter((p) => p.factors !== undefined);
    const noPestDamage =
      round.result.events?.vermin?.length === 0 ||
      (parcelsWithFactors.length > 0 && parcelsWithFactors.every((p) => p.factors!.pestFactor >= 0.99));

    if (distinctNonFallowCrops.size >= 3 && noPestDamage) {
      insights.push({
        type: 'harvest',
        level: 'info',
        title: 'Starke Artenvielfalt',
        message: 'Deine vielfältige Fruchtfolge hat Schädlingsbefall in diesem Jahr wirksam vorgebeugt.',
      });
    }

    const avgNutrition = this.calculateAvgNutrition(round.parcelsSnapshot);
    if (
      round.result.profit > 0 &&
      !Number.isNaN(avgNutrition) &&
      avgNutrition >= GAME_CONSTANTS.NUTRITION.START * 0.7 &&
      avgNutrition <= GAME_CONSTANTS.SOIL.NUTRITION_OVER_PENALTY_START
    ) {
      insights.push({
        type: 'nutrition',
        level: 'info',
        title: 'Ausgewogene Nährstoffbilanz',
        message: 'Guter Ertrag bei stabiler Nährstoffversorgung ohne Überdüngung.',
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

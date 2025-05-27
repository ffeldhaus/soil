import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Parcel, PlantationType } from '../../../../../../core/models/parcel.model'; // Using Parcel (camelCase)
import { RoundDecisionBase } from '../../../../../../core/models/round.model';
import { DynamicSvgBaseComponent } from '../dynamic-svg-base.component';

@Component({
  selector: 'app-nutrition-svg',
  standalone: true,
  imports: [CommonModule],
  template: `<div [innerHTML]="processedSvgContent" class="svg-container"></div>`,
  styleUrls: ['./nutrition-svg.component.scss']
})
export class NutritionSvgComponent extends DynamicSvgBaseComponent {
  private sanitizer = inject(DomSanitizer);
  processedSvgContent!: SafeHtml;

  private nutrientLevelColorMapping: { [key: string]: string } = {
    high: '#2E8B57',
    medium: '#FFBF00',
    low: '#D2691E',
    default: '#212529'
  };

  ngOnChanges() {
    this.updateSvgContent();
  }

  private getNutrientCategory(level: number): string {
    if (level >= 70) return 'high';
    if (level >= 40) return 'medium';
    return 'low';
  }

  private updateSvgContent() {
    if (!this.parcel) {
      this.processedSvgContent = '';
      return;
    }

    const decisions = this.playerDecisions as RoundDecisionBase | undefined;
    const nutrientLevel = this.parcel.nutrientLevel; // camelCase
    const currentPlantation = this.parcel.currentPlantation; // camelCase
    const soilQuality = this.parcel.soilQuality; // camelCase

    const nutrientCategory = this.getNutrientCategory(nutrientLevel);
    const nutrientColor = this.nutrientLevelColorMapping[nutrientCategory] || this.nutrientLevelColorMapping.default;

    const fertilizerUsed = decisions?.fertilize;
    const isLegume = currentPlantation === PlantationType.FIELD_BEAN;
    const manureAppliedLastRound = this.previousParcel?.currentPlantation === PlantationType.ANIMAL_HUSBANDRY;

    let svgElements: string[] = [];

    svgElements.push(`<svg width="100%" height="100%" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`);
    svgElements.push(`
      <style>
        .value-text { font-size: 14px; font-weight: bold; font-family: Arial, sans-serif; }
        .label-text { font-size: 10px; font-family: Arial, sans-serif; fill: #555; }
        .info-text { font-size: 9px; font-family: Arial, sans-serif; fill: #777; }
        .icon { width: 20px; height: 20px; }
        .title-text { font-size: 12px; font-weight: bold; text-anchor: middle; fill: #333; }
      </style>
    `);
    svgElements.push(`<text x="100" y="15" class="title-text">Nährstoffübersicht</text>`);

    svgElements.push(`<g transform="translate(10, 30)">`);
    svgElements.push(`<text x="0" y="0" class="value-text" fill="${nutrientColor}">${nutrientLevel?.toFixed(1)}%</text>`);
    svgElements.push(`<text x="0" y="12" class="label-text">Nährstoffgehalt</text>`);
    svgElements.push(`</g>`);

    svgElements.push(`<g transform="translate(100, 30)">`);
    svgElements.push(`<text x="0" y="0" class="value-text" fill="#444">${currentPlantation ? currentPlantation.valueOf() : 'Keine'}</text>`);
    svgElements.push(`<text x="0" y="12" class="label-text">Akt. Pflanze / Bedarf: ${this.getNutrientUptakeCategory(currentPlantation)}</text>`);
    svgElements.push(`</g>`);

    let iconX = 10;
    const iconY = 60;
    if (fertilizerUsed) {
      svgElements.push(`<image xlink:href="${this.getImagePath('fertilizer')}" x="${iconX}" y="${iconY}" class="icon" title="Konventionell gedüngt"/>`);
      iconX += 30;
    }
    if (manureAppliedLastRound) {
      svgElements.push(`<image xlink:href="${this.getImagePath('manure')}" x="${iconX}" y="${iconY}" class="icon" title="Organische Düngung (Mist)"/>`);
      iconX += 30;
    }
    if (isLegume) {
      svgElements.push(`<image xlink:href="assets/images/legume_fixation.png" x="${iconX}" y="${iconY}" class="icon" title="N-Fixierung (${currentPlantation ? currentPlantation.valueOf() : ''})"/>`);
      iconX += 30;
    }

    let textY = 95;
    if (soilQuality < 50) {
      svgElements.push(`<text x="10" y="${textY}" class="info-text" fill="${this.nutrientLevelColorMapping.low}">Niedrige Bodenqualität (${soilQuality.toFixed(0)}%) kann Nährstoffaufnahme behindern.</text>`);
      textY += 12;
    }
    if (currentPlantation && currentPlantation !== PlantationType.FALLOW && currentPlantation !== PlantationType.ANIMAL_HUSBANDRY) {
        svgElements.push(`<text x="10" y="${textY}" class="info-text">Nährstoffentzug durch ${currentPlantation.valueOf()}.</text>`);
        textY += 12;
    }
    if (nutrientLevel < 40 && (decisions && !decisions.fertilize && !manureAppliedLastRound && !isLegume)) {
         svgElements.push(`<text x="10" y="${textY}" class="info-text" fill="${this.nutrientLevelColorMapping.low}">Geringe Nährstoffe, keine Düngung.</text>`);
    }

    svgElements.push(`</svg>`);
    this.processedSvgContent = this.sanitizer.bypassSecurityTrustHtml(svgElements.join(''));
  }

  private getNutrientUptakeCategory(plantation: PlantationType | undefined | null): string {
    if (!plantation || plantation === PlantationType.FALLOW || plantation === PlantationType.ANIMAL_HUSBANDRY) return 'Kein/Sehr Gering';
    switch (plantation) {
      case PlantationType.POTATO:
      case PlantationType.SUGAR_BEET:
      case PlantationType.CORN:
        return 'Hoch';
      case PlantationType.WHEAT:
      case PlantationType.BARLEY:
        return 'Mittel';
      case PlantationType.OAT:
      case PlantationType.RYE:
        return 'Mittel-Niedrig';
      case PlantationType.FIELD_BEAN:
        return 'Niedrig (Fixiert N)';
      default:
        return 'Unbekannt';
    }
  }
}

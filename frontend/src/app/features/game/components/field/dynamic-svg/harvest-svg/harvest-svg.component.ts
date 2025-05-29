import { Component, inject, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Parcel, HarvestOutcome, PlantationType, CropSequenceEffect } from '../../../../../../core/models/parcel.model'; // Using Parcel (camelCase)
import { RoundDecisionBase } from '../../../../../../core/models/round.model';
import { DynamicSvgBaseComponent } from '../dynamic-svg-base.component';

@Component({
  selector: 'app-harvest-svg',
  standalone: true,
  imports: [CommonModule],
  template: `<div [innerHTML]="processedSvgContent" class="svg-container"></div>`,
  styleUrls: ['./harvest-svg.component.scss']
})
export class HarvestSvgComponent extends DynamicSvgBaseComponent implements OnChanges {
  private sanitizer = inject(DomSanitizer);
  processedSvgContent!: SafeHtml;

  private harvestOutcomeColorMapping: { [key: string]: string } = {
    [HarvestOutcome.VERY_HIGH.valueOf()]: '#196F3D',
    [HarvestOutcome.HIGH.valueOf()]: '#2ECC71',
    [HarvestOutcome.MODERATE.valueOf()]: '#F1C40F',
    [HarvestOutcome.LOW.valueOf()]: '#E67E22',
    [HarvestOutcome.VERY_LOW.valueOf()]: '#C0392B',
    [HarvestOutcome.NONE.valueOf()]: '#95A5A6',
    default: '#2C3E50'
  };

  ngOnChanges() {
    this.updateSvgContent();
  }

  private updateSvgContent() {
    if (!this.parcel) {
      this.processedSvgContent = '<svg width="100%" height="100%" viewBox="0 0 200 100"><text x="10" y="50" style="font-family: Arial, sans-serif; font-size: 12px;">Keine Daten für Parzelle.</text></svg>';
      return;
    }
    
    // Use currentPlantation from the parcel model (which is camelCase)
    if (this.parcel.currentPlantation === PlantationType.FALLOW || this.parcel.currentPlantation === PlantationType.ANIMAL_HUSBANDRY) {
      this.processedSvgContent = `<svg width="100%" height="100%" viewBox="0 0 200 100"><text x="50" y="50" text-anchor="middle" style="font-family: Arial, sans-serif; font-size: 12px;">Keine Ernte für ${this.parcel.currentPlantation.valueOf()}.</text></svg>`;
      return;
    }

    const decisions = this.playerDecisions as RoundDecisionBase | undefined;
    const weatherEvent = this.roundData?.weatherEvent;
    const verminEvent = this.roundData?.verminEvent;
    const playerMachineEfficiency = this.roundData?.playerMachineEfficiency;
    const isOrganic = this.roundData?.achievedOrganicCertification;

    const harvestYield = this.parcel.lastHarvestYieldDt;
    const harvestCategory = this.parcel.lastHarvestOutcomeCategory || HarvestOutcome.NONE;
    const harvestColor = this.harvestOutcomeColorMapping[harvestCategory.valueOf()] || this.harvestOutcomeColorMapping.default;

    const pesticideUsed = decisions?.pesticide;
    const biocontrolUsed = decisions?.biological_control;

    const svgElements: string[] = [];
    // Adjusted viewBox height to accommodate more factors if needed, e.g., 180 or 190
    svgElements.push(`<svg width="100%" height="100%" viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`);
    svgElements.push(`
      <style>
        .value-text { font-size: 16px; font-weight: bold; font-family: Arial, sans-serif; }
        .category-text { font-size: 12px; font-style: italic; font-family: Arial, sans-serif; }
        .label-text { font-size: 10px; font-family: Arial, sans-serif; fill: #444; }
        .factor-text { font-size: 9px; font-family: Arial, sans-serif; fill: #555; }
        .icon { width: 16px; height: 16px; vertical-align: middle; }
        .title-text { font-size: 12px; font-weight: bold; text-anchor: middle; fill: #333; }
      </style>
    `);
    svgElements.push(`<text x="100" y="15" class="title-text">Ernte: ${this.parcel.currentPlantation ? this.parcel.currentPlantation.valueOf() : 'N/A'}</text>`);

    svgElements.push(`<g transform="translate(10, 30)">`);
    svgElements.push(`<text x="0" y="0" class="value-text" fill="${harvestColor}">${harvestYield?.toFixed(1) ?? 'N/A'} dt</text>`);
    svgElements.push(`<text x="0" y="15" class="category-text" fill="${harvestColor}">(${this.formatHarvestCategory(harvestCategory)})</text>`);
    svgElements.push(`</g>`);

    let factorY = 55;
    const factorX = 10;
    const factorLineHeight = 14; // Increased line height slightly
    const iconTextXOffset = 20;

    // Weather
    svgElements.push(this.renderFactorItem(factorX, factorY, this.getImagePath(weatherEvent), `Wetter: ${weatherEvent || 'Normal'}`, iconTextXOffset));
    factorY += factorLineHeight;

    // Vermin & Control
    if (verminEvent && verminEvent !== 'Keine') {
      let verminText = `Schädling: ${verminEvent}`;
      let controlIconPath = this.getImagePath(verminEvent); 
      if (pesticideUsed) {
        verminText += ' (Pestizid)';
        controlIconPath = this.getImagePath('pesticide'); 
      } else if (biocontrolUsed) {
        verminText += ' (Nützling)';
        controlIconPath = 'assets/images/biological_control.png';
      }
      svgElements.push(this.renderFactorItem(factorX, factorY, controlIconPath, verminText, iconTextXOffset));
    } else {
      svgElements.push(this.renderFactorItem(factorX, factorY, this.getImagePath('Keine'), 'Schädlinge: Keine relevanten', iconTextXOffset));
    }
    factorY += factorLineHeight;

    // Soil Quality
    svgElements.push(this.renderFactorItem(factorX, factorY, 'assets/images/soil_icon.png', `Bodenqualität: ${this.parcel.soilQuality?.toFixed(0)}%`, iconTextXOffset));
    factorY += factorLineHeight;

    // Nutrient Level
    svgElements.push(this.renderFactorItem(factorX, factorY, 'assets/images/nutrient_icon.png', `Nährstoffe: ${this.parcel.nutrientLevel?.toFixed(0)}%`, iconTextXOffset));
    factorY += factorLineHeight;

    // Crop Sequence
    if (this.parcel.cropSequenceEffect && this.parcel.cropSequenceEffect !== CropSequenceEffect.NONE) {
      const csColor = this.parcel.cropSequenceEffect === CropSequenceEffect.BAD ? this.harvestOutcomeColorMapping[HarvestOutcome.VERY_LOW.valueOf()] : this.harvestOutcomeColorMapping[HarvestOutcome.HIGH.valueOf()];
      svgElements.push(this.renderFactorItem(factorX, factorY, 'assets/images/crop_sequence_icon.png', 
                         `Fruchtfolge: <tspan style="fill:${csColor}; font-weight:bold;">${this.parcel.cropSequenceEffect.toUpperCase()}</tspan>`, iconTextXOffset));
      factorY += factorLineHeight;
    }
    
    // Monoculture (if not already implied by BAD crop sequence from same crop)
    const isMonoculture = this.parcel.currentPlantation && this.parcel.previousPlantation === this.parcel.currentPlantation;
    if (isMonoculture && this.parcel.cropSequenceEffect !== CropSequenceEffect.BAD) {
        svgElements.push(this.renderFactorItem(factorX, factorY, 'assets/images/monoculture_icon.png', `Monokultur Effekt`, iconTextXOffset));
        factorY += factorLineHeight;
    }

    // Machine Efficiency
    if (playerMachineEfficiency !== undefined && playerMachineEfficiency !== null) {
      svgElements.push(this.renderFactorItem(factorX, factorY, 'assets/images/machine_icon.png', `Maschinen-Eff.: ${playerMachineEfficiency.toFixed(0)}%`, iconTextXOffset));
      factorY += factorLineHeight;
    }
    
    // Organic Status
    if (isOrganic) {
        svgElements.push(this.renderFactorItem(factorX, factorY, 'assets/images/organic_leaf.png', 'Ökologischer Anbau', iconTextXOffset));
        factorY += factorLineHeight;
    }

    svgElements.push(`</svg>`);
    this.processedSvgContent = this.sanitizer.bypassSecurityTrustHtml(svgElements.join(''));
  }

  private renderFactorItem(x: number, y: number, iconPath: string | undefined, text: string, textXOffset: number): string {
    const safeIconPath = iconPath || 'assets/images/transparent.png';
    return `
      <g transform="translate(${x}, ${y})">
        <image xlink:href="${safeIconPath}" x="0" y="-12" class="icon"/> <!-- Adjusted y for better alignment -->
        <text x="${textXOffset}" y="0" class="factor-text" dominant-baseline="middle">${text}</text>
      </g>
    `;
  }

  private formatHarvestCategory(category: HarvestOutcome): string {
    if (!category) return 'N/A';
    return category.toString().replace(/_/g, ' ').split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

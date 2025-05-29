import { Component, inject, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CropSequenceEffect, Parcel, PlantationType } from '../../../../../../core/models/parcel.model'; // Using Parcel (camelCase)
import { RoundDecisionBase } from '../../../../../../core/models/round.model';
import { DynamicSvgBaseComponent } from '../dynamic-svg-base.component';

@Component({
  selector: 'app-soil-svg',
  standalone: true,
  imports: [CommonModule],
  template: `<div [innerHTML]="processedSvgContent" class="svg-container"></div>`,
  styleUrls: ['./soil-svg.component.scss']
})
export class SoilSvgComponent extends DynamicSvgBaseComponent implements OnChanges {
  private sanitizer = inject(DomSanitizer);
  processedSvgContent!: SafeHtml;

  private soilQualityColorMapping: { [key: string]: string } = {
    good: '#28a745',
    ok: '#ffc107',
    poor: '#dc3545',
    default: '#212529'
  };

  private cropSequenceColorMapping: { [key: string]: string } = {
    [CropSequenceEffect.GOOD.valueOf()]: '#28a745',
    [CropSequenceEffect.OK.valueOf()]: '#6c757d',
    [CropSequenceEffect.BAD.valueOf()]: '#dc3545',
    [CropSequenceEffect.NONE.valueOf()]: '#adb5bd'
  };

  ngOnChanges() {
    this.updateSvgContent();
  }

  private getSoilQualityCategory(quality: number): string {
    if (quality >= 75) return 'good';
    if (quality >= 50) return 'ok';
    return 'poor';
  }

  private updateSvgContent() {
    if (!this.parcel) {
      this.processedSvgContent = '';
      return;
    }

    // playerDecisions comes from DynamicSvgBaseComponent, sourced from internalCurrentRoundData()?.decisions in FieldComponent
    const decisions = this.playerDecisions as RoundDecisionBase | undefined;
    
    // roundData from DynamicSvgBaseComponent is internalCurrentRoundData() from FieldComponent
    // which is PlayerComponent.selectedRoundDetailsSignal()
    // These properties are now camelCase from the RoundPublic/RoundWithFieldPublic model update
    const weatherEvent = this.roundData?.weatherEvent;
    const verminEvent = this.roundData?.verminEvent;
    const isOrganic = this.roundData?.achievedOrganicCertification;
    const playerMachineEfficiency = this.roundData?.playerMachineEfficiency;

    const soilQuality = this.parcel.soilQuality; // camelCase
    const soilQualityCategory = this.getSoilQualityCategory(soilQuality);
    const soilColor = this.soilQualityColorMapping[soilQualityCategory] || this.soilQualityColorMapping.default;

    const cropSequenceEff = this.parcel.cropSequenceEffect || CropSequenceEffect.NONE; // camelCase
    const cropSequenceColor = this.cropSequenceColorMapping[cropSequenceEff.valueOf()] || this.soilQualityColorMapping.default;

    const fertilizerUsed = decisions?.fertilize;
    const pesticideUsed = decisions?.pesticide;
    const biologicalControlUsed = decisions?.biological_control;
    
    const isMonoculture = this.parcel.currentPlantation &&
                          this.parcel.previousPlantation &&
                          this.parcel.currentPlantation === this.parcel.previousPlantation;
    const isMonocultureStreak = isMonoculture &&
                                this.parcel.prePreviousPlantation &&
                                this.parcel.currentPlantation === this.parcel.prePreviousPlantation;

    const svgElements: string[] = [];

    svgElements.push(`<svg width="100%" height="100%" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`);
    svgElements.push(`
      <style>
        .value-text { font-size: 14px; font-weight: bold; font-family: Arial, sans-serif; }
        .label-text { font-size: 10px; font-family: Arial, sans-serif; fill: #555; }
        .icon { width: 20px; height: 20px; }
        .title-text { font-size: 12px; font-weight: bold; text-anchor: middle; fill: #333; }
      </style>
    `);
    svgElements.push(`<text x="100" y="15" class="title-text">Bodenübersicht</text>`);

    svgElements.push(`<g transform="translate(10, 30)">`);
    svgElements.push(`<text x="0" y="0" class="value-text" fill="${soilColor}">${soilQuality?.toFixed(1)}%</text>`);
    svgElements.push(`<text x="0" y="12" class="label-text">Bodenqualität</text>`);
    svgElements.push(`</g>`);

    svgElements.push(`<g transform="translate(100, 30)">`);
    svgElements.push(`<text x="0" y="0" class="value-text" fill="${cropSequenceColor}">${cropSequenceEff.toString().toUpperCase()}</text>`);
    svgElements.push(`<text x="0" y="12" class="label-text">Fruchtfolge</text>`);
    svgElements.push(`</g>`);
    
    let iconX = 10;
    const iconY1 = 60;
    if (weatherEvent && weatherEvent !== 'Normal') {
      svgElements.push(`<image xlink:href="${this.getImagePath(weatherEvent)}" x="${iconX}" y="${iconY1}" class="icon" title="Wetter: ${weatherEvent}"/>`);
      iconX += 30;
    }
    if (verminEvent && verminEvent !== 'Keine') {
      svgElements.push(`<image xlink:href="${this.getImagePath(verminEvent)}" x="${iconX}" y="${iconY1}" class="icon" title="Schädling: ${verminEvent}"/>`);
      iconX += 30;
    }
    if (isOrganic) {
      svgElements.push(`<image xlink:href="assets/images/organic_leaf.png" x="${iconX}" y="${iconY1}" class="icon" title="Öko-zertifiziert"/>`);
      iconX += 30;
    }
    if (playerMachineEfficiency !== undefined && playerMachineEfficiency !== null) {
        svgElements.push(`<image xlink:href="assets/images/machine_icon.png" x="${iconX}" y="${iconY1}" class="icon" title="Maschinen-Eff.: ${playerMachineEfficiency.toFixed(0)}%"/>`);
        iconX += 30;
    }

    iconX = 10;
    const iconY2 = 90;
    if (fertilizerUsed) {
      svgElements.push(`<image xlink:href="${this.getImagePath('fertilizer')}" x="${iconX}" y="${iconY2}" class="icon" title="Gedüngt"/>`);
      iconX += 30;
    }
    if (pesticideUsed) {
      svgElements.push(`<image xlink:href="${this.getImagePath('pesticide')}" x="${iconX}" y="${iconY2}" class="icon" title="Pestizideinsatz"/>`);
      iconX += 30;
    }
    if (biologicalControlUsed) {
      svgElements.push(`<image xlink:href="assets/images/biological_control.png" x="${iconX}" y="${iconY2}" class="icon" title="Nützlingseinsatz"/>`);
      iconX += 30;
    }

    let textY = 125;
    if (this.previousParcel?.currentPlantation) {
      svgElements.push(`<text x="10" y="${textY}" class="label-text">Vorfrucht: ${this.previousParcel.currentPlantation}</text>`);
      textY += 12;
    }
    if (this.prePreviousParcel?.prePreviousPlantation) { // Corrected: should be prePreviousParcel.currentPlantation
      svgElements.push(`<text x="10" y="${textY}" class="label-text">Vor-Vorfrucht: ${this.prePreviousParcel.currentPlantation}</text>`);
      textY += 12;
    }

    if (isMonocultureStreak) {
      svgElements.push(`<text x="10" y="${textY}" class="label-text" fill="${this.soilQualityColorMapping.poor}">Starke Monokultur!</text>`);
    } else if (isMonoculture) {
      svgElements.push(`<text x="10" y="${textY}" class="label-text" fill="${this.soilQualityColorMapping.ok}">Monokultur</text>`);
    }

    svgElements.push(`</svg>`);
    this.processedSvgContent = this.sanitizer.bypassSecurityTrustHtml(svgElements.join(''));
  }
}

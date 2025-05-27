import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Parcel, PlantationType, CropSequenceEffect } from '../../../../../../core/models/parcel.model'; // Using Parcel (camelCase)
import { DynamicSvgBaseComponent } from '../dynamic-svg-base.component';

@Component({
  selector: 'app-cropsequence-svg',
  standalone: true,
  imports: [CommonModule],
  template: `<div [innerHTML]="processedSvgContent"></div>`,
})
export class CropsequenceSvgComponent extends DynamicSvgBaseComponent {
  // Ensure that parcel, previousParcel, and prePreviousParcel inputs in DynamicSvgBaseComponent
  // are also typed as Parcel (from parcel.model.ts) if they aren't already.
  // For this component, we assume they are correctly typed from the base or direct inputs.

  private sanitizer = inject(DomSanitizer);
  processedSvgContent!: SafeHtml;

  private colorMapping: { [key: string]: string } = {
    [CropSequenceEffect.GOOD.valueOf()]: '#008000', // green
    [CropSequenceEffect.OK.valueOf()]: '#DAA520',   // goldenrod
    [CropSequenceEffect.BAD.valueOf()]: '#FF0000',    // red
    [CropSequenceEffect.NONE.valueOf()]: '#808080'  // grey
  };

  ngOnChanges() { 
    this.updateSvgContent();
  }

  private updateSvgContent() {
    if (!this.parcel) {
        this.processedSvgContent = '';
        return;
    }
    // Accessing with camelCase now
    const cropEffect = this.parcel.cropSequenceEffect || CropSequenceEffect.NONE;
    const prevPlantation = this.previousParcel?.currentPlantation;
    const prePrevPlantation = this.prePreviousParcel?.currentPlantation;

    let svgString = `
    <svg width="180" height="60" viewBox="0 0 358.92996 118.14562" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <marker refX="0" refY="0" orient="auto" id="Arrow2Lend" style="overflow:visible">
          <path d="M 8.7185878,4.0337352 -2.2072895,0.01601326 8.7185884,-4.0017078 c -1.7454984,2.3720609 -1.7354408,5.6174519 -6e-7,8.035443 z" transform="matrix(-1.1,0,0,-1.1,-1.1,0)" style="font-size:12px;fill-rule:evenodd;stroke-width:0.625;stroke-linejoin:round"/>
        </marker>
      </defs>
      <g transform="translate(0, 0)">
        <path style="fill:none;stroke:#000000;stroke-width:3;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" d="m 92.005737,59 122.5874915,0" marker-end="url(#Arrow2Lend)"/>
        <text style="font-size:17.33588219px;font-family:Arial;fill:${this.getCropSequenceColor(cropEffect)};" x="153.79458" y="20.81143">${cropEffect.toUpperCase()}</text>
        
        <g transform="translate(10, 10) scale(0.6)">
          <image xlink:href="${this.getImagePath(prePrevPlantation?.valueOf())}" y="0" x="0" height="81.78" width="81.78"/>
          <text x="40.89" y="70" style="font-size:10px;font-weight:bold;text-align:center;fill:#ffffff;stroke:#000000;stroke-width:0.5px;" text-anchor="middle">${prePrevPlantation?.valueOf() || 'N/A'}</text>
        </g>
        
        <g transform="translate(220, 10) scale(0.6)">
          <image xlink:href="${this.getImagePath(prevPlantation?.valueOf())}" y="0" x="0" height="81.78" width="81.78"/>
          <text x="40.89" y="70" style="font-size:10px;font-weight:bold;text-align:center;fill:#ffffff;stroke:#000000;stroke-width:0.5px;" text-anchor="middle">${prevPlantation?.valueOf() || 'N/A'}</text>
        </g>
      </g>
    </svg>`;
    this.processedSvgContent = this.sanitizer.bypassSecurityTrustHtml(svgString);
  }

  private getCropSequenceColor(effect: CropSequenceEffect): string {
    return this.colorMapping[effect.valueOf()] || '#000000';
  }
}

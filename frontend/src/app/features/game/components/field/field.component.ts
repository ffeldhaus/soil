import { Component, OnInit, OnDestroy, AfterViewInit, signal, effect, inject, ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import Selectable from 'selectable.js';

import { CropsequenceSvgComponent } from './dynamic-svg/cropsequence-svg/cropsequence-svg.component';
import { SoilSvgComponent } from './dynamic-svg/soil-svg/soil-svg.component';
import { NutritionSvgComponent } from './dynamic-svg/nutrition-svg/nutrition-svg.component';
import { HarvestSvgComponent } from './dynamic-svg/harvest-svg/harvest-svg.component';
import { Parcel, PlantationType, CropSequenceEffect } from '../../../../core/models/parcel.model'; 
import { RoundWithFieldPublic, RoundPublic, Dict } from '../../../../core/models/round.model'; // Removed RoundDecisionBase
import { DisplayPlantationNamePipe } from '../../../../shared/pipes/display-plantation-name.pipe';
import { PlantationDialogComponent } from '../plantation-dialog/plantation-dialog.component';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-field',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    CropsequenceSvgComponent,
    SoilSvgComponent,
    NutritionSvgComponent,
    HarvestSvgComponent,
    DisplayPlantationNamePipe
  ],
  templateUrl: './field.component.html',
  styleUrls: ['./field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  // --- Inputs from PlayerComponent ---
  @Input() roundDisplayData: RoundWithFieldPublic | RoundPublic | null = null;
  @Input() isGameActive: boolean = false;
  @Input() isRoundSubmitted: boolean = false; // Specifically for the round being displayed

  @ViewChild('fieldGrid') fieldGrid!: ElementRef<HTMLDivElement>;
  private selectableInstance: Selectable | null = null;

  // Internal signals for managing field display
  readonly parcelsSignal = signal<Parcel[]>([]);
  readonly overlaySignal = signal<string | null>(null);
  // This internal signal mirrors the relevant parts of roundDisplayData for SVG components, etc.
  readonly internalCurrentRoundData = signal<RoundWithFieldPublic | RoundPublic | null>(null);

  private _tempParcelPlantationChoices: Dict<number, PlantationType> = {};
  private _selectedParcelNumbersForDialog: number[] = [];

  constructor() {
    // Effect to update parcelsSignal based on internalCurrentRoundData and temporary choices
    effect(() => {
      const roundData = this.internalCurrentRoundData();
      if (roundData && roundData.field_state) {
        this.parcelsSignal.set(
          roundData.field_state.parcels.map(p => ({
            ...p,
            currentPlantation: this._tempParcelPlantationChoices[p.parcelNumber] || p.currentPlantation
          }))
        );
      } else if (roundData && roundData.parcels) { // If past round data (RoundPublic) which might just have parcels list directly
        this.parcelsSignal.set(
          roundData.parcels.map(p => ({
            ...p,
            currentPlantation: this._tempParcelPlantationChoices[p.parcelNumber] || p.currentPlantation
          }))
        );
      } else {
        this.parcelsSignal.set([]);
      }
      this.cdr.markForCheck();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['roundDisplayData']) {
      const newRoundData = changes['roundDisplayData'].currentValue;
      this.internalCurrentRoundData.set(newRoundData);
      // When round data changes (e.g., switching tabs in PlayerComponent),
      // clear temporary choices for the new round if it's not submitted.
      if (!this.isRoundSubmitted) { 
        this.clearTemporaryChoices(false); // Pass false to not reset the main round data signal
      } else {
        // If round is submitted, ensure selectable is disabled or interactions are blocked
        this.disableInteractions();
      }
      this.cdr.markForCheck();
    }
    if (changes['isRoundSubmitted'] || changes['isGameActive']) {
        this.updateInteractionState();
    }
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.overlaySignal.set(params['overlay'] || null);
    });
  }

  ngAfterViewInit() {
    this.initializeSelectable();
    this.updateInteractionState(); // Set initial state based on inputs
  }
  
  private initializeSelectable(): void {
    if (this.fieldGrid && this.fieldGrid.nativeElement && !this.selectableInstance) {
      this.selectableInstance = new Selectable(this.fieldGrid.nativeElement, {
        filter: '.parcel-container',
        toggle: true,
        saveState: false,
        lasso: {
          border: '2px dotted #007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)'
        }
      });

      this.selectableInstance.on('selectable.select', (item: HTMLElement) => {
        if(!this.canInteract()) return;
        item.classList.add('parcel-selected');
        this.updateSelectedParcelNumbersForDialog();
      });
      this.selectableInstance.on('selectable.deselect', (item: HTMLElement) => {
        if(!this.canInteract()) return;
        item.classList.remove('parcel-selected');
        this.updateSelectedParcelNumbersForDialog();
      });
      this.selectableInstance.on('end', () => { // Removed event: any
        if (this.canInteract() && this._selectedParcelNumbersForDialog.length > 0) {
          this.openPlantationDialog(this._selectedParcelNumbersForDialog);
        } else if (!this.canInteract() && this._selectedParcelNumbersForDialog.length > 0) {
            this.selectableInstance?.clear();
            this.removeSelectedClasses();
            this._selectedParcelNumbersForDialog = [];
        }
      });
    } else if (!this.fieldGrid || !this.fieldGrid.nativeElement) {
      // console.error("Field grid element not found for Selectable.js initialization");
    }
  }

  private updateInteractionState(): void {
    if (this.selectableInstance) {
      if (this.canInteract()) {
        this.selectableInstance.enable();
      } else {
        this.selectableInstance.disable();
        this.selectableInstance.clear();
        this.removeSelectedClasses();
      }
    }
  }

  private disableInteractions(): void {
     if (this.selectableInstance) {
        this.selectableInstance.disable();
        this.selectableInstance.clear();
        this.removeSelectedClasses();
      }
  }

  private canInteract(): boolean {
    return this.isGameActive && !this.isRoundSubmitted;
  }

  private updateSelectedParcelNumbersForDialog(): void {
    if (!this.selectableInstance) return;
    this._selectedParcelNumbersForDialog = this.selectableInstance.getSelectedItems().map((el: HTMLElement) => {
        const parcelNumAttr = el.getAttribute('data-parcel-number'); // el is already HTMLElement
        return parcelNumAttr ? parseInt(parcelNumAttr, 10) : -1;
      }).filter(num => num !== -1);
  }

  ngOnDestroy() {
    if (this.selectableInstance) {
      this.selectableInstance.destroy();
      this.selectableInstance = null;
    }
  }

  public getCurrentParcelPlantationChoices(): Dict<number, PlantationType> {
    return { ...this._tempParcelPlantationChoices };
  }

  public clearTemporaryChoices(resetRoundDataSignal: boolean = true): void {
    this._tempParcelPlantationChoices = {};
    if (resetRoundDataSignal) {
        const currentInternalData = this.internalCurrentRoundData();
        if (currentInternalData) {
            // Re-trigger effect by setting the signal with a fresh copy (or original if available)
            this.internalCurrentRoundData.set({ ...currentInternalData }); 
        }
    } else {
        // If not resetting round data, just ensure parcelsSignal reflects cleared choices
        const roundData = this.internalCurrentRoundData();
        if (roundData && roundData.field_state) {
            this.parcelsSignal.set(roundData.field_state.parcels.map(p => ({...p}))); // Map to new array to trigger changes
        } else if (roundData && roundData.parcels) {
            this.parcelsSignal.set(roundData.parcels.map(p => ({...p})));
        }
    }
    if (this.selectableInstance) {
      this.selectableInstance.clear();
      this.removeSelectedClasses();
    }
    this._selectedParcelNumbersForDialog = [];
  }

  private removeSelectedClasses(): void {
    this.fieldGrid?.nativeElement?.querySelectorAll('.parcel-selected').forEach(el => {
      el.classList.remove('parcel-selected');
    });
  }

  private openPlantationDialog(parcelNumbers: number[]): void {
    if (!this.canInteract()) {
        this.notificationService.showInfo(this.isRoundSubmitted ? 
            "This round is already submitted. No changes allowed." : 
            "Game is not active. No changes allowed.");
        this.selectableInstance?.clear();
        this.removeSelectedClasses();
        this._selectedParcelNumbersForDialog = [];
        return;
    }
    const dialogRef = this.dialog.open(PlantationDialogComponent, {
      width: 'auto',
      minWidth: '300px',
      maxWidth: '500px',
      data: { selectedParcelNumbers: parcelNumbers }
    });

    dialogRef.afterClosed().subscribe((chosenPlantation: PlantationType | undefined) => {
      if (chosenPlantation && parcelNumbers.length > 0) {
        this.updateLocalParcelPlantations(parcelNumbers, chosenPlantation);
      }
      this.selectableInstance?.clear();
      this.removeSelectedClasses();
      this._selectedParcelNumbersForDialog = [];
    });
  }

  private updateLocalParcelPlantations(parcelNumbers: number[], plantation: PlantationType): void {
    let changesMade = false;
    parcelNumbers.forEach(num => {
      if (this._tempParcelPlantationChoices[num] !== plantation) {
        this._tempParcelPlantationChoices[num] = plantation;
        changesMade = true;
      }
    });

    if (changesMade) {
      const roundData = this.internalCurrentRoundData();
      if (roundData && roundData.field_state) {
         this.parcelsSignal.set(
          roundData.field_state.parcels.map(p => ({
            ...p,
            currentPlantation: this._tempParcelPlantationChoices[p.parcelNumber] || p.currentPlantation
          }))
        );
      } else if (roundData && roundData.parcels) { // For RoundPublic from past rounds
         this.parcelsSignal.set(
          roundData.parcels.map(p => ({
            ...p,
            currentPlantation: this._tempParcelPlantationChoices[p.parcelNumber] || p.currentPlantation
          }))
        );
      }
      this.notificationService.showInfo('Plantation choices updated locally. Submit round to save.');
    }
  }
  
  getPreviousParcelFor(currentParcel: Parcel): Parcel | undefined {
    if (!currentParcel.previousPlantation) return undefined;
    return {
      ...currentParcel,
      parcelNumber: currentParcel.parcelNumber,
      currentPlantation: currentParcel.previousPlantation,
      soilQuality: currentParcel.previousSoilQuality !== undefined && currentParcel.previousSoilQuality !== null ? currentParcel.previousSoilQuality : currentParcel.soilQuality,
      nutrientLevel: currentParcel.previousNutrientLevel !== undefined && currentParcel.previousNutrientLevel !== null ? currentParcel.previousNutrientLevel : currentParcel.nutrientLevel,
      lastHarvestYieldDt: 0, 
      cropSequenceEffect: CropSequenceEffect.NONE 
    } as Parcel;
  }

  getPrePreviousParcelFor(currentParcel: Parcel): Parcel | undefined {
    if (!currentParcel.prePreviousPlantation) return undefined;
    return {
      ...currentParcel,
      parcelNumber: currentParcel.parcelNumber,
      currentPlantation: currentParcel.prePreviousPlantation,
      soilQuality: currentParcel.prePreviousSoilQuality !== undefined && currentParcel.prePreviousSoilQuality !== null ? currentParcel.prePreviousSoilQuality : currentParcel.soilQuality,
      nutrientLevel: currentParcel.prePreviousNutrientLevel !== undefined && currentParcel.prePreviousNutrientLevel !== null ? currentParcel.prePreviousNutrientLevel : currentParcel.nutrientLevel,
      lastHarvestYieldDt: 0,
      cropSequenceEffect: CropSequenceEffect.NONE
    } as Parcel;
  }

  getParcelCssClasses(parcel: Parcel): string[] {
    const classes = [parcel.currentPlantation.toString().toLowerCase()];
    // Add more classes based on parcel state if needed, e.g., if it has a temporary choice
    return classes;
  }

  onParcelContextMenu(event: MouseEvent /* Removed _parcel: Parcel */) {
    event.preventDefault();
  }
}

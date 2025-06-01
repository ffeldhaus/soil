import { Component, OnInit, OnDestroy, signal, computed, effect, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit, WritableSignal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

// Import Selectable and its types correctly
import Selectable, { type SelectableNode } from 'selectable.js'; 

// Angular Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

// Model Imports
import { Parcel, FieldPublic } from '../../../core/models/parcel.model'; 
import { RoundWithFieldPublic, RoundPublic } from '../../../core/models/round.model';


enum HarvestOutcome {
  VERY_HIGH = 'VERY_HIGH', HIGH = 'HIGH', MAESSIG = 'MAESSIG', NIEDRIG = 'NIEDRIG', SEHR_NIEDRIG = 'SEHR_NIEDRIG', KEINER = 'KEINER'
}
enum CropSequenceEffect {
  GUT = 'GUT', OK = 'OK', SCHLECHT = 'SCHLECHT', KEINE = 'KEINE'
}

@Component({
  selector: 'app-player-field',
  templateUrl: './player-field.component.html',
  styleUrls: ['./player-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatButtonModule
  ]
})
export class PlayerFieldComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('parcelGrid') parcelGrid!: ElementRef<HTMLDivElement>;
  private selectableInstance: Selectable | null = null; 

  parcels = signal<Parcel[]>([]); 
  fieldState = signal<RoundWithFieldPublic | RoundPublic | null>(null); 
  isLoading = signal<boolean>(true);
  selectedParcels: WritableSignal<Set<number>> = signal(new Set<number>());
  currentOverlay = signal<string | null>(null);
  isCurrentRound = computed(() => this.fieldState()?.roundNumber === this.latestRoundNumberFromGameService());
  isFirstRound = computed(() => this.fieldState()?.roundNumber === 1);

  constructor(@Inject(PLATFORM_ID) private platformId: object) { 
    effect(() => { 
      if (isPlatformBrowser(this.platformId)) { 
        Promise.resolve().then(() => this.initializeSelectable());
      } else {
        if (this.selectableInstance) {
            this.selectableInstance.destroy();
            this.selectableInstance = null;
        }
      }
    });
  }

  ngOnInit(): void {
    setTimeout(() => {
      const exampleParcels: Parcel[] = Array.from({ length: 30 }, (_, i) => ({
        parcelNumber: i + 1,
        currentPlantation: ['Ackerbohne', 'Hafer', 'Kartoffel', 'Weizen', 'Mais', 'Zuckerruebe', 'Brachland', 'Tiere'][i % 8] as any, 
        soilQuality: 70 + Math.random() * 30,
        nutrientLevel: 60 + Math.random() * 40,
        lastHarvestOutcomeCategory: Object.values(HarvestOutcome)[i % Object.keys(HarvestOutcome).length] as any, 
        lastHarvestYieldDt: Math.floor(Math.random() * 100),
        cropSequenceEffect: Object.values(CropSequenceEffect)[i % Object.keys(CropSequenceEffect).length] as any, 
        // Properties below might not be part of Parcel, ensure they are before uncommenting or provide defaults
        // id: `parcel-${i+1}`,
        // isCultivated: true, 
        // fieldNumber: 1, 
        // playerId: 'player1' 
      }));
      this.parcels.set(exampleParcels);
      
      const exampleFieldState: FieldPublic = {
        parcels: exampleParcels 
      };

      this.fieldState.set({ 
        roundNumber: 2, 
        gameId: 'game1', 
        playerId: 'player1', 
        isSubmitted: false, 
        id: 'round1', 
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fieldState: exampleFieldState,
      }); 
      this.isLoading.set(false);
    }, 500);
  }

  ngAfterViewInit(): void { 
    if (isPlatformBrowser(this.platformId)) {
      this.initializeSelectable();
    }
  }

  private initializeSelectable(): void {
    if (!isPlatformBrowser(this.platformId) || typeof Selectable === 'undefined') { 
      return;
    }

    if (this.selectableInstance) {
      this.selectableInstance.destroy();
      this.selectableInstance = null;
    }

    if (this.parcelGrid && this.parcelGrid.nativeElement && this.parcels().length > 0) {
      const isInteractable = this.isCurrentRound();

      this.selectableInstance = new Selectable({ 
        filter: '.parcel-cell',
        appendTo: this.parcelGrid.nativeElement,
        toggle: true,
        lasso: {
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
        },
      });

      if (!isInteractable) {
        this.selectableInstance.disable();
      } else {
        this.selectableInstance.enable();
      }

      this.selectableInstance.on('select', (itemOrItems: SelectableNode | SelectableNode[]) => { 
        const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
        items.forEach((item: SelectableNode) => { 
          const parcelNumber = parseInt(item.node.dataset['parcelNumber']!, 10); 
          if (!isNaN(parcelNumber) && isInteractable) {
            this.selectedParcels.update(currentSelection => {
              const newSelection = new Set(currentSelection);
              newSelection.add(parcelNumber);
              return newSelection;
            });
          }
        });
      });

      this.selectableInstance.on('deselect', (itemOrItems: SelectableNode | SelectableNode[]) => { 
        const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
        items.forEach((item: SelectableNode) => { 
          const parcelNumber = parseInt(item.node.dataset['parcelNumber']!, 10); 
          if (!isNaN(parcelNumber) && this.isCurrentRound()) { 
            this.selectedParcels.update(currentSelection => {
              const newSelection = new Set(currentSelection);
              newSelection.delete(parcelNumber);
              return newSelection;
            });
          }
        });
      });
    }
  }

  ngOnDestroy(): void {
    if (this.selectableInstance) {
      this.selectableInstance.destroy();
    }
  }

  // Dummy methods
  latestRoundNumberFromGameService(): number { return 5; }
  navigateToPreviousRound() { /* console.log('Navigating to previous round'); */ }
  navigateToNextRound() { /* console.log('Navigating to next round'); */ }
  openPlantationDialog() { /* console.log('Opening plantation dialog'); */ }
  getParcelImagePath(plantation: string): string { return `assets/images/crops/${plantation?.toLowerCase()}.jpg`; }
  getParcelPlantationClass(plantation: string): string { return `plantation-${plantation?.toLowerCase()}`; }
  getSoilQualityClass(quality: number): string { return `soil-${Math.round(quality / 20)}`; }
  getNutrientLevelClass(level: number): string { return `nutrient-${Math.round(level / 20)}`; }
  getHarvestOutcomeClass(outcome: HarvestOutcome | string | undefined | null): string { return outcome ? `harvest-${outcome.toString().toLowerCase().replace(/_/g, '-')}` : ''; }
  getCropSequenceClass(effect: CropSequenceEffect | string | undefined | null): string { return effect ? `sequence-${effect.toString().toLowerCase()}` : ''; }
  isSelected(parcelNumber: number): boolean { return this.selectedParcels().has(parcelNumber); }
}

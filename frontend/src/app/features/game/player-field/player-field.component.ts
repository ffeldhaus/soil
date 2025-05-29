import { Component, OnInit, OnDestroy, signal, computed, effect, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit, WritableSignal, PLATFORM_ID, Inject } from '@angular/core'; // Removed inject
import { isPlatformBrowser, CommonModule } from '@angular/common'; // Added isPlatformBrowser

// Remove the static import of Selectable if it's only used client-side
// import Selectable from 'selectable.js'; 
// Type alias for Selectable will be removed, direct usage of imported types from .d.ts if possible, or specific types for SelectableLib
import { type Selectable as SelectableType, type SelectableNode } from './selectable'; // Assuming selectable.d.ts is in the same folder or path adjusted

// Angular Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';


// (Keep your existing interfaces like Parcel, FieldState, HarvestOutcome, CropSequenceEffect)
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
  private selectableInstance: SelectableType | null = null; 
  private SelectableLib: typeof SelectableType | null = null; // To store the dynamically imported library

  parcels = signal<Parcel[]>([]); // Changed any[] to Parcel[]
  fieldState = signal<RoundWithFieldPublic | RoundPublic | null>(null); // Changed any to specific types
  isLoading = signal<boolean>(true);
  selectedParcels: WritableSignal<Set<number>> = signal(new Set<number>());
  currentOverlay = signal<string | null>(null);
  isCurrentRound = computed(() => this.fieldState()?.roundNumber === this.latestRoundNumberFromGameService());
  isFirstRound = computed(() => this.fieldState()?.roundNumber === 1);

  constructor(@Inject(PLATFORM_ID) private platformId: object) { // Inject PLATFORM_ID
    effect(async () => { // Make effect async for dynamic import
      // const currentParcels = this.parcels(); // Unused
      // const isInteractable = this.isCurrentRound(); // Unused
      
      if (isPlatformBrowser(this.platformId)) { // Check if browser
        // Ensure SelectableLib is loaded before calling initializeSelectable
        if (!this.SelectableLib) {
            try {
                this.SelectableLib = (await import('selectable.js')).default;
            } catch { // Removed e
                // console.error('Error loading selectable.js');
                return; // Don't proceed if library fails to load
            }
        }
        // Promise.resolve() for microtask timing might still be good practice
        Promise.resolve().then(() => this.initializeSelectable());
      } else {
        // If not in browser, ensure instance is destroyed if it somehow exists
        if (this.selectableInstance) {
            this.selectableInstance.destroy();
            this.selectableInstance = null;
        }
      }
    });
  }

  ngOnInit(): void {
    setTimeout(() => {
      const exampleParcels = Array.from({ length: 30 }, (_, i) => ({
        parcelNumber: i + 1,
        currentPlantation: ['Ackerbohne', 'Hafer', 'Kartoffel', 'Weizen', 'Mais', 'Zuckerruebe', 'Brachland', 'Tiere'][i % 8],
        soilQuality: 70 + Math.random() * 30,
        nutrientLevel: 60 + Math.random() * 40,
        lastHarvestOutcomeCategory: Object.values(HarvestOutcome)[i % Object.keys(HarvestOutcome).length],
        lastHarvestYieldDt: Math.floor(Math.random() * 100),
        cropSequenceEffect: Object.values(CropSequenceEffect)[i % Object.keys(CropSequenceEffect).length]
      }));
      this.parcels.set(exampleParcels);
      this.fieldState.set({ roundNumber: 2 });
      this.isLoading.set(false);
    }, 500);
  }

  async ngAfterViewInit(): Promise<void> { // Make async for dynamic import
    if (isPlatformBrowser(this.platformId)) {
        if (!this.SelectableLib) {
            try {
                this.SelectableLib = (await import('selectable.js')).default;
            } catch { // Removed e
                // console.error('Error loading selectable.js in ngAfterViewInit');
                return;
            }
        }
      this.initializeSelectable();
    }
  }

  private initializeSelectable(): void {
    if (!isPlatformBrowser(this.platformId) || !this.SelectableLib) { // Guard against non-browser or unloaded library
      return;
    }

    if (this.selectableInstance) {
      this.selectableInstance.destroy();
      this.selectableInstance = null;
    }

    if (this.parcelGrid && this.parcelGrid.nativeElement && this.parcels().length > 0) {
      const isInteractable = this.isCurrentRound();

      this.selectableInstance = new this.SelectableLib({ // Use the loaded library
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

      this.selectableInstance.on('select', (itemOrItems: SelectableNode | SelectableNode[]) => { // Changed event: any
        const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
        items.forEach((item: SelectableNode) => { // Changed item: any to SelectableNode
          const parcelNumber = parseInt(item.node.dataset.parcelNumber!, 10); // Added non-null assertion for dataset
          if (!isNaN(parcelNumber) && isInteractable) {
            this.selectedParcels.update(currentSelection => {
              const newSelection = new Set(currentSelection);
              newSelection.add(parcelNumber);
              return newSelection;
            });
          }
        });
        // console.log('Selected parcels (selectable.js):', this.selectedParcels());
      });

      this.selectableInstance.on('deselect', (itemOrItems: SelectableNode | SelectableNode[]) => { // Changed event: any
        const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
        items.forEach((item: SelectableNode) => { // Changed item: any to SelectableNode
          const parcelNumber = parseInt(item.node.dataset.parcelNumber!, 10); // Added non-null assertion for dataset
          if (!isNaN(parcelNumber) && this.isCurrentRound()) { // Used isCurrentRound() directly
            this.selectedParcels.update(currentSelection => {
              const newSelection = new Set(currentSelection);
              newSelection.delete(parcelNumber);
              return newSelection;
            });
          }
        });
        // console.log('Selected parcels (selectable.js after deselect):', this.selectedParcels());
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

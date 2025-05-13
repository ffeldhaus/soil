import { Component, OnInit, OnDestroy, signal, computed, effect, inject, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit, WritableSignal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common'; // Added isPlatformBrowser

// Remove the static import of Selectable if it's only used client-side
// import Selectable from 'selectable.js'; 
// Declare Selectable type for when it's dynamically imported
type Selectable = any; // You can use the more detailed type from your .d.ts file if preferred

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
  private selectableInstance: Selectable | null = null; // Type Selectable might need to be 'any' or a more specific type if using dynamic import
  private SelectableLib: any = null; // To store the dynamically imported library

  parcels = signal<any[]>([]);
  fieldState = signal<any | null>(null);
  isLoading = signal<boolean>(true);
  selectedParcels: WritableSignal<Set<number>> = signal(new Set<number>());
  currentOverlay = signal<string | null>(null);
  isCurrentRound = computed(() => this.fieldState()?.round_number === this.latestRoundNumberFromGameService());
  isFirstRound = computed(() => this.fieldState()?.round_number === 1);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { // Inject PLATFORM_ID
    effect(async () => { // Make effect async for dynamic import
      const currentParcels = this.parcels();
      const isInteractable = this.isCurrentRound();
      
      if (isPlatformBrowser(this.platformId)) { // Check if browser
        // Ensure SelectableLib is loaded before calling initializeSelectable
        if (!this.SelectableLib) {
            try {
                this.SelectableLib = (await import('selectable.js')).default;
            } catch (e) {
                console.error('Error loading selectable.js', e);
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
        parcel_number: i + 1,
        current_plantation: ['Ackerbohne', 'Hafer', 'Kartoffel', 'Weizen', 'Mais', 'Zuckerruebe', 'Brachland', 'Tiere'][i % 8],
        soil_quality: 70 + Math.random() * 30,
        nutrient_level: 60 + Math.random() * 40,
        last_harvest_outcome_category: Object.values(HarvestOutcome)[i % Object.keys(HarvestOutcome).length],
        last_harvest_yield_dt: Math.floor(Math.random() * 100),
        crop_sequence_effect: Object.values(CropSequenceEffect)[i % Object.keys(CropSequenceEffect).length]
      }));
      this.parcels.set(exampleParcels);
      this.fieldState.set({ round_number: 2 });
      this.isLoading.set(false);
    }, 500);
  }

  async ngAfterViewInit(): Promise<void> { // Make async for dynamic import
    if (isPlatformBrowser(this.platformId)) {
        if (!this.SelectableLib) {
            try {
                this.SelectableLib = (await import('selectable.js')).default;
            } catch (e) {
                console.error('Error loading selectable.js in ngAfterViewInit', e);
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

      this.selectableInstance.on('select', (event: any) => {
        const items = Array.isArray(event) ? event : [event];
        items.forEach((item: any) => { // Add type for item
          const parcelNumber = parseInt(item.node.dataset.parcelNumber, 10);
          if (!isNaN(parcelNumber) && isInteractable) {
            this.selectedParcels.update(currentSelection => {
              const newSelection = new Set(currentSelection);
              newSelection.add(parcelNumber);
              return newSelection;
            });
          }
        });
        console.log('Selected parcels (selectable.js):', this.selectedParcels());
      });

      this.selectableInstance.on('deselect', (event: any) => {
        const items = Array.isArray(event) ? event : [event];
        items.forEach((item: any) => { // Add type for item
          const parcelNumber = parseInt(item.node.dataset.parcelNumber, 10);
          if (!isNaN(parcelNumber) && isInteractable) {
            this.selectedParcels.update(currentSelection => {
              const newSelection = new Set(currentSelection);
              newSelection.delete(parcelNumber);
              return newSelection;
            });
          }
        });
        console.log('Selected parcels (selectable.js after deselect):', this.selectedParcels());
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
  navigateToPreviousRound() { console.log('Navigating to previous round'); }
  navigateToNextRound() { console.log('Navigating to next round'); }
  openPlantationDialog() { console.log('Opening plantation dialog'); }
  getParcelImagePath(plantation: string): string { return `assets/images/crops/${plantation?.toLowerCase()}.jpg`; }
  getParcelPlantationClass(plantation: string): string { return `plantation-${plantation?.toLowerCase()}`; }
  getSoilQualityClass(quality: number): string { return `soil-${Math.round(quality / 20)}`; }
  getNutrientLevelClass(level: number): string { return `nutrient-${Math.round(level / 20)}`; }
  getHarvestOutcomeClass(outcome: any): string { return outcome ? `harvest-${outcome.toString().toLowerCase().replace(/_/g, '-')}` : ''; }
  getCropSequenceClass(effect: any): string { return effect ? `sequence-${effect.toString().toLowerCase()}` : ''; }
  isSelected(parcelNumber: number): boolean { return this.selectedParcels().has(parcelNumber); }
}

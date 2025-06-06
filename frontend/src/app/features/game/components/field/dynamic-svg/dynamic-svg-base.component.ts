import { Input, Directive } from '@angular/core'; // Changed to Directive as it's a base
import { Parcel } from '../../../../../core/models/parcel.model'; // Changed ParcelInDB to Parcel
import { RoundDecisionBase } from '../../../../../core/models/round.model'; // Import for playerDecisions

// Define a more specific type for roundData if possible
export interface RoundContextData {
  weatherEvent?: string;
  verminEvent?: string;
  achievedOrganicCertification?: boolean; // Added
  playerMachineEfficiency?: number; // Added
  // Add other relevant properties from roundData if known
}

@Directive() // Use @Directive for base class without its own template
export abstract class DynamicSvgBaseComponent {
  @Input() parcel!: Parcel; // Changed ParcelInDB to Parcel
  @Input() previousParcel?: Parcel; // Changed ParcelInDB to Parcel
  @Input() prePreviousParcel?: Parcel; // Changed ParcelInDB to Parcel
  @Input() roundData?: RoundContextData; // General round data if needed (weather, vermin, decisions)
  @Input() playerDecisions?: RoundDecisionBase; // Specific player decisions for the round

  // Image path mapping - similar to original Rails helper
  // This should ideally be a service or a constant/enum for better management
  protected imagePathMap: { [key: string]: string } = {
    'Brachland': 'assets/images/brachland.jpg',
    'Ackerbohne': 'assets/images/ackerbohne.jpg',
    'Gerste': 'assets/images/gerste.jpg',
    'Hafer': 'assets/images/hafer.jpg',
    'Kartoffel': 'assets/images/kartoffel.jpg',
    'Mais': 'assets/images/mais.jpg',
    'Roggen': 'assets/images/roggen.jpg',
    'Tiere': 'assets/images/tiere.jpg',
    'Weizen': 'assets/images/weizen.jpg',
    'Zuckerruebe': 'assets/images/zuckerruebe.jpg',
    // Add paths for vermin, weather icons if they are separate images
    'Blattlaus': 'assets/images/blattlaus.png', // Placeholder
    'Fritfliege': 'assets/images/fritfliege.png', // Placeholder
    'Kartoffelkäfer': 'assets/images/kartoffelkaefer.png', // Placeholder
    'Maiszünsler': 'assets/images/maiszuensler.png', // Placeholder
    'Drahtwurm': 'assets/images/drahtwurm.jpg', // Placeholder
    'Normal': 'assets/images/weather_normal.png', // Placeholder
    'Dürre': 'assets/images/weather_drought.png', // Placeholder
    'Überschwemmung': 'assets/images/weather_flood.png', // Placeholder
    'Kälteeinbruch': 'assets/images/weather_cold.png', // Placeholder
    'fertilizer': 'assets/images/fertilizer.png',
    'pesticide': 'assets/images/pesticide.png', // Placeholder, original didn't have specific image
    'manure': 'assets/images/manure.jpg',
  };

  getImagePath(type: string | undefined): string {
    return type ? (this.imagePathMap[type] || 'assets/images/unknown.jpg') : 'assets/images/unknown.jpg';
  }
}

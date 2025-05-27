// File: frontend/src/app/core/models/parcel.model.ts

// Corresponds to backend app.schemas.parcel.PlantationType
export enum PlantationType {
    FALLOW = "Brachland",
    FIELD_BEAN = "Ackerbohne",
    BARLEY = "Gerste",
    OAT = "Hafer",
    POTATO = "Kartoffel",
    CORN = "Mais",
    RYE = "Roggen",
    ANIMAL_HUSBANDRY = "Tiere",
    WHEAT = "Weizen",
    SUGAR_BEET = "Zuckerruebe"
  }
  
  // Corresponds to backend app.schemas.parcel.CropSequenceEffect
  export enum CropSequenceEffect {
    GOOD = "gut",
    OK = "ok",
    BAD = "schlecht",
    NONE = "keine"
  }
  
  // Corresponds to backend app.schemas.parcel.HarvestOutcome
  export enum HarvestOutcome {
    VERY_HIGH = "sehr_hoch",
    HIGH = "hoch",
    MODERATE = "maessig",
    LOW = "niedrig",
    VERY_LOW = "sehr_niedrig",
    NONE = "keiner"
  }
  
  
  // Corresponds to backend app.schemas.parcel.ParcelInDB
  export interface Parcel {
    id?: string; // Document ID from Firestore, if available/needed on frontend
    parcelNumber: number;
    soilQuality: number;
    nutrientLevel: number;
    currentPlantation: PlantationType;
    previousPlantation?: PlantationType | null;
    prePreviousPlantation?: PlantationType | null;
    cropSequenceEffect: CropSequenceEffect;
    lastHarvestYieldDt: number;
    lastHarvestOutcomeCategory: HarvestOutcome;
    // any other fields from ParcelInDB that the frontend needs to display or use
    // For example, if the backend adds these to ParcelInDB, they should be here in camelCase:
    previousSoilQuality?: number | null; 
    prePreviousSoilQuality?: number | null;
    previousNutrientLevel?: number | null;
    prePreviousNutrientLevel?: number | null;
  }
  
  // Public representation of a player's field for a round
  // Corresponds to backend app.schemas.parcel.FieldPublic
  export interface FieldPublic {
    parcels: Parcel[];
  }
  
  // Represents the full field state document for a player-round
  // Corresponds to backend app.schemas.parcel.FieldState
  export interface FieldState extends FieldPublic {
    id: string; // e.g., gameID_playerID_roundNumber_field_state
    gameId: string;
    playerId: string;
    roundNumber: number;
    createdAt?: string | Date; // ISO string or Date object
    updatedAt?: string | Date;
  }

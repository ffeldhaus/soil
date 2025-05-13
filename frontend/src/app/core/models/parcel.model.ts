// File: frontend/src/app/core/models/parcel.model.ts
// NEW (or update if a basic one exists)

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
    parcel_number: number;
    soil_quality: number;
    nutrient_level: number;
    current_plantation: PlantationType;
    previous_plantation?: PlantationType | null;
    pre_previous_plantation?: PlantationType | null;
    crop_sequence_effect: CropSequenceEffect;
    last_harvest_yield_dt: number;
    last_harvest_outcome_category: HarvestOutcome;
    // any other fields from ParcelInDB that the frontend needs to display or use
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
    game_id: string;
    player_id: string;
    round_number: number;
    created_at?: string | Date; // ISO string or Date object
    updated_at?: string | Date;
  }
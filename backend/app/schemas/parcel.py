# File: backend/app/schemas/parcel.py
from typing import Optional, List, Any, Dict
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from pydantic.alias_generators import to_camel # Import to_camel

# --- Enums for Parcel States ---
class PlantationType(str, Enum):
    FALLOW = "Brachland" 
    FIELD_BEAN = "Ackerbohne" 
    BARLEY = "Gerste" 
    OAT = "Hafer" 
    POTATO = "Kartoffel" 
    CORN = "Mais" 
    RYE = "Roggen" 
    ANIMAL_HUSBANDRY = "Tiere" 
    WHEAT = "Weizen" 
    SUGAR_BEET = "Zuckerruebe" 

    @classmethod
    def _missing_(cls, value):
        for member in cls:
            if member.value.lower() == str(value).lower() or member.name.lower() == str(value).lower():
                return member
        return None 


class CropSequenceEffect(str, Enum):
    GOOD = "gut"
    OK = "ok"
    BAD = "schlecht"
    NONE = "keine" 

class HarvestOutcome(str, Enum):
    VERY_HIGH = "sehr_hoch"
    HIGH = "hoch"
    MODERATE = "maessig" 
    LOW = "niedrig"
    VERY_LOW = "sehr_niedrig"
    NONE = "keiner" 

# --- Parcel Schemas ---

class ParcelBase(BaseModel):
    parcel_number: int = Field(..., ge=1, description="Identifier for the parcel within a player's field (e.g., 1 to 40)")
    soil_quality: float = Field(
        default=80.0, ge=0.0, le=100.0,
        description="Overall soil quality/health (0-100%)"
    )
    nutrient_level: float = Field(
        default=80.0, ge=0.0, le=100.0,
        description="Nutrient level in the soil (0-100%)"
    )
    current_plantation: PlantationType = Field(
        default=PlantationType.FALLOW,
        description="The type of crop currently planted or land use (e.g., fallow)"
    )
    previous_plantation: Optional[PlantationType] = Field(None, description="Plantation in the previous round")
    pre_previous_plantation: Optional[PlantationType] = Field(None, description="Plantation two rounds ago")
    crop_sequence_effect: CropSequenceEffect = Field(
        default=CropSequenceEffect.NONE,
        description="Effect of the current crop sequence (good, ok, bad)"
    )
    last_harvest_yield_dt: float = Field(
        default=0.0, ge=0.0,
        description="Yield from the last harvest in decitons (dt) or other appropriate unit"
    )
    last_harvest_outcome_category: HarvestOutcome = Field(
        default=HarvestOutcome.NONE,
        description="Categorical outcome of the last harvest (e.g., high, low)"
    )
    # Added previous_soil_quality and pre_previous_soil_quality based on FieldComponent needs
    previous_soil_quality: Optional[float] = Field(None, ge=0.0, le=100.0)
    pre_previous_soil_quality: Optional[float] = Field(None, ge=0.0, le=100.0)
    previous_nutrient_level: Optional[float] = Field(None, ge=0.0, le=100.0)
    pre_previous_nutrient_level: Optional[float] = Field(None, ge=0.0, le=100.0)

    model_config = ConfigDict(
        populate_by_name=True, 
        alias_generator=to_camel,
        use_enum_values=True # Ensures enum values are used in serialization
    )


class ParcelCreate(ParcelBase):
    # Inherits model_config from ParcelBase, typically for request model, so aliasing might apply if needed
    pass


class ParcelUpdate(BaseModel): 
    current_plantation: PlantationType = Field(..., description="The new plantation chosen for this parcel for the upcoming round")
    model_config = ConfigDict(extra='forbid') # Not typically a response model


class ParcelInDB(ParcelBase): 
    # Ensure from_attributes is present if used with ORMs, and merge with base config logic
    model_config = ConfigDict(
        from_attributes=True, 
        populate_by_name=True, 
        alias_generator=to_camel,
        use_enum_values=True
    )


class ParcelPublic(ParcelInDB):
    # Inherits config from ParcelInDB, will serialize to camelCase
    pass


# --- Field Schemas (A Field is a collection of Parcels for a player in a round) ---

class FieldBase(BaseModel):
    game_id: str
    player_id: str
    round_number: int
    # If FieldBase is used as a response model, it would also need camelCase config
    model_config = ConfigDict(
        populate_by_name=True, 
        alias_generator=to_camel,
        use_enum_values=True 
    )

class FieldState(FieldBase): 
    id: str = Field(..., description="Unique ID for this field state document (e.g., gameID_playerID_roundNumber)")
    parcels: List[ParcelInDB] # Parcels will be camelCased by ParcelInDB's config
    # Ensure from_attributes and other configs are correctly set if this is a response model
    model_config = ConfigDict(
        from_attributes=True, 
        populate_by_name=True, 
        alias_generator=to_camel,
        use_enum_values=True 
    )

class FieldPublic(BaseModel):
    parcels: List[ParcelPublic] # ParcelPublic instances will be camelCased by their own config
    model_config = ConfigDict(
        populate_by_name=True, 
        alias_generator=to_camel, # For any direct fields of FieldPublic if added
        use_enum_values=True 
    )

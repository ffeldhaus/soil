# File: backend/app/schemas/parcel.py
from typing import Optional, List, Any, Dict
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator

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
    """
    Base properties for a single land parcel.
    """
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

    # MODIFIED: Removed use_enum_values=True. Pydantic v2 by default serializes enums to their values.
    # Internally, the attributes should now hold the enum members if initialized with them or valid strings.
    model_config = ConfigDict() 


class ParcelCreate(ParcelBase):
    """
    Schema for creating a new parcel instance.
    """
    pass


class ParcelUpdate(BaseModel): 
    """
    Schema for a player updating a parcel, primarily its plantation for the next round.
    """
    current_plantation: PlantationType = Field(..., description="The new plantation chosen for this parcel for the upcoming round")
    model_config = ConfigDict(extra='forbid')


class ParcelInDB(ParcelBase): 
    """
    Represents a Parcel as stored in the database.
    """
    model_config = ConfigDict(from_attributes=True)


class ParcelPublic(ParcelInDB):
    """
    Parcel properties to return to the client.
    """
    pass


# --- Field Schemas (A Field is a collection of Parcels for a player in a round) ---

class FieldBase(BaseModel):
    """
    Base for a player's field in a specific round.
    """
    game_id: str
    player_id: str
    round_number: int

class FieldState(FieldBase): 
    """
    Represents the complete state of a player's field (all their parcels)
    """
    id: str = Field(..., description="Unique ID for this field state document (e.g., gameID_playerID_roundNumber)")
    parcels: List[ParcelInDB] = Field(..., description="The state of all parcels in the field")
    model_config = ConfigDict(from_attributes=True)

class FieldPublic(BaseModel):
    """
    Public representation of a player's field.
    """
    parcels: List[ParcelPublic]
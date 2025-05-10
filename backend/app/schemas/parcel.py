# File: backend/app/schemas/parcel.py
from typing import Optional, List, Any, Dict
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator

# --- Enums for Parcel States ---
class PlantationType(str, Enum):
    FALLOW = "Brachland" # German: Brachland
    FIELD_BEAN = "Ackerbohne" # German: Ackerbohne
    BARLEY = "Gerste" # German: Gerste
    OAT = "Hafer" # German: Hafer
    POTATO = "Kartoffel" # German: Kartoffel
    CORN = "Mais" # German: Mais
    RYE = "Roggen" # German: Roggen
    ANIMAL_HUSBANDRY = "Tiere" # German: Tiere (for livestock grazing/manure, not a typical "crop")
    WHEAT = "Weizen" # German: Weizen
    SUGAR_BEET = "Zuckerruebe" # German: Zuckerrübe
    # Add more as needed

    @classmethod
    def _missing_(cls, value):
        # Allow case-insensitive matching or matching with internal names if needed
        for member in cls:
            if member.value.lower() == str(value).lower() or member.name.lower() == str(value).lower():
                return member
        return None # Or raise error


class CropSequenceEffect(str, Enum):
    GOOD = "gut"
    OK = "ok"
    BAD = "schlecht"
    NONE = "keine" # No prior crop / initial state

class HarvestOutcome(str, Enum):
    VERY_HIGH = "sehr_hoch"
    HIGH = "hoch"
    MODERATE = "maessig" # German: mäßig
    LOW = "niedrig"
    VERY_LOW = "sehr_niedrig"
    NONE = "keiner" # No harvest (e.g., fallow, animal husbandry)

# --- Parcel Schemas ---

class ParcelBase(BaseModel):
    """
    Base properties for a single land parcel.
    A "Field" for a player will consist of multiple such parcels.
    """
    parcel_number: int = Field(..., ge=1, description="Identifier for the parcel within a player's field (e.g., 1 to 40)")
    
    # Core ecological attributes
    soil_quality: float = Field(
        default=80.0, ge=0.0, le=100.0,
        description="Overall soil quality/health (0-100%)"
    )
    nutrient_level: float = Field(
        default=80.0, ge=0.0, le=100.0,
        description="Nutrient level in the soil (0-100%)"
    )
    
    # Current state related to cultivation
    current_plantation: PlantationType = Field(
        default=PlantationType.FALLOW,
        description="The type of crop currently planted or land use (e.g., fallow)"
    )
    
    # History for game mechanics
    previous_plantation: Optional[PlantationType] = Field(None, description="Plantation in the previous round")
    pre_previous_plantation: Optional[PlantationType] = Field(None, description="Plantation two rounds ago")
    
    crop_sequence_effect: CropSequenceEffect = Field(
        default=CropSequenceEffect.NONE,
        description="Effect of the current crop sequence (good, ok, bad)"
    )

    # Outcome of the last harvest from this parcel
    last_harvest_yield_dt: float = Field(
        default=0.0, ge=0.0,
        description="Yield from the last harvest in decitons (dt) or other appropriate unit"
    )
    last_harvest_outcome_category: HarvestOutcome = Field(
        default=HarvestOutcome.NONE,
        description="Categorical outcome of the last harvest (e.g., high, low)"
    )

    model_config = ConfigDict(use_enum_values=True)


class ParcelCreate(ParcelBase):
    """
    Schema for creating a new parcel instance.
    Typically, parcels are created en masse when a player's field is initialized.
    They will start with default values.
    """
    # Most fields will use defaults from ParcelBase
    # parcel_number will be set by the system during field initialization.
    pass


class ParcelUpdate(BaseModel): # Player submits their plantation choice for a parcel
    """
    Schema for a player updating a parcel, primarily its plantation for the next round.
    This is part of the round's decisions.
    """
    current_plantation: PlantationType = Field(..., description="The new plantation chosen for this parcel for the upcoming round")

    # Other fields are generally not directly updatable by player choice,
    # they are outcomes of game mechanics.

    model_config = ConfigDict(extra='forbid')


class ParcelInDB(ParcelBase): # How parcel data is stored (e.g., as part of a Field document or subcollection)
    """
    Represents a Parcel as stored in the database.
    This might be part of a list within a player's "Field" document for a specific round,
    or in a subcollection.
    """
    # No extra DB-specific fields needed if ParcelBase covers it and ID is implicit (part of a list/subcollection key)
    # If these are individual documents, they might have their own ID.
    # id: Optional[str] = Field(None, description="Unique ID if stored as a separate document")
    
    model_config = ConfigDict(from_attributes=True)


class ParcelPublic(ParcelInDB):
    """
    Parcel properties to return to the client.
    """
    # Inherits all fields from ParcelInDB by default.
    # Adjust if some fields should be hidden or transformed for public view.
    pass


# --- Field Schemas (A Field is a collection of Parcels for a player in a round) ---

class FieldBase(BaseModel):
    """
    Base for a player's field in a specific round.
    """
    game_id: str
    player_id: str
    round_number: int
    # parcels: List[ParcelInDB] = Field(default_factory=list, description="List of all parcels in this field for the round")

class FieldState(FieldBase): # Represents the state of all parcels for a player in a round
    """
    Represents the complete state of a player's field (all their parcels)
    at a specific point in time (e.g., start of round, end of round after calculations).
    """
    id: str = Field(..., description="Unique ID for this field state document (e.g., gameID_playerID_roundNumber)")
    parcels: List[ParcelInDB] = Field(..., description="The state of all parcels in the field")
    # is_submitted: bool = False # This was on original Field, but now on Round for player decisions

    model_config = ConfigDict(from_attributes=True)

class FieldPublic(BaseModel):
    """
    Public representation of a player's field.
    """
    parcels: List[ParcelPublic]
    # Potentially other summary info about the field
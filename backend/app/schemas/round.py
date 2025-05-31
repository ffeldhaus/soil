# File: backend/app/schemas/round.py
from typing import Optional, List, Any, Dict
from uuid import UUID, uuid4
from datetime import datetime, timezone
from enum import Enum # Added import

from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel

from .parcel import FieldPublic, PlantationType # FieldPublic will also need camelCase output config

# Define RoundStatus Enum before it's used
class RoundStatus(str, Enum):
    PENDING = "pending"         # Round is open for player decisions
    SUBMITTED = "submitted"     # Player has submitted decisions
    CALCULATING = "calculating" # System is processing the round
    CALCULATED = "calculated"   # Round processing is complete, results available
    ERROR = "error"             # An error occurred during calculation

class RoundDecisionBase(BaseModel):
    fertilize: bool = Field(False, description="Conventional fertilizer applied this round")
    pesticide: bool = Field(False, description="Pesticides applied this round")
    biological_control: bool = Field(False, description="Biological pest control (beneficial organisms) applied") 
    attempt_organic_certification: bool = Field(False, description="Attempting to achieve/maintain organic certification this round")
    machine_investment_level: int = Field(
        0,
        ge=0,
        le=50, 
        description="Level of investment in new machinery or increased machine usage (e.g., 0-50%)"
    )
    # This model's fields are already camelCase compatible or single word.
    # If it were used in a response directly and needed camelCase output for some reason,
    # it would need its own model_config with alias_generator.


class PlayerRoundSubmissionPayload(BaseModel):
    round_decisions: RoundDecisionBase
    parcel_plantation_choices: Dict[int, PlantationType]
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )


class RoundBase(BaseModel):
    game_id: str = Field(..., description="ID of the game this round belongs to")
    player_id: str = Field(..., description="UID of the player this round belongs to")
    round_number: int = Field(..., ge=1, description="The sequential number of this round in the game")
    status: RoundStatus = Field(default=RoundStatus.PENDING, description="Status of the round") # Added status
    decisions: Optional[RoundDecisionBase] = Field(None, description="Player's decisions for this round")
    is_submitted: bool = Field(False, description="Whether the player has submitted their decisions for this round")
    submitted_at: Optional[datetime] = Field(None, description="Timestamp when the round was submitted")
    # Config for serializing to camelCase for API responses
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True # Keep this if enums should be their values in JSON
    )


class RoundCreate(RoundBase):
    decisions: RoundDecisionBase = Field(default_factory=RoundDecisionBase, description="Initial (default) decisions for the round")
    # Inherits model_config from RoundBase for response serialization if used as such

class RoundUpdate(BaseModel): 
    decisions: RoundDecisionBase
    is_submitted: bool = Field(True)
    model_config = ConfigDict(extra='forbid') # Primarily for request validation


class RoundInDBBase(RoundBase):
    id: str = Field(..., description="Unique ID for the round document")
    result_id: Optional[str] = Field(None, description="ID of the associated result document")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Inherits model_config from RoundBase. Also add from_attributes=True for ORM mode.
    model_config = ConfigDict(
        from_attributes=True, 
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )


class RoundInDB(RoundInDBBase):
    pass # Inherits config


class RoundPublic(RoundInDBBase):
    pass # Inherits config

class RoundSimple(BaseModel):
    id: str
    game_id: str
    player_id: str
    round_number: int
    is_submitted: bool
    submitted_at: Optional[datetime] = None
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )


class RoundWithFieldPublic(RoundPublic):
    field_state: FieldPublic # FieldPublic needs its own camelCase config in parcel.py
    # Inherits model_config from RoundPublic (which inherits from RoundInDBBase -> RoundBase)
    # Ensure the most specific model_config is comprehensive or correctly chained.
    # Pydantic v2 model_config is not directly inherited/merged in a simple way for all settings like `alias_generator`
    # It's often better to be explicit on models used directly as responses if chaining is unclear.
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )

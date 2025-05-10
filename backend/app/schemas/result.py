# File: backend/app/schemas/result.py
from typing import Optional, Any, Dict
from uuid import UUID, uuid4
from datetime import datetime, timezone # MODIFIED: Import timezone

from pydantic import BaseModel, Field, ConfigDict

from .financials import TotalIncome, TotalExpenses 

class ResultBase(BaseModel):
    """
    Base properties for the results of a player's round.
    """
    game_id: str = Field(..., description="ID of the game")
    player_id: str = Field(..., description="UID of the player")
    round_number: int = Field(..., ge=1, description="The round number these results pertain to")

    profit_or_loss: float = Field(0.0, description="Net profit or loss for this round (Income - Expenses)")
    closing_capital: float = Field(0.0, description="Total capital at the end of this round")
    starting_capital: float = Field(0.0, description="Total capital at the start of this round (after previous round's results)")
    achieved_organic_certification: bool = Field(False, description="Whether organic certification was achieved/maintained this round")
    weather_event: Optional[str] = Field(None, description="Weather event that occurred this round (e.g., Normal, Drought)")
    vermin_event: Optional[str] = Field(None, description="Vermin event that occurred this round (e.g., None, Aphids)")
    player_machine_efficiency: Optional[float] = Field(
        None, 
        ge=0.0, 
        description="Player's overall machine efficiency at the end of this round / start of next (e.g. 100.0)"
    )
    income_details: TotalIncome = Field(default_factory=TotalIncome)
    expense_details: TotalExpenses = Field(default_factory=TotalExpenses)
    explanations: Optional[Dict[str, str]] = Field(
        default_factory=dict,
        description="Key-value pairs of outcomes and their explanations (e.g., 'harvest_low': 'Drought reduced potato yield.')"
    )


class ResultCreate(ResultBase):
    """
    Schema for creating a new result document.
    """
    pass


class ResultInDBBase(ResultBase):
    """
    Base properties for a Result as stored in the database.
    """
    id: str = Field(..., description="Unique ID for the result document") 
    calculated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) # MODIFIED
    model_config = ConfigDict(from_attributes=True)


class ResultInDB(ResultInDBBase):
    """
    Represents a Result object as stored in the database.
    """
    pass


class ResultPublic(ResultInDBBase):
    """
    Properties of a Result to return to the client.
    """
    pass
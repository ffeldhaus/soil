# File: backend/app/schemas/result.py
from typing import Optional, Any, Dict, List # Added List
from uuid import UUID, uuid4
from datetime import datetime, timezone

from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel # Import to_camel

# TotalIncome and TotalExpenses (which should be detailed breakdowns)
# will need their own camelCase output config in financials.py
from .financials import HarvestIncome, TotalExpensesBreakdown, TotalIncome

class ResultBase(BaseModel):
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
    # Updated to use more specific financial breakdown models
    income_details: TotalIncome = Field(default_factory=TotalIncome) # Changed from HarvestIncome
    expense_details: TotalExpensesBreakdown = Field(default_factory=TotalExpensesBreakdown)
    explanations: Optional[Dict[str, str]] = Field(
        default_factory=dict,
        description="Key-value pairs of outcomes and their explanations"
    )
    market_demand_multiplier: Optional[float] = Field(None, description="Market demand multiplier")
    environmental_score: Optional[float] = Field(None, description="Environmental score")
    total_yield: Optional[float] = Field(None, description="Total yield")
    total_revenue: Optional[float] = Field(None, description="Total revenue")
    total_expenses_sum: Optional[float] = Field(None, description="Sum of total expenses")
    parcel_results: Optional[List[Any]] = Field(default_factory=list, description="Results from individual parcels")

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True # If any enums get added here
    )

class ResultCreate(ResultBase):
    # Inherits config from ResultBase
    pass

class ResultInDBBase(ResultBase):
    id: str = Field(..., description="Unique ID for the result document") 
    calculated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )

class ResultInDB(ResultInDBBase):
    pass # Inherits config

class ResultPublic(ResultInDBBase):
    pass # Inherits config

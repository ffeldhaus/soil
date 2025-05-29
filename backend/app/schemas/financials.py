# File: backend/app/schemas/financials.py
from typing import Optional, Dict
from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel # Import to_camel

# --- Expense Breakdowns ---

class SeedCosts(BaseModel):
    field_bean: float = Field(0.0, description="Cost for Ackerbohne seeds")
    barley: float = Field(0.0, description="Cost for Gerste seeds")
    oat: float = Field(0.0, description="Cost for Hafer seeds")
    potato: float = Field(0.0, description="Cost for Kartoffel seeds")
    corn: float = Field(0.0, description="Cost for Mais seeds")
    rye: float = Field(0.0, description="Cost for Roggen seeds")
    wheat: float = Field(0.0, description="Cost for Weizen seeds")
    sugar_beet: float = Field(0.0, description="Cost for Zuckerrübe seeds")
    total: float = Field(0.0, description="Total cost for all seeds")
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, use_enum_values=True)

class InvestmentCosts(BaseModel):
    animals: float = Field(0.0, description="Cost for purchasing/establishing animal parcels")
    machines: float = Field(0.0, description="Cost related to machinery investment")
    total: float = Field(0.0, description="Total cost for all investments")
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, use_enum_values=True)

class RunningCosts(BaseModel):
    organic_certification_control: float = Field(0.0, description="Cost for organic certification controls")
    fertilizer: float = Field(0.0, description="Cost for conventional fertilizer")
    pesticide: float = Field(0.0, description="Cost for pesticides")
    biological_control: float = Field(0.0, description="Cost for beneficial organisms")
    animal_feed_vet: float = Field(0.0, description="Cost for animal feed, veterinary services, etc.")
    base_operational_costs: float = Field(0.0, description="Base operational costs")
    total: float = Field(0.0, description="Total for all running costs")
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, use_enum_values=True)

class TotalExpensesBreakdown(BaseModel): # Renamed from TotalExpenses for clarity
    """Aggregated and broken-down expenses for the round."""
    seed_costs: SeedCosts = Field(default_factory=SeedCosts)
    investment_costs: InvestmentCosts = Field(default_factory=InvestmentCosts)
    running_costs: RunningCosts = Field(default_factory=RunningCosts)
    grand_total: float = Field(0.0, description="Grand total of all expenses") # Renamed from total to grand_total
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, use_enum_values=True)

# --- Income Breakdowns ---

class HarvestIncome(BaseModel):
    field_bean: float = Field(0.0, description="Income from Ackerbohne harvest")
    barley: float = Field(0.0, description="Income from Gerste harvest")
    oat: float = Field(0.0, description="Income from Hafer harvest")
    potato: float = Field(0.0, description="Income from Kartoffel harvest")
    corn: float = Field(0.0, description="Income from Mais harvest")
    rye: float = Field(0.0, description="Income from Roggen harvest")
    wheat: float = Field(0.0, description="Income from Weizen harvest")
    sugar_beet: float = Field(0.0, description="Income from Zuckerrübe harvest")
    animal_products: float = Field(0.0, description="Income from animal products")
    total: float = Field(0.0, description="Total income from all harvests/products")
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, use_enum_values=True)

# The TotalIncome model previously defined might be redundant if ResultBase directly uses HarvestIncome
# for income_details, which is the current setup in result.py and frontend model alignment.
# If there were other income sources like subsidies, TotalIncome would aggregate them.
class TotalIncome(BaseModel):
    harvest_income: HarvestIncome = Field(default_factory=HarvestIncome)
    # subsidies: float = Field(0.0)
    grand_total: float = Field(0.0, description="Grand total of all income")
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, use_enum_values=True)

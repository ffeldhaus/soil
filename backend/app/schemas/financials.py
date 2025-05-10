# Renamed from result_components.py or similar for better organization
from typing import Optional, Dict
from pydantic import BaseModel, Field

# --- Expense Breakdowns ---

class SeedCosts(BaseModel):
    """Costs associated with seeds for different plantation types."""
    field_bean: float = Field(0.0, description="Cost for Ackerbohne seeds")
    barley: float = Field(0.0, description="Cost for Gerste seeds")
    oat: float = Field(0.0, description="Cost for Hafer seeds")
    potato: float = Field(0.0, description="Cost for Kartoffel seeds")
    corn: float = Field(0.0, description="Cost for Mais seeds")
    rye: float = Field(0.0, description="Cost for Roggen seeds")
    wheat: float = Field(0.0, description="Cost for Weizen seeds")
    sugar_beet: float = Field(0.0, description="Cost for Zuckerrübe seeds")
    total: float = Field(0.0, description="Total cost for all seeds")

class InvestmentCosts(BaseModel):
    """Costs associated with investments."""
    animals: float = Field(0.0, description="Cost for purchasing/maintaining animals")
    machines: float = Field(0.0, description="Cost related to machinery investment/upgrades")
    # Add other investment categories if any
    total: float = Field(0.0, description="Total cost for all investments")

class RunningCosts(BaseModel):
    """Ongoing operational costs for the round."""
    organic_certification_control: float = Field(0.0, description="Cost for organic certification controls")
    fertilizer: float = Field(0.0, description="Cost for conventional fertilizer")
    pesticide: float = Field(0.0, description="Cost for pesticides")
    biological_control: float = Field(0.0, description="Cost for beneficial organisms")
    animal_feed_vet: float = Field(0.0, description="Cost for animal feed, veterinary services, etc.")
    base_operational_costs: float = Field(0.0, description="Base operational costs (e.g., land tax, general maintenance)")
    # Add other running cost categories
    total: float = Field(0.0, description="Total for all running costs")

class TotalExpenses(BaseModel):
    """Aggregated expenses for the round."""
    seeds: SeedCosts = Field(default_factory=SeedCosts)
    investments: InvestmentCosts = Field(default_factory=InvestmentCosts)
    running_costs: RunningCosts = Field(default_factory=RunningCosts)
    total: float = Field(0.0, description="Grand total of all expenses")

# --- Income Breakdowns ---

class HarvestIncome(BaseModel):
    """Income generated from harvesting different plantation types."""
    field_bean: float = Field(0.0, description="Income from Ackerbohne harvest")
    barley: float = Field(0.0, description="Income from Gerste harvest")
    oat: float = Field(0.0, description="Income from Hafer harvest")
    potato: float = Field(0.0, description="Income from Kartoffel harvest")
    corn: float = Field(0.0, description="Income from Mais harvest")
    rye: float = Field(0.0, description="Income from Roggen harvest")
    wheat: float = Field(0.0, description="Income from Weizen harvest")
    sugar_beet: float = Field(0.0, description="Income from Zuckerrübe harvest")
    # Income from animal products if applicable
    animal_products: float = Field(0.0, description="Income from animal products (milk, meat, etc.)")
    total: float = Field(0.0, description="Total income from all harvests/products")

class TotalIncome(BaseModel):
    """Aggregated income for the round."""
    harvests: HarvestIncome = Field(default_factory=HarvestIncome)
    # Other income sources (e.g., subsidies - though not in original)
    # subsidies: float = Field(0.0)
    total: float = Field(0.0, description="Grand total of all income")
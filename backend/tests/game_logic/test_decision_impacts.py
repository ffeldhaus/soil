# File: backend/tests/game_logic/test_decision_impacts.py

import pytest
from typing import List, Dict, Any, Optional

from app.schemas.parcel import ParcelInDB, PlantationType, CropSequenceEffect, HarvestOutcome
from app.schemas.round import RoundDecisionBase
from app.game_logic import decision_impacts, game_rules

# --- Helper to create a default ParcelInDB for testing ---
def create_default_parcel(
    parcel_number: int = 1,
    soil_quality: float = 80.0,
    nutrient_level: float = 80.0,
    current_plantation: PlantationType = PlantationType.FALLOW,
    previous_plantation: Optional[PlantationType] = None,
    pre_previous_plantation: Optional[PlantationType] = None,
    last_harvest_yield_dt: float = 0.0,
    last_harvest_outcome_category: HarvestOutcome = HarvestOutcome.NONE
) -> ParcelInDB:
    return ParcelInDB(
        parcel_number=parcel_number,
        soil_quality=soil_quality,
        nutrient_level=nutrient_level,
        current_plantation=current_plantation,
        previous_plantation=previous_plantation,
        pre_previous_plantation=pre_previous_plantation,
        crop_sequence_effect=CropSequenceEffect.NONE, 
        last_harvest_yield_dt=last_harvest_yield_dt,
        last_harvest_outcome_category=last_harvest_outcome_category
    )

# --- Helper to create default RoundDecisionBase ---
def create_default_round_decisions(
    fertilize: bool = False,
    pesticide: bool = False,
    biological_control: bool = False,
    attempt_organic_certification: bool = False,
    machine_investment_level: int = 0
) -> RoundDecisionBase:
    return RoundDecisionBase(
        fertilize=fertilize,
        pesticide=pesticide,
        biological_control=biological_control,
        attempt_organic_certification=attempt_organic_certification,
        machine_investment_level=machine_investment_level
    )

# --- Tests for update_parcel_ecological_state ---

@pytest.mark.asyncio
async def test_update_parcel_fallow_to_wheat_normal_conditions():
    initial_parcel_state_at_decision_time = create_default_parcel(
        current_plantation=PlantationType.WHEAT, 
        previous_plantation=PlantationType.FALLOW 
    )
    
    player_decisions = create_default_round_decisions()
    updated_parcel, explanations = decision_impacts.update_parcel_ecological_state(
        parcel=initial_parcel_state_at_decision_time, 
        player_decisions=player_decisions,
        round_weather=game_rules.NORMAL_WEATHER,
        round_vermin=game_rules.NO_VERMIN,
        player_machine_efficiency=game_rules.INITIAL_MACHINE_EFFICIENCY, # 100%
        num_animal_parcels_on_field=0,
        total_parcels_on_field=game_rules.DEFAULT_NUMBER_OF_PARCELS_PER_PLAYER,
        is_organic_certified_this_round=False
    )
    assert updated_parcel.previous_plantation == PlantationType.WHEAT
    assert updated_parcel.pre_previous_plantation == PlantationType.FALLOW
    
    expected_base_wheat_yield = game_rules.HARVEST_BASE_YIELD_DT[PlantationType.WHEAT.value] # 115
    # Expected factors:
    # Soil (80/80), Nutrient (80/80) => ~1.0 each
    # Crop Sequence (Fallow -> Wheat = GOOD) => *(1 + 0.10) = 1.1
    # Machine efficiency (100% INITIAL vs 100% BASE) => machine_yield_factor = 1.0
    # Weather, Vermin normal.
    # Expected yield = 115 * 1.0 * 1.0 * 1.1 * 1.0 = 126.5
    assert updated_parcel.last_harvest_yield_dt == pytest.approx(expected_base_wheat_yield * 1.1, rel=1e-3) # MODIFIED assertion

    expected_soil_change = game_rules.SOIL_IMPACT_BY_PLANTATION[PlantationType.WHEAT.value] + game_rules.SOIL_CROPSEQUENCE_GOOD_BONUS
    assert abs(updated_parcel.soil_quality - (game_rules.INITIAL_PARCEL_SOIL_QUALITY + expected_soil_change)) < 0.1
    
    actual_yield_this_round = updated_parcel.last_harvest_yield_dt
    relative_yield_for_uptake = actual_yield_this_round / expected_base_wheat_yield if expected_base_wheat_yield > 0 else 1.0
    expected_nutrient_uptake_factor = game_rules.NUTRIENT_UPTAKE_BY_PLANTATION[PlantationType.WHEAT.value] * \
                                   max(0.25, min(1.5, relative_yield_for_uptake)) 
    expected_nutrient_level = game_rules.INITIAL_PARCEL_NUTRIENT_LEVEL * (1 - expected_nutrient_uptake_factor)
    assert abs(updated_parcel.nutrient_level - expected_nutrient_level) < 1.0 
    
    assert explanations["crop_sequence_info"] == f"Gute Fruchtfolge: {PlantationType.WHEAT.value} nach {PlantationType.FALLOW.value}."

@pytest.mark.asyncio
async def test_update_parcel_potato_after_potato_bad_sequence_drought_pesticide():
    parcel_with_choice = create_default_parcel(
        current_plantation=PlantationType.POTATO, 
        previous_plantation=PlantationType.POTATO, 
        pre_previous_plantation=PlantationType.POTATO 
    )
    player_decisions = create_default_round_decisions(pesticide=True) 
    updated_parcel, explanations = decision_impacts.update_parcel_ecological_state(
        parcel=parcel_with_choice, player_decisions=player_decisions,
        round_weather=game_rules.DROUGHT, round_vermin=game_rules.POTATO_BEETLE,
        player_machine_efficiency=game_rules.INITIAL_MACHINE_EFFICIENCY - 10, # 90%
        num_animal_parcels_on_field=0, total_parcels_on_field=game_rules.DEFAULT_NUMBER_OF_PARCELS_PER_PLAYER,
        is_organic_certified_this_round=False
    )
    assert updated_parcel.crop_sequence_effect == CropSequenceEffect.BAD
    expected_base_potato_yield = game_rules.HARVEST_BASE_YIELD_DT[PlantationType.POTATO.value]
    assert updated_parcel.last_harvest_yield_dt < expected_base_potato_yield * 0.35 
    expected_soil_change = (game_rules.SOIL_IMPACT_BY_PLANTATION[PlantationType.POTATO.value] +
                            game_rules.SOIL_CROPSEQUENCE_BAD_PENALTY +
                            game_rules.SOIL_MONOCULTURE_STREAK_PENALTY +
                            game_rules.SOIL_PESTICIDE_PENALTY +
                            game_rules.SOIL_DROUGHT_DAMAGE)
    assert abs(updated_parcel.soil_quality - (80.0 + expected_soil_change)) < 0.1
    assert "Schlechte Fruchtfolge" in explanations["crop_sequence_info"]
    assert "Dürre" in explanations["harvest_weather"]
    assert "Pestizideinsatz" in explanations["harvest_vermin_control"]
    assert "Anhaltende Monokultur" in explanations["soil_monoculture"]

# --- Tests for organic certification ---
def test_determine_organic_certification():
    decisions = create_default_round_decisions(attempt_organic_certification=True, fertilize=False, pesticide=False)
    is_organic, expl = decision_impacts.determine_organic_certification(decisions, was_certified_last_round=False)
    assert is_organic is True
    assert "erfolgreich beantragt/beibehalten" in expl

    decisions = create_default_round_decisions(attempt_organic_certification=True, fertilize=True, pesticide=False)
    is_organic, expl = decision_impacts.determine_organic_certification(decisions, was_certified_last_round=False)
    assert is_organic is False
    assert "nicht möglich/verloren durch Einsatz konventioneller Betriebsmittel" in expl
    
    decisions = create_default_round_decisions(attempt_organic_certification=False)
    is_organic, expl = decision_impacts.determine_organic_certification(decisions, was_certified_last_round=True)
    assert is_organic is False
    assert "nicht aktiv weitergeführt und daher verloren" in expl

    decisions = create_default_round_decisions(attempt_organic_certification=True, fertilize=False, pesticide=False)
    is_organic, expl = decision_impacts.determine_organic_certification(decisions, was_certified_last_round=True)
    assert is_organic is True
    assert "erfolgreich beantragt/beibehalten" in expl

# --- Tests for machine level ---
def test_update_player_machine_level():
    level = decision_impacts.update_player_machine_level(100.0, investment_decision_level=10) 
    assert level == pytest.approx(121.0)

    level = decision_impacts.update_player_machine_level(100.0, investment_decision_level=0) 
    assert level == pytest.approx(100.0 - game_rules.MACHINE_DEPRECIATION_PER_ROUND) 

    level = decision_impacts.update_player_machine_level(game_rules.MACHINE_MAX_EFFICIENCY_LEVEL - 1.0, investment_decision_level=20) 
    assert level == game_rules.MACHINE_MAX_EFFICIENCY_LEVEL

    level = decision_impacts.update_player_machine_level(game_rules.MACHINE_MIN_EFFICIENCY_LEVEL + 1.0, investment_decision_level=0) 
    assert level == game_rules.MACHINE_MIN_EFFICIENCY_LEVEL


# --- Tests for financial calculations ---
def test_calculate_seed_costs_basic():
    parcels = [
        create_default_parcel(current_plantation=PlantationType.WHEAT),
        create_default_parcel(current_plantation=PlantationType.POTATO),
    ]
    costs = decision_impacts.calculate_seed_costs(parcels, is_organic_certified_this_round=False)
    expected_cost = (game_rules.SEED_COSTS_PER_PARCEL[PlantationType.WHEAT.value][False] +
                       game_rules.SEED_COSTS_PER_PARCEL[PlantationType.POTATO.value][False])
    assert costs.total == pytest.approx(expected_cost)
    assert costs.wheat == pytest.approx(game_rules.SEED_COSTS_PER_PARCEL[PlantationType.WHEAT.value][False])

def test_calculate_seed_costs_organic():
    parcels = [create_default_parcel(current_plantation=PlantationType.WHEAT)]
    costs = decision_impacts.calculate_seed_costs(parcels, is_organic_certified_this_round=True)
    expected_cost = game_rules.SEED_COSTS_PER_PARCEL[PlantationType.WHEAT.value][True]
    assert costs.total == pytest.approx(expected_cost)

def test_calculate_investment_costs():
    decisions = create_default_round_decisions(machine_investment_level=5) 
    costs = decision_impacts.calculate_investment_costs(decisions, num_newly_dedicated_animal_parcels=2)
    expected_animal_cost = 2 * game_rules.COST_PER_NEW_ANIMAL_PARCEL_INVESTMENT
    expected_machine_cost = 5 * game_rules.COST_PER_MACHINE_INVESTMENT_LEVEL_UNIT
    assert costs.animals == pytest.approx(expected_animal_cost)
    assert costs.machines == pytest.approx(expected_machine_cost)
    assert costs.total == pytest.approx(expected_animal_cost + expected_machine_cost)

def test_calculate_running_costs_organic_high_machine():
    decisions = create_default_round_decisions(attempt_organic_certification=True, biological_control=True)
    num_parcels = 10
    num_animal = 2
    machine_level = game_rules.INITIAL_MACHINE_EFFICIENCY + 20 

    costs = decision_impacts.calculate_running_costs(
        player_decisions=decisions,
        num_parcels_total=num_parcels,
        num_current_animal_parcels=num_animal,
        is_attempting_organic_this_round=True, 
        is_already_organic_certified=True,    
        current_player_machine_level=machine_level
    )
    assert costs.organic_certification_control == pytest.approx(game_rules.COST_ORGANIC_CERTIFICATION_CONTROL)
    assert costs.biological_control == pytest.approx(num_parcels * game_rules.COST_BIOCONTROL_PER_PARCEL)
    assert costs.animal_feed_vet == pytest.approx(num_animal * game_rules.COST_ANIMAL_MAINTENANCE_PER_PARCEL)
    
    base_op_cost_no_machine_factor = num_parcels * game_rules.BASE_OPERATIONAL_COST_PER_PARCEL
    efficiency_delta = machine_level - game_rules.BASE_MACHINE_EFFICIENCY_FOR_COSTS 
    cost_multiplier = 1.0 + (efficiency_delta / 100.0 * game_rules.MACHINE_MAINTENANCE_COST_FACTOR_OVERALL) 
    expected_base_op_cost = base_op_cost_no_machine_factor * cost_multiplier
    assert costs.base_operational_costs == pytest.approx(expected_base_op_cost)
    assert costs.fertilizer == 0
    assert costs.pesticide == 0

def test_calculate_harvest_income_organic_bonus():
    parcels_harvested = [
        create_default_parcel(
            current_plantation=PlantationType.WHEAT, 
            last_harvest_yield_dt=100 
        )
    ]
    income = decision_impacts.calculate_harvest_income(parcels_harvested, is_organic_certified_this_round=True)
    expected_base_price = game_rules.CROP_PRICES[PlantationType.WHEAT.value]
    expected_income = 100 * expected_base_price * game_rules.ORGANIC_PRICE_BONUS_MULTIPLIER
    assert income.wheat == pytest.approx(expected_income)
    assert income.total == pytest.approx(expected_income)
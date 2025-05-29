import pytest
from unittest.mock import patch, MagicMock
import random # To control its behavior
from typing import Optional, List, Dict, Any # Ensure Optional is imported
from datetime import datetime, timezone # Added missing import

from app.game_logic.ai_player import _choose_plantation_for_parcel, generate_ai_player_decisions, AIStrategyType
from app.schemas.parcel import ParcelInDB, PlantationType
from app.schemas.round import RoundDecisionBase, RoundUpdate # Added RoundUpdate
from app.schemas.result import ResultCreate, TotalIncome # For previous_result
from app.schemas.financials import TotalExpensesBreakdown, SeedCosts, RunningCosts, InvestmentCosts # For previous_result
from app.game_logic import game_rules # To mock its contents like CROP_PRICES

# --- Fixtures ---

@pytest.fixture
def mock_parcel_good_soil() -> ParcelInDB:
    return ParcelInDB(
        parcel_number=1, owner_id="ai_player", current_plantation=PlantationType.FALLOW,
        soil_quality=80, nutrient_level=70, water_level=60, growth_stage=0,
        previous_plantation=PlantationType.WHEAT, yield_potential=0.9,
        last_tilled=MagicMock(), last_fertilized=None, last_pesticided=None # Using MagicMock for datetime for simplicity
    )

@pytest.fixture
def mock_parcel_poor_soil() -> ParcelInDB:
    return ParcelInDB(
        parcel_number=2, owner_id="ai_player", current_plantation=PlantationType.WHEAT,
        soil_quality=30, nutrient_level=20, water_level=40, growth_stage=2,
        previous_plantation=PlantationType.CORN, yield_potential=0.5,
        last_tilled=MagicMock(), last_fertilized=None, last_pesticided=None
    )

@pytest.fixture
def available_crops_all() -> list[PlantationType]:
    return list(PlantationType) # All defined plantation types

@pytest.fixture
def available_crops_limited(available_crops_all: list[PlantationType]) -> list[PlantationType]:
    # Exclude FALLOW and ANIMAL_HUSBANDRY for some tests to ensure plantable crops are chosen
    return [crop for crop in available_crops_all if crop not in [PlantationType.FALLOW, PlantationType.ANIMAL_HUSBANDRY]]


@pytest.fixture
def previous_result_example() -> ResultCreate:
    # A minimal example, can be expanded if AI uses more fields from it
    return ResultCreate(
        game_id="g1", player_id="ai_player", round_number=1,
        market_demand_multiplier=1.0, environmental_score=75,
        total_yield=1000, total_revenue=10000, total_expenses_sum=5000, profit_or_loss=5000,
        income_details=TotalIncome(crop_sales=10000, bonuses=0),
        expense_details=TotalExpensesBreakdown( 
            seed_costs=SeedCosts(), # Use default instance
            running_costs=RunningCosts(), # Use default instance
            investment_costs=InvestmentCosts() # Use default instance
        ),
        parcel_results=[]
    )

# --- Tests for _choose_plantation_for_parcel ---

def test_choose_plantation_profit_maximizer_picks_high_price(
    mock_parcel_good_soil: ParcelInDB,
    available_crops_limited: list[PlantationType],
    previous_result_example: ResultCreate
):
    # Arrange
    # Ensure WHEAT has the highest price
    mock_crop_prices = {
        PlantationType.WHEAT.value: 100,
        PlantationType.CORN.value: 80,
        PlantationType.FIELD_BEAN.value: 60,
        PlantationType.OAT.value: 70,
    }
    # Ensure available_crops_limited contains WHEAT, CORN, FIELD_BEAN, OAT
    # and other plantable types for the test to be meaningful.
    
    with patch.object(game_rules, "CROP_PRICES", mock_crop_prices):
        # Act
        chosen_crop = _choose_plantation_for_parcel(
            parcel=mock_parcel_good_soil,
            strategy=AIStrategyType.PROFIT_MAXIMIZER,
            available_crops=available_crops_limited,
            current_round_number=2,
            previous_result=previous_result_example
        )
    # Assert
    assert chosen_crop == PlantationType.WHEAT

def test_choose_plantation_profit_maximizer_handles_empty_prices_gracefully(
    mock_parcel_good_soil: ParcelInDB,
    available_crops_limited: list[PlantationType],
    previous_result_example: ResultCreate
):
    # Arrange
    # Determine what the SUT should choose if all prices are 0 (from empty CROP_PRICES)
    # The SUT iterates available_crops, skips FALLOW/ANIMAL_HUSBANDRY, and picks the first one if all prices are 0.
    plantable_crops_in_fixture = [
        crop for crop in available_crops_limited 
        if crop not in [PlantationType.FALLOW, PlantationType.ANIMAL_HUSBANDRY]
    ]
    # Ensure the fixture provides a deterministic order or the test accounts for it.
    assert plantable_crops_in_fixture, "available_crops_limited fixture must contain plantable crops for this test"
    expected_fallback_crop = plantable_crops_in_fixture[0] # SUT picks the first encountered plantable crop

    with patch.dict(game_rules.CROP_PRICES, {}, clear=True):
        # Act
        chosen_crop = _choose_plantation_for_parcel(
            parcel=mock_parcel_good_soil,
            strategy=AIStrategyType.PROFIT_MAXIMIZER,
            available_crops=available_crops_limited, # Pass the original fixture
            current_round_number=2,
            previous_result=previous_result_example
        )
    
    # Assert
    # No random.choice should be called; it should deterministically pick the first plantable crop encountered in its loop.
    assert chosen_crop == expected_fallback_crop


def test_choose_plantation_eco_conscious_poor_soil_chooses_fallow_or_bean(
    mock_parcel_poor_soil: ParcelInDB, # soil_quality=30, nutrient_level=20
    available_crops_all: list[PlantationType], # Ensure FALLOW and FIELD_BEAN are available
    previous_result_example: ResultCreate
):
    # Eco strategy with poor soil should consider FALLOW or FIELD_BEAN
    # We'll patch random.random to control the 40% chance for FALLOW
    
    # Test case 1: random.random() < 0.4 (chooses FALLOW)
    with patch("app.game_logic.ai_player.random.random", return_value=0.3): # < 0.4
        chosen_crop_fallow = _choose_plantation_for_parcel(
            parcel=mock_parcel_poor_soil,
            strategy=AIStrategyType.ECO_CONSCIOUS,
            available_crops=available_crops_all,
            current_round_number=2,
            previous_result=previous_result_example
        )
    assert chosen_crop_fallow == PlantationType.FALLOW

    # Test case 2: random.random() >= 0.4 (should choose FIELD_BEAN if available)
    with patch("app.game_logic.ai_player.random.random", return_value=0.5): # >= 0.4
        chosen_crop_bean = _choose_plantation_for_parcel(
            parcel=mock_parcel_poor_soil,
            strategy=AIStrategyType.ECO_CONSCIOUS,
            available_crops=available_crops_all, # Assumes FIELD_BEAN is in here
            current_round_number=2,
            previous_result=previous_result_example
        )
    assert chosen_crop_bean == PlantationType.FIELD_BEAN

def test_choose_plantation_eco_conscious_good_soil_chooses_good_sequence(
    mock_parcel_good_soil: ParcelInDB,
    available_crops_limited: list[PlantationType], # Plantable crops
    previous_result_example: ResultCreate
):
    # Good soil, should pick from less damaging / good sequence crops
    # e.g., FIELD_BEAN, OAT, RYE
    expected_eco_choices = [PlantationType.FIELD_BEAN, PlantationType.OAT, PlantationType.RYE]
    # Ensure at least one of these is in available_crops_limited for the test to be meaningful
    # For this test, let's ensure all are available if possible
    test_available_crops = [c for c in available_crops_limited if c in expected_eco_choices]
    if not test_available_crops: # If limited list doesn't have them, add one
        test_available_crops = [PlantationType.OAT] + [c for c in available_crops_limited if c != PlantationType.OAT]


    with patch("app.game_logic.ai_player.random.choice") as mock_random_choice:
        # Make random.choice deterministic
        mock_random_choice.return_value = test_available_crops[0] # e.g., OAT

        chosen_crop = _choose_plantation_for_parcel(
            parcel=mock_parcel_good_soil,
            strategy=AIStrategyType.ECO_CONSCIOUS,
            available_crops=test_available_crops,
            current_round_number=2,
            previous_result=previous_result_example
        )
    
    # Assert that random.choice was called with the list of good_sequence_crops
    args, _ = mock_random_choice.call_args
    # The SUT logic filters available_crops to make good_sequence_crops.
    # Check if the list passed to random.choice contains only expected eco crops that were available.
    sut_choices = args[0]
    for crop in sut_choices:
        assert crop in expected_eco_choices
    assert chosen_crop in expected_eco_choices


def test_choose_plantation_random_explorer(
    mock_parcel_good_soil: ParcelInDB,
    available_crops_all: list[PlantationType], # Should pick from all, including FALLOW/ANIMALS
    previous_result_example: ResultCreate
):
    with patch("app.game_logic.ai_player.random.choice") as mock_random_choice:
        mock_random_choice.return_value = PlantationType.CORN # Example choice
        
        chosen_crop = _choose_plantation_for_parcel(
            parcel=mock_parcel_good_soil,
            strategy=AIStrategyType.RANDOM_EXPLORER,
            available_crops=available_crops_all,
            current_round_number=2,
            previous_result=previous_result_example
        )
    
    mock_random_choice.assert_called_once_with(available_crops_all)
    assert chosen_crop == PlantationType.CORN

def test_choose_plantation_balanced_avoids_previous_sometimes(
    mock_parcel_good_soil: ParcelInDB, # previous_plantation is WHEAT
    available_crops_limited: list[PlantationType], # Plantable crops
    previous_result_example: ResultCreate
):
    assert mock_parcel_good_soil.previous_plantation == PlantationType.WHEAT
    # Ensure WHEAT is in available_crops_limited for this test's logic
    test_available_crops = available_crops_limited
    if PlantationType.WHEAT not in test_available_crops:
        test_available_crops = [PlantationType.WHEAT] + test_available_crops
    
    plantable_crops_excluding_wheat = [c for c in test_available_crops if c != PlantationType.WHEAT and c not in [PlantationType.FALLOW, PlantationType.ANIMAL_HUSBANDRY]]
    assert len(plantable_crops_excluding_wheat) > 0 # Need other options

    # Case 1: random.random() > 0.3 (tries to avoid previous)
    with patch("app.game_logic.ai_player.random.random", return_value=0.7), \
         patch("app.game_logic.ai_player.random.choice") as mock_random_choice:
        
        mock_random_choice.return_value = plantable_crops_excluding_wheat[0] # e.g. CORN

        chosen_crop = _choose_plantation_for_parcel(
            parcel=mock_parcel_good_soil,
            strategy=AIStrategyType.BALANCED, # or any other unrecognized strategy for default
            available_crops=test_available_crops,
            current_round_number=2,
            previous_result=previous_result_example
        )
        
        # Assert random.choice was called with crops *excluding* WHEAT
        args_list = [args[0][0] for args in mock_random_choice.call_args_list] # Get the list of choices passed
        assert PlantationType.WHEAT not in args_list[0] # First call to random.choice
        assert chosen_crop == plantable_crops_excluding_wheat[0]


    # Case 2: random.random() <= 0.3 (may pick previous if only option or by chance)
    # Or if plantable_crops_excluding_wheat was empty (not this test case)
    plantable_crops_all = [c for c in test_available_crops if c not in [PlantationType.FALLOW, PlantationType.ANIMAL_HUSBANDRY]]
    with patch("app.game_logic.ai_player.random.random", return_value=0.2), \
         patch("app.game_logic.ai_player.random.choice") as mock_random_choice:
        
        mock_random_choice.return_value = PlantationType.WHEAT # Example

        chosen_crop = _choose_plantation_for_parcel(
            parcel=mock_parcel_good_soil,
            strategy=AIStrategyType.BALANCED,
            available_crops=test_available_crops,
            current_round_number=2,
            previous_result=previous_result_example
        )
        # Assert random.choice was called with *all* plantable crops
        args_list = [args[0][0] for args in mock_random_choice.call_args_list] # Get the list of choices passed
        assert PlantationType.WHEAT in args_list[0]
        assert chosen_crop == PlantationType.WHEAT


def test_choose_plantation_no_plantable_crops_returns_fallow(
    mock_parcel_good_soil: ParcelInDB,
    previous_result_example: ResultCreate
):
    # available_crops contains only FALLOW or ANIMAL_HUSBANDRY, or is empty after filtering
    chosen_crop = _choose_plantation_for_parcel(
        parcel=mock_parcel_good_soil,
        strategy=AIStrategyType.BALANCED,
        available_crops=[PlantationType.FALLOW, PlantationType.ANIMAL_HUSBANDRY], # These get filtered out
        current_round_number=2,
        previous_result=previous_result_example
    )
    assert chosen_crop == PlantationType.FALLOW


# --- Tests for generate_ai_player_decisions ---

@pytest.fixture
def two_mock_parcels(mock_parcel_good_soil: ParcelInDB, mock_parcel_poor_soil: ParcelInDB) -> list[ParcelInDB]:
    # Ensure unique parcel numbers for dictionary keys if generate_ai_player_decisions uses them
    mock_parcel_good_soil.parcel_number = 1 
    mock_parcel_poor_soil.parcel_number = 2
    return [mock_parcel_good_soil, mock_parcel_poor_soil]

FIXED_DATETIME_ROUND_LATER = datetime(2023, 11, 1, 13, 0, 0, tzinfo=timezone.utc) # Define for updated_parcels_data_example


@pytest.fixture
def round_update_obj() -> RoundUpdate: # This fixture is not used by the new tests directly, but defined in user prompt
    return RoundUpdate(
        decisions=RoundDecisionBase( # Example decisions
            fertilize=True,
            pesticide=False,
            biological_control=True
        ),
        is_submitted=True
    )

@pytest.fixture
def updated_parcels_data_example() -> list[dict]:
    # Example of what the updated parcel data might look like.
    # In a real scenario, this would reflect changes due to decisions.
    return [
        ParcelInDB(parcel_number=1, owner_id="ai_player", current_plantation=PlantationType.WHEAT, health=90, water_level=40, growth_stage=1, last_tilled=MagicMock(), last_fertilized=FIXED_DATETIME_ROUND_LATER, last_pesticided=None, yield_potential=0.85).model_dump(),
        ParcelInDB(parcel_number=2, owner_id="ai_player", current_plantation=PlantationType.FALLOW, health=100, water_level=60, growth_stage=0, last_tilled=MagicMock(), last_fertilized=None, last_pesticided=None, yield_potential=0.9).model_dump(),
    ]

def test_generate_decisions_profit_maximizer_general_choices(
    two_mock_parcels: list[ParcelInDB],
    previous_result_example: ResultCreate,
    available_crops_all: list[PlantationType] # available_crops_all is used by SUT for profit maximizer
):
    # Arrange
    # Profit maximizer: fertilize=True (80%), pesticide=True (70%), bio=False, organic=False, machine=random
    with patch("app.game_logic.ai_player.random.random", side_effect=[0.1, 0.1]) as mock_random_float, \
         patch("app.game_logic.ai_player.random.choice") as mock_random_choice, \
         patch("app.game_logic.ai_player._choose_plantation_for_parcel") as mock_choose_plantation:
        
        # Mock random.choice for machine_investment_level
        mock_random_choice.return_value = 20 # Example machine investment
        # Mock _choose_plantation_for_parcel as its testing is separate
        mock_choose_plantation.return_value = PlantationType.WHEAT # Dummy return

        # Act
        round_decisions, parcel_choices = generate_ai_player_decisions(
            player_id="ai_profit",
            current_field_state=two_mock_parcels,
            strategy=AIStrategyType.PROFIT_MAXIMIZER,
            current_round_number=3,
            previous_result=previous_result_example # Removed available_crops
        )

    # Assert
    assert mock_random_float.call_count == 2 # For fertilize and pesticide
    assert round_decisions.fertilize is True
    assert round_decisions.pesticide is True
    assert round_decisions.biological_control is False
    assert round_decisions.attempt_organic_certification is False
    assert round_decisions.machine_investment_level == 20
    
    assert mock_choose_plantation.call_count == len(two_mock_parcels)
    assert len(parcel_choices) == len(two_mock_parcels)
    for parcel in two_mock_parcels:
        assert parcel.parcel_number in parcel_choices
        assert parcel_choices[parcel.parcel_number] == PlantationType.WHEAT


def test_generate_decisions_eco_conscious_general_choices(
    two_mock_parcels: list[ParcelInDB],
    previous_result_example: ResultCreate,
    available_crops_all: list[PlantationType] # available_crops_all for eco strategy
):
    # Arrange
    # Eco conscious: fertilize=False, pesticide=False, bio=True (75%), organic=True, machine=random
    with patch("app.game_logic.ai_player.random.random", return_value=0.1) as mock_random_float, \
         patch("app.game_logic.ai_player.random.choice") as mock_random_choice, \
         patch("app.game_logic.ai_player._choose_plantation_for_parcel") as mock_choose_plantation:
        
        mock_random_choice.return_value = 5 # Example machine investment
        mock_choose_plantation.return_value = PlantationType.FIELD_BEAN

        # Act
        round_decisions, parcel_choices = generate_ai_player_decisions(
            player_id="ai_eco",
            current_field_state=two_mock_parcels,
            strategy=AIStrategyType.ECO_CONSCIOUS,
            current_round_number=3,
            previous_result=previous_result_example # Removed available_crops
        )

    # Assert
    assert mock_random_float.call_count == 1 # For biological_control
    assert round_decisions.fertilize is False
    assert round_decisions.pesticide is False
    assert round_decisions.biological_control is True
    assert round_decisions.attempt_organic_certification is True
    assert round_decisions.machine_investment_level == 5

    assert mock_choose_plantation.call_count == len(two_mock_parcels)
    assert len(parcel_choices) == len(two_mock_parcels)
    for parcel in two_mock_parcels:
        assert parcel.parcel_number in parcel_choices
        assert parcel_choices[parcel.parcel_number] == PlantationType.FIELD_BEAN


def test_generate_decisions_organic_conflict_resolution(
    two_mock_parcels: list[ParcelInDB],
    previous_result_example: ResultCreate,
    available_crops_all: list[PlantationType]
):
    # Test RANDOM_EXPLORER strategy for conflict potential
    # It can randomly set fertilize=T, pesticide=T, attempt_organic_certification=T
    # The conflict resolution should then force fertilize and pesticide to False.

    def random_choice_side_effect_for_conflict(options_list):
        # For boolean choices related to decisions
        if options_list == [True, False]: # fertilize, attempt_organic_certification
            return True 
        elif options_list == [True, False, False, False]: # pesticide
            return True 
        elif options_list == [True, True, False] : # biological_control (when pesticide is True)
             return False 
        # For machine_investment_level
        elif all(isinstance(x, int) for x in options_list) and 0 in options_list and 30 in options_list:
            return 10
        # For _choose_plantation_for_parcel's internal random.choice if not mocked separately
        elif all(isinstance(x, PlantationType) for x in options_list):
            return PlantationType.WHEAT # Dummy choice for plantation
        return random.choice(options_list) # Fallback for any other calls

    with patch("app.game_logic.ai_player.random.choice", side_effect=random_choice_side_effect_for_conflict) as mock_rand_choice, \
         patch("app.game_logic.ai_player._choose_plantation_for_parcel") as mock_choose_plantation:
        
        # _choose_plantation_for_parcel is called for each parcel.
        # Its return value doesn't affect the general decisions part being tested here.
        mock_choose_plantation.return_value = PlantationType.OAT

        round_decisions, _ = generate_ai_player_decisions(
            player_id="ai_conflict_test",
            current_field_state=two_mock_parcels,
            strategy=AIStrategyType.RANDOM_EXPLORER,
            current_round_number=3,
            previous_result=previous_result_example # Removed available_crops
        )
            
    # Assert conflict resolution: if attempt_organic_certification was True,
    # then fertilize and pesticide should have been forced to False.
    # The side_effect for random.choice was set to make them all True initially.
    assert round_decisions.attempt_organic_certification is True
    assert round_decisions.fertilize is False # Should be corrected by SUT
    assert round_decisions.pesticide is False # Should be corrected by SUT
    # biological_control depends on pesticide. If pesticide became False,
    # then biological_control decision might be re-evaluated based on random.choice
    # (if not pesticide: biological_control = random.choice([True, True, False]))
    # This part is complex to assert without knowing the exact order of operations and re-evaluation
    # For now, focus on the core conflict: organic=T -> fert=F, pest=F

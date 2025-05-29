# File: backend/tests/game_logic/test_calculation_engine.py

import pytest
from typing import List, Dict, Any, Optional

from app.schemas.game import GameInDB
from app.schemas.player import PlayerInDB, UserType
from app.schemas.round import RoundInDB, RoundDecisionBase
from app.schemas.parcel import ParcelInDB, PlantationType, CropSequenceEffect, HarvestOutcome
from app.schemas.result import ResultCreate
from app.game_logic import game_rules, calculation_engine, decision_impacts
from app.game_logic.calculation_engine import PlayerRoundInputBundle, PlayerRoundOutputBundle

# --- Test Helpers ---
def create_test_game(
    game_id: str = "test_game_1",
    num_rounds: int = 15,
    current_round_number: int = 1 
) -> GameInDB:
    return GameInDB(
        id=game_id,
        name="Test Game",
        admin_id="admin_user_123",
        number_of_rounds=num_rounds,
        max_players=2,
        current_round_number=current_round_number, 
        weather_sequence=game_rules.generate_weather_sequence(num_rounds),
        vermin_sequence=game_rules.generate_vermin_sequence(num_rounds),
        player_uids=["player_uid_1", "player_uid_2"] 
    )

def create_test_player(player_uid: str = "player_uid_1", game_id: str = "test_game_1") -> PlayerInDB:
    return PlayerInDB(
        uid=player_uid,
        email=f"{player_uid}@example.com",
        user_type=UserType.PLAYER,
        game_id=game_id,
        player_number=1
    )

def create_test_round_doc(
    game_id: str = "test_game_1",
    player_id: str = "player_uid_1",
    round_number: int = 1,
    decisions: Optional[RoundDecisionBase] = None
) -> RoundInDB:
    if decisions is None:
        decisions = RoundDecisionBase() 
    return RoundInDB(
        id=f"{game_id}_{player_id}_{round_number}",
        game_id=game_id,
        player_id=player_id,
        round_number=round_number,
        decisions=decisions,
        is_submitted=True 
    )

def create_initial_field_state(num_parcels: int = 1, start_plantation: PlantationType = PlantationType.FALLOW, previous_plantation: Optional[PlantationType] = None) -> List[ParcelInDB]:
    parcels = []
    for i in range(1, num_parcels + 1):
        parcels.append(ParcelInDB(
            parcel_number=i,
            soil_quality=game_rules.INITIAL_PARCEL_SOIL_QUALITY,
            nutrient_level=game_rules.INITIAL_PARCEL_NUTRIENT_LEVEL,
            current_plantation=start_plantation, 
            previous_plantation=previous_plantation, 
            pre_previous_plantation=None,
            crop_sequence_effect=CropSequenceEffect.NONE,
            last_harvest_yield_dt=0.0,
            last_harvest_outcome_category=HarvestOutcome.NONE
        ))
    return parcels

# --- Tests for _calculate_single_player_round_outcome ---

@pytest.mark.asyncio
async def test_calculate_single_player_round_1_fallow_to_wheat_normal():
    game = create_test_game(num_rounds=15, current_round_number=1) 
    player = create_test_player()
    
    initial_field_this_round = create_initial_field_state(num_parcels=1, start_plantation=PlantationType.WHEAT, previous_plantation=None)
    
    round_doc = create_test_round_doc(round_number=1, decisions=RoundDecisionBase()) 

    plantation_choices_for_bundle: Dict[int, PlantationType] = {
        p.parcel_number: p.current_plantation for p in initial_field_this_round
    }

    input_bundle = PlayerRoundInputBundle(
        player_doc=player,
        player_round_doc=round_doc,
        parcel_plantation_choices=plantation_choices_for_bundle,
        initial_field_state_for_this_round=initial_field_this_round,
        previous_round_result_for_player=None 
    )

    output_bundle = await calculation_engine._calculate_single_player_round_outcome(
        game_doc=game,
        player_input=input_bundle
    )

    assert output_bundle is not None
    result = output_bundle.calculated_result_for_this_round
    
    expected_machine_eff_r1 = game_rules.INITIAL_MACHINE_EFFICIENCY - game_rules.MACHINE_DEPRECIATION_PER_ROUND
    assert result.player_machine_efficiency == pytest.approx(expected_machine_eff_r1) 
    
    parcel_after_round = output_bundle.field_state_for_next_round_start[0]
    expected_base_wheat_yield = game_rules.HARVEST_BASE_YIELD_DT[PlantationType.WHEAT.value]
    # Round 1: No previous plantation, so no crop sequence bonus/penalty (factor 1.0)
    # Machine factor: (1 + ((96.0 - 100.0) * 0.005)) = 0.98
    # Expected yield = 115 * 1.0 (soil) * 1.0 (nutrient) * 1.0 (crop_seq=NONE) * 0.98 = 112.7
    assert parcel_after_round.last_harvest_yield_dt == pytest.approx(expected_base_wheat_yield * 0.98, rel=1e-3) 

@pytest.mark.asyncio
async def test_calculate_single_player_round_2_potato_after_wheat_with_investment_and_fertilizer():
    game = create_test_game(current_round_number=2)
    player = create_test_player()

    # --- Make test deterministic for round 2 weather/vermin ---
    if len(game.weather_sequence) > 1: # Should be true given num_rounds=15
        game.weather_sequence[1] = game_rules.DROUGHT
    if len(game.vermin_sequence) > 1:
        game.vermin_sequence[1] = game_rules.APHIDS
    # ---

    parcel1_start_of_round2 = create_initial_field_state(
        num_parcels=1,
        start_plantation=PlantationType.POTATO,
        previous_plantation=PlantationType.WHEAT
    )[0]
    parcel1_start_of_round2.soil_quality = 78.5 
    parcel1_start_of_round2.nutrient_level = 62.0 
    
    initial_field_this_round = [parcel1_start_of_round2]
    
    plantation_choices_for_bundle: Dict[int, PlantationType] = {
        p.parcel_number: p.current_plantation for p in initial_field_this_round
    }

    round2_decisions = RoundDecisionBase(
        fertilize=True, 
        machine_investment_level=10 
    )
    round_doc = create_test_round_doc(round_number=2, decisions=round2_decisions)

    previous_round_result = ResultCreate(
        game_id=game.id, player_id=player.uid, round_number=1,
        profit_or_loss=500.0, 
        starting_capital=game_rules.INITIAL_PLAYER_CAPITAL,
        closing_capital=game_rules.INITIAL_PLAYER_CAPITAL + 500.0,
        player_machine_efficiency=96.0 
    )

    input_bundle = PlayerRoundInputBundle(
        player_doc=player,
        player_round_doc=round_doc,
        parcel_plantation_choices=plantation_choices_for_bundle,
        initial_field_state_for_this_round=initial_field_this_round,
        previous_round_result_for_player=previous_round_result
    )

    output_bundle = await calculation_engine._calculate_single_player_round_outcome(
        game_doc=game,
        player_input=input_bundle
    )
    assert output_bundle is not None
    result_round2 = output_bundle.calculated_result_for_this_round
    parcel_after_round2 = output_bundle.field_state_for_next_round_start[0]

    expected_machine_eff_end_r2 = (previous_round_result.player_machine_efficiency + 
                                   (10 * game_rules.MACHINE_INVESTMENT_EFFICIENCY_GAIN_PER_LEVEL_UNIT) - 
                                   game_rules.MACHINE_DEPRECIATION_PER_ROUND)
    assert result_round2.player_machine_efficiency == pytest.approx(expected_machine_eff_end_r2)
    
    # Expectation based on manual trace with DROUGHT and APHIDS for round 2
    assert parcel_after_round2.nutrient_level == pytest.approx(78.9, abs=0.1)
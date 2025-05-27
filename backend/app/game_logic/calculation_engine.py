# File: backend/app/game_logic/calculation_engine.py
from typing import List, Dict, Any, Tuple, Optional

from app.schemas.game import GameInDB
from app.schemas.player import PlayerInDB
from app.schemas.round import RoundInDB, RoundDecisionBase 
from app.schemas.parcel import ParcelInDB, PlantationType
from app.schemas.result import ResultCreate 
from app.schemas.financials import TotalIncome, TotalExpenses
from pydantic import BaseModel # To ensure TotalIncome/Expenses are models

from app.game_logic import game_rules, decision_impacts
from app.core.config import settings 

# Helper data classes 
class PlayerRoundInputBundle:
    """Bundles all necessary inputs for processing a single player's round."""
    def __init__(
        self,
        player_doc: PlayerInDB,
        player_round_doc: RoundInDB,
        parcel_plantation_choices: Dict[int, PlantationType], 
        initial_field_state_for_this_round: List[ParcelInDB], # Parcels here have .current_plantation set to this round's choice
        previous_round_result_for_player: Optional[ResultCreate] 
    ):
        self.player_doc = player_doc
        self.player_round_doc = player_round_doc
        self.parcel_plantation_choices = parcel_plantation_choices # Kept for clarity, though derivable
        self.initial_field_state_for_this_round = initial_field_state_for_this_round
        self.previous_round_result_for_player = previous_round_result_for_player

class PlayerRoundOutputBundle:
    """Bundles all outputs after processing a single player's round."""
    def __init__(
        self,
        player_id: str,
        round_number: int,
        calculated_result_for_this_round: ResultCreate,
        field_state_for_next_round_start: List[ParcelInDB],
        aggregated_explanations_for_this_round: Dict[str, str]
    ):
        self.player_id = player_id
        self.round_number = round_number
        self.calculated_result_for_this_round = calculated_result_for_this_round
        self.field_state_for_next_round_start = field_state_for_next_round_start
        self.aggregated_explanations_for_this_round = aggregated_explanations_for_this_round # Corrected typo


async def _calculate_single_player_round_outcome(
    game_doc: GameInDB,
    player_input: PlayerRoundInputBundle,
) -> PlayerRoundOutputBundle:
    """
    Processes a single player's submitted round decisions and calculates outcomes.
    """
    player_doc = player_input.player_doc
    round_doc_with_decisions = player_input.player_round_doc
    # parcels_at_start_of_round_with_choices is where parcel.current_plantation = choice for THIS round
    parcels_at_start_of_round_with_choices = player_input.initial_field_state_for_this_round
    # parcel_plantation_choices_this_round = player_input.parcel_plantation_choices # This is now redundant
    previous_result = player_input.previous_round_result_for_player

    current_round_number = round_doc_with_decisions.round_number
    player_decisions: RoundDecisionBase = round_doc_with_decisions.decisions
    if not player_decisions: # Should always be a RoundDecisionBase object due to schema
        player_decisions = RoundDecisionBase() 

    starting_capital = previous_result.closing_capital if previous_result else game_rules.INITIAL_PLAYER_CAPITAL
    current_machine_level = game_rules.INITIAL_MACHINE_EFFICIENCY
    if previous_result and previous_result.player_machine_efficiency is not None:
        current_machine_level = previous_result.player_machine_efficiency
    was_organic_certified_last_round = previous_result.achieved_organic_certification if previous_result else False
    
    is_organic_certified_this_round, organic_expl = decision_impacts.determine_organic_certification(
        player_decisions,
        was_certified_last_round=was_organic_certified_last_round,
    )
    updated_player_machine_level = decision_impacts.update_player_machine_level(
        current_machine_level, player_decisions.machine_investment_level
    )

    parcels_state_for_next_round_start: List[ParcelInDB] = []
    round_aggregated_explanations: Dict[str, str] = {}
    if organic_expl: round_aggregated_explanations["organic_status"] = organic_expl
    machine_level_change = updated_player_machine_level - current_machine_level
    if abs(machine_level_change) > 0.01: # Use a small epsilon for float comparison
        change_direction = "gestiegen" if machine_level_change > 0 else "gesunken"
        round_aggregated_explanations["machine_level_change"] = (
            f"Maschineneffizienz ist auf {updated_player_machine_level:.1f}% {change_direction} "
            f"(von {current_machine_level:.1f}%)."
        )

    weather_this_round = game_doc.weather_sequence[current_round_number - 1] 
    vermin_this_round = game_doc.vermin_sequence[current_round_number - 1]

    num_parcels_chosen_for_animals_this_round = sum(
        1 for p in parcels_at_start_of_round_with_choices if p.current_plantation == PlantationType.ANIMAL_HUSBANDRY
    )
    num_total_parcels = len(parcels_at_start_of_round_with_choices) if parcels_at_start_of_round_with_choices else game_rules.DEFAULT_NUMBER_OF_PARCELS_PER_PLAYER

    for parcel_with_choice_for_this_round in parcels_at_start_of_round_with_choices:
        # `parcel_with_choice_for_this_round.current_plantation` is the key choice for this round.
        parcel_state_at_end_of_this_round, parcel_explanations = decision_impacts.update_parcel_ecological_state(
            parcel=parcel_with_choice_for_this_round, # This parcel's .current_plantation is the choice for this round
            player_decisions=player_decisions,
            round_weather=weather_this_round,
            round_vermin=vermin_this_round,
            player_machine_efficiency=updated_player_machine_level,
            num_animal_parcels_on_field=num_parcels_chosen_for_animals_this_round,
            total_parcels_on_field=num_total_parcels,
            is_organic_certified_this_round=is_organic_certified_this_round
            # new_plantation_choice argument removed from decision_impacts.update_parcel_ecological_state
        )
        parcels_state_for_next_round_start.append(parcel_state_at_end_of_this_round)
        for key, val in parcel_explanations.items():
            round_aggregated_explanations[f"P{parcel_with_choice_for_this_round.parcel_number:02d}_{key}"] = val
    
    seed_costs = decision_impacts.calculate_seed_costs(
        parcels_at_start_of_round_with_choices, # Seed costs depend on what was *chosen* to be planted this round
        is_organic_certified_this_round
    )

    # For investment costs, need to compare animal parcels *this* round vs *previous* round.
    # `parcels_at_start_of_round_with_choices` has `current_plantation` for this round.
    # `previous_plantation` on these same parcels would be from start of this round (= end of previous round's active plantation).
    parcels_at_end_of_previous_round_dedicated_to_animals = sum(
        1 for p in parcels_at_start_of_round_with_choices if p.previous_plantation == PlantationType.ANIMAL_HUSBANDRY
    ) if current_round_number > 1 else 0 # No previous plantation for round 1

    net_new_animal_parcels = num_parcels_chosen_for_animals_this_round - parcels_at_end_of_previous_round_dedicated_to_animals
    
    investment_costs = decision_impacts.calculate_investment_costs(
        player_decisions, 
        num_newly_dedicated_animal_parcels=max(0, net_new_animal_parcels)
    )

    running_costs = decision_impacts.calculate_running_costs(
        player_decisions,
        num_total_parcels,
        num_parcels_chosen_for_animals_this_round, # Animals active *this* round
        player_decisions.attempt_organic_certification,
        was_organic_certified_last_round,
        updated_player_machine_level 
    )

    total_expenses_obj = TotalExpenses(
        seeds=seed_costs, investments=investment_costs, running_costs=running_costs,
        total=round(seed_costs.total + investment_costs.total + running_costs.total, 2)
    )

    # Harvest income is based on the yields calculated by update_parcel_ecological_state,
    # which are stored in `parcel_state_at_end_of_this_round.last_harvest_yield_dt`.
    # So we pass `parcels_state_for_next_round_start` (which contains these updated parcels) to calculate_harvest_income.
    harvest_income_obj = decision_impacts.calculate_harvest_income(
        parcels_state_for_next_round_start, is_organic_certified_this_round
    )
    total_income_obj = TotalIncome(
        harvests=harvest_income_obj, 
        total=round(harvest_income_obj.total if harvest_income_obj else 0.0, 2) # Ensure harvest_income_obj is not None
    )

    profit_this_round = total_income_obj.total - total_expenses_obj.total
    closing_capital = starting_capital + profit_this_round

    result_for_this_round = ResultCreate(
        game_id=game_doc.id,
        player_id=player_doc.uid,
        round_number=current_round_number,
        profit_or_loss=round(profit_this_round, 2),
        starting_capital=round(starting_capital, 2),
        closing_capital=round(closing_capital, 2),
        achieved_organic_certification=is_organic_certified_this_round,
        weather_event=weather_this_round,
        vermin_event=vermin_this_round,
        income_details=total_income_obj,
        expense_details=total_expenses_obj,
        explanations=round_aggregated_explanations,
        player_machine_efficiency=round(updated_player_machine_level, 1) 
    )

    return PlayerRoundOutputBundle(
        player_id=player_doc.uid,
        round_number=current_round_number,
        calculated_result_for_this_round=result_for_this_round,
        field_state_for_next_round_start=parcels_state_for_next_round_start, # This is the key output for next round's field state
        aggregated_explanations_for_this_round=round_aggregated_explanations
    )


async def orchestrate_round_calculations(
    db: Any, 
    game_doc: GameInDB,
    all_players_round_inputs_packaged: List[PlayerRoundInputBundle]
) -> List[PlayerRoundOutputBundle]:
    """
    Orchestrates the calculation of outcomes for all players for a given completed round.
    """
    all_player_round_outputs: List[PlayerRoundOutputBundle] = []

    for player_input_bundle in all_players_round_inputs_packaged:
        if not player_input_bundle.player_round_doc.is_submitted:
            print(f"Warning: Player {player_input_bundle.player_doc.uid} round {player_input_bundle.player_round_doc.round_number} not submitted. Skipping calculation.")
            continue
        player_output = await _calculate_single_player_round_outcome(
            game_doc=game_doc, 
            player_input=player_input_bundle
        )
        all_player_round_outputs.append(player_output)
    return all_player_round_outputs
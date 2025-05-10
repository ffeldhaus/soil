# File: backend/app/game_logic/calculation_engine.py
from typing import List, Dict, Any, Tuple, Optional

from app.schemas.game import GameInDB
from app.schemas.player import PlayerInDB
from app.schemas.round import RoundInDB, RoundDecisionBase # Player's submitted round
from app.schemas.parcel import ParcelInDB, PlantationType
from app.schemas.result import ResultCreate # Ensure this schema has player_machine_efficiency
from app.schemas.financials import TotalIncome, TotalExpenses

from app.game_logic import game_rules, decision_impacts
from app.core.config import settings # For default number of parcels if needed

# Helper data classes (can be kept here or moved to a common `types.py` in game_logic)
class PlayerRoundInputBundle:
    """Bundles all necessary inputs for processing a single player's round."""
    def __init__(
        self,
        player_doc: PlayerInDB,
        player_round_doc: RoundInDB,
        parcel_plantation_choices: Dict[int, PlantationType], # Key: parcel_number
        initial_field_state_for_this_round: List[ParcelInDB],
        previous_round_result_for_player: Optional[ResultCreate] # ResultCreate from PREVIOUS round
    ):
        self.player_doc = player_doc
        self.player_round_doc = player_round_doc
        self.parcel_plantation_choices = parcel_plantation_choices
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
        self.aggregated_explanations_for_this_round = aggregated_explanations


async def _calculate_single_player_round_outcome(
    game_doc: GameInDB,
    player_input: PlayerRoundInputBundle,
) -> PlayerRoundOutputBundle:
    """
    Processes a single player's submitted round decisions and calculates outcomes.
    """
    player_doc = player_input.player_doc
    round_doc_with_decisions = player_input.player_round_doc
    initial_parcels_this_round = player_input.initial_field_state_for_this_round
    plantation_choices_this_round = player_input.parcel_plantation_choices
    previous_result = player_input.previous_round_result_for_player # This is ResultCreate type

    current_round_number = round_doc_with_decisions.round_number
    player_decisions: RoundDecisionBase = round_doc_with_decisions.decisions
    if not player_decisions:
        player_decisions = RoundDecisionBase() # Should have defaults

    # --- Determine initial states from previous round or game defaults ---
    starting_capital = previous_result.closing_capital if previous_result else game_rules.INITIAL_PLAYER_CAPITAL
    
    current_machine_level = game_rules.INITIAL_MACHINE_EFFICIENCY
    if previous_result and previous_result.player_machine_efficiency is not None: # Check attribute exists
        current_machine_level = previous_result.player_machine_efficiency

    was_organic_certified_last_round = previous_result.achieved_organic_certification if previous_result else False
    # consecutive_organic_rounds = previous_result.consecutive_organic_rounds if previous_result else 0 # For transition period

    # --- Apply player-level decisions that affect overall state for *this* round ---
    is_organic_certified_this_round, organic_expl = decision_impacts.determine_organic_certification(
        player_decisions,
        was_certified_last_round=was_organic_certified_last_round,
        # consecutive_rounds_organic_practices=consecutive_organic_rounds # Pass if using transition
    )
    updated_player_machine_level = decision_impacts.update_player_machine_level(
        current_machine_level, player_decisions.machine_investment_level
    )

    # --- Process each parcel for ecological changes and harvest for *this* round ---
    parcels_state_for_next_round_start: List[ParcelInDB] = []
    round_aggregated_explanations: Dict[str, str] = {}
    if organic_expl: round_aggregated_explanations["organic_status"] = organic_expl
    
    machine_level_change = updated_player_machine_level - current_machine_level
    if abs(machine_level_change) > 0.1:
        change_direction = "gestiegen" if machine_level_change > 0 else "gesunken"
        round_aggregated_explanations["machine_level_change"] = (
            f"Maschineneffizienz ist auf {updated_player_machine_level:.1f}% {change_direction} "
            f"(von {current_machine_level:.1f}%)."
        )

    weather_this_round = game_doc.weather_sequence[current_round_number - 1] # Lists are 0-indexed
    vermin_this_round = game_doc.vermin_sequence[current_round_number - 1]

    num_parcels_chosen_for_animals_this_round = sum(
        1 for p_choice in plantation_choices_this_round.values() if p_choice == PlantationType.ANIMAL_HUSBANDRY
    )
    num_total_parcels = len(initial_parcels_this_round) if initial_parcels_this_round else game_rules.DEFAULT_NUMBER_OF_PARCELS_PER_PLAYER


    for parcel_at_round_start in initial_parcels_this_round:
        plantation_choice_for_this_parcel = plantation_choices_this_round.get(
            parcel_at_round_start.parcel_number,
            parcel_at_round_start.current_plantation # Fallback, though UI should enforce choices
        )

        parcel_state_for_next_round, parcel_explanations = decision_impacts.update_parcel_ecological_state(
            parcel=parcel_at_round_start,
            player_decisions=player_decisions,
            round_weather=weather_this_round,
            round_vermin=vermin_this_round,
            player_machine_efficiency=updated_player_machine_level,
            num_animal_parcels_on_field=num_parcels_chosen_for_animals_this_round,
            total_parcels_on_field=num_total_parcels,
            is_organic_certified_this_round=is_organic_certified_this_round,
            new_plantation_choice=plantation_choice_for_this_parcel
        )
        parcels_state_for_next_round_start.append(parcel_state_for_next_round)
        for key, val in parcel_explanations.items():
            # Prefix with parcel number for uniqueness in aggregated explanations
            round_aggregated_explanations[f"P{parcel_at_round_start.parcel_number:02d}_{key}"] = val
            
    # --- Calculate Financials for *this* current round ---
    # Seed costs: based on what was planted *this* round (now in .current_plantation of parcels_state_for_next_round_start)
    seed_costs = decision_impacts.calculate_seed_costs(
        parcels_state_for_next_round_start, is_organic_certified_this_round
    )

    # Investment costs:
    parcels_at_start_of_round_dedicated_to_animals = sum(
        1 for p in initial_parcels_this_round if p.current_plantation == PlantationType.ANIMAL_HUSBANDRY
    )
    net_new_animal_parcels = num_parcels_chosen_for_animals_this_round - parcels_at_start_of_round_dedicated_to_animals
    
    investment_costs = decision_impacts.calculate_investment_costs(
        player_decisions, 
        num_newly_dedicated_animal_parcels=max(0, net_new_animal_parcels) # Cost only for net increase
    )

    running_costs = decision_impacts.calculate_running_costs(
        player_decisions,
        num_total_parcels,
        num_parcels_chosen_for_animals_this_round,
        player_decisions.attempt_organic_certification,
        was_organic_certified_last_round,
        updated_player_machine_level # Use the machine level *after* this round's investment
    )

    total_expenses_obj = TotalExpenses(
        seeds=seed_costs, investments=investment_costs, running_costs=running_costs,
        total=round(seed_costs.total + investment_costs.total + running_costs.total, 2)
    )

    # Harvest income: based on .last_harvest_yield_dt from parcels_state_for_next_round_start
    harvest_income_obj = decision_impacts.calculate_harvest_income(
        parcels_state_for_next_round_start, is_organic_certified_this_round
    )
    total_income_obj = TotalIncome(harvests=harvest_income_obj, total=round(harvest_income_obj.total, 2))

    # --- Final profit and capital ---
    profit_this_round = total_income_obj.total + total_expenses_obj.total # Expenses are stored as negative values in original, but here as positive costs
    # So profit = income - expenses. If expenses are positive, then it's income - total_expenses_obj.total
    profit_this_round = total_income_obj.total - total_expenses_obj.total # Corrected based on positive expense values
    closing_capital = starting_capital + profit_this_round

    # --- Assemble the ResultCreate object ---
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
        player_machine_efficiency=round(updated_player_machine_level, 1) # Persist updated machine level
    )

    return PlayerRoundOutputBundle(
        player_id=player_doc.uid,
        round_number=current_round_number,
        calculated_result_for_this_round=result_for_this_round,
        field_state_for_next_round_start=parcels_state_for_next_round_start,
        aggregated_explanations_for_this_round=round_aggregated_explanations
    )


async def orchestrate_round_calculations(
    db: Any, # Firestore Client, passed to CRUD methods
    game_doc: GameInDB,
    # List of: (PlayerInDB, RoundInDB with decisions, List[ParcelInDB] at start of round, Dict[parcel_num, PlantationType] choices)
    all_players_round_inputs_packaged: List[PlayerRoundInputBundle]
    # Previous results are now part of PlayerRoundInputBundle
) -> List[PlayerRoundOutputBundle]:
    """
    Orchestrates the calculation of outcomes for all players for a given completed round.
    """
    all_player_round_outputs: List[PlayerRoundOutputBundle] = []

    for player_input_bundle in all_players_round_inputs_packaged:
        if not player_input_bundle.player_round_doc.is_submitted:
            print(f"Warning: Player {player_input_bundle.player_doc.uid} round {player_input_bundle.player_round_doc.round_number} not submitted. Skipping calculation.")
            # Optionally create a default/empty output or raise an error
            continue
        
        player_output = await _calculate_single_player_round_outcome(
            game_doc=game_doc, # Pass the main game document
            player_input=player_input_bundle
        )
        all_player_round_outputs.append(player_output)
    
    return all_player_round_outputs
# File: backend/app/game_logic/ai_player.py
import random
from typing import Dict, List, Tuple, Optional

from app.schemas.parcel import ParcelInDB, PlantationType
from app.schemas.round import RoundDecisionBase
from app.schemas.result import ResultCreate # For AI to potentially consider previous financial/eco outcomes
from app.game_logic import game_rules # Access to costs, yields, impacts


class AIStrategyType:
    BALANCED = "balanced"
    PROFIT_MAXIMIZER = "profit_maximizer"
    ECO_CONSCIOUS = "eco_conscious"
    RANDOM_EXPLORER = "random_explorer" # For variety or testing


def _choose_plantation_for_parcel(
    parcel: ParcelInDB,
    strategy: str,
    available_crops: List[PlantationType],
    current_round_number: int, # To potentially vary strategy over time
    previous_result: Optional[ResultCreate]
) -> PlantationType:
    """
    Simple logic for an AI to choose a plantation for a single parcel based on strategy.
    This is a very basic placeholder and needs significant expansion.
    """
    # Ensure FALLOW and ANIMAL_HUSBANDRY are not chosen if not desired as primary crops by AI
    plantable_crops = [crop for crop in available_crops if crop not in [PlantationType.FALLOW, PlantationType.ANIMAL_HUSBANDRY]]
    if not plantable_crops: # Should not happen if available_crops is well-defined
        return PlantationType.FALLOW

    if strategy == AIStrategyType.PROFIT_MAXIMIZER:
        # Basic: pick a crop with high base price (ignoring yield variability for now)
        # A more advanced AI would estimate profit based on current soil/nutrient, costs, etc.
        best_crop = None
        max_price = -1
        for crop in plantable_crops:
            price = game_rules.CROP_PRICES.get(crop.value, 0)
            if price > max_price:
                max_price = price
                best_crop = crop
        return best_crop if best_crop else random.choice(plantable_crops)

    elif strategy == AIStrategyType.ECO_CONSCIOUS:
        # Basic: prioritize soil-improving crops or fallow if soil is poor
        if parcel.soil_quality < 50 or parcel.nutrient_level < 40:
            # Consider fallow or field bean
            if PlantationType.FALLOW in available_crops and random.random() < 0.4: # 40% chance for fallow
                return PlantationType.FALLOW
            if PlantationType.FIELD_BEAN in plantable_crops:
                return PlantationType.FIELD_BEAN
        # Otherwise, pick a crop that is generally less damaging or good in sequence
        good_sequence_crops = []
        for crop in plantable_crops:
            # Check crop sequence effect if this crop were planted after parcel.current_plantation
            # This logic is simplified as we don't know the 'previous_plantation' of the *next* state yet
            # For now, just pick one known to be generally good or less harmful.
            if crop in [PlantationType.FIELD_BEAN, PlantationType.OAT, PlantationType.RYE]:
                good_sequence_crops.append(crop)
        return random.choice(good_sequence_crops) if good_sequence_crops else random.choice(plantable_crops)

    elif strategy == AIStrategyType.RANDOM_EXPLORER:
        return random.choice(available_crops) # Includes Fallow and Animals if in available_crops

    # Default (Balanced) or unrecognized strategy
    # Try to maintain some crop rotation
    if parcel.previous_plantation and parcel.previous_plantation in plantable_crops and random.random() > 0.3:
        # Avoid planting the same as last time with 70% probability
        eligible_crops = [c for c in plantable_crops if c != parcel.previous_plantation]
        if eligible_crops:
            return random.choice(eligible_crops)
    return random.choice(plantable_crops)


def generate_ai_player_decisions(
    player_id: str, # For logging or more complex AI personalization
    current_field_state: List[ParcelInDB], # Player's current parcels (at start of decision phase)
    strategy: str, # e.g., "balanced", "profit_maximizer", "eco_conscious"
    current_round_number: int,
    previous_result: Optional[ResultCreate], # AI might use this to adapt
    # game_rules could be passed if not globally imported, or specific parts of it
) -> Tuple[RoundDecisionBase, Dict[int, PlantationType]]:
    """
    Generates decisions for an AI player based on its strategy and current game state.

    Returns:
        A tuple containing:
        - RoundDecisionBase: General decisions for the round.
        - Dict[int, PlantationType]: Plantation choices (parcel_number: PlantationType).
    """
    round_decisions = RoundDecisionBase()
    parcel_choices: Dict[int, PlantationType] = {}

    # --- General Round Decisions (RoundDecisionBase) ---
    # This is a very basic placeholder logic. A real AI would be more sophisticated.

    # Determine available crops (all except potentially a few based on rules or strategy)
    # AI currently can choose from all defined plantation types.
    all_defined_plantations = list(PlantationType)


    if strategy == AIStrategyType.PROFIT_MAXIMIZER:
        round_decisions.fertilize = True if random.random() < 0.8 else False # High chance
        round_decisions.pesticide = True if random.random() < 0.7 else False
        round_decisions.biological_control = False # Typically conflicts with pesticide and costs more
        round_decisions.attempt_organic_certification = False
        round_decisions.machine_investment_level = random.choice([0, 10, 20, 20, 30]) # Invest moderately

    elif strategy == AIStrategyType.ECO_CONSCIOUS:
        round_decisions.fertilize = False
        round_decisions.pesticide = False
        round_decisions.biological_control = True if random.random() < 0.75 else False
        round_decisions.attempt_organic_certification = True
        round_decisions.machine_investment_level = random.choice([0, 0, 5, 10]) # Lower investment

    elif strategy == AIStrategyType.RANDOM_EXPLORER:
        round_decisions.fertilize = random.choice([True, False])
        round_decisions.pesticide = random.choice([True, False])
        # Avoid pesticide and biocontrol together usually
        if round_decisions.pesticide:
            round_decisions.biological_control = False
        else:
            round_decisions.biological_control = random.choice([True, False])
        round_decisions.attempt_organic_certification = random.choice([True, False])
        round_decisions.machine_investment_level = random.choice([0, 5, 10, 15, 20, 25, 30])

    else: # Balanced (default)
        round_decisions.fertilize = random.choice([True, False, False]) # Less likely to use conventional
        round_decisions.pesticide = random.choice([True, False, False, False]) # Even less likely
        if round_decisions.pesticide:
            round_decisions.biological_control = False
        else:
            round_decisions.biological_control = random.choice([True, True, False])
        # Try organic if not using conventional methods
        if not round_decisions.fertilize and not round_decisions.pesticide:
            round_decisions.attempt_organic_certification = True if random.random() < 0.6 else False
        else:
            round_decisions.attempt_organic_certification = False
        round_decisions.machine_investment_level = random.choice([0, 5, 10, 10, 15])

    # --- Parcel Plantation Choices ---
    for parcel in current_field_state:
        parcel_choices[parcel.parcel_number] = _choose_plantation_for_parcel(
            parcel, strategy, all_defined_plantations, current_round_number, previous_result
        )

    # Ensure AI doesn't choose conflicting organic practices if attempting certification
    if round_decisions.attempt_organic_certification:
        if round_decisions.fertilize or round_decisions.pesticide:
            # If strategy led to conflict, override to be compliant for organic attempt
            # print(f"AI Debug: Correcting conflicting choices for organic attempt for player {player_id}")
            round_decisions.fertilize = False
            round_decisions.pesticide = False
            # Eco strategy might favor biological_control, which is fine
            if strategy != AIStrategyType.ECO_CONSCIOUS and not round_decisions.biological_control:
                 round_decisions.biological_control = True if random.random() < 0.5 else False


    print(f"AI Decisions for player {player_id} (Strat: {strategy}, Rd: {current_round_number}): General: {round_decisions.model_dump()}, Parcel Choices (sample): {dict(list(parcel_choices.items())[:3])}...")
    return round_decisions, parcel_choices
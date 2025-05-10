# File: backend/app/game_logic/decision_impacts.py
from typing import Dict, Any, Tuple, Optional, List
import math

from app.schemas.parcel import ParcelInDB, PlantationType, CropSequenceEffect, HarvestOutcome
from app.schemas.round import RoundDecisionBase
from app.schemas.financials import SeedCosts, InvestmentCosts, RunningCosts, HarvestIncome
from app.game_logic import game_rules # Now using more detailed constants

# --- Parcel State Updaters ---

def update_parcel_ecological_state(
    parcel: ParcelInDB, # Current state of the parcel (before this round's chosen plantation takes effect)
    player_decisions: RoundDecisionBase,
    round_weather: str,
    round_vermin: str,
    player_machine_efficiency: float, # Player's overall machine efficiency (e.g., 100.0 for base)
    num_animal_parcels_on_field: int, # Total animal parcels the player has this round
    total_parcels_on_field: int, # Should be game_rules.DEFAULT_NUMBER_OF_PARCELS_PER_PLAYER
    is_organic_certified_this_round: bool,
    new_plantation_choice: PlantationType # The plantation chosen by the player for THIS parcel for THIS round
) -> Tuple[ParcelInDB, Dict[str, str]]:
    explanations: Dict[str, str] = {}
    next_state_parcel = parcel.model_copy(deep=True)

    # 1. Update plantation history
    next_state_parcel.pre_previous_plantation = parcel.previous_plantation
    next_state_parcel.previous_plantation = parcel.current_plantation
    next_state_parcel.current_plantation = new_plantation_choice

    # 2. Determine Crop Sequence Effect
    if next_state_parcel.previous_plantation:
        rules_for_current_crop = game_rules.CROP_SEQUENCE_RULES.get(next_state_parcel.current_plantation.value, {})
        effect_str = rules_for_current_crop.get(
            next_state_parcel.previous_plantation.value,
            rules_for_current_crop.get("default", CropSequenceEffect.OK.value)
        )
        next_state_parcel.crop_sequence_effect = CropSequenceEffect(effect_str)
        if effect_str == CropSequenceEffect.GOOD.value: explanations["crop_sequence_info"] = f"Gute Fruchtfolge: {next_state_parcel.current_plantation.value} nach {next_state_parcel.previous_plantation.value}."
        elif effect_str == CropSequenceEffect.BAD.value: explanations["crop_sequence_info"] = f"Schlechte Fruchtfolge: {next_state_parcel.current_plantation.value} nach {next_state_parcel.previous_plantation.value}."
    else:
        next_state_parcel.crop_sequence_effect = CropSequenceEffect.NONE

    # 3. Calculate Harvest for THIS round
    current_harvest_yield_dt = 0.0
    current_harvest_outcome_category = HarvestOutcome.NONE

    if next_state_parcel.current_plantation not in [PlantationType.FALLOW, PlantationType.ANIMAL_HUSBANDRY]:
        base_yield = game_rules.HARVEST_BASE_YIELD_DT.get(next_state_parcel.current_plantation.value, 0.0)
        effective_yield = base_yield

        # a. Soil quality impact
        soil_quality_norm = parcel.soil_quality / game_rules.SOIL_TARGET_FOR_HARVEST_OPTIMUM
        soil_exponent = game_rules.HARVEST_SOIL_EXPONENT.get(next_state_parcel.current_plantation.value, 1.0)
        soil_factor = max(0.1, min(1.5, soil_quality_norm ** soil_exponent))
        effective_yield *= soil_factor
        if soil_factor < 0.85 and parcel.soil_quality < game_rules.SOIL_TARGET_FOR_HARVEST_OPTIMUM: explanations["harvest_soil"] = f"Niedrige Bodenqualität ({parcel.soil_quality:.0f}%) reduzierte Ertrag."
        elif soil_factor > 1.1 and parcel.soil_quality > game_rules.SOIL_TARGET_FOR_HARVEST_OPTIMUM: explanations["harvest_soil"] = f"Gute Bodenqualität ({parcel.soil_quality:.0f}%) steigerte Ertrag."

        # b. Nutrient level impact
        nutrient_level_norm = parcel.nutrient_level / game_rules.NUTRITION_TARGET_FOR_HARVEST_OPTIMUM
        nutrient_exponent = game_rules.HARVEST_NUTRITION_EXPONENT.get(next_state_parcel.current_plantation.value, 1.0)
        nutrient_factor = max(0.1, min(1.5, nutrient_level_norm ** nutrient_exponent))
        effective_yield *= nutrient_factor
        if nutrient_factor < 0.85 and parcel.nutrient_level < game_rules.NUTRITION_TARGET_FOR_HARVEST_OPTIMUM: explanations["harvest_nutrient"] = f"Niedriger Nährstoffgehalt ({parcel.nutrient_level:.0f}%) reduzierte Ertrag."
        elif nutrient_factor > 1.1 and parcel.nutrient_level > game_rules.NUTRITION_TARGET_FOR_HARVEST_OPTIMUM: explanations["harvest_nutrient"] = f"Hoher Nährstoffgehalt ({parcel.nutrient_level:.0f}%) steigerte Ertrag."
        
        # c. Weather impact
        weather_impact_rules = game_rules.HARVEST_WEATHER_IMPACT.get(next_state_parcel.current_plantation.value, {})
        weather_multiplier = weather_impact_rules.get(round_weather, 1.0)
        if is_organic_certified_this_round and weather_multiplier < 1.0:
             weather_multiplier = min(1.0, weather_multiplier * game_rules.HARVEST_ORGANIC_WEATHER_RESILIENCE_FACTOR)
        effective_yield *= weather_multiplier
        if weather_multiplier < 0.9 and round_weather != game_rules.NORMAL_WEATHER: explanations["harvest_weather"] = f"Ernte durch {round_weather} um {((1-weather_multiplier)*100):.0f}% reduziert."
        
        # d. Vermin impact
        vermin_is_relevant = game_rules.HARVEST_VERMIN_RELEVANCE.get(next_state_parcel.current_plantation.value, {}).get(round_vermin, False)
        if vermin_is_relevant and round_vermin != game_rules.NO_VERMIN:
            vermin_damage_multiplier = 1.0
            control_measure_applied = False
            if player_decisions.pesticide:
                vermin_damage_multiplier = game_rules.HARVEST_VERMIN_PESTICIDE_EFFECTIVENESS
                explanations["harvest_vermin_control"] = f"Pestizideinsatz reduzierte Schaden durch {round_vermin}."
                control_measure_applied = True
            elif player_decisions.biological_control:
                vermin_damage_multiplier = game_rules.HARVEST_VERMIN_BIOCONTROL_EFFECTIVENESS
                explanations["harvest_vermin_control"] = f"Nützlingseinsatz reduzierte Schaden durch {round_vermin}."
                control_measure_applied = True
            
            if not control_measure_applied:
                vermin_damage_multiplier = game_rules.HARVEST_VERMIN_NO_CONTROL_IMPACT
                explanations["harvest_vermin_control"] = f"Ernteverlust durch {round_vermin} (keine Bekämpfung) um {((1-vermin_damage_multiplier)*100):.0f}%."
            effective_yield *= vermin_damage_multiplier
        
        # e. Crop sequence direct harvest impact
        if next_state_parcel.crop_sequence_effect == CropSequenceEffect.GOOD:
            effective_yield *= (1 + game_rules.HARVEST_CROPSEQUENCE_BONUS)
        elif next_state_parcel.crop_sequence_effect == CropSequenceEffect.BAD:
            effective_yield *= (1 - game_rules.HARVEST_CROPSEQUENCE_PENALTY) # Penalty is positive in game_rules

        # f. Machine efficiency impact
        machine_efficiency_delta_percent = player_machine_efficiency - game_rules.INITIAL_MACHINE_EFFICIENCY
        machine_yield_factor = 1.0 + (machine_efficiency_delta_percent * game_rules.HARVEST_YIELD_PER_MACHINE_EFFICIENCY_PERCENT)
        machine_yield_factor = max(0.5, min(1.5, machine_yield_factor)) # Cap effect
        effective_yield *= machine_yield_factor
        if machine_yield_factor < 0.95 and player_machine_efficiency < game_rules.INITIAL_MACHINE_EFFICIENCY: explanations["harvest_machine"] = f"Geringere Maschinen-Effizienz ({player_machine_efficiency:.0f}%) reduzierte Ertrag."
        if machine_yield_factor > 1.05 and player_machine_efficiency > game_rules.INITIAL_MACHINE_EFFICIENCY: explanations["harvest_machine"] = f"Höhere Maschinen-Effizienz ({player_machine_efficiency:.0f}%) steigerte Ertrag."

        current_harvest_yield_dt = max(0.0, effective_yield)

        if base_yield > 0:
            ratio_to_base = current_harvest_yield_dt / base_yield
            if ratio_to_base >= 1.20: current_harvest_outcome_category = HarvestOutcome.VERY_HIGH
            elif ratio_to_base >= 0.95: current_harvest_outcome_category = HarvestOutcome.HIGH
            elif ratio_to_base >= 0.75: current_harvest_outcome_category = HarvestOutcome.MODERATE
            elif ratio_to_base >= 0.50: current_harvest_outcome_category = HarvestOutcome.LOW
            elif ratio_to_base > 0: current_harvest_outcome_category = HarvestOutcome.VERY_LOW
        else: current_harvest_outcome_category = HarvestOutcome.NONE
            
    next_state_parcel.last_harvest_yield_dt = round(current_harvest_yield_dt, 2)
    next_state_parcel.last_harvest_outcome_category = current_harvest_outcome_category

    # --- 4. Update Soil Quality for START of NEXT round ---
    soil_change_points = 0.0
    current_soil_quality = parcel.soil_quality

    if next_state_parcel.current_plantation == PlantationType.FALLOW:
        soil_change_points += game_rules.SOIL_FALLOW_RECOVERY_PER_ROUND
        if current_soil_quality < game_rules.SOIL_TARGET_OPTIMUM: explanations["soil_fallow"] = f"Brache verbessert Bodenqualität um {game_rules.SOIL_FALLOW_RECOVERY_PER_ROUND:.1f} Punkte."
    elif next_state_parcel.current_plantation == PlantationType.ANIMAL_HUSBANDRY:
        soil_change_points += game_rules.SOIL_ANIMAL_HUSBANDRY_EFFECT_PER_ROUND
        if game_rules.SOIL_ANIMAL_HUSBANDRY_EFFECT_PER_ROUND > 0: explanations["soil_animals"] = f"Tierhaltung verbessert Bodenqualität um {game_rules.SOIL_ANIMAL_HUSBANDRY_EFFECT_PER_ROUND:.1f} Punkte."
        elif game_rules.SOIL_ANIMAL_HUSBANDRY_EFFECT_PER_ROUND < 0: explanations["soil_animals"] = f"Tierhaltung verschlechtert Bodenqualität um {-game_rules.SOIL_ANIMAL_HUSBANDRY_EFFECT_PER_ROUND:.1f} Punkte."
    else: # It's a crop
        soil_change_points += game_rules.SOIL_IMPACT_BY_PLANTATION.get(next_state_parcel.current_plantation.value, 0.0)
        
        if next_state_parcel.crop_sequence_effect == CropSequenceEffect.GOOD: soil_change_points += game_rules.SOIL_CROPSEQUENCE_GOOD_BONUS
        if next_state_parcel.crop_sequence_effect == CropSequenceEffect.BAD: soil_change_points += game_rules.SOIL_CROPSEQUENCE_BAD_PENALTY # Penalty is negative
        
        if player_decisions.fertilize: soil_change_points += game_rules.SOIL_CONV_FERTILIZER_PENALTY
        if player_decisions.pesticide: soil_change_points += game_rules.SOIL_PESTICIDE_PENALTY
            
        if round_weather == game_rules.FLOOD: soil_change_points += game_rules.SOIL_FLOOD_DAMAGE
        elif round_weather == game_rules.DROUGHT: soil_change_points += game_rules.SOIL_DROUGHT_DAMAGE
        
        is_monoculture_streak = (next_state_parcel.current_plantation == next_state_parcel.previous_plantation and
                                 next_state_parcel.current_plantation == next_state_parcel.pre_previous_plantation and
                                 next_state_parcel.previous_plantation is not None and # Ensure history exists
                                 next_state_parcel.pre_previous_plantation is not None)
        is_second_year_monoculture = (next_state_parcel.current_plantation == next_state_parcel.previous_plantation and
                                      next_state_parcel.previous_plantation is not None and
                                      not is_monoculture_streak)

        if is_monoculture_streak:
            soil_change_points += game_rules.SOIL_MONOCULTURE_STREAK_PENALTY
            explanations["soil_monoculture"] = f"Anhaltende Monokultur ({next_state_parcel.current_plantation.value}) schadet dem Boden stark ({-game_rules.SOIL_MONOCULTURE_STREAK_PENALTY:.1f} Pkt)."
        elif is_second_year_monoculture:
             soil_change_points += game_rules.SOIL_MONOCULTURE_PENALTY
             explanations["soil_monoculture"] = f"Monokultur ({next_state_parcel.current_plantation.value}, 2. Jahr) schadet dem Boden ({-game_rules.SOIL_MONOCULTURE_PENALTY:.1f} Pkt)."

    next_state_parcel.soil_quality = round(max(0.0, min(100.0, current_soil_quality + soil_change_points)), 1)
    if soil_change_points < -0.1 and "soil_fallow" not in explanations and "soil_monoculture" not in explanations and "soil_animals" not in explanations :
        explanations["soil_general_change"] = f"Bodenqualität um {soil_change_points:.1f} Punkte verändert."
    elif soil_change_points > 0.1 and "soil_fallow" not in explanations and "soil_monoculture" not in explanations and "soil_animals" not in explanations :
         explanations["soil_general_change"] = f"Bodenqualität um {soil_change_points:.1f} Punkte verbessert."

    # --- 5. Update Nutrient Level for START of NEXT round ---
    nutrient_change_points = 0.0
    current_nutrient_level = parcel.nutrient_level

    if next_state_parcel.current_plantation == PlantationType.FALLOW:
        nutrient_change_points += game_rules.NUTRIENT_FALLOW_RECOVERY_PER_ROUND
        if current_nutrient_level < game_rules.NUTRIENT_TARGET_OPTIMUM: explanations["nutrient_fallow"] = f"Brache erhöht Nährstoffgehalt um {game_rules.NUTRIENT_FALLOW_RECOVERY_PER_ROUND:.1f} Pkt."
    elif next_state_parcel.current_plantation == PlantationType.ANIMAL_HUSBANDRY:
        # Simple bonus, could be scaled by animal density if that becomes a stat
        nutrient_change_points += game_rules.NUTRIENT_ANIMAL_MANURE_BONUS_PER_ROUND
        explanations["nutrient_animals"] = f"Tierhaltung/Düngung reichert Nährstoffe um {game_rules.NUTRIENT_ANIMAL_MANURE_BONUS_PER_ROUND:.1f} Pkt an."
    else: # It's a crop
        base_yield_for_uptake = game_rules.HARVEST_BASE_YIELD_DT.get(next_state_parcel.current_plantation.value, 1.0)
        relative_yield_factor = current_harvest_yield_dt / base_yield_for_uptake if base_yield_for_uptake > 0 else 0
        
        uptake_rate_percentage = game_rules.NUTRIENT_UPTAKE_BY_PLANTATION.get(next_state_parcel.current_plantation.value, 0.0)
        # Nutrient uptake is a % of current nutrients, scaled by how well the crop grew (relative_yield_factor)
        nutrient_change_points -= uptake_rate_percentage * current_nutrient_level * max(0.25, min(1.5, relative_yield_factor)) # Cap relative_yield_factor's impact
        
        if player_decisions.fertilize:
            nutrient_change_points += game_rules.NUTRIENT_CONV_FERTILIZER_GAIN
            explanations["nutrient_fertilizer"] = f"Konventioneller Dünger erhöht Nährstoffe um {game_rules.NUTRIENT_CONV_FERTILIZER_GAIN:.1f} Pkt."
            
        if next_state_parcel.current_plantation == PlantationType.FIELD_BEAN: # And other legumes
            nutrient_change_points += game_rules.NUTRIENT_LEGUME_FIXATION_BONUS
            explanations["nutrient_legumes"] = f"{PlantationType.FIELD_BEAN.value} bindet Stickstoff (+{game_rules.NUTRIENT_LEGUME_FIXATION_BONUS:.1f} Pkt Nährstoffe)."

    next_state_parcel.nutrient_level = round(max(0.0, min(100.0, current_nutrient_level + nutrient_change_points)), 1)
    if nutrient_change_points < -0.1 and not any(k in explanations for k in ["nutrient_fallow", "nutrient_animals", "nutrient_legumes", "nutrient_fertilizer"]):
        explanations["nutrient_general_change"] = f"Nährstoffgehalt um {nutrient_change_points:.1f} Punkte verändert."
    elif nutrient_change_points > 0.1 and not any(k in explanations for k in ["nutrient_fallow", "nutrient_animals", "nutrient_legumes", "nutrient_fertilizer"]):
         explanations["nutrient_general_change"] = f"Nährstoffgehalt um {nutrient_change_points:.1f} Punkte verbessert."

    return next_state_parcel, explanations


# --- Financial Calculators (adjustments based on game_rules) ---

def calculate_seed_costs(
    parcels_with_new_plantations: List[ParcelInDB],
    is_organic_certified_this_round: bool
) -> SeedCosts:
    costs = SeedCosts()
    for parcel in parcels_with_new_plantations:
        plantation_val = parcel.current_plantation.value # Ensured it's PlantationType by now
        if plantation_val == PlantationType.FALLOW.value or plantation_val == PlantationType.ANIMAL_HUSBANDRY.value:
            continue

        cost_map = game_rules.SEED_COSTS_PER_PARCEL.get(plantation_val, {})
        cost_per_parcel = cost_map.get(is_organic_certified_this_round, cost_map.get(False, 0.0))
        
        field_name = parcel.current_plantation.name.lower() # e.g. field_bean, sugar_beet
        if hasattr(costs, field_name):
            current_val = getattr(costs, field_name)
            setattr(costs, field_name, current_val + cost_per_parcel)
    
    costs.total = round(sum(getattr(costs, field.name) for field in costs.model_fields.values() if field.name != 'total'),2)
    return costs

def calculate_investment_costs(
    player_decisions: RoundDecisionBase,
    num_newly_dedicated_animal_parcels: int,
) -> InvestmentCosts:
    costs = InvestmentCosts()
    if num_newly_dedicated_animal_parcels > 0:
        costs.animals = num_newly_dedicated_animal_parcels * game_rules.COST_PER_NEW_ANIMAL_PARCEL_INVESTMENT
    
    costs.machines = player_decisions.machine_investment_level * game_rules.COST_PER_MACHINE_INVESTMENT_LEVEL_UNIT
    
    costs.total = round(costs.animals + costs.machines, 2)
    return costs

def calculate_running_costs(
    player_decisions: RoundDecisionBase,
    num_parcels_total: int,
    num_current_animal_parcels: int,
    is_attempting_organic_this_round: bool,
    is_already_organic_certified: bool,
    current_player_machine_level: float
) -> RunningCosts:
    costs = RunningCosts()
    if player_decisions.fertilize:
        costs.fertilizer = num_parcels_total * game_rules.COST_FERTILIZER_PER_PARCEL
    if player_decisions.pesticide:
        costs.pesticide = num_parcels_total * game_rules.COST_PESTICIDE_PER_PARCEL
    if player_decisions.biological_control:
        costs.biological_control = num_parcels_total * game_rules.COST_BIOCONTROL_PER_PARCEL
    
    costs.animal_feed_vet = num_current_animal_parcels * game_rules.COST_ANIMAL_MAINTENANCE_PER_PARCEL
    
    if is_attempting_organic_this_round or is_already_organic_certified:
        costs.organic_certification_control = game_rules.COST_ORGANIC_CERTIFICATION_CONTROL
        
    machine_maintenance_delta_factor = (current_player_machine_level - game_rules.BASE_MACHINE_EFFICIENCY_FOR_COSTS) / 100.0
    base_cost_multiplier = 1.0 + (machine_maintenance_delta_factor * game_rules.MACHINE_MAINTENANCE_COST_FACTOR_PER_PARCEL * num_parcels_total) # This seems too high if per parcel
    # Let's simplify: cost factor applies to overall base cost, not per parcel again
    base_op_cost_total = num_parcels_total * game_rules.BASE_OPERATIONAL_COST_PER_PARCEL
    costs.base_operational_costs = base_op_cost_total * max(0.5, min(2.0, 1.0 + ( (current_player_machine_level - game_rules.BASE_MACHINE_EFFICIENCY_FOR_COSTS) / 100.0 * game_rules.MACHINE_MAINTENANCE_COST_FACTOR_OVERALL ))) # Assume new constant
    # Add a new constant: MACHINE_MAINTENANCE_COST_FACTOR_OVERALL = 0.1 (e.g. 10% change in total base cost for 100% efficiency delta)


    costs.total = round(sum(getattr(costs, field.name) for field in costs.model_fields.values() if field.name != 'total'), 2)
    return costs

def calculate_harvest_income(
    parcels_after_this_rounds_harvest: List[ParcelInDB],
    is_organic_certified_this_round: bool
) -> HarvestIncome:
    income = HarvestIncome()
    price_multiplier = game_rules.ORGANIC_PRICE_BONUS_MULTIPLIER if is_organic_certified_this_round else 1.0
    
    for parcel in parcels_after_this_rounds_harvest:
        plantation_val = parcel.current_plantation.value
        if parcel.last_harvest_yield_dt > 0 and plantation_val not in [PlantationType.FALLOW.value, PlantationType.ANIMAL_HUSBANDRY.value]:
            base_price = game_rules.CROP_PRICES.get(plantation_val, 0.0)
            revenue_from_parcel = parcel.last_harvest_yield_dt * base_price * price_multiplier
            
            field_name = parcel.current_plantation.name.lower()
            if hasattr(income, field_name):
                current_val = getattr(income, field_name)
                setattr(income, field_name, current_val + revenue_from_parcel)
        elif plantation_val == PlantationType.ANIMAL_HUSBANDRY.value:
            # Direct income from animal parcels if applicable (e.g., per parcel holding animals)
            # This assumes each "animal parcel" generates this income.
            income.animal_products += game_rules.INCOME_PER_ANIMAL_PARCEL_PRODUCTS * price_multiplier

    income.total = round(sum(getattr(income, field.name) for field in income.model_fields.values() if field.name != 'total'), 2)
    return income


# --- Overall Player State Updaters ---
def determine_organic_certification(
    player_decisions: RoundDecisionBase,
    was_certified_last_round: bool,
    # consecutive_rounds_organic_practices: int # Add this if implementing transition period
) -> Tuple[bool, Optional[str]]:
    explanation = None
    # if game_rules.ORGANIC_TRANSITION_PERIOD_ROUNDS > 0 and not was_certified_last_round:
    #     if player_decisions.attempt_organic_certification and not (player_decisions.fertilize or player_decisions.pesticide):
    #         if consecutive_rounds_organic_practices + 1 >= game_rules.ORGANIC_TRANSITION_PERIOD_ROUNDS:
    #             explanation = "Öko-Zertifizierung nach erfolgreicher Umstellung erteilt."
    #             return True, explanation
    #         else:
    #             explanation = f"Öko-Umstellung im Gange ({consecutive_rounds_organic_practices + 1}/{game_rules.ORGANIC_TRANSITION_PERIOD_ROUNDS} Runden)."
    #             return False, explanation # Still in transition
    #     else: # Failed compliance during transition or didn't attempt
    #         # Reset transition counter if needed elsewhere
    #         return False, "Öko-Umstellung unterbrochen oder nicht begonnen."

    if player_decisions.attempt_organic_certification:
        is_compliant = not (player_decisions.fertilize or player_decisions.pesticide)
        if is_compliant:
            explanation = "Öko-Zertifizierung erfolgreich beantragt/beibehalten."
            return True, explanation
        else:
            explanation = "Öko-Zertifizierung nicht möglich/verloren durch Einsatz konventioneller Betriebsmittel."
            return False, explanation
    else: 
        if was_certified_last_round:
            explanation = "Öko-Zertifizierung nicht aktiv weitergeführt und daher verloren."
            return False, explanation
        return False, None


def update_player_machine_level(
    current_machine_level: float,
    investment_decision_level: int # From RoundDecisionBase.machine_investment_level
) -> float:
    new_level = current_machine_level
    new_level += investment_decision_level * game_rules.MACHINE_INVESTMENT_EFFICIENCY_GAIN_PER_LEVEL_UNIT
    new_level -= game_rules.MACHINE_DEPRECIATION_PER_ROUND
    
    return round(max(game_rules.MACHINE_MIN_EFFICIENCY_LEVEL, min(game_rules.MACHINE_MAX_EFFICIENCY_LEVEL, new_level)), 1)
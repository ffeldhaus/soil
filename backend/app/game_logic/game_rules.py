# File: backend/app/game_logic/game_rules.py
import random
from typing import List, Dict, Final

from app.schemas.parcel import PlantationType, CropSequenceEffect # For enum values

# --- Game Setup & Player Defaults ---
INITIAL_PLAYER_CAPITAL: Final[float] = 20000.0
DEFAULT_NUMBER_OF_PARCELS_PER_PLAYER: Final[int] = 40 # As in original
INITIAL_PARCEL_SOIL_QUALITY: Final[float] = 80.0 # Target for good growth
INITIAL_PARCEL_NUTRIENT_LEVEL: Final[float] = 80.0 # Target for good growth
INITIAL_PARCEL_PLANTATION: Final[str] = PlantationType.FALLOW.value # Start with fallow land

# --- Machinery ---
INITIAL_MACHINE_EFFICIENCY: Final[float] = 100.0 # Base efficiency percentage (e.g. 100.0 means standard)
MACHINE_INVESTMENT_EFFICIENCY_GAIN_PER_LEVEL_UNIT: Final[float] = 2.5 # Each 'level' of investment adds e.g. 2.5% to efficiency
MACHINE_DEPRECIATION_PER_ROUND: Final[float] = 4.0 # Efficiency % points lost per round due to aging/use
MACHINE_MIN_EFFICIENCY_LEVEL: Final[float] = 40.0 # Minimum efficiency machine can drop to
MACHINE_MAX_EFFICIENCY_LEVEL: Final[float] = 160.0 # Max efficiency (e.g. 160% of base)
BASE_MACHINE_EFFICIENCY_FOR_COSTS: Final[float] = 100.0 # Reference point for maintenance cost scaling
# For each % point machine efficiency deviates from BASE_MACHINE_EFFICIENCY_FOR_COSTS,
# the *overall* base operational costs change by this factor.
MACHINE_MAINTENANCE_COST_FACTOR_OVERALL: Final[float] = 0.003 # e.g., 0.3% change in total base op costs per 1% efficiency delta
# For each 1% player_machine_efficiency is above INITIAL_MACHINE_EFFICIENCY, harvest yield increases by this fraction.
HARVEST_YIELD_PER_MACHINE_EFFICIENCY_PERCENT: Final[float] = 0.005 # 0.5% yield increase per 1% efficiency increase from base

# --- Organic Farming ---
ORGANIC_PRICE_BONUS_MULTIPLIER: Final[float] = 1.20
COST_ORGANIC_CERTIFICATION_CONTROL: Final[float] = 250.0 # Per farm, per round if certified/attempting
# ORGANIC_TRANSITION_PERIOD_ROUNDS: Final[int] = 2 # If implementing full transition logic

# --- Weather & Vermin Event Generation ---
NORMAL_WEATHER: Final[str] = "Normal"
DROUGHT: Final[str] = "Dürre"
FLOOD: Final[str] = "Überschwemmung"
COLD_SNAP: Final[str] = "Kälteeinbruch"
ALL_WEATHER_EVENTS: Final[List[str]] = [NORMAL_WEATHER, DROUGHT, FLOOD, COLD_SNAP]

NO_VERMIN: Final[str] = "Keine"
APHIDS: Final[str] = "Blattläuse"
FRIT_FLY: Final[str] = "Fritfliege"
POTATO_BEETLE: Final[str] = "Kartoffelkäfer"
CORN_BORER: Final[str] = "Maiszünsler"
WIREWORM: Final[str] = "Drahtwurm"
ALL_VERMIN_EVENTS: Final[List[str]] = [NO_VERMIN, APHIDS, FRIT_FLY, POTATO_BEETLE, CORN_BORER, WIREWORM]

# --- Soil Quality (0-100) ---
SOIL_TARGET_OPTIMUM: Final[float] = 80.0 # Soil quality around which positive/negative effects are balanced

SOIL_FALLOW_RECOVERY_PER_ROUND: Final[float] = 2.5
SOIL_ANIMAL_HUSBANDRY_EFFECT_PER_ROUND: Final[float] = 0.75 # Net effect of animals on soil quality

SOIL_IMPACT_BY_PLANTATION: Dict[str, float] = { # Delta points per round
    PlantationType.FIELD_BEAN.value: 1.8,
    PlantationType.BARLEY.value: -1.2,
    PlantationType.OAT.value: -0.6,
    PlantationType.POTATO.value: -2.2,
    PlantationType.CORN.value: -1.8,
    PlantationType.RYE.value: 0.2, # Rye can be soil conserving or slightly improving
    PlantationType.WHEAT.value: -1.5,
    PlantationType.SUGAR_BEET.value: -2.8,
}
SOIL_CROPSEQUENCE_GOOD_BONUS: Final[float] = 1.2
SOIL_CROPSEQUENCE_BAD_PENALTY: Final[float] = -2.2 # Negative value

SOIL_MONOCULTURE_PENALTY: Final[float] = -1.2 # For 2nd consecutive year (negative value)
SOIL_MONOCULTURE_STREAK_PENALTY: Final[float] = -1.8 # Additional penalty for 3rd+ year (negative value)

SOIL_CONV_FERTILIZER_PENALTY: Final[float] = -0.5 # Negative impact
SOIL_PESTICIDE_PENALTY: Final[float] = -1.0 # Negative impact

SOIL_FLOOD_DAMAGE: Final[float] = -5.5 # Negative impact
SOIL_DROUGHT_DAMAGE: Final[float] = -3.5 # Negative impact


# --- Nutrient Level (0-100) ---
NUTRIENT_TARGET_OPTIMUM: Final[float] = 80.0

NUTRIENT_FALLOW_RECOVERY_PER_ROUND: Final[float] = 3.5
NUTRIENT_ANIMAL_MANURE_BONUS_PER_ROUND: Final[float] = 4.5 # From animal parcels, applied broadly or locally
NUTRIENT_LEGUME_FIXATION_BONUS: Final[float] = 7.0 # For Ackerbohne (Field Bean)

NUTRIENT_UPTAKE_BY_PLANTATION: Dict[str, float] = { # Base % of *current nutrients* removed if crop achieves 100% base yield
    PlantationType.FIELD_BEAN.value: 0.04, # Still takes some, despite fixing more
    PlantationType.BARLEY.value: 0.20,
    PlantationType.OAT.value: 0.15,
    PlantationType.POTATO.value: 0.28,
    PlantationType.CORN.value: 0.25,
    PlantationType.RYE.value: 0.13,
    PlantationType.WHEAT.value: 0.22,
    PlantationType.SUGAR_BEET.value: 0.30,
}
NUTRIENT_CONV_FERTILIZER_GAIN: Final[float] = 22.0 # Absolute points added


# --- Harvest Calculations ---
HARVEST_BASE_YIELD_DT: Dict[str, float] = { # Decitons per parcel
    PlantationType.FIELD_BEAN.value: 60.0, PlantationType.BARLEY.value: 95.0,
    PlantationType.OAT.value: 70.0, PlantationType.POTATO.value: 370.0,
    PlantationType.CORN.value: 110.0, PlantationType.RYE.value: 100.0,
    PlantationType.WHEAT.value: 115.0, PlantationType.SUGAR_BEET.value: 570.0,
}
SOIL_TARGET_FOR_HARVEST_OPTIMUM: Final[float] = 80.0
NUTRITION_TARGET_FOR_HARVEST_OPTIMUM: Final[float] = 80.0

HARVEST_SOIL_EXPONENT: Dict[str, float] = { pt.value: 1.0 for pt in PlantationType }
HARVEST_SOIL_EXPONENT.update({
    PlantationType.BARLEY.value: 1.1, PlantationType.POTATO.value: 1.25,
    PlantationType.WHEAT.value: 1.15, PlantationType.SUGAR_BEET.value: 1.3,
})
HARVEST_NUTRITION_EXPONENT: Dict[str, float] = { pt.value: 1.0 for pt in PlantationType }
HARVEST_NUTRITION_EXPONENT.update({
    PlantationType.POTATO.value: 1.45, PlantationType.WHEAT.value: 1.25,
    PlantationType.SUGAR_BEET.value: 1.55, PlantationType.CORN.value: 1.35,
    PlantationType.FIELD_BEAN.value: 0.55 # Less dependent on high soil N
})

HARVEST_WEATHER_IMPACT: Dict[str, Dict[str, float]] = { # Multiplier
    pt.value: {NORMAL_WEATHER: 1.0, DROUGHT: 0.60, FLOOD: 0.50, COLD_SNAP: 0.70} for pt in PlantationType if pt not in [PlantationType.FALLOW, PlantationType.ANIMAL_HUSBANDRY]
}
HARVEST_WEATHER_IMPACT[PlantationType.POTATO.value].update({DROUGHT: 0.40, FLOOD: 0.30, COLD_SNAP: 0.55})
HARVEST_WEATHER_IMPACT[PlantationType.CORN.value].update({DROUGHT: 0.50, COLD_SNAP: 0.45})
HARVEST_WEATHER_IMPACT[PlantationType.SUGAR_BEET.value].update({DROUGHT: 0.45, FLOOD: 0.40})
HARVEST_ORGANIC_WEATHER_RESILIENCE_FACTOR: Final[float] = 1.10 # If bad weather (mult < 1), effective_mult = min(1.0, orig_mult * resilience_factor)

HARVEST_VERMIN_RELEVANCE: Dict[str, Dict[str, bool]] = {
    pt.value: {v_event: False for v_event in ALL_VERMIN_EVENTS} for pt in PlantationType
} # Initialize all to False
HARVEST_VERMIN_RELEVANCE[PlantationType.FIELD_BEAN.value].update({APHIDS: True})
HARVEST_VERMIN_RELEVANCE[PlantationType.BARLEY.value].update({FRIT_FLY: True})
HARVEST_VERMIN_RELEVANCE[PlantationType.OAT.value].update({FRIT_FLY: True})
HARVEST_VERMIN_RELEVANCE[PlantationType.POTATO.value].update({POTATO_BEETLE: True, WIREWORM: True})
HARVEST_VERMIN_RELEVANCE[PlantationType.CORN.value].update({CORN_BORER: True, WIREWORM: True})
HARVEST_VERMIN_RELEVANCE[PlantationType.RYE.value].update({APHIDS: True})
HARVEST_VERMIN_RELEVANCE[PlantationType.WHEAT.value].update({APHIDS: True, FRIT_FLY: True})
HARVEST_VERMIN_RELEVANCE[PlantationType.SUGAR_BEET.value].update({WIREWORM: True, APHIDS: True})

HARVEST_VERMIN_PESTICIDE_EFFECTIVENESS: Final[float] = 0.90  # Yield becomes 90% of potential if relevant vermin present
HARVEST_VERMIN_BIOCONTROL_EFFECTIVENESS: Final[float] = 0.78 # Yield becomes 78%
HARVEST_VERMIN_NO_CONTROL_IMPACT: Final[float] = 0.50       # Yield becomes 50%

HARVEST_CROPSEQUENCE_BONUS: Final[float] = 0.10  # +10% yield
HARVEST_CROPSEQUENCE_PENALTY: Final[float] = 0.15 # -15% yield (this is a positive value for penalty calc)


# --- Financials: Costs (€) ---
SEED_COSTS_PER_PARCEL: Dict[str, Dict[bool, float]] = { # {PlantationType.value: {is_organic_bool: cost_float}}
    PlantationType.FIELD_BEAN.value: {False: 125.0, True: 150.0}, PlantationType.BARLEY.value: {False: 70.0,  True: 88.0},
    PlantationType.OAT.value: {False: 65.0,  True: 80.0}, PlantationType.POTATO.value: {False: 115.0, True: 140.0},
    PlantationType.CORN.value: {False: 75.0,  True: 90.0}, PlantationType.RYE.value: {False: 78.0,  True: 98.0},
    PlantationType.WHEAT.value: {False: 75.0,  True: 94.0}, PlantationType.SUGAR_BEET.value: {False: 130.0, True: 155.0},
    PlantationType.FALLOW.value: {False: 0.0,   True: 0.0}, PlantationType.ANIMAL_HUSBANDRY.value:{False: 0.0,   True: 0.0},
}
COST_PER_NEW_ANIMAL_PARCEL_INVESTMENT: Final[float] = 1100.0 # One-time cost to establish
COST_PER_MACHINE_INVESTMENT_LEVEL_UNIT: Final[float] = 220.0 # Cost for each 'level' of machine investment chosen

COST_FERTILIZER_PER_PARCEL: Final[float] = 55.0
COST_PESTICIDE_PER_PARCEL: Final[float] = 55.0
COST_BIOCONTROL_PER_PARCEL: Final[float] = 105.0
COST_ANIMAL_MAINTENANCE_PER_PARCEL: Final[float] = 220.0 # Feed, vet, etc. for established animal parcels
BASE_OPERATIONAL_COST_PER_PARCEL: Final[float] = 28.0

# --- Financials: Income (€) ---
CROP_PRICES: Dict[str, float] = { # € per deciton (dt)
    PlantationType.FIELD_BEAN.value: 20.0, PlantationType.BARLEY.value: 14.0,
    PlantationType.OAT.value: 13.0, PlantationType.POTATO.value: 4.5,
    PlantationType.CORN.value: 16.0, PlantationType.RYE.value: 13.8,
    PlantationType.WHEAT.value: 16.5, PlantationType.SUGAR_BEET.value: 2.8,
}
INCOME_PER_ANIMAL_PARCEL_PRODUCTS: Final[float] = 550.0 # e.g. from milk, meat, wool per round per animal parcel

# --- Crop Sequence Rules (Detailed Matrix) ---
_default_ok_rules = {pt.value: CropSequenceEffect.OK.value for pt in PlantationType}
_good_after_legume_fallow_animal = {
    PlantationType.FIELD_BEAN.value: CropSequenceEffect.GOOD.value,
    PlantationType.FALLOW.value: CropSequenceEffect.GOOD.value,
    PlantationType.ANIMAL_HUSBANDRY.value: CropSequenceEffect.GOOD.value,
}
CROP_SEQUENCE_RULES: Dict[str, Dict[str, str]] = {
    pt.value: {**_default_ok_rules, **_good_after_legume_fallow_animal, "default": CropSequenceEffect.OK.value} for pt in PlantationType
}
# Specific negative or exceptionally good interactions override defaults:
CROP_SEQUENCE_RULES[PlantationType.BARLEY.value].update({
    PlantationType.OAT.value: CropSequenceEffect.BAD.value, PlantationType.WHEAT.value: CropSequenceEffect.BAD.value,
    PlantationType.BARLEY.value: CropSequenceEffect.BAD.value,
})
CROP_SEQUENCE_RULES[PlantationType.OAT.value].update({
    PlantationType.BARLEY.value: CropSequenceEffect.BAD.value, PlantationType.WHEAT.value: CropSequenceEffect.BAD.value,
    PlantationType.OAT.value: CropSequenceEffect.BAD.value,
})
CROP_SEQUENCE_RULES[PlantationType.POTATO.value].update({
    PlantationType.POTATO.value: CropSequenceEffect.BAD.value, PlantationType.SUGAR_BEET.value: CropSequenceEffect.BAD.value,
    PlantationType.CORN.value: CropSequenceEffect.GOOD.value, # Corn can be good before potatoes
})
CROP_SEQUENCE_RULES[PlantationType.CORN.value].update({
    PlantationType.CORN.value: CropSequenceEffect.BAD.value, # Corn after corn for too long is bad
})
CROP_SEQUENCE_RULES[PlantationType.WHEAT.value].update({
    PlantationType.BARLEY.value: CropSequenceEffect.BAD.value, PlantationType.OAT.value: CropSequenceEffect.BAD.value,
    PlantationType.WHEAT.value: CropSequenceEffect.BAD.value,
    PlantationType.CORN.value: CropSequenceEffect.OK.value, # Usually OK, not exceptionally good
})
CROP_SEQUENCE_RULES[PlantationType.SUGAR_BEET.value].update({
    PlantationType.SUGAR_BEET.value: CropSequenceEffect.BAD.value, PlantationType.POTATO.value: CropSequenceEffect.BAD.value,
    PlantationType.WHEAT.value: CropSequenceEffect.GOOD.value, # Wheat often precedes sugar beet
})
CROP_SEQUENCE_RULES[PlantationType.FIELD_BEAN.value].update({
    PlantationType.FIELD_BEAN.value: CropSequenceEffect.OK.value # Legume after legume is not always "good"
})
CROP_SEQUENCE_RULES[PlantationType.FALLOW.value].update({PlantationType.FALLOW.value: CropSequenceEffect.GOOD.value}) # Fallow after fallow is still good
CROP_SEQUENCE_RULES[PlantationType.ANIMAL_HUSBANDRY.value].update({PlantationType.ANIMAL_HUSBANDRY.value: CropSequenceEffect.GOOD.value})


# --- Sequence Generation Functions (Re-included for completeness) ---
def generate_weather_sequence(num_rounds: int) -> List[str]:
    if num_rounds <= 0: return []
    sequence = [NORMAL_WEATHER]
    if num_rounds == 1: return sequence
    
    remaining_rounds = num_rounds - 1
    other_events = [event for event in ALL_WEATHER_EVENTS if event != NORMAL_WEATHER]
    
    full_cycles_content = []
    if other_events:
        num_cycles = remaining_rounds // len(other_events)
        for _ in range(num_cycles):
            full_cycles_content.extend(random.sample(other_events, len(other_events)))
    
    sequence.extend(full_cycles_content)
    # Calculate how many elements were added by full_cycles_content
    num_elements_from_cycles = len(full_cycles_content)
    remaining_slots_to_fill = remaining_rounds - num_elements_from_cycles
    
    if remaining_slots_to_fill > 0:
        choices_pool = [NORMAL_WEATHER] * 3 + other_events # Weight Normal weather even higher
        additional_events = random.choices(choices_pool, k=remaining_slots_to_fill)
        sequence.extend(additional_events)

    if len(sequence) > 1:
        tail = sequence[1:num_rounds] # Slice to ensure we don't exceed num_rounds before shuffle
        random.shuffle(tail)
        sequence = [sequence[0]] + tail
        
    return sequence[:num_rounds]

def generate_vermin_sequence(num_rounds: int) -> List[str]:
    if num_rounds <= 0: return []
    sequence = [NO_VERMIN]
    if num_rounds == 1: return sequence

    remaining_rounds = num_rounds - 1
    other_events = [event for event in ALL_VERMIN_EVENTS if event != NO_VERMIN]

    full_cycles_content = []
    if other_events:
        num_cycles = remaining_rounds // len(other_events)
        for _ in range(num_cycles):
            full_cycles_content.extend(random.sample(other_events, len(other_events)))
            
    sequence.extend(full_cycles_content)
    num_elements_from_cycles = len(full_cycles_content)
    remaining_slots_to_fill = remaining_rounds - num_elements_from_cycles

    if remaining_slots_to_fill > 0:
        choices_pool = [NO_VERMIN] * 3 + other_events # Weight No Vermin higher
        additional_events = random.choices(choices_pool, k=remaining_slots_to_fill)
        sequence.extend(additional_events)
        
    if len(sequence) > 1:
        tail = sequence[1:num_rounds]
        random.shuffle(tail)
        sequence = [sequence[0]] + tail
        
    return sequence[:num_rounds]
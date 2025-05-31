# File: backend/tests/game_logic/test_game_rules.py
import pytest
from unittest.mock import patch
import random # Keep the original import for type hinting if needed, but functions will be patched

from app.game_logic import game_rules
from app.schemas.parcel import PlantationType # For any rule structures that might use it, though not directly tested here

# --- Tests for generate_weather_sequence ---

def test_generate_weather_sequence_zero_rounds():
    assert game_rules.generate_weather_sequence(0) == []

def test_generate_weather_sequence_one_round():
    assert game_rules.generate_weather_sequence(1) == [game_rules.NORMAL_WEATHER]

@patch('app.game_logic.game_rules.random.shuffle')
@patch('app.game_logic.game_rules.random.choices')
def test_generate_weather_sequence_multiple_rounds_deterministic(mock_choices, mock_shuffle):
    num_rounds = 5
    # Define what random.choices should return for the 'remaining_slots_to_fill' part
    # Example: if len(other_events) is 3, and num_rounds is 5, then:
    # remaining_rounds = 4. num_cycles = 4 // 3 = 1. full_cycles_content = other_events (len 3)
    # num_elements_from_cycles = 3. remaining_slots_to_fill = 4 - 3 = 1
    # So, random.choices will be called once with k=1.
    # Let's assume other_events = [DROUGHT, FLOOD, COLD_SNAP]
    # and choices_pool makes it pick DROUGHT for the last slot.

    # To make it fully deterministic, we need to know ALL_WEATHER_EVENTS and how 'other_events' is derived.
    all_events = game_rules.ALL_WEATHER_EVENTS # e.g., [NORMAL, DROUGHT, FLOOD, COLD_SNAP]
    other_events_internal = [event for event in all_events if event != game_rules.NORMAL_WEATHER]

    # If num_rounds = 5:
    # sequence starts with [NORMAL_WEATHER]
    # remaining_rounds = 4
    # if len(other_events_internal) = 3 (e.g., DROUGHT, FLOOD, COLD_SNAP)
    # num_cycles = 4 // 3 = 1. full_cycles_content will be a sample of other_events_internal.
    # Let's assume random.sample (which is not directly patched here, but influences full_cycles_content)
    # returns other_events_internal in order for simplicity in prediction.
    # So, full_cycles_content = [DROUGHT, FLOOD, COLD_SNAP] (length 3)
    # num_elements_from_cycles = 3
    # remaining_slots_to_fill = 4 - 3 = 1
    # random.choices will be called for this 1 slot.

    # Mocking random.choices to return a specific event for the remaining slot
    mock_choices.return_value = [game_rules.DROUGHT]

    # Mocking random.shuffle to do nothing (in-place)
    mock_shuffle.side_effect = lambda x: None

    # For the full_cycles_content part, the SUT uses random.sample.
    # To make this test truly deterministic without patching random.sample (which can be complex),
    # we can instead check properties of the output.
    # However, for this example, let's assume a fixed order from an unmocked random.sample
    # or rely on the fact that with patching shuffle and choices, the sequence becomes predictable.
    # A more robust approach would be to also patch random.sample if its randomness is critical.
    # For now, let's proceed with patching shuffle and choices, and verify structure.

    sequence = game_rules.generate_weather_sequence(num_rounds)

    assert len(sequence) == num_rounds
    assert sequence[0] == game_rules.NORMAL_WEATHER

    # Check that all events in the sequence are valid weather events
    for event in sequence:
        assert event in game_rules.ALL_WEATHER_EVENTS

    # Based on the logic with num_rounds=5 and 3 other_events:
    # sequence starts [NORMAL]
    # full_cycles_content = other_events_internal (shuffled, but shuffle is mocked to do nothing)
    #   e.g. [DROUGHT, FLOOD, COLD_SNAP]
    # additional_events = mock_choices.return_value = [DROUGHT]
    # tail before shuffle = [DROUGHT, FLOOD, COLD_SNAP, DROUGHT]
    # after mocked shuffle (no change) = [DROUGHT, FLOOD, COLD_SNAP, DROUGHT]
    # final sequence = [NORMAL, DROUGHT, FLOOD, COLD_SNAP, DROUGHT]

    # Verify calls if possible and structure
    # If other_events_internal is not empty and remaining_rounds >= len(other_events_internal)
    # then random.sample is used internally for full_cycles_content.
    # If remaining_slots_to_fill > 0, random.choices is called.
    if other_events_internal:
        remaining_rounds = num_rounds -1
        num_cycles = remaining_rounds // len(other_events_internal)
        num_elements_from_cycles = num_cycles * len(other_events_internal) # This is what random.sample would have produced in total
        remaining_slots_to_fill = remaining_rounds - num_elements_from_cycles
        if remaining_slots_to_fill > 0:
            mock_choices.assert_called_once() # Or more precisely with k=remaining_slots_to_fill

    if len(sequence) > 1:
        mock_shuffle.assert_called_once() # Called on the tail

def test_generate_weather_sequence_num_rounds_equals_all_events_len():
    num_rounds = len(game_rules.ALL_WEATHER_EVENTS)
    # This test is tricky to make fully deterministic without more patching (e.g. random.sample)
    # We'll check structural properties.

    sequence = game_rules.generate_weather_sequence(num_rounds)

    assert len(sequence) == num_rounds
    assert sequence[0] == game_rules.NORMAL_WEATHER
    for event in sequence:
        assert event in game_rules.ALL_WEATHER_EVENTS

    # If num_rounds = len(ALL_WEATHER_EVENTS), and NORMAL_WEATHER is one of them,
    # the 'other_events' will have len(ALL_WEATHER_EVENTS) - 1.
    # The sequence should contain NORMAL_WEATHER once at the start,
    # and then a permutation of all other_events.
    # So, all unique other_events should be present in the tail.
    other_events_internal = [e for e in game_rules.ALL_WEATHER_EVENTS if e != game_rules.NORMAL_WEATHER]
    if other_events_internal: # Only if there are other events
      tail_events = sequence[1:]
      assert len(set(tail_events)) == len(other_events_internal)
      for event in other_events_internal:
          assert event in tail_events

# --- Tests for generate_vermin_sequence ---

def test_generate_vermin_sequence_zero_rounds():
    assert game_rules.generate_vermin_sequence(0) == []

def test_generate_vermin_sequence_one_round():
    assert game_rules.generate_vermin_sequence(1) == [game_rules.NO_VERMIN]

@patch('app.game_logic.game_rules.random.shuffle')
@patch('app.game_logic.game_rules.random.choices')
def test_generate_vermin_sequence_multiple_rounds_deterministic(mock_choices, mock_shuffle):
    num_rounds = 6 # Example
    all_vermin = game_rules.ALL_VERMIN_EVENTS
    other_vermin_internal = [v for v in all_vermin if v != game_rules.NO_VERMIN]

    # Similar logic to weather:
    # If num_rounds = 6, other_vermin_internal (e.g. 5 types: A,B,C,D,E)
    # remaining_rounds = 5
    # num_cycles = 5 // 5 = 1. full_cycles_content = [A,B,C,D,E] (len 5) (assuming sample gives this order)
    # num_elements_from_cycles = 5
    # remaining_slots_to_fill = 5 - 5 = 0. So random.choices NOT called.

    mock_choices.return_value = [] # Should not be called if remaining_slots_to_fill is 0
    mock_shuffle.side_effect = lambda x: None

    sequence = game_rules.generate_vermin_sequence(num_rounds)

    assert len(sequence) == num_rounds
    assert sequence[0] == game_rules.NO_VERMIN
    for event in sequence:
        assert event in game_rules.ALL_VERMIN_EVENTS

    # Verification based on the logic above for num_rounds = 6
    # Expected: sequence = [NO_VERMIN] + shuffled(other_vermin_internal)
    # Since shuffle is mocked (no-op), it would be [NO_VERMIN] + other_vermin_internal
    expected_tail = other_vermin_internal[:] # Make a copy
    # random.sample in SUT might shuffle it, but our mock_shuffle only affects the final tail shuffle.
    # This part is hard to make perfectly deterministic without patching random.sample.
    # We check that the elements are correct.

    # If remaining_slots_to_fill was 0 (as in this example num_rounds=6, len(other_vermin)=5)
    # mock_choices should not have been called.
    if other_vermin_internal:
        remaining_rounds = num_rounds - 1
        num_cycles = remaining_rounds // len(other_vermin_internal)
        num_elements_from_cycles = num_cycles * len(other_vermin_internal)
        remaining_slots_to_fill = remaining_rounds - num_elements_from_cycles
        if remaining_slots_to_fill == 0:
            mock_choices.assert_not_called()
        elif remaining_slots_to_fill > 0 : # If it were called
             mock_choices.assert_called_once()


    if len(sequence) > 1:
        mock_shuffle.assert_called_once()


def test_generate_vermin_sequence_num_rounds_less_than_all_vermin_types():
    num_rounds = 3
    all_vermin = game_rules.ALL_VERMIN_EVENTS
    assert num_rounds < len(all_vermin) # Precondition for test name

    sequence = game_rules.generate_vermin_sequence(num_rounds)

    assert len(sequence) == num_rounds
    assert sequence[0] == game_rules.NO_VERMIN
    for event in sequence:
        assert event in game_rules.ALL_VERMIN_EVENTS

    # With num_rounds = 3, other_vermin_internal has len > 2.
    # remaining_rounds = 2.
    # num_cycles = 2 // len(other_vermin_internal) = 0.
    # full_cycles_content = []
    # remaining_slots_to_fill = 2 - 0 = 2
    # So, random.choices will be called for k=2.
    # The tail (len 2) will be these choices, then shuffled.
    # We cannot predict the exact events without mocking choices, but we check structure.
    assert len(sequence[1:]) == num_rounds - 1

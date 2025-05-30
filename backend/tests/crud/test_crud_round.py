import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone # Ensure timezone is imported
from pydantic import BaseModel # Added for isinstance check in new tests
from typing import Optional, List, Dict, Any # Ensure Optional is here

from google.cloud.firestore_v1.document import DocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.async_query import AsyncQuery

from app.crud.crud_round import CRUDRound, ROUND_COLLECTION_NAME_TEMPLATE, FIELD_STATE_COLLECTION_NAME_TEMPLATE
from app.schemas.round import RoundCreate, RoundUpdate, RoundInDB, RoundDecisionBase, RoundStatus
from app.schemas.parcel import ParcelInDB, PlantationType # Removed ParcelDecision, TreatmentType

# --- Constants ---
TEST_GAME_ID_R = "test-game-round-crud"
TEST_PLAYER_ID_R = "player-round-crud"
TEST_ROUND_NUMBER_R = 1
FIXED_DATETIME_ROUND = datetime(2023, 11, 1, 12, 0, 0, tzinfo=timezone.utc)

# --- Fixtures ---

@pytest.fixture
def crud_round_instance() -> CRUDRound:
    return CRUDRound(model_schema=RoundInDB)

@pytest.fixture
def initial_parcels_data() -> list[dict]:
    # Simplified parcel data for initial field state
    return [
        ParcelInDB(parcel_number=1, owner_id=TEST_PLAYER_ID_R, current_plantation=PlantationType.FALLOW, health=100, water_level=50, growth_stage=0, last_tilled=FIXED_DATETIME_ROUND, last_fertilized=None, last_pesticided=None, yield_potential=0.8).model_dump(), # Changed parcel_id to parcel_number
        ParcelInDB(parcel_number=2, owner_id=TEST_PLAYER_ID_R, current_plantation=PlantationType.FALLOW, health=100, water_level=60, growth_stage=0, last_tilled=FIXED_DATETIME_ROUND, last_fertilized=None, last_pesticided=None, yield_potential=0.9).model_dump(), # Changed parcel_id to parcel_number
    ]

@pytest.fixture
def round_create_obj() -> RoundCreate:
    return RoundCreate(
        game_id=TEST_GAME_ID_R,
        player_id=TEST_PLAYER_ID_R,
        round_number=TEST_ROUND_NUMBER_R,
        decisions=RoundDecisionBase( # Empty decisions for creation
            parcel_decisions=[] 
        ),
        is_submitted=False,
        status=RoundStatus.PENDING # Initial status
    )

@pytest.fixture
def mock_round_doc_ref() -> MagicMock:
    mock_ref = MagicMock(spec=DocumentReference)
    mock_ref.id = f"{TEST_PLAYER_ID_R}_round_{TEST_ROUND_NUMBER_R}"
    mock_ref.set = AsyncMock()
    mock_ref.get = AsyncMock()
    mock_ref.update = AsyncMock()
    return mock_ref

@pytest.fixture
def mock_field_state_doc_ref() -> MagicMock:
    mock_ref = MagicMock(spec=DocumentReference)
    mock_ref.id = f"{TEST_PLAYER_ID_R}_round_{TEST_ROUND_NUMBER_R}_field_state"
    mock_ref.set = AsyncMock()
    mock_ref.get = AsyncMock()
    mock_ref.update = AsyncMock()
    return mock_ref

# --- Test Cases ---

@pytest.mark.asyncio
async def test_create_player_round(
    crud_round_instance: CRUDRound,
    mock_firestore_db: MagicMock, # From conftest.py
    round_create_obj: RoundCreate,
    initial_parcels_data: list[dict],
    mock_round_doc_ref: MagicMock,
    mock_field_state_doc_ref: MagicMock
):
    # Arrange
    # Patch the helper methods that construct doc refs
    with patch.object(CRUDRound, "_get_round_doc_ref", return_value=mock_round_doc_ref) as mock_get_round_ref, \
         patch.object(CRUDRound, "_get_field_state_doc_ref", return_value=mock_field_state_doc_ref) as mock_get_field_ref, \
         patch("app.crud.crud_round.datetime") as mock_datetime: # Patch datetime used in crud_round.py
        
        mock_datetime.now.return_value = FIXED_DATETIME_ROUND
        mock_datetime.UTC = timezone.utc # Make sure timezone.utc is available if SUT uses datetime.UTC

        # Act
        created_round = await crud_round_instance.create_player_round(
            db=mock_firestore_db, obj_in=round_create_obj, initial_parcels=initial_parcels_data
        )

    # Assert
    mock_get_round_ref.assert_called_once_with(
        mock_firestore_db, TEST_GAME_ID_R, TEST_PLAYER_ID_R, TEST_ROUND_NUMBER_R
    )
    mock_get_field_ref.assert_called_once_with(
        mock_firestore_db, TEST_GAME_ID_R, TEST_PLAYER_ID_R, TEST_ROUND_NUMBER_R
    )

    # Check round document creation
    mock_round_doc_ref.set.assert_called_once()
    round_set_args, _ = mock_round_doc_ref.set.call_args
    round_set_data = round_set_args[0]

    assert round_set_data["game_id"] == round_create_obj.game_id
    assert round_set_data["player_id"] == round_create_obj.player_id
    assert round_set_data["round_number"] == round_create_obj.round_number
    assert round_set_data["is_submitted"] == round_create_obj.is_submitted
    assert round_set_data["status"] == round_create_obj.status.value
    assert round_set_data["decisions"] == round_create_obj.decisions.model_dump() # Compare dumped dicts
    assert round_set_data["created_at"] == FIXED_DATETIME_ROUND
    assert round_set_data["updated_at"] == FIXED_DATETIME_ROUND
    assert round_set_data["id"] == mock_round_doc_ref.id
    assert round_set_data.get("submitted_at") is None # Should not be set on creation
    assert round_set_data.get("result_id") is None # Should not be set on creation


    # Check field state document creation
    mock_field_state_doc_ref.set.assert_called_once()
    field_set_args, _ = mock_field_state_doc_ref.set.call_args
    field_set_data = field_set_args[0]

    assert field_set_data["game_id"] == TEST_GAME_ID_R
    assert field_set_data["player_id"] == TEST_PLAYER_ID_R
    assert field_set_data["round_number"] == TEST_ROUND_NUMBER_R
    assert field_set_data["parcels"] == initial_parcels_data
    assert field_set_data["created_at"] == FIXED_DATETIME_ROUND
    assert field_set_data["updated_at"] == FIXED_DATETIME_ROUND
    assert field_set_data["id"] == mock_field_state_doc_ref.id
    
    # Check returned RoundInDB object (built from round_set_data)
    assert isinstance(created_round, RoundInDB)
    assert created_round.id == mock_round_doc_ref.id
    assert created_round.game_id == round_create_obj.game_id
    assert created_round.player_id == round_create_obj.player_id
    assert created_round.round_number == round_create_obj.round_number
    assert created_round.decisions == round_create_obj.decisions # Pydantic models should be comparable
    assert created_round.is_submitted == round_create_obj.is_submitted
    assert created_round.status == round_create_obj.status
    assert created_round.created_at == FIXED_DATETIME_ROUND
    assert created_round.updated_at == FIXED_DATETIME_ROUND
    assert created_round.submitted_at is None
    assert created_round.result_id is None


FIXED_DATETIME_ROUND_LATER = datetime(2023, 11, 1, 13, 0, 0, tzinfo=timezone.utc)


@pytest.fixture
def round_update_obj() -> RoundUpdate:
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
        ParcelInDB(parcel_number=1, owner_id=TEST_PLAYER_ID_R, current_plantation=PlantationType.WHEAT, health=90, water_level=40, growth_stage=1, last_tilled=FIXED_DATETIME_ROUND, last_fertilized=FIXED_DATETIME_ROUND_LATER, last_pesticided=None, yield_potential=0.85).model_dump(),
        ParcelInDB(parcel_number=2, owner_id=TEST_PLAYER_ID_R, current_plantation=PlantationType.FALLOW, health=100, water_level=60, growth_stage=0, last_tilled=FIXED_DATETIME_ROUND, last_fertilized=None, last_pesticided=None, yield_potential=0.9).model_dump(),
    ]

@pytest.mark.asyncio
async def test_update_player_round_decisions(
    crud_round_instance: CRUDRound,
    mock_firestore_db: MagicMock,
    mock_round_doc_ref: MagicMock,
    mock_field_state_doc_ref: MagicMock,
    round_update_obj: RoundUpdate,
    updated_parcels_data_example: list[dict],
    round_create_obj: RoundCreate # To shape the snapshot data for the final .get()
):
    # Arrange
    # Snapshot data for the round document *after* it's updated
    # This is what mock_round_doc_ref.get() will return at the end of the SUT method
    final_round_snapshot_data = round_create_obj.model_dump() # Start with create data
    final_round_snapshot_data["id"] = mock_round_doc_ref.id
    final_round_snapshot_data["decisions"] = round_update_obj.decisions.model_dump()
    final_round_snapshot_data["is_submitted"] = round_update_obj.is_submitted
    final_round_snapshot_data["submitted_at"] = FIXED_DATETIME_ROUND_LATER # Set by SUT
    final_round_snapshot_data["updated_at"] = FIXED_DATETIME_ROUND_LATER # Set by SUT
    # Convert datetimes to ISO strings for .to_dict()
    final_round_snapshot_dict = final_round_snapshot_data.copy()
    # Ensure created_at is from original object if not None, else use FIXED_DATETIME_ROUND
    original_created_at = final_round_snapshot_data.get("created_at", FIXED_DATETIME_ROUND)
    if isinstance(original_created_at, datetime):
        final_round_snapshot_dict["created_at"] = original_created_at.isoformat()
    
    final_round_snapshot_dict["updated_at"] = final_round_snapshot_data["updated_at"].isoformat()
    if final_round_snapshot_dict.get("submitted_at") and isinstance(final_round_snapshot_data.get("submitted_at"), datetime):
        final_round_snapshot_dict["submitted_at"] = final_round_snapshot_data["submitted_at"].isoformat()


    mock_final_round_snapshot = MagicMock(spec=DocumentSnapshot)
    mock_final_round_snapshot.exists = True
    mock_final_round_snapshot.to_dict.return_value = final_round_snapshot_dict
    mock_final_round_snapshot.id = mock_round_doc_ref.id
    
    mock_round_doc_ref.get = AsyncMock(return_value=mock_final_round_snapshot) # .get() called at the end of SUT

    with patch.object(CRUDRound, "_get_round_doc_ref", return_value=mock_round_doc_ref) as mock_get_round_ref, \
         patch.object(CRUDRound, "_get_field_state_doc_ref", return_value=mock_field_state_doc_ref) as mock_get_field_ref, \
         patch("app.crud.crud_round.datetime") as mock_datetime:
        
        mock_datetime.now.return_value = FIXED_DATETIME_ROUND_LATER # Time of update/submission
        mock_datetime.UTC = timezone.utc # Ensure timezone.utc is available

        # Act
        updated_round = await crud_round_instance.update_player_round_decisions(
            db=mock_firestore_db,
            game_id=TEST_GAME_ID_R,
            player_id=TEST_PLAYER_ID_R,
            round_number=TEST_ROUND_NUMBER_R,
            obj_in=round_update_obj,
            updated_parcels_data=updated_parcels_data_example
        )

    # Assert
    mock_get_round_ref.assert_called_once_with(mock_firestore_db, TEST_GAME_ID_R, TEST_PLAYER_ID_R, TEST_ROUND_NUMBER_R)
    mock_get_field_ref.assert_called_once_with(mock_firestore_db, TEST_GAME_ID_R, TEST_PLAYER_ID_R, TEST_ROUND_NUMBER_R)

    # Check round document update
    mock_round_doc_ref.update.assert_called_once()
    round_update_args, _ = mock_round_doc_ref.update.call_args
    round_update_data = round_update_args[0]
    assert round_update_data["decisions"] == round_update_obj.decisions.model_dump()
    assert round_update_data["is_submitted"] == round_update_obj.is_submitted
    assert round_update_data["updated_at"] == FIXED_DATETIME_ROUND_LATER
    if round_update_obj.is_submitted:
        assert round_update_data["submitted_at"] == FIXED_DATETIME_ROUND_LATER
    else:
        assert "submitted_at" not in round_update_data # Or assert it's None if field is always present

    # Check field state document update
    mock_field_state_doc_ref.update.assert_called_once()
    field_update_args, _ = mock_field_state_doc_ref.update.call_args
    field_update_data = field_update_args[0]
    assert field_update_data["parcels"] == updated_parcels_data_example
    assert field_update_data["updated_at"] == FIXED_DATETIME_ROUND_LATER
    
    # Check returned RoundInDB object
    assert isinstance(updated_round, RoundInDB)
    assert updated_round.id == mock_round_doc_ref.id
    assert updated_round.is_submitted == round_update_obj.is_submitted
    assert updated_round.decisions.fertilize == round_update_obj.decisions.fertilize # Example decision
    if updated_round.is_submitted:
        assert updated_round.submitted_at == FIXED_DATETIME_ROUND_LATER
    else:
        assert updated_round.submitted_at is None # Should remain None or be explicitly set to None
    assert updated_round.updated_at == FIXED_DATETIME_ROUND_LATER


@pytest.mark.asyncio
async def test_update_player_round_decisions_not_submitted(
    crud_round_instance: CRUDRound,
    mock_firestore_db: MagicMock,
    mock_round_doc_ref: MagicMock,
    mock_field_state_doc_ref: MagicMock,
    updated_parcels_data_example: list[dict],
    round_create_obj: RoundCreate # To shape the snapshot data
):
    # Arrange
    round_update_not_submitted = RoundUpdate(
        decisions=RoundDecisionBase(fertilize=True), # Example decision
        is_submitted=False # Key difference for this test
    )

    # Snapshot data for the round document *after* it's updated
    final_round_snapshot_data = round_create_obj.model_dump()
    final_round_snapshot_data["id"] = mock_round_doc_ref.id
    final_round_snapshot_data["decisions"] = round_update_not_submitted.decisions.model_dump()
    final_round_snapshot_data["is_submitted"] = round_update_not_submitted.is_submitted
    # submitted_at should NOT be set or should be None
    final_round_snapshot_data["submitted_at"] = None
    final_round_snapshot_data["updated_at"] = FIXED_DATETIME_ROUND_LATER
    # Convert datetimes to ISO strings for .to_dict()
    final_round_snapshot_dict = final_round_snapshot_data.copy()
    original_created_at = final_round_snapshot_data.get("created_at", FIXED_DATETIME_ROUND)
    if isinstance(original_created_at, datetime):
        final_round_snapshot_dict["created_at"] = original_created_at.isoformat()
    final_round_snapshot_dict["updated_at"] = final_round_snapshot_data["updated_at"].isoformat()
    if final_round_snapshot_data.get("submitted_at") is None: # Ensure it's explicitly None if not set
        final_round_snapshot_dict["submitted_at"] = None


    mock_final_round_snapshot = MagicMock(spec=DocumentSnapshot)
    mock_final_round_snapshot.exists = True
    mock_final_round_snapshot.to_dict.return_value = final_round_snapshot_dict
    mock_final_round_snapshot.id = mock_round_doc_ref.id
    mock_round_doc_ref.get = AsyncMock(return_value=mock_final_round_snapshot)

    with patch.object(CRUDRound, "_get_round_doc_ref", return_value=mock_round_doc_ref), \
         patch.object(CRUDRound, "_get_field_state_doc_ref", return_value=mock_field_state_doc_ref), \
         patch("app.crud.crud_round.datetime") as mock_datetime:

        mock_datetime.now.return_value = FIXED_DATETIME_ROUND_LATER
        mock_datetime.UTC = timezone.utc

        # Act
        updated_round = await crud_round_instance.update_player_round_decisions(
            db=mock_firestore_db,
            game_id=TEST_GAME_ID_R,
            player_id=TEST_PLAYER_ID_R,
            round_number=TEST_ROUND_NUMBER_R,
            obj_in=round_update_not_submitted,
            updated_parcels_data=updated_parcels_data_example
        )

    # Assert round document update
    mock_round_doc_ref.update.assert_called_once()
    round_update_args, _ = mock_round_doc_ref.update.call_args
    round_update_data = round_update_args[0]
    assert round_update_data["is_submitted"] == False
    assert "submitted_at" not in round_update_data # Should not be in payload if not submitted
    assert round_update_data["updated_at"] == FIXED_DATETIME_ROUND_LATER

    # Assert field state document update (still happens)
    mock_field_state_doc_ref.update.assert_called_once()
    field_update_args, _ = mock_field_state_doc_ref.update.call_args
    field_update_data = field_update_args[0]
    assert field_update_data["parcels"] == updated_parcels_data_example
    assert field_update_data["updated_at"] == FIXED_DATETIME_ROUND_LATER

    # Assert returned RoundInDB object
    assert isinstance(updated_round, RoundInDB)
    assert updated_round.is_submitted == False
    assert updated_round.submitted_at is None
    assert updated_round.updated_at == FIXED_DATETIME_ROUND_LATER


@pytest.mark.asyncio
async def test_get_player_round_found(
    crud_round_instance: CRUDRound,
    mock_firestore_db: MagicMock, # From conftest.py
    mock_round_doc_ref: MagicMock, # From this test file's fixtures
    round_create_obj: RoundCreate # To shape the snapshot data
):
    # Arrange
    # Simulate the data that would be in Firestore
    snapshot_data = round_create_obj.model_dump() # Uses RoundCreate which has default decisions
    snapshot_data["id"] = mock_round_doc_ref.id
    snapshot_data["created_at"] = FIXED_DATETIME_ROUND # Match Pydantic model type
    snapshot_data["updated_at"] = FIXED_DATETIME_ROUND
    # Ensure decisions are dict if Pydantic model was used to create snapshot_data
    if isinstance(snapshot_data["decisions"], BaseModel):
        snapshot_data["decisions"] = snapshot_data["decisions"].model_dump()


    mock_snapshot = MagicMock(spec=DocumentSnapshot)
    mock_snapshot.exists = True
    # snapshot.to_dict() should return data that can be parsed by RoundInDB
    # which means datetime fields should be datetime objects or ISO strings
    # Forcing ISO string here to mimic Firestore, Pydantic will parse it.
    dict_return = snapshot_data.copy()
    dict_return["created_at"] = FIXED_DATETIME_ROUND.isoformat()
    dict_return["updated_at"] = FIXED_DATETIME_ROUND.isoformat()
    mock_snapshot.to_dict.return_value = dict_return
    mock_snapshot.id = mock_round_doc_ref.id # Ensure snapshot has the ID

    mock_round_doc_ref.get = AsyncMock(return_value=mock_snapshot)

    with patch.object(CRUDRound, "_get_round_doc_ref", return_value=mock_round_doc_ref) as mock_get_ref:
        # Act
        result = await crud_round_instance.get_player_round(
            db=mock_firestore_db,
            game_id=TEST_GAME_ID_R,
            player_id=TEST_PLAYER_ID_R,
            round_number=TEST_ROUND_NUMBER_R
        )

    # Assert
    mock_get_ref.assert_called_once_with(mock_firestore_db, TEST_GAME_ID_R, TEST_PLAYER_ID_R, TEST_ROUND_NUMBER_R)
    assert isinstance(result, RoundInDB)
    assert result.id == mock_round_doc_ref.id
    assert result.game_id == round_create_obj.game_id
    assert result.player_id == round_create_obj.player_id
    assert result.round_number == round_create_obj.round_number
    assert result.decisions == round_create_obj.decisions # Compares Pydantic models
    assert result.is_submitted == round_create_obj.is_submitted
    assert result.status == round_create_obj.status
    assert result.created_at == FIXED_DATETIME_ROUND
    assert result.updated_at == FIXED_DATETIME_ROUND # From snapshot_data
    assert result.submitted_at is None # Was not set in round_create_obj
    assert result.result_id is None # Was not set

@pytest.mark.asyncio
async def test_get_player_round_not_found(
    crud_round_instance: CRUDRound,
    mock_firestore_db: MagicMock,
    mock_round_doc_ref: MagicMock
):
    # Arrange
    mock_snapshot = MagicMock(spec=DocumentSnapshot)
    mock_snapshot.exists = False
    mock_round_doc_ref.get = AsyncMock(return_value=mock_snapshot)

    with patch.object(CRUDRound, "_get_round_doc_ref", return_value=mock_round_doc_ref) as mock_get_ref:
        # Act
        result = await crud_round_instance.get_player_round(
            db=mock_firestore_db,
            game_id=TEST_GAME_ID_R,
            player_id=TEST_PLAYER_ID_R,
            round_number=TEST_ROUND_NUMBER_R
        )

    # Assert
    mock_get_ref.assert_called_once_with(mock_firestore_db, TEST_GAME_ID_R, TEST_PLAYER_ID_R, TEST_ROUND_NUMBER_R)
    assert result is None


# Need to define result_create_obj_round1_player2 for one of the new tests
# and a corresponding snapshot function or use the generic create_mock_snapshot.

@pytest.fixture
def round_create_obj_player2_round1(round_create_obj: RoundCreate) -> RoundCreate: # Based on player1's create_obj
    return round_create_obj.model_copy(update={"player_id": TEST_PLAYER_ID_R + "_player2"})


def create_round_mock_snapshot(round_obj: RoundCreate, doc_id_override: Optional[str] = None) -> MagicMock:
    snapshot = MagicMock(spec=DocumentSnapshot)
    snapshot.exists = True
    # Data as it would come from Firestore (e.g., datetimes as ISO strings)
    data = round_obj.model_dump()
    doc_id = doc_id_override if doc_id_override else f"{round_obj.player_id}_round_{round_obj.round_number}"
    data["id"] = doc_id
    data["created_at"] = FIXED_DATETIME_ROUND.isoformat()
    data["updated_at"] = FIXED_DATETIME_ROUND.isoformat()
    if data.get("submitted_at") and isinstance(data.get("submitted_at"), datetime): # Check if datetime before format
         data["submitted_at"] = data["submitted_at"].isoformat()

    # Ensure decisions is a dict
    if isinstance(data.get("decisions"), BaseModel): # Check if decisions exist and is a BaseModel
        data["decisions"] = data["decisions"].model_dump()
        
    snapshot.to_dict.return_value = data
    snapshot.id = doc_id
    return snapshot

@pytest.mark.asyncio
async def test_get_all_player_rounds_for_game_round_multiple_found(
    crud_round_instance: CRUDRound,
    mock_firestore_db: MagicMock,
    round_create_obj: RoundCreate, # Player 1, Round 1
    round_create_obj_player2_round1: RoundCreate # Player 2, Round 1
):
    # Arrange
    collection_path = ROUND_COLLECTION_NAME_TEMPLATE.format(game_id=TEST_GAME_ID_R)
    mock_collection_ref = mock_firestore_db.collection(collection_path)
    
    mock_query = AsyncMock(spec=AsyncQuery) # Object returned by where()
    mock_collection_ref.where.return_value = mock_query

    mock_snapshot_p1r1 = create_round_mock_snapshot(round_create_obj)
    mock_snapshot_p2r1 = create_round_mock_snapshot(round_create_obj_player2_round1)

    async def stream_results_gen(*args, **kwargs):
        yield mock_snapshot_p1r1
        yield mock_snapshot_p2r1
    
    # query.stream is a sync method returning an async iterator
    mock_query.stream = MagicMock(return_value=stream_results_gen())

    # Act
    results = await crud_round_instance.get_all_player_rounds_for_game_round(
        db=mock_firestore_db, game_id=TEST_GAME_ID_R, round_number=TEST_ROUND_NUMBER_R
    )

    # Assert
    mock_collection_ref.where.assert_called_once_with(field="round_number", op_string="==", value=TEST_ROUND_NUMBER_R)
    
    assert len(results) == 2
    assert len(results) == 2

    # Create a map for easier lookup and assertion
    expected_rounds_data = {
        mock_snapshot_p1r1.id: round_create_obj,
        mock_snapshot_p2r1.id: round_create_obj_player2_round1
    }

    for res_obj in results:
        assert isinstance(res_obj, RoundInDB)
        assert res_obj.id in expected_rounds_data
        expected_data_create_obj = expected_rounds_data[res_obj.id]

        assert res_obj.game_id == expected_data_create_obj.game_id
        assert res_obj.player_id == expected_data_create_obj.player_id
        assert res_obj.round_number == expected_data_create_obj.round_number
        assert res_obj.decisions == expected_data_create_obj.decisions
        assert res_obj.is_submitted == expected_data_create_obj.is_submitted
        assert res_obj.status == expected_data_create_obj.status
        assert res_obj.created_at == FIXED_DATETIME_ROUND # Based on create_round_mock_snapshot
        assert res_obj.updated_at == FIXED_DATETIME_ROUND # Based on create_round_mock_snapshot
        assert res_obj.submitted_at is None # Not set in create_obj
        assert res_obj.result_id is None # Not set in create_obj


@pytest.mark.asyncio
async def test_get_all_player_rounds_for_game_round_empty(
    crud_round_instance: CRUDRound,
    mock_firestore_db: MagicMock
):
    # Arrange
    collection_path = ROUND_COLLECTION_NAME_TEMPLATE.format(game_id=TEST_GAME_ID_R)
    mock_collection_ref = mock_firestore_db.collection(collection_path)
    mock_query = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query

    async def stream_no_results_gen(*args, **kwargs):
        if False: yield
    mock_query.stream = MagicMock(return_value=stream_no_results_gen())

    # Act
    results = await crud_round_instance.get_all_player_rounds_for_game_round(
        db=mock_firestore_db, game_id=TEST_GAME_ID_R, round_number=TEST_ROUND_NUMBER_R + 5 # A round with no results
    )
    # Assert
    assert len(results) == 0

@pytest.mark.asyncio
async def test_set_round_calculated_success(
    crud_round_instance: CRUDRound,
    mock_firestore_db: MagicMock,
    mock_round_doc_ref: MagicMock # Represents the specific round to be updated
):
    # Arrange
    test_result_id = "result-doc-id-for-round"
    # mock_round_doc_ref.update is already an AsyncMock from its fixture
    
    with patch.object(CRUDRound, "_get_round_doc_ref", return_value=mock_round_doc_ref) as mock_get_round_ref, \
         patch("app.crud.crud_round.datetime") as mock_datetime:
        
        mock_datetime.now.return_value = FIXED_DATETIME_ROUND_LATER # Time of update
        mock_datetime.UTC = timezone.utc

        # Act
        success = await crud_round_instance.set_round_calculated(
            db=mock_firestore_db,
            game_id=TEST_GAME_ID_R,
            player_id=TEST_PLAYER_ID_R,
            round_number=TEST_ROUND_NUMBER_R,
            result_id=test_result_id
        )

    # Assert
    assert success is True
    mock_get_round_ref.assert_called_once_with(mock_firestore_db, TEST_GAME_ID_R, TEST_PLAYER_ID_R, TEST_ROUND_NUMBER_R)
    
    mock_round_doc_ref.update.assert_called_once()
    update_args, _ = mock_round_doc_ref.update.call_args
    update_data = update_args[0]
    
    assert update_data["result_id"] == test_result_id
    assert update_data["status"] == "calculated" # As per SUT logic
    assert update_data["updated_at"] == FIXED_DATETIME_ROUND_LATER

@pytest.mark.asyncio
async def test_set_round_calculated_failure_exception(
    crud_round_instance: CRUDRound,
    mock_firestore_db: MagicMock,
    mock_round_doc_ref: MagicMock
):
    # Arrange
    mock_round_doc_ref.update = AsyncMock(side_effect=Exception("Firestore error"))

    with patch.object(CRUDRound, "_get_round_doc_ref", return_value=mock_round_doc_ref) as mock_get_round_ref, \
         patch("app.crud.crud_round.datetime"): # No need to check datetime here
        # Act
        success = await crud_round_instance.set_round_calculated(
            db=mock_firestore_db,
            game_id=TEST_GAME_ID_R,
            player_id=TEST_PLAYER_ID_R,
            round_number=TEST_ROUND_NUMBER_R,
            result_id="any_result_id"
        )
    # Assert
    assert success is False

@pytest.mark.asyncio
async def test_get_player_field_state_found(
    crud_round_instance: CRUDRound,
    mock_firestore_db: MagicMock,
    mock_field_state_doc_ref: MagicMock, # From this test file's fixtures
    initial_parcels_data: list[dict] # To shape the snapshot data
):
    # Arrange
    snapshot_data = {
        "id": mock_field_state_doc_ref.id,
        "game_id": TEST_GAME_ID_R,
        "player_id": TEST_PLAYER_ID_R,
        "round_number": TEST_ROUND_NUMBER_R,
        "parcels": initial_parcels_data,
        "created_at": FIXED_DATETIME_ROUND.isoformat(), # Firestore like data
        "updated_at": FIXED_DATETIME_ROUND.isoformat()
    }
    mock_snapshot = MagicMock(spec=DocumentSnapshot)
    mock_snapshot.exists = True
    mock_snapshot.to_dict.return_value = snapshot_data
    
    mock_field_state_doc_ref.get = AsyncMock(return_value=mock_snapshot)

    with patch.object(CRUDRound, "_get_field_state_doc_ref", return_value=mock_field_state_doc_ref) as mock_get_ref:
        # Act
        result_dict = await crud_round_instance.get_player_field_state(
            db=mock_firestore_db,
            game_id=TEST_GAME_ID_R,
            player_id=TEST_PLAYER_ID_R,
            round_number=TEST_ROUND_NUMBER_R
        )

    # Assert
    mock_get_ref.assert_called_once_with(mock_firestore_db, TEST_GAME_ID_R, TEST_PLAYER_ID_R, TEST_ROUND_NUMBER_R)
    assert isinstance(result_dict, dict)
    assert result_dict["id"] == mock_field_state_doc_ref.id
    assert result_dict["game_id"] == TEST_GAME_ID_R
    assert result_dict["player_id"] == TEST_PLAYER_ID_R
    assert result_dict["round_number"] == TEST_ROUND_NUMBER_R
    assert result_dict["parcels"] == initial_parcels_data
    # Timestamps in snapshot_data were ISO strings, to_dict() returns them as is.
    assert result_dict["created_at"] == FIXED_DATETIME_ROUND.isoformat()
    assert result_dict["updated_at"] == FIXED_DATETIME_ROUND.isoformat()

@pytest.mark.asyncio
async def test_get_player_field_state_not_found(
    crud_round_instance: CRUDRound,
    mock_firestore_db: MagicMock,
    mock_field_state_doc_ref: MagicMock
):
    # Arrange
    mock_snapshot = MagicMock(spec=DocumentSnapshot)
    mock_snapshot.exists = False
    mock_field_state_doc_ref.get = AsyncMock(return_value=mock_snapshot)

    with patch.object(CRUDRound, "_get_field_state_doc_ref", return_value=mock_field_state_doc_ref) as mock_get_ref:
        # Act
        result = await crud_round_instance.get_player_field_state(
            db=mock_firestore_db,
            game_id=TEST_GAME_ID_R,
            player_id=TEST_PLAYER_ID_R,
            round_number=TEST_ROUND_NUMBER_R
        )

    # Assert
    mock_get_ref.assert_called_once_with(mock_firestore_db, TEST_GAME_ID_R, TEST_PLAYER_ID_R, TEST_ROUND_NUMBER_R)
    assert result is None

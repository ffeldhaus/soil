import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud.firestore_v1.document import DocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.async_query import AsyncQuery

from app.crud.crud_game import CRUDGame
from app.schemas.game import GameCreate, GameUpdate, GameInDB, GameStatus, GameStage
from app.core.config import settings

# --- Constants for Test Data ---
TEST_GAME_ID = "test-game-id-123"
ADMIN_ID = "admin-user-id-abc"
PLAYER_UID_1 = "player-uid-xyz"

DEFAULT_WEATHER_SEQ = ["Normal", "Drought", "Normal"]
DEFAULT_VERMIN_SEQ = ["None", "Aphids", "None"]
FIXED_DATETIME_NOW_GAME = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
FIXED_DATETIME_LATER_GAME = datetime(2023, 1, 1, 13, 0, 0, tzinfo=timezone.utc)


# --- Test Data Schemas ---
GAME_CREATE_DATA = GameCreate(
    name="Test Game Alpha",
    number_of_rounds=5,
    max_players=2,
    requested_player_slots=1
)

GAME_UPDATE_DATA = GameUpdate(
    name="Test Game Alpha Modified"
)

# Base dictionary for a game document in Firestore for tests
BASE_GAME_IN_DB_DICT = {
    "id": TEST_GAME_ID, "uid": TEST_GAME_ID,
    "name": "Test Game Alpha", "adminId": ADMIN_ID, # Use alias for Pydantic model consistency
    "number_of_rounds": 5, "max_players": 2,
    "current_round_number": 0, "game_status": GameStatus.PENDING.value,
    "game_stage": GameStage.INITIAL_SETUP.value, "player_uids": [],
    "weather_sequence": DEFAULT_WEATHER_SEQ, "vermin_sequence": DEFAULT_VERMIN_SEQ,
    "created_at": FIXED_DATETIME_NOW_GAME, # Use datetime objects directly
    "updated_at": FIXED_DATETIME_NOW_GAME,
    "ai_player_strategies": {}
}

# --- Pytest Fixtures ---

@pytest.fixture
def crud_game_instance() -> CRUDGame:
    return CRUDGame(collection_name=settings.FIRESTORE_COLLECTION_GAMES, model_schema=GameInDB)

@pytest.fixture
def game_create_obj() -> GameCreate:
    return GAME_CREATE_DATA.model_copy(deep=True)

@pytest.fixture
def game_update_obj() -> GameUpdate:
    return GAME_UPDATE_DATA.model_copy(deep=True)

@pytest.fixture
def mock_game_doc_snapshot_data() -> dict:
    # Data that a DocumentSnapshot.to_dict() would return for a game
    # Timestamps are stored as ISO strings in Firestore, but Pydantic models expect datetime
    data = BASE_GAME_IN_DB_DICT.copy()
    # Pydantic V2 with from_attributes=True can often handle datetime objects directly,
    # but Firestore to_dict() will return ISO strings if they were stored as Firestore timestamps.
    # Let's assume to_dict() returns datetime objects if they were set as such, or ISO strings
    # if they came from Firestore Timestamps. For consistency in tests, we'll use datetime objects
    # in our base dict and convert to ISO for what snapshot.to_dict() would return.
    data["created_at"] = FIXED_DATETIME_NOW_GAME.isoformat() 
    data["updated_at"] = FIXED_DATETIME_NOW_GAME.isoformat()
    return data

@pytest.fixture
def mock_game_doc_snapshot(mock_game_doc_snapshot_data: dict, mock_firestore_db: AsyncFirestoreClient) -> MagicMock:
    snapshot = MagicMock(spec=DocumentSnapshot)
    snapshot.exists = True
    snapshot.to_dict.return_value = mock_game_doc_snapshot_data
    snapshot.id = mock_game_doc_snapshot_data["id"]
    
    # Configure the general mock_doc_ref from conftest to return this snapshot for this specific ID
    doc_ref_mock = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_GAMES).document(TEST_GAME_ID)
    doc_ref_mock.get = AsyncMock(return_value=snapshot)
    return snapshot

@pytest.fixture(autouse=True) # Apply to all tests in this module
def mock_game_rules_sequences_fixture(): # Renamed to avoid clash if imported directly
    with patch("app.crud.crud_game.game_rules.generate_weather_sequence", return_value=DEFAULT_WEATHER_SEQ) as mock_weather, \
         patch("app.crud.crud_game.game_rules.generate_vermin_sequence", return_value=DEFAULT_VERMIN_SEQ) as mock_vermin:
        yield mock_weather, mock_vermin

# --- Test Cases for CRUDGame ---

@pytest.mark.asyncio
async def test_create_game_with_admin(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    game_create_obj: GameCreate,
    mock_game_rules_sequences_fixture # Autouse fixture
):
    mock_weather_gen, mock_vermin_gen = mock_game_rules_sequences_fixture
    
    # Expected data for GameInDB instantiation after creation
    # This data is what the mocked CRUDBase.create() should return
    expected_game_dict_from_base_create = {
        "id": TEST_GAME_ID, # Assume CRUDBase.create adds this 'id'
        "uid": TEST_GAME_ID, # And 'uid' if schema expects it
        "name": game_create_obj.name, "adminId": ADMIN_ID, # Use alias 'adminId'
        "number_of_rounds": game_create_obj.number_of_rounds,
        "max_players": game_create_obj.max_players,
        "weather_sequence": DEFAULT_WEATHER_SEQ, "vermin_sequence": DEFAULT_VERMIN_SEQ,
        "player_uids": [], "game_status": GameStatus.PENDING.value,
        "current_round_number": 0, "game_stage": GameStage.INITIAL_SETUP.value,
        "created_at": FIXED_DATETIME_NOW_GAME, # Expecting datetime objects now from CRUDBase
        "updated_at": FIXED_DATETIME_NOW_GAME,
        "ai_player_strategies": {}
    }

    # Mock CRUDBase.create behavior specifically for this test path
    # CRUDGame.create_with_admin calls super().create()
    with patch("app.crud.base.CRUDBase.create", new_callable=AsyncMock) as mock_crudbase_create:
        # CRUDBase.create is expected to return a dict that can initialize the Pydantic model
        mock_crudbase_create.return_value = expected_game_dict_from_base_create

        created_game_dict_result = await crud_game_instance.create_with_admin(
            db=mock_firestore_db, obj_in=game_create_obj, admin_id=ADMIN_ID
        )
    
    assert created_game_dict_result is not None
    # Ensure the dict returned by create_with_admin can initialize GameInDB
    created_game = GameInDB(**created_game_dict_result) 

    mock_weather_gen.assert_called_once_with(game_create_obj.number_of_rounds)
    mock_vermin_gen.assert_called_once_with(game_create_obj.number_of_rounds)

    mock_crudbase_create.assert_called_once()
    # Check the 'obj_in' passed to CRUDBase.create
    passed_obj_to_crudbase = mock_crudbase_create.call_args[1]['obj_in']

    assert passed_obj_to_crudbase["name"] == game_create_obj.name
    assert passed_obj_to_crudbase["admin_id"] == ADMIN_ID # Internal data uses Python field names
    assert passed_obj_to_crudbase["weather_sequence"] == DEFAULT_WEATHER_SEQ
    assert passed_obj_to_crudbase["vermin_sequence"] == DEFAULT_VERMIN_SEQ
    assert passed_obj_to_crudbase["game_status"] == GameStatus.PENDING.value # Check added fields

    assert created_game.name == game_create_obj.name
    assert created_game.admin_id == ADMIN_ID # Pydantic model should allow access by Python name
    assert created_game.game_status == GameStatus.PENDING


@pytest.mark.asyncio
async def test_get_games_by_admin_id_found(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    mock_game_doc_snapshot: MagicMock # Specific snapshot for a game
):
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_GAMES)
    mock_query = AsyncMock(spec=AsyncQuery) # This is the object after .where().limit() etc.
    mock_collection_ref.where.return_value = mock_query # Assuming where returns the final query obj for simplicity here
    
    async def stream_results_gen(*args, **kwargs):
        yield mock_game_doc_snapshot
    
    # query.stream is a method that returns an async generator
    mock_query.stream = MagicMock(return_value=stream_results_gen())

    games_list = await crud_game_instance.get_games_by_admin_id(db=mock_firestore_db, admin_id=ADMIN_ID)
    
    mock_collection_ref.where.assert_called_once_with("admin_id", "==", ADMIN_ID)
    assert mock_query.limit.called_with(100) # Check if limit was called (default is 100)
    assert len(games_list) == 1
    assert games_list[0].id == mock_game_doc_snapshot.id

@pytest.mark.asyncio
async def test_get_games_by_admin_id_not_found(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient # From conftest.py
):
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_GAMES)
    mock_query = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query

    async def stream_no_results_gen(*args, **kwargs):
        if False: yield # Empty async generator
    
    mock_query.stream = MagicMock(return_value=stream_no_results_gen())
    
    games_list = await crud_game_instance.get_games_by_admin_id(db=mock_firestore_db, admin_id="other-admin-id")
    assert len(games_list) == 0

@pytest.mark.asyncio
async def test_add_player_to_game_success(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    mock_array_union_class # From conftest.py (patches google.cloud.firestore.ArrayUnion)
):
    game_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_GAMES).document(TEST_GAME_ID)
    # game_doc_ref.update is an AsyncMock from mock_firestore_db in conftest

    result = await crud_game_instance.add_player_to_game(
        db=mock_firestore_db, game_id=TEST_GAME_ID, player_uid=PLAYER_UID_1
    )
    assert result is True
    # mock_array_union_class is the MagicMock for the class ArrayUnion
    # Its return_value is what's passed to update
    mock_array_union_class.assert_called_once_with([PLAYER_UID_1])
    game_doc_ref.update.assert_called_once_with({"player_uids": mock_array_union_class.return_value})


@pytest.mark.asyncio
async def test_remove_player_from_game_success(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    mock_array_remove_class # From conftest.py
):
    game_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_GAMES).document(TEST_GAME_ID)

    result = await crud_game_instance.remove_player_from_game(
        db=mock_firestore_db, game_id=TEST_GAME_ID, player_uid=PLAYER_UID_1
    )
    assert result is True
    mock_array_remove_class.assert_called_once_with([PLAYER_UID_1])
    game_doc_ref.update.assert_called_once_with({"player_uids": mock_array_remove_class.return_value})


@pytest.mark.asyncio
async def test_update_game_status(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
):
    new_status = GameStatus.ACTIVE
    game_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_GAMES).document(TEST_GAME_ID)

    # Data that will be returned by the snapshot after the update
    # This is used by CRUDBase.update to construct the returned Pydantic model
    # It should come from the generic doc snapshot mock defined in conftest's mock_firestore_db
    # but overridden for the specific game ID and with updated status/timestamp.
    
    # Get the generic snapshot data from the conftest fixture's setup
    # (This is a bit complex, ideally the fixture provides a way to get this base data)
    # For simplicity, we'll redefine what the snapshot for THIS test should return.
    updated_snapshot_data = {
        **BASE_GAME_IN_DB_DICT, # Base structure, uses adminId
        "id": TEST_GAME_ID, "uid": TEST_GAME_ID, # Ensure correct ID
        "game_status": new_status.value,
        "updated_at": FIXED_DATETIME_LATER_GAME.isoformat(), # CRUDBase.update calls doc_ref.get()
        "created_at": FIXED_DATETIME_NOW_GAME.isoformat() # Original created_at
    }
    # Convert to datetime objects for Pydantic model if model expects them
    expected_return_dict_for_pydantic = {
        **updated_snapshot_data,
        "created_at": FIXED_DATETIME_NOW_GAME,
        "updated_at": FIXED_DATETIME_LATER_GAME,
    }

    mock_snapshot_after_update = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_update.exists = True
    mock_snapshot_after_update.to_dict.return_value = updated_snapshot_data
    mock_snapshot_after_update.id = TEST_GAME_ID
    game_doc_ref.get = AsyncMock(return_value=mock_snapshot_after_update) # After .update() in CRUDBase

    # Patch datetime.now used within CRUDGame.update_game_status
    with patch("app.crud.crud_game.datetime") as mock_datetime_crud_game:
        # This datetime is for the 'updated_at' set by update_game_status itself
        mock_datetime_crud_game.now.return_value = FIXED_DATETIME_LATER_GAME
        # If CRUDBase.update also sets its own updated_at, that would need patching too
        # but current CRUDBase.update doesn't add timestamps to the dict it sends to Firestore.
        # It relies on the snapshot returned by .get() for the final data.

        updated_game_dict_result = await crud_game_instance.update_game_status(
            db=mock_firestore_db, game_id=TEST_GAME_ID, status=new_status # Pass enum directly
        )
    
    assert updated_game_dict_result is not None
    # The dict returned from CRUDBase.update is based on mock_snapshot_after_update.to_dict()
    # Pydantic model expects datetime objects, to_dict() returns ISO strings.
    # CRUDBase.get and by extension CRUDBase.update (which calls get) should handle this conversion
    # if the Pydantic model fields are `datetime`.
    # So, updated_game_dict_result should have datetime objects if CRUDBase converts them.
    # The `mock_firestore_db` in conftest for `generic_doc_snapshot_data` returns datetime objects.
    # Let's assume `updated_game_dict_result` is the dict from `to_dict()` (ISO strings)
    # and Pydantic parsing handles it.
    # However, CRUDBase.update returns snapshot.to_dict() which then is used to make the model.
    # The provided `generic_doc_snapshot_data` in conftest has datetime objects for created_at/updated_at.
    # This needs to be consistent. Let's assume `CRUDBase` returns a dict ready for Pydantic.
    # The `expected_return_dict_for_pydantic` has datetime objects.
    # The actual `game_doc_ref.update` payload will have `updated_at` from `update_game_status`.
    
    # Check the payload sent to Firestore
    game_doc_ref.update.assert_called_once()
    update_call_payload = game_doc_ref.update.call_args[0][0]
    assert update_call_payload["game_status"] == new_status.value
    assert update_call_payload["updated_at"] == FIXED_DATETIME_LATER_GAME # This is set by update_game_status

    # Check the returned Pydantic model
    updated_game = GameInDB(**updated_game_dict_result) # This should work if dict has right types/aliases
    assert updated_game.game_status == new_status
    assert updated_game.updated_at == FIXED_DATETIME_LATER_GAME


@pytest.mark.asyncio
async def test_get_game_by_id_found(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    mock_game_doc_snapshot: MagicMock # Specific game snapshot for TEST_GAME_ID
):
    # mock_game_doc_snapshot is already configured by its fixture to be returned
    # by mock_firestore_db.collection(...).document(TEST_GAME_ID).get()
    
    game_dict = await crud_game_instance.get(db=mock_firestore_db, doc_id=TEST_GAME_ID)
    assert game_dict is not None
    game = GameInDB(**game_dict) # Pydantic should parse ISO strings from snapshot data
    assert game.id == TEST_GAME_ID
    assert game.name == BASE_GAME_IN_DB_DICT["name"]


@pytest.mark.asyncio
async def test_update_game_general(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    game_update_obj: GameUpdate,
    mock_game_doc_snapshot_data: dict # Base data for the game
):
    game_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_GAMES).document(TEST_GAME_ID)
    
    # Data for snapshot *after* update is applied (what .get() on game_doc_ref returns)
    data_after_update_dict = {
        **mock_game_doc_snapshot_data, # Contains original created_at, adminId etc. as ISO strings
        "name": game_update_obj.name,   # Updated field
        "updated_at": FIXED_DATETIME_LATER_GAME.isoformat() # Updated timestamp as ISO string from snapshot
    }
    mock_snapshot_after_update = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_update.exists = True
    mock_snapshot_after_update.to_dict.return_value = data_after_update_dict
    mock_snapshot_after_update.id = TEST_GAME_ID
    game_doc_ref.get = AsyncMock(return_value=mock_snapshot_after_update)

    # CRUDBase.update does not set 'updated_at' itself in the payload to Firestore.
    # It relies on server timestamps or what's in obj_in.
    # Here, obj_in (GameUpdate) does not have updated_at.
    # So, actual_update_payload should only contain game_update_obj fields.
    
    updated_game_dict = await crud_game_instance.update(
        db=mock_firestore_db, doc_id=TEST_GAME_ID, obj_in=game_update_obj
    )
    
    assert updated_game_dict is not None
    updated_game = GameInDB(**updated_game_dict) # Pydantic parses ISO strings

    # Check Firestore .update() call payload
    game_doc_ref.update.assert_called_once()
    update_call_payload = game_doc_ref.update.call_args[0][0]
    assert update_call_payload["name"] == game_update_obj.name
    assert "updated_at" not in update_call_payload # CRUDBase.update doesn't add it from obj_in unless present

    assert updated_game.name == game_update_obj.name
    assert updated_game.updated_at == FIXED_DATETIME_LATER_GAME # From the mocked snapshot after update
    assert updated_game.created_at == FIXED_DATETIME_NOW_GAME # Should remain original


@pytest.mark.asyncio
async def test_remove_game_success(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient # From conftest.py
):
    game_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_GAMES).document(TEST_GAME_ID)
    # game_doc_ref.delete is already an AsyncMock from conftest fixture
    
    result = await crud_game_instance.remove(db=mock_firestore_db, doc_id=TEST_GAME_ID)
    assert result is True
    game_doc_ref.delete.assert_called_once()

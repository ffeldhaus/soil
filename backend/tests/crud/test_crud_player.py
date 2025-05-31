import pytest
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta

from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from app.crud.base import CRUDBase # Added for patching super().update
from google.cloud.firestore_v1.document import DocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.document import DocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.async_query import AsyncQuery

from app.crud.crud_player import CRUDPlayer
from app.schemas.player import PlayerCreate, PlayerUpdate, PlayerInDB, UserType
from app.core.config import settings

# --- Constants for Test Data ---
TEST_GAME_ID_FOR_PLAYER = "test-game-id-for-player-tests"
PLAYER_UID = "test-player-uid-1"
PLAYER_EMAIL = "player.test@example.com"
PLAYER_PASSWORD = "playerpass789"
PLAYER_NUMBER = 1

FIXED_DATETIME_NOW_PLAYER = datetime(2023, 1, 2, 10, 0, 0, tzinfo=timezone.utc)
FIXED_DATETIME_LATER_PLAYER = datetime(2023, 1, 2, 11, 0, 0, tzinfo=timezone.utc)

# --- Test Data Schemas ---
PLAYER_CREATE_DATA = PlayerCreate(
    email=PLAYER_EMAIL,
    password=PLAYER_PASSWORD,
    game_id=TEST_GAME_ID_FOR_PLAYER,
    player_number=PLAYER_NUMBER,
    username="TestPlayerAlpha",
    is_ai=False
)

PLAYER_UPDATE_DATA = PlayerUpdate(
    username="TestPlayerAlphaUpdated",
    is_active=False
)

# Base dictionary for a player document in Firestore for tests
BASE_PLAYER_IN_DB_DICT = {
    "id": PLAYER_UID, "uid": PLAYER_UID,
    "email": PLAYER_EMAIL, "game_id": TEST_GAME_ID_FOR_PLAYER,
    "player_number": PLAYER_NUMBER, "username": "TestPlayerAlpha",
    "temp_password_hash": "initial_hashed_temp_pass", # Set by CRUD method
    "user_type": UserType.PLAYER.value, "is_active": True, "is_superuser": False,
    "created_at": FIXED_DATETIME_NOW_PLAYER, # Expecting datetime objects
    "updated_at": FIXED_DATETIME_NOW_PLAYER,
    "current_capital": 0.0, # Added as it's in PlayerInDB
    "is_ai": False, "ai_strategy": None # Added from PlayerBase
    # Fields like full_name, first_name, last_name, institution are not part of PlayerInDB base
}

# --- Pytest Fixtures ---

@pytest.fixture
def crud_player_instance() -> CRUDPlayer:
    return CRUDPlayer(collection_name=settings.FIRESTORE_COLLECTION_USERS, model_schema=PlayerInDB)

@pytest.fixture
def player_create_obj() -> PlayerCreate:
    return PLAYER_CREATE_DATA.model_copy(deep=True)

@pytest.fixture
def player_update_obj() -> PlayerUpdate:
    return PLAYER_UPDATE_DATA.model_copy(deep=True)

@pytest.fixture
def mock_player_doc_snapshot_data() -> dict:
    data = BASE_PLAYER_IN_DB_DICT.copy()
    # Convert datetimes to ISO strings for snapshot.to_dict() representation
    data["created_at"] = FIXED_DATETIME_NOW_PLAYER.isoformat()
    data["updated_at"] = FIXED_DATETIME_NOW_PLAYER.isoformat()
    return data

@pytest.fixture
def mock_player_doc_snapshot(mock_player_doc_snapshot_data: dict, mock_firestore_db: AsyncFirestoreClient) -> MagicMock:
    snapshot = MagicMock(spec=DocumentSnapshot)
    snapshot.exists = True
    snapshot.to_dict.return_value = mock_player_doc_snapshot_data
    snapshot.id = mock_player_doc_snapshot_data["id"]
    
    # Configure the general mock_doc_ref from conftest to return this snapshot for this specific ID
    doc_ref_mock = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS).document(PLAYER_UID)
    doc_ref_mock.get = AsyncMock(return_value=snapshot)
    return snapshot


# --- Test Cases for CRUDPlayer ---

@pytest.mark.asyncio
async def test_create_player_with_uid(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    player_create_obj: PlayerCreate
):
    player_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS).document(PLAYER_UID)

    # Data for the snapshot that .get() will return after .set()
    # This is what CRUDBase.create_with_uid will use to build the returned PlayerInDB
    expected_player_dict_from_get = {
        **BASE_PLAYER_IN_DB_DICT, # Start with base, override as needed
        "temp_password_hash": "hashed_temp_password_from_patch", # This is set by create_with_uid
        # created_at/updated_at will be FIXED_DATETIME_NOW_PLAYER due to patching datetime.now
    }
    # snapshot.to_dict() returns ISO strings for datetimes
    snap_dict_return = expected_player_dict_from_get.copy()
    snap_dict_return["created_at"] = FIXED_DATETIME_NOW_PLAYER.isoformat()
    snap_dict_return["updated_at"] = FIXED_DATETIME_NOW_PLAYER.isoformat()
    
    mock_snapshot_after_set = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_set.exists = True
    mock_snapshot_after_set.to_dict.return_value = snap_dict_return
    mock_snapshot_after_set.id = PLAYER_UID
    player_doc_ref.get = AsyncMock(return_value=mock_snapshot_after_set) # Used by CRUDBase after set

    # Patch get_password_hash and datetime.now in app.crud.crud_player
    with patch("app.crud.crud_player.get_password_hash", return_value="hashed_temp_password_from_patch") as mock_hash, \
         patch("app.crud.crud_player.datetime") as mock_dt_crud_player: # For created_at/updated_at in Player
        mock_dt_crud_player.now.return_value = FIXED_DATETIME_NOW_PLAYER

        created_player_dict_result = await crud_player_instance.create_with_uid(
            db=mock_firestore_db, uid=PLAYER_UID, obj_in=player_create_obj
        )
    
    assert created_player_dict_result is not None
    created_player = PlayerInDB(**created_player_dict_result)

    mock_hash.assert_called_once_with(player_create_obj.password)
    
    # Check data passed to Firestore .set()
    player_doc_ref.set.assert_called_once()
    actual_set_data = player_doc_ref.set.call_args[0][0]
    
    assert actual_set_data["uid"] == PLAYER_UID
    assert actual_set_data["email"] == player_create_obj.email
    assert actual_set_data["temp_password_hash"] == "hashed_temp_password_from_patch"
    # Timestamps are set by CRUDPlayer.create_with_uid (which calls super().create_with_uid)
    # CRUDBase.create_with_uid does NOT add timestamps itself to the data it passes to .set()
    # It relies on what's in obj_in. CRUDPlayer.create_with_uid adds them to its internal dict.
    # The patch for app.crud.crud_player.datetime ensures these are fixed.
    # However, CRUDPlayer.create_with_uid in the actual code doesn't add created_at/updated_at.
    # This logic was in CRUDAdmin. Player.create_with_uid now adds created_at/updated_at.
    assert actual_set_data["created_at"] == FIXED_DATETIME_NOW_PLAYER
    assert actual_set_data["updated_at"] == FIXED_DATETIME_NOW_PLAYER
    assert "password" not in actual_set_data # Plain password should not be stored

    # Verify all fields from PlayerCreate are present and correct
    assert actual_set_data["game_id"] == player_create_obj.game_id
    assert actual_set_data["player_number"] == player_create_obj.player_number
    assert actual_set_data["username"] == player_create_obj.username
    assert actual_set_data["is_ai"] == player_create_obj.is_ai
    assert actual_set_data["user_type"] == UserType.PLAYER.value # Set by CRUDPlayer

    # Verify defaults like is_active (is_superuser is not in PlayerCreate/UserBase)
    # PlayerCreate -> UserCreate -> UserBase. UserBase has is_active = True.
    # model_dump should include this default.
    assert actual_set_data["is_active"] is True
    assert actual_set_data["is_superuser"] is False # is_superuser is set by CRUDPlayer.create_with_uid

    # Check returned PlayerInDB object (comes from snapshot mock which should align with these values)
    assert created_player.uid == PLAYER_UID
    assert created_player.email == player_create_obj.email
    assert created_player.temp_password_hash == "hashed_temp_password_from_patch"
    assert created_player.created_at == FIXED_DATETIME_NOW_PLAYER
    assert created_player.updated_at == FIXED_DATETIME_NOW_PLAYER
    assert created_player.game_id == player_create_obj.game_id
    assert created_player.player_number == player_create_obj.player_number
    assert created_player.username == player_create_obj.username
    assert created_player.is_ai == player_create_obj.is_ai
    assert created_player.user_type == UserType.PLAYER # Parsed as enum
    assert created_player.is_active is True
    assert created_player.is_superuser is False # PlayerInDB schema default
    assert created_player.current_capital == BASE_PLAYER_IN_DB_DICT["current_capital"] # Default from PlayerInDB
    assert created_player.ai_strategy == BASE_PLAYER_IN_DB_DICT["ai_strategy"] # Default from PlayerInDB


@pytest.mark.asyncio
async def test_get_player_by_email_found(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    mock_player_doc_snapshot: MagicMock # Specific player snapshot
):
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS)
    mock_query = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query
    
    async def stream_results_gen(*args, **kwargs): yield mock_player_doc_snapshot
    # query.limit(1).stream() -> query.limit() returns a new query object.
    # So, the final object that .stream() is called on needs to have .stream mocked.
    mock_limit_query = AsyncMock(spec=AsyncQuery)
    mock_query.limit = MagicMock(return_value=mock_limit_query)
    mock_limit_query.stream = MagicMock(return_value=stream_results_gen())


    player_dict_or_model = await crud_player_instance.get_by_email(db=mock_firestore_db, email=PLAYER_EMAIL)
    assert player_dict_or_model is not None
    player = player_dict_or_model # Changed: crud.get_by_email returns a model instance

    # Comprehensive assertions
    assert player.uid == PLAYER_UID
    # assert player.id == PLAYER_UID # id is not a field on PlayerInDB, uid is the id.
    assert player.email == PLAYER_EMAIL
    assert player.game_id == TEST_GAME_ID_FOR_PLAYER
    assert player.player_number == PLAYER_NUMBER
    assert player.username == BASE_PLAYER_IN_DB_DICT["username"]
    assert player.user_type == UserType.PLAYER
    assert player.is_active == BASE_PLAYER_IN_DB_DICT["is_active"]
    assert player.is_superuser == BASE_PLAYER_IN_DB_DICT["is_superuser"]
    assert player.created_at == FIXED_DATETIME_NOW_PLAYER
    assert player.updated_at == FIXED_DATETIME_NOW_PLAYER
    assert player.current_capital == BASE_PLAYER_IN_DB_DICT["current_capital"]
    assert player.is_ai == BASE_PLAYER_IN_DB_DICT["is_ai"]
    assert player.ai_strategy == BASE_PLAYER_IN_DB_DICT["ai_strategy"]
    assert player.temp_password_hash == BASE_PLAYER_IN_DB_DICT["temp_password_hash"]

    mock_collection_ref.where.assert_called_once_with(field="email", op_string="==", value=PLAYER_EMAIL)
    # Ensure limit(1) was used by get_by_field
    mock_query.limit.assert_called_once_with(1)


@pytest.mark.asyncio
async def test_get_player_by_email_not_found(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient # From conftest.py
):
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS)
    mock_query = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query
    async def stream_no_results_gen(*args, **kwargs): 
        if False: yield
    
    mock_limit_query = AsyncMock(spec=AsyncQuery)
    mock_query.limit = MagicMock(return_value=mock_limit_query)
    mock_limit_query.stream = MagicMock(return_value=stream_no_results_gen())
    
    player_dict = await crud_player_instance.get_by_email(db=mock_firestore_db, email="nonexistent@example.com")
    assert player_dict is None


@pytest.mark.asyncio
async def test_update_player(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    player_update_obj: PlayerUpdate,
    mock_player_doc_snapshot_data: dict # Base data for the player
):
    player_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS).document(PLAYER_UID)

    # Data for snapshot *after* update
    data_after_update_dict = {
        **mock_player_doc_snapshot_data, # Contains original created_at, email etc. as ISO strings
        "username": player_update_obj.username,
        "is_active": player_update_obj.is_active,
        "updated_at": FIXED_DATETIME_LATER_PLAYER.isoformat() # Updated timestamp as ISO string
    }
    mock_snapshot_after_update = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_update.exists = True
    mock_snapshot_after_update.to_dict.return_value = data_after_update_dict
    mock_snapshot_after_update.id = PLAYER_UID
    player_doc_ref.get = AsyncMock(return_value=mock_snapshot_after_update) # CRUDBase.update calls .get()

    # Patch datetime.now() in app.crud.crud_player (used by CRUDPlayer.update)
    with patch("app.crud.crud_player.datetime") as mock_dt_player: # CRUDBase does not set timestamps, only CRUDPlayer
        mock_dt_player.now.return_value = FIXED_DATETIME_LATER_PLAYER

        updated_player_dict = await crud_player_instance.update(
            db=mock_firestore_db, doc_id=PLAYER_UID, obj_in=player_update_obj
        )
    
    assert updated_player_dict is not None
    updated_player = PlayerInDB(**updated_player_dict) # Pydantic parses ISO strings

    # Check Firestore .update() call payload
    player_doc_ref.update.assert_called_once()
    update_call_payload = player_doc_ref.update.call_args[0][0]
    assert update_call_payload["username"] == player_update_obj.username
    assert update_call_payload["is_active"] == player_update_obj.is_active
    assert update_call_payload["updated_at"] == FIXED_DATETIME_LATER_PLAYER # Set by CRUDPlayer.update

    assert updated_player.username == player_update_obj.username
    assert updated_player.is_active == player_update_obj.is_active
    assert updated_player.updated_at == FIXED_DATETIME_LATER_PLAYER
    # Verify fields that should not change
    original_player_data = mock_player_doc_snapshot_data # This has ISO dates
    assert updated_player.created_at == FIXED_DATETIME_NOW_PLAYER # From original snapshot data
    assert updated_player.email == original_player_data["email"]
    assert updated_player.temp_password_hash == original_player_data["temp_password_hash"]
    assert updated_player.game_id == original_player_data["game_id"]
    assert updated_player.player_number == original_player_data["player_number"]
    assert updated_player.user_type == UserType(original_player_data["user_type"])

@pytest.mark.asyncio
async def test_update_player_ignores_password(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient,
    mock_player_doc_snapshot_data: dict # Represents current state in DB
):
    player_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS).document(PLAYER_UID)
    original_temp_hash = mock_player_doc_snapshot_data["temp_password_hash"]

    update_with_password = PlayerUpdate(
        username="PlayerIgnoresPass",
        password="newfakepassword123" # This should be ignored
    )

    # Data for snapshot returned *after* this specific update attempt
    data_after_update_attempt_dict = {
        **mock_player_doc_snapshot_data, # Start with existing data (ISO dates)
        "username": update_with_password.username,
        "updated_at": FIXED_DATETIME_LATER_PLAYER.isoformat(),
        "temp_password_hash": original_temp_hash, # Should NOT change
    }
    mock_snapshot_after_update = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_update.exists = True
    mock_snapshot_after_update.to_dict.return_value = data_after_update_attempt_dict
    mock_snapshot_after_update.id = PLAYER_UID
    player_doc_ref.get = AsyncMock(return_value=mock_snapshot_after_update)

    with patch("app.crud.crud_player.datetime") as mock_dt_player:
        mock_dt_player.now.return_value = FIXED_DATETIME_LATER_PLAYER

        updated_player_dict = await crud_player_instance.update(
            db=mock_firestore_db, doc_id=PLAYER_UID, obj_in=update_with_password
        )

    assert updated_player_dict is not None
    updated_player = PlayerInDB(**updated_player_dict)

    # 1. Check Firestore .update() call payload
    player_doc_ref.update.assert_called_once()
    actual_update_payload = player_doc_ref.update.call_args[0][0]
    assert "password" not in actual_update_payload # CRITICAL
    assert "temp_password_hash" not in actual_update_payload # Should not be trying to update this from password
    assert actual_update_payload["username"] == update_with_password.username
    assert actual_update_payload["updated_at"] == FIXED_DATETIME_LATER_PLAYER

    # 2. Check returned PlayerInDB object
    assert updated_player.username == update_with_password.username
    assert updated_player.temp_password_hash == original_temp_hash # CRITICAL: Unchanged
    assert updated_player.updated_at == FIXED_DATETIME_LATER_PLAYER
    assert updated_player.created_at == datetime.fromisoformat(mock_player_doc_snapshot_data["created_at"])

@pytest.mark.asyncio
async def test_get_players_by_game_id_found(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    mock_player_doc_snapshot: MagicMock
):
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS)
    mock_query_after_where = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query_after_where
    
    mock_query_after_limit = AsyncMock(spec=AsyncQuery)
    mock_query_after_where.limit.return_value = mock_query_after_limit

    async def stream_results_gen_async(*args, **kwargs):
        yield mock_player_doc_snapshot

    mock_query_after_limit.stream = MagicMock(return_value=stream_results_gen_async())

    players_list = await crud_player_instance.get_players_by_game_id(
        db=mock_firestore_db, game_id=TEST_GAME_ID_FOR_PLAYER, limit=10 # Explicit limit
    )

    mock_collection_ref.where.assert_called_once_with(field="game_id", op_string="==", value=TEST_GAME_ID_FOR_PLAYER)
    mock_query_after_where.limit.assert_called_once_with(10) # Check limit passed to query

    assert len(players_list) == 1
    player = players_list[0]
    # Comprehensive assertions for the returned player
    assert player.uid == PLAYER_UID
    assert player.email == PLAYER_EMAIL # From BASE_PLAYER_IN_DB_DICT via snapshot
    assert player.game_id == TEST_GAME_ID_FOR_PLAYER
    assert player.player_number == PLAYER_NUMBER
    assert player.username == BASE_PLAYER_IN_DB_DICT["username"]
    assert player.user_type == UserType.PLAYER
    assert player.is_active == BASE_PLAYER_IN_DB_DICT["is_active"]
    assert player.is_superuser == BASE_PLAYER_IN_DB_DICT["is_superuser"]
    assert player.created_at == FIXED_DATETIME_NOW_PLAYER
    assert player.updated_at == FIXED_DATETIME_NOW_PLAYER
    assert player.current_capital == BASE_PLAYER_IN_DB_DICT["current_capital"]
    assert player.is_ai == BASE_PLAYER_IN_DB_DICT["is_ai"]
    assert player.ai_strategy == BASE_PLAYER_IN_DB_DICT["ai_strategy"]
    assert player.temp_password_hash == BASE_PLAYER_IN_DB_DICT["temp_password_hash"]

@pytest.mark.asyncio
async def test_get_players_by_game_id_not_found(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient
):
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS)
    mock_query = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query

    async def stream_no_results(*args, **kwargs):
        if False: yield # Empty async generator
    mock_query.stream = MagicMock(return_value=stream_no_results()) # After .limit()

    players_list = await crud_player_instance.get_players_by_game_id(
        db=mock_firestore_db, game_id="non-existent-game-id", limit=5
    )
    mock_collection_ref.where.assert_called_once_with(field="game_id", op_string="==", value="non-existent-game-id")
    mock_query.limit.assert_called_once_with(5)
    assert len(players_list) == 0

@pytest.mark.asyncio
async def test_get_player_in_game_by_number_found(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient,
    mock_player_doc_snapshot: MagicMock
):
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS)
    # Mocking the chain: collection.where().where().limit().stream()
    mock_query_game_id = AsyncMock(spec=AsyncQuery) # After first .where()
    mock_query_player_num = AsyncMock(spec=AsyncQuery) # After second .where()
    mock_query_limit = AsyncMock(spec=AsyncQuery)      # After .limit()

    mock_collection_ref.where.return_value = mock_query_game_id
    mock_query_game_id.where.return_value = mock_query_player_num
    mock_query_player_num.limit.return_value = mock_query_limit

    async def stream_one_result(*args, **kwargs):
        yield mock_player_doc_snapshot
    mock_query_limit.stream = MagicMock(return_value=stream_one_result())

    player_dict_or_model = await crud_player_instance.get_player_in_game_by_number(
        db=mock_firestore_db, game_id=TEST_GAME_ID_FOR_PLAYER, player_number=PLAYER_NUMBER
    )
    assert player_dict_or_model is not None
    player = player_dict_or_model # Changed: crud method returns a model instance
    
    # Assert correct query construction
    calls = mock_collection_ref.where.call_args_list
    assert calls[0][1]['field'] == "game_id"
    assert calls[0][1]['op_string'] == "=="
    assert calls[0][1]['value'] == TEST_GAME_ID_FOR_PLAYER

    mock_query_game_id.where.assert_called_once_with(field="player_number", op_string="==", value=PLAYER_NUMBER) # Second where call
    mock_query_player_num.limit.assert_called_once_with(1)

    # Comprehensive assertions for the returned player
    assert player.uid == PLAYER_UID
    assert player.email == PLAYER_EMAIL
    assert player.game_id == TEST_GAME_ID_FOR_PLAYER
    assert player.player_number == PLAYER_NUMBER
    # ... (add all other fields similar to test_get_players_by_game_id_found)
    assert player.username == BASE_PLAYER_IN_DB_DICT["username"]
    assert player.user_type == UserType.PLAYER
    assert player.is_active == BASE_PLAYER_IN_DB_DICT["is_active"]
    assert player.is_superuser == BASE_PLAYER_IN_DB_DICT["is_superuser"]
    assert player.created_at == FIXED_DATETIME_NOW_PLAYER
    assert player.updated_at == FIXED_DATETIME_NOW_PLAYER
    assert player.current_capital == BASE_PLAYER_IN_DB_DICT["current_capital"]
    assert player.is_ai == BASE_PLAYER_IN_DB_DICT["is_ai"]
    assert player.ai_strategy == BASE_PLAYER_IN_DB_DICT["ai_strategy"]
    assert player.temp_password_hash == BASE_PLAYER_IN_DB_DICT["temp_password_hash"]


@pytest.mark.asyncio
async def test_get_player_in_game_by_number_not_found(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient
):
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS)
    mock_query_game_id = AsyncMock(spec=AsyncQuery)
    mock_query_player_num = AsyncMock(spec=AsyncQuery)
    mock_query_limit = AsyncMock(spec=AsyncQuery)

    mock_collection_ref.where.return_value = mock_query_game_id
    mock_query_game_id.where.return_value = mock_query_player_num
    mock_query_player_num.limit.return_value = mock_query_limit

    async def stream_no_results(*args, **kwargs):
        if False: yield
    mock_query_limit.stream = MagicMock(return_value=stream_no_results())

    player = await crud_player_instance.get_player_in_game_by_number(
        db=mock_firestore_db, game_id="some-game-id", player_number=99
    )
    assert player is None
    calls = mock_collection_ref.where.call_args_list
    assert calls[0][1]['field'] == "game_id"
    assert calls[0][1]['op_string'] == "=="
    assert calls[0][1]['value'] == "some-game-id"
    mock_query_game_id.where.assert_called_once_with(field="player_number", op_string="==", value=99)
    mock_query_player_num.limit.assert_called_once_with(1)

@pytest.mark.asyncio
async def test_clear_temp_password_hash_success(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    mock_player_doc_snapshot_data: dict
):
    player_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS).document(PLAYER_UID)

    # Data for snapshot *after* update (temp_password_hash is None)
    # This is what CRUDBase.update will make its .get() call return
    data_after_clear_dict = {
        **mock_player_doc_snapshot_data, # has ISO strings
        "temp_password_hash": None,
        "updated_at": FIXED_DATETIME_LATER_PLAYER.isoformat() # as ISO string
    }
    mock_snapshot_after_clear = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_clear.exists = True
    mock_snapshot_after_clear.to_dict.return_value = data_after_clear_dict
    mock_snapshot_after_clear.id = PLAYER_UID
    player_doc_ref.get = AsyncMock(return_value=mock_snapshot_after_clear)

    # Patch datetime.now() in app.crud.crud_player (used by CRUDPlayer.update which is called by super().update)
    with patch("app.crud.crud_player.datetime") as mock_dt_player: # For CRUDBase if it used it
        mock_dt_player.now.return_value = FIXED_DATETIME_LATER_PLAYER

        cleared_player_dict_result = await crud_player_instance.clear_temp_password_hash(
            db=mock_firestore_db, player_uid=PLAYER_UID
        )
    
    assert cleared_player_dict_result is not None
    cleared_player = PlayerInDB(**cleared_player_dict_result) # Pydantic parses ISO strings

    # Check Firestore .update() call payload made by super().update()
    # The conftest mock_firestore_db ensures player_doc_ref.update is an AsyncMock
    player_doc_ref.update.assert_called_once()
    update_call_payload = player_doc_ref.update.call_args[0][0]
    
    assert update_call_payload["temp_password_hash"] is None
    # This updated_at is set by CRUDPlayer.clear_temp_password_hash in its obj_in
    assert update_call_payload["updated_at"] == FIXED_DATETIME_LATER_PLAYER

    assert cleared_player_dict_result["temp_password_hash"] is None # Check dict directly
    assert cleared_player_dict_result["updated_at"] == FIXED_DATETIME_LATER_PLAYER.isoformat() # Comes from snapshot

    assert cleared_player.temp_password_hash is None # Check Pydantic model
    assert cleared_player.updated_at == FIXED_DATETIME_LATER_PLAYER


@pytest.mark.asyncio
async def test_clear_temp_password_hash_failure_doc_not_found(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient,
):
    # Patch the super().update() call within clear_temp_password_hash to simulate failure
    with patch.object(CRUDBase, "update", new_callable=AsyncMock) as mock_base_update:
        mock_base_update.return_value = None # Simulate document not found or update failure

        # We still need to patch datetime.now used by clear_temp_password_hash itself for its own updated_at
        with patch("app.crud.crud_player.datetime") as mock_dt_player:
             mock_dt_player.now.return_value = FIXED_DATETIME_LATER_PLAYER

             result_dict = await crud_player_instance.clear_temp_password_hash(
                db=mock_firestore_db, player_uid="non-existent-player-uid"
             )

    assert result_dict is None
    # Check that super().update was called correctly by clear_temp_password_hash
    expected_payload_to_base = {
        "temp_password_hash": None,
        "updated_at": FIXED_DATETIME_LATER_PLAYER
    }
    mock_base_update.assert_called_once_with(
        mock_firestore_db, doc_id="non-existent-player-uid", obj_in=expected_payload_to_base
    )


@pytest.mark.asyncio
async def test_get_player_by_id_found(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    mock_player_doc_snapshot: MagicMock # Specific player snapshot
):
    player_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS).document(PLAYER_UID)
    player_doc_ref.get = AsyncMock(return_value=mock_player_doc_snapshot) # Ensure this specific doc ID returns our snapshot
    
    player_dict_or_model = await crud_player_instance.get(db=mock_firestore_db, doc_id=PLAYER_UID)
    assert player_dict_or_model is not None
    player = player_dict_or_model # Changed: crud.get returns a model instance

    # Comprehensive assertions
    assert player.uid == PLAYER_UID
    # assert player.id == PLAYER_UID # id is not a field on PlayerInDB, uid is the id.
    assert player.email == PLAYER_EMAIL
    assert player.game_id == TEST_GAME_ID_FOR_PLAYER
    assert player.player_number == PLAYER_NUMBER
    assert player.username == BASE_PLAYER_IN_DB_DICT["username"]
    assert player.user_type == UserType.PLAYER
    assert player.is_active == BASE_PLAYER_IN_DB_DICT["is_active"]
    assert player.is_superuser == BASE_PLAYER_IN_DB_DICT["is_superuser"]
    assert player.created_at == FIXED_DATETIME_NOW_PLAYER
    assert player.updated_at == FIXED_DATETIME_NOW_PLAYER
    assert player.current_capital == BASE_PLAYER_IN_DB_DICT["current_capital"]
    assert player.is_ai == BASE_PLAYER_IN_DB_DICT["is_ai"]
    assert player.ai_strategy == BASE_PLAYER_IN_DB_DICT["ai_strategy"]
    assert player.temp_password_hash == BASE_PLAYER_IN_DB_DICT["temp_password_hash"]


@pytest.mark.asyncio
async def test_get_player_by_id_not_found(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient
):
    non_existent_player_uid = "non-existent-player-uid"
    doc_ref_mock = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS).document(non_existent_player_uid)

    mock_snapshot_not_found = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_not_found.exists = False
    doc_ref_mock.get = AsyncMock(return_value=mock_snapshot_not_found)

    player = await crud_player_instance.get(db=mock_firestore_db, doc_id=non_existent_player_uid)
    assert player is None
    doc_ref_mock.get.assert_called_once()


@pytest.mark.asyncio
async def test_remove_player_success( # Renamed
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient # From conftest.py
):
    player_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS).document(PLAYER_UID)
    # player_doc_ref.delete is already an AsyncMock from conftest fixture
    
    result = await crud_player_instance.remove(db=mock_firestore_db, doc_id=PLAYER_UID)
    assert result is True
    player_doc_ref.delete.assert_called_once()


@pytest.mark.asyncio
async def test_update_player_with_dict_input(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient,
    mock_player_doc_snapshot_data: dict # To get base data for constructing snapshot after update
):
    # Arrange
    player_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS).document(PLAYER_UID)

    update_dict = {
        "username": "dict_user_updated",
        "password": "fakepassword_dict", # Should be ignored and deleted
        "is_active": False,
        "current_capital": 1234.56, # Field specific to Player
    }

    data_after_update_dict = {
        **mock_player_doc_snapshot_data,
        "username": update_dict["username"],
        "is_active": update_dict["is_active"],
        "current_capital": update_dict["current_capital"],
        "updated_at": FIXED_DATETIME_LATER_PLAYER.isoformat(),
    }

    mock_snapshot_after_update = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_update.exists = True
    mock_snapshot_after_update.to_dict.return_value = data_after_update_dict
    mock_snapshot_after_update.id = PLAYER_UID

    # Configure the .get() call that happens *after* .update() in CRUDBase
    player_doc_ref.get = AsyncMock(return_value=mock_snapshot_after_update)
    # Configure .update() on the specific doc_ref to be an AsyncMock we can assert
    player_doc_ref.update = AsyncMock()


    with patch("app.crud.crud_player.datetime") as mock_datetime_crud_player:
        mock_datetime_crud_player.now.return_value = FIXED_DATETIME_LATER_PLAYER

        updated_player_dict_result = await crud_player_instance.update(
            db=mock_firestore_db, doc_id=PLAYER_UID, obj_in=update_dict
        )

    assert updated_player_dict_result is not None
    assert updated_player_dict_result["username"] == update_dict["username"]
    assert updated_player_dict_result["is_active"] == update_dict["is_active"]
    assert updated_player_dict_result["current_capital"] == update_dict["current_capital"]
    assert updated_player_dict_result["updated_at"] == FIXED_DATETIME_LATER_PLAYER.isoformat()
    assert updated_player_dict_result["email"] == mock_player_doc_snapshot_data["email"] # Unchanged

    player_doc_ref.update.assert_called_once()
    args_to_firestore_update, _ = player_doc_ref.update.call_args
    actual_firestore_payload = args_to_firestore_update[0]

    assert "password" not in actual_firestore_payload
    assert actual_firestore_payload["username"] == update_dict["username"]
    assert actual_firestore_payload["is_active"] == update_dict["is_active"]
    assert actual_firestore_payload["current_capital"] == update_dict["current_capital"]
    assert actual_firestore_payload["updated_at"] == FIXED_DATETIME_LATER_PLAYER


@pytest.mark.asyncio
async def test_create_player_with_uid_dict_input(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient
):
    NEW_PLAYER_UID = "new-player-uid-dict"
    # The mock_firestore_db fixture ensures collection(...).document(...) returns a configurable AsyncMock
    player_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS).document(NEW_PLAYER_UID)

    create_dict = {
        "email": "dict_creator@example.com",
        "game_id": "game_for_dict_player",
        "player_number": 7,
        "username": "DictCreator",
        "password": "dict_raw_password",
        "is_ai": True,
        "ai_strategy": "Aggressive"
    }

    expected_player_data_in_db = {
        "uid": NEW_PLAYER_UID, "id": NEW_PLAYER_UID,
        "email": create_dict["email"],
        "game_id": create_dict["game_id"],
        "player_number": create_dict["player_number"],
        "username": create_dict["username"],
        "temp_password_hash": "hashed_temp_password_for_dict_input",
        "user_type": UserType.PLAYER.value,
        "is_active": True,
        "is_superuser": False,
        "created_at": FIXED_DATETIME_NOW_PLAYER.isoformat(),
        "updated_at": FIXED_DATETIME_NOW_PLAYER.isoformat(),
        "current_capital": 0.0,
        "is_ai": create_dict["is_ai"],
        "ai_strategy": create_dict["ai_strategy"]
    }

    mock_snapshot_after_set = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_set.exists = True
    mock_snapshot_after_set.to_dict.return_value = expected_player_data_in_db
    mock_snapshot_after_set.id = NEW_PLAYER_UID

    # Configure the specific doc_ref for this test
    player_doc_ref.get = AsyncMock(return_value=mock_snapshot_after_set)
    player_doc_ref.set = AsyncMock()

    with patch("app.crud.crud_player.get_password_hash", return_value="hashed_temp_password_for_dict_input") as mock_hash, \
         patch("app.crud.crud_player.datetime") as mock_dt_crud_player:
        mock_dt_crud_player.now.return_value = FIXED_DATETIME_NOW_PLAYER

        created_player_dict_result = await crud_player_instance.create_with_uid(
            db=mock_firestore_db, uid=NEW_PLAYER_UID, obj_in=create_dict
        )

    assert created_player_dict_result is not None
    assert created_player_dict_result["email"] == create_dict["email"]
    assert created_player_dict_result["username"] == create_dict["username"]
    assert created_player_dict_result["temp_password_hash"] == "hashed_temp_password_for_dict_input"
    assert created_player_dict_result["is_ai"] == create_dict["is_ai"]

    mock_hash.assert_called_once_with(create_dict["password"])

    player_doc_ref.set.assert_called_once()
    actual_set_data = player_doc_ref.set.call_args[0][0]

    assert actual_set_data["uid"] == NEW_PLAYER_UID
    assert actual_set_data["email"] == create_dict["email"]
    assert actual_set_data["temp_password_hash"] == "hashed_temp_password_for_dict_input"
    assert "password" not in actual_set_data
    assert actual_set_data["game_id"] == create_dict["game_id"]
    assert actual_set_data["player_number"] == create_dict["player_number"]
    assert actual_set_data["username"] == create_dict["username"]
    assert actual_set_data["is_ai"] == create_dict["is_ai"]
    assert actual_set_data["ai_strategy"] == create_dict["ai_strategy"]
    assert actual_set_data["user_type"] == UserType.PLAYER.value
    assert actual_set_data["is_active"] is True
    assert actual_set_data["is_superuser"] is False
    assert actual_set_data["created_at"] == FIXED_DATETIME_NOW_PLAYER
    assert actual_set_data["updated_at"] == FIXED_DATETIME_NOW_PLAYER


@pytest.mark.asyncio
async def test_create_player_with_uid_no_password(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient
):
    # Test covering create_with_uid when input dict has no "password"
    # This should hit the `else` for `if plain_password:` in crud_player.py
    NEW_PLAYER_UID_NO_PASS = "new-player-no-pass"
    player_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS).document(NEW_PLAYER_UID_NO_PASS)

    create_dict_no_password = {
        "email": "nopass@example.com",
        "game_id": "game_for_no_pass",
        "player_number": 8,
        "username": "NoPassUser",
        # "password": "..." // Password intentionally omitted
    }

    expected_data_in_db = {
        "uid": NEW_PLAYER_UID_NO_PASS, "id": NEW_PLAYER_UID_NO_PASS,
        "email": create_dict_no_password["email"],
        "game_id": create_dict_no_password["game_id"],
        "player_number": create_dict_no_password["player_number"],
        "username": create_dict_no_password["username"],
        "temp_password_hash": None, # Expected due to no password provided
        "user_type": UserType.PLAYER.value,
        "is_active": True, "is_superuser": False,
        "created_at": FIXED_DATETIME_NOW_PLAYER.isoformat(),
        "updated_at": FIXED_DATETIME_NOW_PLAYER.isoformat(),
        "current_capital": 0.0, "is_ai": False # Assuming default for is_ai if not provided
    }

    mock_snapshot_after_set = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_set.exists = True
    mock_snapshot_after_set.to_dict.return_value = expected_data_in_db
    mock_snapshot_after_set.id = NEW_PLAYER_UID_NO_PASS

    player_doc_ref.get = AsyncMock(return_value=mock_snapshot_after_set)
    player_doc_ref.set = AsyncMock()

    # No need to mock get_password_hash as it shouldn't be called if plain_password is None
    with patch("app.crud.crud_player.datetime") as mock_dt_crud_player:
        mock_dt_crud_player.now.return_value = FIXED_DATETIME_NOW_PLAYER

        created_player_dict = await crud_player_instance.create_with_uid(
            db=mock_firestore_db, uid=NEW_PLAYER_UID_NO_PASS, obj_in=create_dict_no_password
        )

    assert created_player_dict is not None
    assert created_player_dict["temp_password_hash"] is None

    player_doc_ref.set.assert_called_once()
    actual_set_data = player_doc_ref.set.call_args[0][0]
    assert actual_set_data["temp_password_hash"] is None
    assert actual_set_data["email"] == create_dict_no_password["email"]


@pytest.mark.asyncio
async def test_get_players_by_game_id_non_existent_snapshot_in_stream(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient
):
    # Test covering get_players_by_game_id when stream yields a snapshot with exists=False
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS)
    mock_query_after_where = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query_after_where

    mock_query_after_limit = AsyncMock(spec=AsyncQuery)
    mock_query_after_where.limit.return_value = mock_query_after_limit

    mock_non_existent_snapshot = MagicMock(spec=DocumentSnapshot)
    mock_non_existent_snapshot.exists = False # Key part of this test

    async def stream_one_non_existent_snapshot(*args, **kwargs):
        yield mock_non_existent_snapshot

    mock_query_after_limit.stream = MagicMock(return_value=stream_one_non_existent_snapshot())

    players_list = await crud_player_instance.get_players_by_game_id(
        db=mock_firestore_db, game_id=TEST_GAME_ID_FOR_PLAYER, limit=10
    )
    assert len(players_list) == 0 # Should be empty as the only snapshot "didn't exist"


@pytest.mark.asyncio
async def test_clear_temp_password_hash_super_update_raises_exception(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient
):
    # Test covering the except block in clear_temp_password_hash
    PLAYER_UID_FOR_EXCEPTION_TEST = "player-uid-exception"

    # Patch CRUDBase.update to raise an exception
    with patch.object(CRUDBase, "update", new_callable=AsyncMock) as mock_super_update, \
         patch("builtins.print") as mock_print: # To assert error logging
        mock_super_update.side_effect = Exception("DB update error")

        # We still need to patch datetime.now used by clear_temp_password_hash itself
        with patch("app.crud.crud_player.datetime") as mock_dt_player:
             mock_dt_player.now.return_value = FIXED_DATETIME_LATER_PLAYER

             result = await crud_player_instance.clear_temp_password_hash(
                db=mock_firestore_db, player_uid=PLAYER_UID_FOR_EXCEPTION_TEST
             )

    assert result is None # Method should return None on exception
    mock_super_update.assert_called_once()
    mock_print.assert_called_once()
    # Check that the print call contains the error message and player UID
    args, _ = mock_print.call_args
    assert "Error clearing temp_password_hash" in args[0]
    assert PLAYER_UID_FOR_EXCEPTION_TEST in args[0]

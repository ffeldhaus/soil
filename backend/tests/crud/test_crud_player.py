import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta

from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
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
    # This logic was in CRUDAdmin. Let's assume Player doesn't add them and they come from server/snapshot.
    # So, they should NOT be in actual_set_data unless PlayerCreate schema defaults them.
    assert "created_at" not in actual_set_data 
    assert "updated_at" not in actual_set_data
    assert "password" not in actual_set_data

    # Check returned PlayerInDB object (comes from snapshot)
    assert created_player.uid == PLAYER_UID
    assert created_player.temp_password_hash == "hashed_temp_password_from_patch"
    assert created_player.created_at == FIXED_DATETIME_NOW_PLAYER
    assert created_player.updated_at == FIXED_DATETIME_NOW_PLAYER


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


    player_dict = await crud_player_instance.get_by_email(db=mock_firestore_db, email=PLAYER_EMAIL)
    assert player_dict is not None
    player = PlayerInDB(**player_dict) # Pydantic parses ISO strings from snapshot
    assert player.uid == PLAYER_UID
    mock_collection_ref.where.assert_called_once_with("email", "==", PLAYER_EMAIL)


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
    # and app.crud.base (if it were to also set updated_at, though current CRUDBase does not)
    with patch("app.crud.crud_player.datetime") as mock_dt_player, \
         patch("app.crud.base.datetime") as mock_dt_base: # CRUDBase might use it in future
        mock_dt_player.now.return_value = FIXED_DATETIME_LATER_PLAYER
        mock_dt_base.now.return_value = FIXED_DATETIME_LATER_PLAYER 

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
    assert updated_player.created_at == FIXED_DATETIME_NOW_PLAYER # Should remain original

@pytest.mark.asyncio
async def test_get_players_by_game_id_found(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    mock_player_doc_snapshot: MagicMock
):
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS)
    mock_query = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query # .where().limit() if limit is part of query
    
    async def stream_results_gen(*args, **kwargs): yield mock_player_doc_snapshot
    mock_query.stream = MagicMock(return_value=stream_results_gen()) # After .limit()

    players_list = await crud_player_instance.get_players_by_game_id(db=mock_firestore_db, game_id=TEST_GAME_ID_FOR_PLAYER)
    assert len(players_list) == 1
    assert players_list[0].uid == PLAYER_UID


@pytest.mark.asyncio
async def test_get_player_in_game_by_number_found(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    mock_player_doc_snapshot: MagicMock
):
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS)
    mock_query_game_id = AsyncMock(spec=AsyncQuery)
    mock_query_player_num = AsyncMock(spec=AsyncQuery)
    mock_query_limit = AsyncMock(spec=AsyncQuery)

    mock_collection_ref.where.return_value = mock_query_game_id
    mock_query_game_id.where.return_value = mock_query_player_num
    mock_query_player_num.limit.return_value = mock_query_limit

    async def stream_results_gen(*args, **kwargs): yield mock_player_doc_snapshot
    mock_query_limit.stream = MagicMock(return_value=stream_results_gen())

    player_dict = await crud_player_instance.get_player_in_game_by_number(
        db=mock_firestore_db, game_id=TEST_GAME_ID_FOR_PLAYER, player_number=PLAYER_NUMBER
    )
    assert player_dict is not None
    player = PlayerInDB(**player_dict) # Pydantic parses ISO strings
    assert player.uid == PLAYER_UID
    
    mock_collection_ref.where.assert_called_with("game_id", "==", TEST_GAME_ID_FOR_PLAYER)
    mock_query_game_id.where.assert_called_once_with("player_number", "==", PLAYER_NUMBER)
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
    # and in app.crud.base (if CRUDBase.update also set it, though it doesn't)
    with patch("app.crud.crud_player.datetime") as mock_dt_player, \
         patch("app.crud.base.datetime") as mock_dt_base: # For CRUDBase if it used it
        mock_dt_player.now.return_value = FIXED_DATETIME_LATER_PLAYER
        mock_dt_base.now.return_value = FIXED_DATETIME_LATER_PLAYER

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
    # This updated_at is set by CRUDPlayer.update before calling super().update
    assert update_call_payload["updated_at"] == FIXED_DATETIME_LATER_PLAYER

    assert cleared_player.temp_password_hash is None
    assert cleared_player.updated_at == FIXED_DATETIME_LATER_PLAYER


@pytest.mark.asyncio
async def test_get_player_by_id_found(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient, # From conftest.py
    mock_player_doc_snapshot: MagicMock # Specific player snapshot
):
    player_doc_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_USERS).document(PLAYER_UID)
    player_doc_ref.get = AsyncMock(return_value=mock_player_doc_snapshot) # Ensure this specific doc ID returns our snapshot
    
    player_dict = await crud_player_instance.get(db=mock_firestore_db, doc_id=PLAYER_UID)
    assert player_dict is not None
    player = PlayerInDB(**player_dict) # Pydantic parses ISO strings
    assert player.uid == PLAYER_UID


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

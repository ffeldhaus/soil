import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

# Imports from google.cloud
from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud.firestore_v1.document import DocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.async_collection import AsyncCollectionReference
from google.cloud.firestore_v1.async_query import AsyncQuery # For query results

# Imports from app
from app.crud.crud_player import CRUDPlayer 
from app.schemas.player import PlayerCreate, PlayerUpdate, PlayerInDB, UserType
from app.core.config import settings

# --- Constants for Test Data ---
TEST_GAME_ID = "test-game-id-456"
PLAYER_UID_1 = "player-uid-abc-123"
PLAYER_EMAIL_1 = "player1@example.com"
PLAYER_PASSWORD_1 = "playerpass123"
PLAYER_NUMBER_1 = 1

PLAYER_UID_2 = "player-uid-def-456"
PLAYER_EMAIL_2 = "player2@example.com"
PLAYER_NUMBER_2 = 2


FIXED_DATETIME_NOW = datetime(2023, 1, 1, 13, 0, 0, tzinfo=timezone.utc)

# --- Test Data Schemas ---
PLAYER_CREATE_DATA = PlayerCreate(
    email=PLAYER_EMAIL_1,
    password=PLAYER_PASSWORD_1, 
    game_id=TEST_GAME_ID,
    player_number=PLAYER_NUMBER_1,
    full_name="Test Player One", 
    first_name="TestP",
    last_name="One",
    institution="Player University"
)

PLAYER_UPDATE_DATA = PlayerUpdate(
    full_name="Test Player One Updated",
    first_name="TestPlayer", # Example update
    last_name="OneUpdated"
)

PLAYER_IN_DB_DICT_FIRESTORE = {
    "uid": PLAYER_UID_1, 
    "id": PLAYER_UID_1,  
    "email": PLAYER_EMAIL_1,
    "temp_password_hash": "hashed_temp_password_example", 
    "game_id": TEST_GAME_ID,
    "player_number": PLAYER_NUMBER_1,
    "full_name": "Test Player One",
    "first_name": "TestP",
    "last_name": "One",
    "institution": "Player University",
    "user_type": UserType.PLAYER.value, 
    "is_active": True,
    "is_superuser": False, 
    "created_at": FIXED_DATETIME_NOW.isoformat(),
    "updated_at": FIXED_DATETIME_NOW.isoformat()
}


# --- Pytest Fixtures ---

@pytest.fixture
def mock_firestore_db() -> AsyncFirestoreClient:
    mock_db = AsyncMock(spec=AsyncFirestoreClient)
    mock_collection_ref = AsyncMock(spec=AsyncCollectionReference)
    mock_db.collection = MagicMock(return_value=mock_collection_ref)
    return mock_db

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
def firestore_player_doc_data() -> dict:
    return PLAYER_IN_DB_DICT_FIRESTORE.copy()

@pytest.fixture
def mock_doc_ref() -> DocumentReference:
    return AsyncMock(spec=DocumentReference)

@pytest.fixture
def mock_player_doc_snapshot(firestore_player_doc_data: dict) -> DocumentSnapshot:
    snapshot = MagicMock(spec=DocumentSnapshot)
    snapshot.exists = True
    snapshot.to_dict.return_value = firestore_player_doc_data
    snapshot.id = firestore_player_doc_data["uid"] 
    return snapshot

@pytest.fixture
def mock_doc_snapshot_non_existent() -> DocumentSnapshot:
    snapshot = MagicMock(spec=DocumentSnapshot)
    snapshot.exists = False
    snapshot.to_dict.return_value = None
    snapshot.id = "non-existent-player-uid"
    return snapshot

@pytest.fixture(autouse=True) 
def mock_current_datetime_player():
    with patch("app.crud.base.datetime", wraps=datetime) as mock_dt_base, \
         patch("app.crud.crud_player.datetime", wraps=datetime) as mock_dt_player: 
        mock_dt_base.now.return_value = FIXED_DATETIME_NOW
        mock_dt_player.now.return_value = FIXED_DATETIME_NOW
        yield mock_dt_base, mock_dt_player


# --- Test Cases for CRUDPlayer ---

@pytest.mark.asyncio
async def test_create_player_with_uid(
    crud_player_instance: CRUDPlayer,
    mock_firestore_db: AsyncFirestoreClient,
    player_create_obj: PlayerCreate,
    firestore_player_doc_data: dict # Used to shape the snapshot data
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_doc_ref_new = AsyncMock(spec=DocumentReference)
    mock_collection_ref.document.return_value = mock_doc_ref_new
    mock_doc_ref_new.set = AsyncMock()

    snapshot_return_data = firestore_player_doc_data.copy()
    snapshot_return_data.update({
        "email": player_create_obj.email, "game_id": player_create_obj.game_id,
        "player_number": player_create_obj.player_number, "full_name": player_create_obj.full_name,
        "first_name": player_create_obj.first_name, "last_name": player_create_obj.last_name,
        "institution": player_create_obj.institution,
        "temp_password_hash": "hashed_temp_password_from_patch",
        "user_type": UserType.PLAYER.value, "is_active": True, "is_superuser": False,
        "uid": PLAYER_UID_1, "id": PLAYER_UID_1,
        "created_at": FIXED_DATETIME_NOW.isoformat(), "updated_at": FIXED_DATETIME_NOW.isoformat()
    })

    mock_doc_snapshot_after_set = MagicMock(spec=DocumentSnapshot)
    mock_doc_snapshot_after_set.exists = True
    mock_doc_snapshot_after_set.to_dict.return_value = snapshot_return_data
    mock_doc_snapshot_after_set.id = PLAYER_UID_1
    mock_doc_ref_new.get = AsyncMock(return_value=mock_doc_snapshot_after_set)

    with patch("app.crud.crud_player.get_password_hash", return_value="hashed_temp_password_from_patch") as mock_hash_func:
        created_player_dict = await crud_player_instance.create_with_uid(
            db=mock_firestore_db, uid=PLAYER_UID_1, obj_in=player_create_obj
        )
    
    created_player = PlayerInDB(**created_player_dict)
    mock_hash_func.assert_called_once_with(player_create_obj.password)
    
    args_to_set, _ = mock_doc_ref_new.set.call_args
    actual_set_data = args_to_set[0]
    
    assert actual_set_data["temp_password_hash"] == "hashed_temp_password_from_patch"
    assert actual_set_data["user_type"] == UserType.PLAYER.value
    assert "password" not in actual_set_data
    assert created_player.uid == PLAYER_UID_1
    assert created_player.temp_password_hash == "hashed_temp_password_from_patch"

@pytest.mark.asyncio
async def test_get_player_by_email_found(
    crud_player_instance: CRUDPlayer, mock_firestore_db: AsyncFirestoreClient,
    mock_player_doc_snapshot: DocumentSnapshot, firestore_player_doc_data: dict 
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_query_obj = AsyncMock(spec=AsyncQuery) 
    mock_limit_obj = AsyncMock(spec=AsyncQuery) 
    mock_collection_ref.where.return_value = mock_query_obj
    mock_query_obj.limit = MagicMock(return_value=mock_limit_obj)

    async def stream_results(*args, **kwargs): yield mock_player_doc_snapshot
    mock_limit_obj.stream = stream_results

    player = await crud_player_instance.get_by_email(db=mock_firestore_db, email=firestore_player_doc_data["email"])
    assert player is not None
    assert player.uid == firestore_player_doc_data["uid"]

@pytest.mark.asyncio
async def test_get_player_by_email_not_found(
    crud_player_instance: CRUDPlayer, mock_firestore_db: AsyncFirestoreClient
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_query_obj = AsyncMock(spec=AsyncQuery)
    mock_limit_obj = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query_obj
    mock_query_obj.limit = MagicMock(return_value=mock_limit_obj)
    async def stream_no_results(*args, **kwargs): 
        if False: yield
    mock_limit_obj.stream = stream_no_results
    player = await crud_player_instance.get_by_email(db=mock_firestore_db, email="nonexistent.player@example.com")
    assert player is None

@pytest.mark.asyncio
async def test_update_player(
    crud_player_instance: CRUDPlayer, mock_firestore_db: AsyncFirestoreClient,
    player_update_obj: PlayerUpdate, firestore_player_doc_data: dict
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_doc_ref = AsyncMock(spec=DocumentReference)
    mock_collection_ref.document.return_value = mock_doc_ref
    mock_doc_ref.update = AsyncMock()

    data_after_update = firestore_player_doc_data.copy()
    data_after_update.update(player_update_obj.model_dump(exclude_unset=True))
    data_after_update["updated_at"] = (FIXED_DATETIME_NOW + timezone.resolution).isoformat() # Ensure different time
    data_after_update["id"] = PLAYER_UID_1
    data_after_update["uid"] = PLAYER_UID_1
    
    mock_snapshot_after_update = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_update.exists = True
    mock_snapshot_after_update.to_dict.return_value = data_after_update
    mock_snapshot_after_update.id = PLAYER_UID_1
    mock_doc_ref.get = AsyncMock(return_value=mock_snapshot_after_update)

    # Patch get_password_hash for the case where PlayerUpdate contains 'password'
    with patch("app.crud.crud_player.get_password_hash", return_value="new_hashed_pass") as mock_hash_func:
        updated_player_dict = await crud_player_instance.update(
            db=mock_firestore_db, doc_id=PLAYER_UID_1, obj_in=player_update_obj
        )
    
    assert updated_player_dict is not None
    updated_player = PlayerInDB(**updated_player_dict)
    
    mock_hash_func.assert_not_called() # PlayerUpdate doesn't have password in this test data

    args_to_update, _ = mock_doc_ref.update.call_args
    actual_update_payload = args_to_update[0]
    assert "updated_at" in actual_update_payload
    assert actual_update_payload["full_name"] == player_update_obj.full_name
    assert "password" not in actual_update_payload
    assert "temp_password_hash" not in actual_update_payload

    assert updated_player.full_name == player_update_obj.full_name

@pytest.mark.asyncio
async def test_get_players_by_game_id_found(
    crud_player_instance: CRUDPlayer, mock_firestore_db: AsyncFirestoreClient,
    mock_player_doc_snapshot: DocumentSnapshot, firestore_player_doc_data: dict
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_query_obj = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query_obj
    async def stream_results(*args, **kwargs): yield mock_player_doc_snapshot
    mock_query_obj.stream = stream_results

    players = await crud_player_instance.get_multi_by_game_id(db=mock_firestore_db, game_id=TEST_GAME_ID)
    assert len(players) == 1
    assert players[0].uid == firestore_player_doc_data["uid"]

@pytest.mark.asyncio
async def test_get_player_in_game_by_number_found(
    crud_player_instance: CRUDPlayer, mock_firestore_db: AsyncFirestoreClient,
    mock_player_doc_snapshot: DocumentSnapshot, firestore_player_doc_data: dict
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_query_obj1 = AsyncMock(spec=AsyncQuery) # After first .where()
    mock_query_obj2 = AsyncMock(spec=AsyncQuery) # After second .where()
    mock_limit_obj = AsyncMock(spec=AsyncQuery)   # After .limit()

    mock_collection_ref.where.return_value = mock_query_obj1
    mock_query_obj1.where.return_value = mock_query_obj2
    mock_query_obj2.limit = MagicMock(return_value=mock_limit_obj)

    async def stream_results(*args, **kwargs): yield mock_player_doc_snapshot
    mock_limit_obj.stream = stream_results

    player = await crud_player_instance.get_player_in_game_by_number(
        db=mock_firestore_db, game_id=TEST_GAME_ID, player_number=PLAYER_NUMBER_1
    )
    assert player is not None
    assert player.uid == firestore_player_doc_data["uid"]
    mock_collection_ref.where.assert_any_call(field="game_id", op_string="==", value=TEST_GAME_ID)
    mock_query_obj1.where.assert_called_once_with(field="player_number", op_string="==", value=PLAYER_NUMBER_1)

@pytest.mark.asyncio
async def test_clear_temp_password_hash_success(
    crud_player_instance: CRUDPlayer, mock_firestore_db: AsyncFirestoreClient,
    firestore_player_doc_data: dict
):
    data_after_clear = firestore_player_doc_data.copy()
    data_after_clear["temp_password_hash"] = None
    data_after_clear["updated_at"] = (FIXED_DATETIME_NOW + timezone.resolution).isoformat()

    # Mock super().update behavior
    with patch.object(CRUDPlayer, "update", new_callable=AsyncMock) as mock_super_update:
        mock_super_update.return_value = data_after_clear # super().update returns a dict

        cleared_player_dict = await crud_player_instance.clear_temp_password_hash(
            db=mock_firestore_db, player_uid=PLAYER_UID_1
        )
    
    assert cleared_player_dict is not None
    cleared_player = PlayerInDB(**cleared_player_dict)

    args_to_super_update, _ = mock_super_update.call_args
    assert args_to_super_update[0].get("doc_id") == PLAYER_UID_1
    update_payload = args_to_super_update[0].get("obj_in")
    assert update_payload == {"temp_password_hash": None} # This is what's passed to super().update
    
    assert cleared_player.temp_password_hash is None
    assert cleared_player.updated_at != firestore_player_doc_data["updated_at"]

# --- Tests for Inherited CRUDBase methods ---
@pytest.mark.asyncio
async def test_get_player_by_id_found(
    crud_player_instance: CRUDPlayer, mock_firestore_db: AsyncFirestoreClient, 
    mock_player_doc_snapshot: DocumentSnapshot, firestore_player_doc_data: dict
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_doc_ref = AsyncMock(spec=DocumentReference)
    mock_collection_ref.document.return_value = mock_doc_ref
    mock_doc_ref.get = AsyncMock(return_value=mock_player_doc_snapshot)
    
    player = await crud_player_instance.get(db=mock_firestore_db, doc_id=PLAYER_UID_1)
    assert player is not None
    assert player.uid == firestore_player_doc_data["uid"]

@pytest.mark.asyncio
async def test_remove_player(
    crud_player_instance: CRUDPlayer, mock_firestore_db: AsyncFirestoreClient
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_doc_ref = AsyncMock(spec=DocumentReference)
    mock_collection_ref.document.return_value = mock_doc_ref
    mock_doc_ref.delete = AsyncMock()

    result = await crud_player_instance.remove(db=mock_firestore_db, doc_id=PLAYER_UID_1)
    assert result is True
    mock_doc_ref.delete.assert_called_once()

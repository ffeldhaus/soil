import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

# Imports from google.cloud
from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud.firestore_v1.document import DocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.async_collection import AsyncCollectionReference
from google.cloud.firestore_v1.async_query import AsyncQuery # For query results

# Imports from app
from app.crud.crud_game import CRUDGame
from app.schemas.game import GameCreate, GameUpdate, GameInDB, GameStatus, GameStage
from app.core.config import settings

# --- Constants for Test Data ---
TEST_GAME_ID = "test-game-id-123"
ADMIN_ID = "admin-user-id-abc"
PLAYER_UID_1 = "player-uid-xyz"
PLAYER_UID_2 = "player-uid-efg"

DEFAULT_WEATHER_SEQ = ["Normal", "Drought", "Normal"]
DEFAULT_VERMIN_SEQ = ["None", "Aphids", "None"]
FIXED_DATETIME_NOW = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

# --- Test Data Schemas ---
GAME_CREATE_DATA = GameCreate(
    name="Test Game Alpha",
    number_of_rounds=3,
    max_players=2
)

GAME_UPDATE_DATA = GameUpdate(
    name="Test Game Alpha Modified",
    max_players=3,
    game_stage=GameStage.REGISTRATION # Example update
)

GAME_IN_DB_DICT_FIRESTORE = {
    "id": TEST_GAME_ID,
    "uid": TEST_GAME_ID, 
    "name": "Test Game Alpha",
    "admin_id": ADMIN_ID,
    "number_of_rounds": 3,
    "max_players": 2,
    "current_round_number": 0,
    "game_status": GameStatus.PENDING.value,
    "game_stage": GameStage.INITIAL_SETUP.value,
    "player_uids": [],
    "weather_sequence": DEFAULT_WEATHER_SEQ,
    "vermin_sequence": DEFAULT_VERMIN_SEQ,
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
def crud_game_instance() -> CRUDGame:
    return CRUDGame(collection_name=settings.FIRESTORE_COLLECTION_GAMES, model_schema=GameInDB)

@pytest.fixture
def game_create_obj() -> GameCreate:
    return GAME_CREATE_DATA.model_copy(deep=True)

@pytest.fixture
def game_update_obj() -> GameUpdate:
    return GAME_UPDATE_DATA.model_copy(deep=True)

@pytest.fixture
def firestore_game_doc_data() -> dict:
    return GAME_IN_DB_DICT_FIRESTORE.copy()

@pytest.fixture
def mock_doc_ref() -> DocumentReference:
    return AsyncMock(spec=DocumentReference)

@pytest.fixture
def mock_game_doc_snapshot(firestore_game_doc_data: dict) -> DocumentSnapshot:
    snapshot = MagicMock(spec=DocumentSnapshot)
    snapshot.exists = True
    snapshot.to_dict.return_value = firestore_game_doc_data
    snapshot.id = firestore_game_doc_data["id"]
    return snapshot

@pytest.fixture
def mock_doc_snapshot_non_existent() -> DocumentSnapshot:
    snapshot = MagicMock(spec=DocumentSnapshot)
    snapshot.exists = False
    snapshot.to_dict.return_value = None
    snapshot.id = "non-existent-game-id"
    return snapshot

@pytest.fixture
def mock_array_union_class(): # Renamed to avoid conflict if we import actual ArrayUnion
    with patch("app.crud.crud_game.ArrayUnion") as mock:
        mock.side_effect = lambda items: f"ArrayUnion({items})" # Simulate behavior for assertion
        yield mock

@pytest.fixture
def mock_array_remove_class():
    with patch("app.crud.crud_game.ArrayRemove") as mock:
        mock.side_effect = lambda items: f"ArrayRemove({items})"
        yield mock

@pytest.fixture(autouse=True) # Apply to all tests in this module
def mock_game_rules_sequences():
    with patch("app.crud.crud_game.game_rules.generate_weather_sequence", return_value=DEFAULT_WEATHER_SEQ) as mock_weather, \
         patch("app.crud.crud_game.game_rules.generate_vermin_sequence", return_value=DEFAULT_VERMIN_SEQ) as mock_vermin:
        yield mock_weather, mock_vermin

@pytest.fixture(autouse=True) # Apply to all tests
def mock_current_datetime():
    # Patch datetime used in CRUDBase for created_at/updated_at if they are app-managed
    # and in CRUDGame.update_game_status for updated_at
    with patch("app.crud.base.datetime", wraps=datetime) as mock_dt_base, \
         patch("app.crud.crud_game.datetime", wraps=datetime) as mock_dt_game:
        mock_dt_base.now.return_value = FIXED_DATETIME_NOW
        mock_dt_game.now.return_value = FIXED_DATETIME_NOW
        # For CRUDBase methods that use obj_in.model_dump() which includes Pydantic's now()
        # this might not be enough if Pydantic uses its own internal datetime.
        # However, created_at/updated_at are often server timestamps from Firestore.
        # For tests, we control the snapshot data.
        yield mock_dt_base, mock_dt_game


# --- Test Cases for CRUDGame ---

@pytest.mark.asyncio
async def test_create_game_with_admin(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient,
    game_create_obj: GameCreate,
    mock_game_rules_sequences # autouse fixture
):
    mock_weather_gen, mock_vermin_gen = mock_game_rules_sequences
    mock_collection_ref = mock_firestore_db.collection.return_value
    
    # Data that will be returned by the snapshot.to_dict() after document is created
    # This should reflect the state after all CRUD operations (including defaults and sequences)
    expected_game_data_in_db = {
        "name": game_create_obj.name, "admin_id": ADMIN_ID,
        "number_of_rounds": game_create_obj.number_of_rounds, "max_players": game_create_obj.max_players,
        "weather_sequence": DEFAULT_WEATHER_SEQ, "vermin_sequence": DEFAULT_VERMIN_SEQ,
        "player_uids": [], "game_status": GameStatus.PENDING.value,
        "current_round_number": 0, "game_stage": GameStage.INITIAL_SETUP.value,
        "id": TEST_GAME_ID, "uid": TEST_GAME_ID, # Added by CRUDBase from snapshot.id
        "created_at": FIXED_DATETIME_NOW.isoformat(), # Added by CRUDBase
        "updated_at": FIXED_DATETIME_NOW.isoformat()  # Added by CRUDBase
    }

    # Mock the super().create() call within CRUDGame.create_with_admin
    # This is the most direct way to test what create_with_admin passes to its parent
    with patch.object(CRUDGame, "create", new_callable=AsyncMock) as mock_super_create:
        mock_super_create.return_value = expected_game_data_in_db # super().create returns a dict

        created_game_dict = await crud_game_instance.create_with_admin(
            db=mock_firestore_db, obj_in=game_create_obj, admin_id=ADMIN_ID
        )
    
    created_game = GameInDB(**created_game_dict)

    mock_weather_gen.assert_called_once_with(game_create_obj.number_of_rounds)
    mock_vermin_gen.assert_called_once_with(game_create_obj.number_of_rounds)

    # Assert that super().create was called with the correctly prepared game data
    args_to_super_create, _ = mock_super_create.call_args
    assert len(args_to_super_create) > 0
    call_obj_in_dict = args_to_super_create[0].get("obj_in") # obj_in is a kwarg
    
    assert call_obj_in_dict["name"] == game_create_obj.name
    assert call_obj_in_dict["admin_id"] == ADMIN_ID
    assert call_obj_in_dict["weather_sequence"] == DEFAULT_WEATHER_SEQ

    assert created_game.name == game_create_obj.name
    assert created_game.admin_id == ADMIN_ID
    assert created_game.game_status == GameStatus.PENDING

@pytest.mark.asyncio
async def test_get_games_by_admin_id_found(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient,
    mock_game_doc_snapshot: DocumentSnapshot, # This snapshot will be the item yielded
    firestore_game_doc_data: dict
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_query_obj = AsyncMock(spec=AsyncQuery) # After .where()
    mock_collection_ref.where.return_value = mock_query_obj
    
    async def stream_results(*args, **kwargs): yield mock_game_doc_snapshot
    mock_query_obj.stream = stream_results

    games = await crud_game_instance.get_multi_by_admin_id(db=mock_firestore_db, admin_id=ADMIN_ID)
    
    mock_collection_ref.where.assert_called_once_with(field="admin_id", op_string="==", value=ADMIN_ID)
    assert len(games) == 1
    assert games[0].uid == firestore_game_doc_data["uid"]

@pytest.mark.asyncio
async def test_get_games_by_admin_id_not_found(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_query_obj = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query_obj
    async def stream_no_results(*args, **kwargs): 
        if False: yield
    mock_query_obj.stream = stream_no_results
    
    games = await crud_game_instance.get_multi_by_admin_id(db=mock_firestore_db, admin_id="other-admin-id")
    assert len(games) == 0

@pytest.mark.asyncio
async def test_add_player_to_game_success(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient,
    mock_doc_ref: DocumentReference, # Mock for the game document
    mock_array_union_class: MagicMock # Patched ArrayUnion
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_collection_ref.document.return_value = mock_doc_ref
    mock_doc_ref.update = AsyncMock()

    result = await crud_game_instance.add_player_to_game(
        db=mock_firestore_db, game_id=TEST_GAME_ID, player_id=PLAYER_UID_1
    )
    assert result is True
    mock_doc_ref.update.assert_called_once_with({"player_uids": f"ArrayUnion([{PLAYER_UID_1}])"})

@pytest.mark.asyncio
async def test_remove_player_from_game_success(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient,
    mock_doc_ref: DocumentReference,
    mock_array_remove_class: MagicMock
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_collection_ref.document.return_value = mock_doc_ref
    mock_doc_ref.update = AsyncMock()

    result = await crud_game_instance.remove_player_from_game(
        db=mock_firestore_db, game_id=TEST_GAME_ID, player_id=PLAYER_UID_1
    )
    assert result is True
    mock_doc_ref.update.assert_called_once_with({"player_uids": f"ArrayRemove([{PLAYER_UID_1}])"})

@pytest.mark.asyncio
async def test_update_game_status(
    crud_game_instance: CRUDGame,
    mock_firestore_db: AsyncFirestoreClient,
    firestore_game_doc_data: dict # For shaping the returned dict from super().update
):
    new_status = GameStatus.ACTIVE
    
    # Data that super().update is expected to return (mocked)
    updated_game_data = firestore_game_doc_data.copy()
    updated_game_data["game_status"] = new_status.value
    updated_game_data["updated_at"] = FIXED_DATETIME_NOW.isoformat() # Due to mock_current_datetime

    with patch.object(CRUDGame, "update", new_callable=AsyncMock) as mock_super_update:
        mock_super_update.return_value = updated_game_data

        updated_game_dict = await crud_game_instance.update_game_status(
            db=mock_firestore_db, game_id=TEST_GAME_ID, new_status=new_status
        )

    updated_game = GameInDB(**updated_game_dict)
    
    args_to_super_update, _ = mock_super_update.call_args
    assert args_to_super_update[0].get("doc_id") == TEST_GAME_ID
    update_payload = args_to_super_update[0].get("obj_in")
    assert update_payload["game_status"] == new_status.value
    assert "updated_at" in update_payload # From CRUDGame.update_game_status logic

    assert updated_game.game_status == new_status

# --- Tests for Inherited CRUDBase methods ---
@pytest.mark.asyncio
async def test_get_game_by_id_found(
    crud_game_instance: CRUDGame, mock_firestore_db: AsyncFirestoreClient, 
    mock_game_doc_snapshot: DocumentSnapshot, firestore_game_doc_data: dict
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_doc_ref = AsyncMock(spec=DocumentReference)
    mock_collection_ref.document.return_value = mock_doc_ref
    mock_doc_ref.get = AsyncMock(return_value=mock_game_doc_snapshot)
    
    game = await crud_game_instance.get(db=mock_firestore_db, doc_id=TEST_GAME_ID)
    assert game is not None
    assert game.uid == firestore_game_doc_data["uid"]

@pytest.mark.asyncio
async def test_update_game_general(
    crud_game_instance: CRUDGame, mock_firestore_db: AsyncFirestoreClient,
    game_update_obj: GameUpdate, firestore_game_doc_data: dict
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_doc_ref = AsyncMock(spec=DocumentReference)
    mock_collection_ref.document.return_value = mock_doc_ref
    mock_doc_ref.update = AsyncMock()

    # Data for snapshot after update
    data_after_update = firestore_game_doc_data.copy()
    data_after_update.update(game_update_obj.model_dump(exclude_unset=True))
    data_after_update["updated_at"] = FIXED_DATETIME_NOW.isoformat() # from mock
    # CRUDBase.update returns dict with id and uid from snapshot
    data_after_update["id"] = TEST_GAME_ID 
    data_after_update["uid"] = TEST_GAME_ID

    mock_snapshot_after_update = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_update.exists = True
    mock_snapshot_after_update.to_dict.return_value = data_after_update
    mock_snapshot_after_update.id = TEST_GAME_ID
    mock_doc_ref.get = AsyncMock(return_value=mock_snapshot_after_update)

    updated_game_dict = await crud_game_instance.update(
        db=mock_firestore_db, doc_id=TEST_GAME_ID, obj_in=game_update_obj
    )
    assert updated_game_dict is not None
    updated_game = GameInDB(**updated_game_dict)

    assert updated_game.name == game_update_obj.name
    assert updated_game.max_players == game_update_obj.max_players
    assert updated_game.game_stage == game_update_obj.game_stage

@pytest.mark.asyncio
async def test_remove_game(
    crud_game_instance: CRUDGame, mock_firestore_db: AsyncFirestoreClient
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_doc_ref = AsyncMock(spec=DocumentReference)
    mock_collection_ref.document.return_value = mock_doc_ref
    mock_doc_ref.delete = AsyncMock()

    result = await crud_game_instance.remove(db=mock_firestore_db, doc_id=TEST_GAME_ID)
    assert result is True
    mock_doc_ref.delete.assert_called_once()

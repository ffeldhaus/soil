import pytest
from unittest.mock import AsyncMock, MagicMock, patch # Added patch
from datetime import datetime, timezone

from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud.firestore_v1.document import DocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.async_collection import AsyncCollectionReference
from google.cloud.firestore_v1.async_query import AsyncQuery # For query objects

from app.schemas.game import GameStatus, GameStage

GENERIC_DOC_ID = "generic-doc-id"
FIXED_DATETIME_NOW_CONFTEST = datetime(2023, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

@pytest.fixture
def mock_firestore_db() -> AsyncFirestoreClient:
    mock_db = AsyncMock(spec=AsyncFirestoreClient)
    mock_collection_ref = AsyncMock(spec=AsyncCollectionReference)
    mock_db.collection = MagicMock(return_value=mock_collection_ref)

    mock_doc_ref_on_add = AsyncMock(spec=DocumentReference)
    mock_collection_ref.add = AsyncMock(return_value=(FIXED_DATETIME_NOW_CONFTEST, mock_doc_ref_on_add))
    
    mock_snapshot_data_after_add = {
        "id": "mock_added_id", "uid": "mock_added_id",
        "name": "Added Document Name",
        "created_at": FIXED_DATETIME_NOW_CONFTEST.isoformat(), # Firestore returns ISO strings
        "updated_at": FIXED_DATETIME_NOW_CONFTEST.isoformat(),
        "adminId": "generic_admin_id_after_add", "number_of_rounds": 5, "max_players": 2,
        "current_round_number": 0, "game_status": GameStatus.PENDING.value,
        "game_stage": GameStage.INITIAL_SETUP.value, "player_uids": [],
        "weather_sequence": ["Normal"], "vermin_sequence": ["None"],
        "ai_player_strategies": {}
    }
    mock_snapshot_after_add = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_add.exists = True
    mock_snapshot_after_add.to_dict.return_value = mock_snapshot_data_after_add
    mock_snapshot_after_add.id = mock_snapshot_data_after_add["id"]
    mock_doc_ref_on_add.get = AsyncMock(return_value=mock_snapshot_after_add)

    mock_doc_ref_generic = AsyncMock(spec=DocumentReference)
    mock_doc_ref_generic.update = AsyncMock(return_value=None)
    mock_doc_ref_generic.set = AsyncMock(return_value=None)
    mock_doc_ref_generic.delete = AsyncMock(return_value=None)

    generic_doc_snapshot_data = {
        "id": GENERIC_DOC_ID, "uid": GENERIC_DOC_ID,
        "name": "Generic Document Name",
        "created_at": FIXED_DATETIME_NOW_CONFTEST.isoformat(), # Firestore returns ISO strings
        "updated_at": FIXED_DATETIME_NOW_CONFTEST.isoformat(),
        "adminId": "generic_admin_id", "number_of_rounds": 5, "max_players": 2,
        "current_round_number": 1, "game_status": GameStatus.ACTIVE.value,
        "game_stage": GameStage.MID_ROUND.value, "player_uids": [],
        "weather_sequence": ["Normal"], "vermin_sequence": ["None"],
        "ai_player_strategies": {}
    }
    mock_generic_snapshot = MagicMock(spec=DocumentSnapshot)
    mock_generic_snapshot.exists = True
    mock_generic_snapshot.to_dict.return_value = generic_doc_snapshot_data
    mock_generic_snapshot.id = GENERIC_DOC_ID
    mock_doc_ref_generic.get = AsyncMock(return_value=mock_generic_snapshot)
    
    mock_collection_ref.document = MagicMock(return_value=mock_doc_ref_generic)
    
    # Mocking for query chains like collection.where().limit().stream()
    mock_query = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where = MagicMock(return_value=mock_query)
    mock_collection_ref.limit = MagicMock(return_value=mock_query) # .limit() can be on collection or query
    mock_query.where = MagicMock(return_value=mock_query) # query.where()
    mock_query.order_by = MagicMock(return_value=mock_query) # query.order_by()
    mock_query.limit = MagicMock(return_value=mock_query) # query.limit()
    
    # Default stream mock: yields nothing. Tests should override this.
    async def default_empty_stream_gen(*args, **kwargs):
        if False: yield
    # AsyncQuery.stream() is a *synchronous* method returning an AsyncIterator.
    mock_query.stream = MagicMock(return_value=default_empty_stream_gen())

    return mock_db

@pytest.fixture
def mock_doc_snapshot_non_existent(mock_firestore_db: AsyncFirestoreClient) -> MagicMock:
    snapshot = MagicMock(spec=DocumentSnapshot)
    snapshot.exists = False
    snapshot.to_dict.return_value = None
    snapshot.id = "non-existent-doc-id"
    
    # Configure the generic doc_ref to return this if .get() is called after
    # a test specifically sets up a scenario for a non-existent doc.
    # This might be overridden by more specific mocks in tests.
    doc_ref = mock_firestore_db.collection("any_collection").document("non-existent-doc-id")
    doc_ref.get = AsyncMock(return_value=snapshot)
    return snapshot

@pytest.fixture
def mock_array_union_class():
    with patch("google.cloud.firestore.ArrayUnion") as mock:
        # Simulate ArrayUnion by returning a specific type or structure if needed for assertions
        # For simple value checking, just returning the items might be enough.
        mock.side_effect = lambda items: items # Or a more specific mock if type matters
        yield mock

@pytest.fixture
def mock_array_remove_class():
    with patch("google.cloud.firestore.ArrayRemove") as mock:
        mock.side_effect = lambda items: items
        yield mock

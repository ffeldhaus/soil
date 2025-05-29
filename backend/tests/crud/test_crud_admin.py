import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud.firestore_v1.document import DocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.async_collection import AsyncCollectionReference

from app.crud.crud_admin import CRUDAdmin
from app.schemas.admin import AdminCreate, AdminUpdate, AdminInDB
from app.core.config import settings

# --- Constants ---
FIXED_DATETIME_NOW = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
FIXED_DATETIME_LATER = datetime(2023, 1, 1, 13, 0, 0, tzinfo=timezone.utc)

ADMIN_UID = "test-admin-uid"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "securepassword123" # Raw password for AdminCreate

ADMIN_CREATE_DATA = AdminCreate(
    email=ADMIN_EMAIL,
    password=ADMIN_PASSWORD,
    full_name="Test Admin User",
    first_name="Test",
    last_name="Admin",
    institution="Test University"
)

ADMIN_UPDATE_DATA = AdminUpdate(
    first_name="UpdatedTest",
    last_name="AdminUser",
    email="updated.admin@example.com",
    institution="Updated University"
)

# Base dictionary for Firestore document data. Timestamps will be set by tests.
ADMIN_IN_DB_DICT_BASE = {
    "uid": ADMIN_UID,
    "id": ADMIN_UID, # Firestore document ID is typically the same as UID for users
    "email": ADMIN_EMAIL,
    "hashed_password": "hashed_password_example_from_get_password_hash", # This will be patched
    "full_name": "Test Admin User",
    "first_name": "Test",
    "last_name": "Admin",
    "institution": "Test University",
    "is_superuser": True,
    "is_active": True,
    "user_type": "admin",
}

# --- Pytest Fixtures ---

@pytest.fixture
def mock_firestore_db() -> AsyncFirestoreClient:
    mock_db = AsyncMock(spec=AsyncFirestoreClient)
    mock_collection_ref = AsyncMock(spec=AsyncCollectionReference)
    mock_db.collection = MagicMock(return_value=mock_collection_ref)

    # Common DocumentReference setup for all tests needing it
    mock_doc_ref = AsyncMock(spec=DocumentReference)
    mock_doc_ref.set = AsyncMock()
    mock_doc_ref.update = AsyncMock() # Ensure update is an AsyncMock
    mock_doc_ref.delete = AsyncMock(return_value=None) # remove returns True on success

    # Default behavior for collection().document()
    mock_collection_ref.document = MagicMock(return_value=mock_doc_ref)
    return mock_db

@pytest.fixture
def crud_admin_instance() -> CRUDAdmin:
    return CRUDAdmin(collection_name=settings.FIRESTORE_COLLECTION_ADMINS, model_schema=AdminInDB)

@pytest.fixture
def admin_create_obj() -> AdminCreate:
    return ADMIN_CREATE_DATA.model_copy(deep=True)

@pytest.fixture
def admin_update_obj() -> AdminUpdate:
    return ADMIN_UPDATE_DATA.model_copy(deep=True)

@pytest.fixture
def mock_doc_snapshot(mock_firestore_db: AsyncFirestoreClient) -> MagicMock: # Changed to MagicMock for flexibility
    # This snapshot will represent the state *after* creation or *before* update
    doc_data = {
        **ADMIN_IN_DB_DICT_BASE,
        "created_at": FIXED_DATETIME_NOW, # Set by create
        "updated_at": FIXED_DATETIME_NOW, # Set by create
    }
    snapshot = MagicMock(spec=DocumentSnapshot)
    snapshot.exists = True
    snapshot.to_dict.return_value = doc_data
    snapshot.id = doc_data["id"]
    
    # Make the default document reference return this snapshot on get()
    mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS).document(ADMIN_UID).get = AsyncMock(return_value=snapshot)
    return snapshot

@pytest.fixture
def mock_doc_snapshot_non_existent(mock_firestore_db: AsyncFirestoreClient) -> MagicMock:
    snapshot = MagicMock(spec=DocumentSnapshot)
    snapshot.exists = False
    snapshot.to_dict.return_value = None
    snapshot.id = "non-existent-admin-uid"
    
    # Make the default document reference return this snapshot on get() for a specific ID
    mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS).document("non-existent-admin-uid").get = AsyncMock(return_value=snapshot)
    return snapshot

# --- Test Cases ---

@pytest.mark.asyncio
async def test_create_admin_with_uid(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    admin_create_obj: AdminCreate,
    mock_doc_snapshot: MagicMock # Used to mock the .get() call after .set()
):
    # Arrange
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS)
    # document(ADMIN_UID) is already configured by mock_doc_snapshot to return it on .get()
    mock_doc_ref_for_admin_uid = mock_collection_ref.document(ADMIN_UID)

    # Patch 'get_password_hash' and 'datetime' in 'app.crud.crud_admin'
    # This assumes 'from datetime import datetime, timezone' exists in app.crud.crud_admin
    with patch("app.crud.crud_admin.get_password_hash", return_value="hashed_password_example_from_get_password_hash") as mock_hash, \
         patch("app.crud.crud_admin.datetime") as mock_datetime_module:
        mock_datetime_module.now.return_value = FIXED_DATETIME_NOW
        mock_datetime_module.utcnow.return_value = FIXED_DATETIME_NOW # If utcnow is used

        # Act
        created_admin_dict = await crud_admin_instance.create_with_uid(
            db=mock_firestore_db, uid=ADMIN_UID, obj_in=admin_create_obj
        )

    # Assert
    assert created_admin_dict is not None
    created_admin = AdminInDB(**created_admin_dict)

    # 1. Check what was passed to Firestore's .set() method
    mock_doc_ref_for_admin_uid.set.assert_called_once()
    args_to_set, _ = mock_doc_ref_for_admin_uid.set.call_args
    actual_set_data = args_to_set[0]

    assert actual_set_data["uid"] == ADMIN_UID
    assert actual_set_data["email"] == admin_create_obj.email
    assert actual_set_data["hashed_password"] == "hashed_password_example_from_get_password_hash"
    assert actual_set_data["full_name"] == admin_create_obj.full_name
    assert actual_set_data["created_at"] == FIXED_DATETIME_NOW
    assert actual_set_data["updated_at"] == FIXED_DATETIME_NOW
    assert actual_set_data["is_superuser"] is True # Default from AdminCreateFirebase
    assert actual_set_data["is_active"] is True   # Default from AdminCreateFirebase
    assert actual_set_data["user_type"] == "admin" # Default from AdminCreateFirebase

    # 2. Check the returned AdminInDB object (which comes from the snapshot mock)
    assert created_admin.uid == ADMIN_UID
    assert created_admin.id == ADMIN_UID
    assert created_admin.email == admin_create_obj.email
    assert created_admin.hashed_password == "hashed_password_example_from_get_password_hash"
    assert created_admin.created_at == FIXED_DATETIME_NOW
    assert created_admin.updated_at == FIXED_DATETIME_NOW

@pytest.mark.asyncio
async def test_get_admin_by_email_found(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    mock_doc_snapshot: MagicMock # This snapshot is configured with ADMIN_EMAIL
):
    # Arrange
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS)
    mock_query_obj = AsyncMock()
    mock_collection_ref.where.return_value = mock_query_obj
    # .limit(1).stream() should yield one result (the mock_doc_snapshot)
    async def stream_results(*args, **kwargs): yield mock_doc_snapshot
    mock_query_obj.limit = MagicMock(return_value=MagicMock(stream=stream_results))

    # Act
    admin = await crud_admin_instance.get_by_email(db=mock_firestore_db, email=ADMIN_EMAIL)

    # Assert
    assert admin is not None
    assert admin.uid == ADMIN_UID
    assert admin.email == ADMIN_EMAIL
    mock_collection_ref.where.assert_called_once_with("email", "==", ADMIN_EMAIL)

@pytest.mark.asyncio
async def test_get_admin_by_email_not_found(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient
):
    # Arrange
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS)
    mock_query_obj = AsyncMock()
    mock_collection_ref.where.return_value = mock_query_obj
    async def stream_no_results(*args, **kwargs): 
        if False: yield # Empty async generator
    mock_query_obj.limit = MagicMock(return_value=MagicMock(stream=stream_no_results))
    
    # Act
    admin = await crud_admin_instance.get_by_email(db=mock_firestore_db, email="nonexistent@example.com")
    
    # Assert
    assert admin is None

@pytest.mark.asyncio
async def test_update_admin(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    admin_update_obj: AdminUpdate,
    mock_doc_snapshot: MagicMock # Represents state *before* update, .get() will be called again for *after*
):
    # Arrange
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS)
    mock_doc_ref_for_admin_uid = mock_collection_ref.document(ADMIN_UID) # .update and .get will be called on this

    # Snapshot data *after* update is applied
    data_after_update = {
        **ADMIN_IN_DB_DICT_BASE, # Base data
        "created_at": FIXED_DATETIME_NOW, # Original creation time
        "updated_at": FIXED_DATETIME_LATER, # New update time
        "first_name": admin_update_obj.first_name, # Updated field
        "last_name": admin_update_obj.last_name,   # Updated field
        "email": admin_update_obj.email,           # Updated field
        "institution": admin_update_obj.institution, # Updated field
        "full_name": f"{admin_update_obj.first_name} {admin_update_obj.last_name}",
    }
    mock_snapshot_after_update = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_update.exists = True
    mock_snapshot_after_update.to_dict.return_value = data_after_update
    mock_snapshot_after_update.id = ADMIN_UID
    
    # CRUDBase.update calls .get() after .update()
    mock_doc_ref_for_admin_uid.get = AsyncMock(return_value=mock_snapshot_after_update)

    # Patch datetime.now() in app.crud.crud_admin (assuming it's used by update)
    with patch("app.crud.crud_admin.datetime") as mock_datetime_module:
        mock_datetime_module.now.return_value = FIXED_DATETIME_LATER # Time of update

        # Act
        updated_admin_dict = await crud_admin_instance.update(
            db=mock_firestore_db, doc_id=ADMIN_UID, obj_in=admin_update_obj
        )

    # Assert
    assert updated_admin_dict is not None
    updated_admin = AdminInDB(**updated_admin_dict)

    # 1. Check what was passed to Firestore's .update() method
    mock_doc_ref_for_admin_uid.update.assert_called_once()
    args_to_update, _ = mock_doc_ref_for_admin_uid.update.call_args
    actual_update_payload = args_to_update[0]
    
    assert actual_update_payload["first_name"] == admin_update_obj.first_name
    assert actual_update_payload["last_name"] == admin_update_obj.last_name
    assert actual_update_payload["email"] == admin_update_obj.email
    assert actual_update_payload["institution"] == admin_update_obj.institution
    assert actual_update_payload["full_name"] == f"{admin_update_obj.first_name} {admin_update_obj.last_name}"
    assert actual_update_payload["updated_at"] == FIXED_DATETIME_LATER # This must be set by CRUDAdmin.update

    # 2. Check the returned AdminInDB object
    assert updated_admin.first_name == admin_update_obj.first_name
    assert updated_admin.updated_at == FIXED_DATETIME_LATER

@pytest.mark.asyncio
async def test_update_admin_non_existent(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    admin_update_obj: AdminUpdate,
    mock_doc_snapshot_non_existent: MagicMock # Configured for "non-existent-admin-uid"
):
    # Arrange
    # mock_firestore_db.collection().document("non-existent-admin-uid").get is already mocked by the fixture
    
    # Act
    # No need to patch datetime if .get() returns non-existent, as .update won't be called.
    updated_admin_dict = await crud_admin_instance.update(
        db=mock_firestore_db, doc_id="non-existent-admin-uid", obj_in=admin_update_obj
    )
    
    # Assert
    assert updated_admin_dict is None
    mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS).document("non-existent-admin-uid").update.assert_not_called()


@pytest.mark.asyncio
async def test_get_admin_by_id_found(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    mock_doc_snapshot: MagicMock # Already configured for ADMIN_UID and returns data
):
    # Act
    admin_dict = await crud_admin_instance.get(db=mock_firestore_db, doc_id=ADMIN_UID)
    
    # Assert
    assert admin_dict is not None
    admin = AdminInDB(**admin_dict)
    assert admin.uid == ADMIN_UID
    assert admin.id == ADMIN_UID # Ensure .id is also checked if relevant for your model

@pytest.mark.asyncio
async def test_get_admin_by_id_not_found(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    mock_doc_snapshot_non_existent: MagicMock # Configured for "non-existent-admin-uid"
):
    # Act
    admin = await crud_admin_instance.get(db=mock_firestore_db, doc_id="non-existent-admin-uid")
    
    # Assert
    assert admin is None

@pytest.mark.asyncio
async def test_get_multi_admins(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    mock_doc_snapshot: MagicMock # Snapshot for the first admin
):
    # Arrange
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS)
    
    # Create a second admin snapshot
    other_admin_data = {
        **ADMIN_IN_DB_DICT_BASE,
        "id": "other-admin-uid", "uid": "other-admin-uid", "email": "other@example.com",
        "created_at": FIXED_DATETIME_NOW, "updated_at": FIXED_DATETIME_NOW,
    }
    mock_doc_snapshot_other = MagicMock(spec=DocumentSnapshot)
    mock_doc_snapshot_other.exists = True
    mock_doc_snapshot_other.to_dict.return_value = other_admin_data
    mock_doc_snapshot_other.id = other_admin_data["id"]
    
    async def stream_multi_results(*args, **kwargs):
        yield mock_doc_snapshot
        yield mock_doc_snapshot_other
    
    mock_collection_ref.limit = MagicMock(return_value=MagicMock(stream=stream_multi_results))

    # Act
    admins_list = await crud_admin_instance.get_multi(db=mock_firestore_db, limit=10)
    
    # Assert
    assert len(admins_list) == 2
    assert admins_list[0].uid == ADMIN_UID
    assert admins_list[1].uid == "other-admin-uid"

@pytest.mark.asyncio
async def test_get_multi_admins_empty(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient
):
    # Arrange
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS)
    async def stream_empty_results(*args, **kwargs):
        if False: yield
    mock_collection_ref.limit = MagicMock(return_value=MagicMock(stream=stream_empty_results))
    
    # Act
    admins = await crud_admin_instance.get_multi(db=mock_firestore_db, limit=5)
    
    # Assert
    assert len(admins) == 0

@pytest.mark.asyncio
async def test_remove_admin_success( # Renamed for clarity
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient
):
    # Arrange
    mock_doc_ref_to_delete = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS).document(ADMIN_UID)
    # .delete is already an AsyncMock from the main fixture
    
    # Act
    delete_result = await crud_admin_instance.remove(db=mock_firestore_db, doc_id=ADMIN_UID)
    
    # Assert
    assert delete_result is True
    mock_doc_ref_to_delete.delete.assert_called_once()

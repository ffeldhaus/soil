import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud.firestore_v1.document import DocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.async_collection import AsyncCollectionReference

from app.crud.crud_admin import CRUDAdmin
from app.schemas.admin import AdminCreate, AdminUpdate, AdminInDB
from app.schemas.user import UserType # Added for UserType.ADMIN assertion
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
    # full_name is derived by CRUDAdmin.create_with_uid from first_name and last_name.
    # It should not be passed directly here if AdminCreate schema doesn't include it,
    # or it will be overwritten. Assuming AdminCreate does not have full_name.
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
    "full_name": "Test Admin", # Corrected: This should be the derived name
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
    # Arrange
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS)
    mock_doc_ref_for_admin_uid = mock_collection_ref.document(ADMIN_UID)

    # Patch 'get_password_hash' and 'datetime' in 'app.crud.crud_admin'
    # This assumes 'from datetime import datetime, timezone' exists in app.crud.crud_admin
    with patch("app.crud.crud_admin.get_password_hash", return_value="hashed_password_example_from_get_password_hash") as mock_hash, \
         patch("app.crud.crud_admin.datetime") as mock_datetime_module:
        mock_datetime_module.now.return_value = FIXED_DATETIME_NOW # Used for created_at and updated_at
        # mock_datetime_module.utcnow.return_value = FIXED_DATETIME_NOW # If utcnow is used by crud

        # Act
        # The create_with_uid method will call .set() and then .get() on the doc_ref.
        # The mock_doc_snapshot fixture is configured to be returned by .get() on ADMIN_UID.
        # Its .to_dict() method will provide the data for created_admin_dict.
        # The ADMIN_IN_DB_DICT_BASE (used by mock_doc_snapshot) has full_name="Test Admin"
        # and timestamps are set by the fixture to FIXED_DATETIME_NOW.
        created_admin_dict = await crud_admin_instance.create_with_uid(
            db=mock_firestore_db, uid=ADMIN_UID, obj_in=admin_create_obj
        )

    # Assert
    assert created_admin_dict is not None, "create_with_uid should return a dictionary."

    # Ensure the dictionary from Firestore can be parsed into AdminInDB model
    # This also validates that the structure matches AdminInDB, including timestamps.
    created_admin = AdminInDB(**created_admin_dict)

    # 1. Check what was passed to Firestore's .set() method on the specific mock_doc_ref
    mock_doc_ref_for_admin_uid.set.assert_called_once()
    args_to_set, _ = mock_doc_ref_for_admin_uid.set.call_args
    actual_set_data = args_to_set[0]

    assert actual_set_data["uid"] == ADMIN_UID
    assert actual_set_data["email"] == admin_create_obj.email
    assert actual_set_data["hashed_password"] == "hashed_password_example_from_get_password_hash"
    # full_name should be constructed from first_name and last_name by CRUDAdmin.create_with_uid
    expected_full_name = f"{admin_create_obj.first_name} {admin_create_obj.last_name}"
    assert actual_set_data["full_name"] == expected_full_name
    assert actual_set_data["created_at"] == FIXED_DATETIME_NOW
    assert actual_set_data["updated_at"] == FIXED_DATETIME_NOW
    # is_superuser is set to True by default in CRUDAdmin.create_with_uid
    assert actual_set_data["is_superuser"] is True
    # is_active is set to True by default in CRUDAdmin.create_with_uid (from UserBase via AdminCreate)
    assert actual_set_data["is_active"] is True
    # user_type is set to "admin" by default in CRUDAdmin.create_with_uid (from AdminBase via AdminCreate)
    assert actual_set_data["user_type"] == "admin"

    # 2. Check the returned AdminInDB object (which comes from the snapshot mock)
    # The mock_doc_snapshot returns ADMIN_IN_DB_DICT_BASE data.
    # We need to ensure its full_name also matches the expected constructed full_name for this test.
    # Or, more accurately, the snapshot should reflect what *would have been written* to the DB.
    # The created_admin_dict comes from doc_ref.get() after set. So it *should* match actual_set_data.
    assert created_admin.uid == ADMIN_UID
    assert created_admin.id == ADMIN_UID
    assert created_admin.email == admin_create_obj.email
    assert created_admin.hashed_password == "hashed_password_example_from_get_password_hash"
    # Ensure the full_name in the returned object is also the constructed one.
    # This depends on mock_doc_snapshot returning a dict that aligns with actual_set_data.
    # For this test, let's assume mock_doc_snapshot's to_dict() is updated or
    # we focus on what create_with_uid returns, which is created_admin_dict.
    assert created_admin.full_name == expected_full_name # Check against constructed name
    assert created_admin.created_at == FIXED_DATETIME_NOW
    assert created_admin.updated_at == FIXED_DATETIME_NOW
    assert created_admin.is_superuser is True
    assert created_admin.is_active is True
    assert created_admin.user_type == UserType.ADMIN # Check enum value

@pytest.mark.asyncio
async def test_get_admin_by_email_found(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    mock_doc_snapshot: MagicMock # This snapshot is configured with ADMIN_EMAIL
):
    # Arrange
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS)
    # Setup for .where().limit().stream()
    # This complex mocking is to ensure the chained calls .where().limit().stream() work as expected.
    mock_query_obj = AsyncMock() # This will be returned by .where()
    mock_limit_query_obj = AsyncMock() # This will be returned by .limit()

    async def stream_results_generator(*args, **kwargs): # The async generator for .stream()
        yield mock_doc_snapshot

    mock_limit_query_obj.stream = stream_results_generator # .stream() method returns the generator
    mock_query_obj.limit = MagicMock(return_value=mock_limit_query_obj) # .limit() method returns mock_limit_query_obj
    mock_collection_ref.where = MagicMock(return_value=mock_query_obj) # .where() method returns mock_query_obj

    # Act
    admin = await crud_admin_instance.get_by_email(db=mock_firestore_db, email=ADMIN_EMAIL)

    # Assert
    assert admin is not None
    # mock_doc_snapshot data is based on ADMIN_IN_DB_DICT_BASE and fixture timestamps
    assert admin.uid == ADMIN_UID
    assert admin.id == ADMIN_UID # From ADMIN_IN_DB_DICT_BASE
    assert admin.email == ADMIN_EMAIL
    assert admin.full_name == ADMIN_IN_DB_DICT_BASE["full_name"]
    assert admin.first_name == ADMIN_IN_DB_DICT_BASE["first_name"]
    assert admin.last_name == ADMIN_IN_DB_DICT_BASE["last_name"]
    assert admin.institution == ADMIN_IN_DB_DICT_BASE["institution"]
    assert admin.is_superuser == ADMIN_IN_DB_DICT_BASE["is_superuser"]
    assert admin.is_active == ADMIN_IN_DB_DICT_BASE["is_active"]
    assert admin.user_type == UserType.ADMIN # Parsed as enum
    assert admin.created_at == FIXED_DATETIME_NOW # From mock_doc_snapshot fixture
    assert admin.updated_at == FIXED_DATETIME_NOW # From mock_doc_snapshot fixture

    mock_collection_ref.where.assert_called_once_with("email", "==", ADMIN_EMAIL)
    mock_query_obj.limit.assert_called_once_with(1)

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
    mock_doc_snapshot: MagicMock # Represents state *before* update for the first .get()
):
    # Arrange
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS)
    mock_doc_ref_for_admin_uid = mock_collection_ref.document(ADMIN_UID)

    # Data for snapshot returned *after* update.
    # This should reflect the changes made by admin_update_obj.
    # Original created_at, user_type, and hashed_password should remain.
    original_doc_data_before_update = mock_doc_snapshot.to_dict() # Data from ADMIN_IN_DB_DICT_BASE + timestamps
    expected_full_name_after_update = f"{admin_update_obj.first_name} {admin_update_obj.last_name}"

    data_after_update_dict = {
        **original_doc_data_before_update, # Start with existing data
        "first_name": admin_update_obj.first_name,
        "last_name": admin_update_obj.last_name,
        "full_name": expected_full_name_after_update,
        "email": admin_update_obj.email,
        "institution": admin_update_obj.institution,
        "updated_at": FIXED_DATETIME_LATER, # This will be set by the update method in CRUDAdmin
        # Fields that should NOT change:
        "created_at": original_doc_data_before_update["created_at"],
        "hashed_password": original_doc_data_before_update["hashed_password"],
        "user_type": original_doc_data_before_update["user_type"],
        "is_superuser": original_doc_data_before_update["is_superuser"],
        # is_active can be changed by AdminUpdate, so if it's in admin_update_obj, it should be here
        "is_active": admin_update_obj.is_active if admin_update_obj.is_active is not None else original_doc_data_before_update["is_active"],
    }

    mock_snapshot_after_update = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_update.exists = True
    mock_snapshot_after_update.to_dict.return_value = data_after_update_dict
    mock_snapshot_after_update.id = ADMIN_UID
    
    # CRUDBase.update calls doc_ref.update() then doc_ref.get().
    # The mock_doc_snapshot fixture (passed to this test) represents the state *before* this update.
    # It's used by CRUDBase if it internally calls .get() before .update() (which it doesn't explicitly).
    # More importantly, the .get() *after* the .update() call needs to return the new state.
    mock_doc_ref_for_admin_uid.get = AsyncMock(return_value=mock_snapshot_after_update)


    # Patch datetime.now() in app.crud.crud_admin.py as it's used by CRUDAdmin.update
    with patch("app.crud.crud_admin.datetime") as mock_datetime_crud_admin_module:
        # Mock datetime.now(timezone.utc) specifically if that's what's used.
        # If it's just datetime.now(), this is fine.
        mock_datetime_crud_admin_module.now.return_value = FIXED_DATETIME_LATER # Time of update

        # Act
        updated_admin_dict = await crud_admin_instance.update(
            db=mock_firestore_db, doc_id=ADMIN_UID, obj_in=admin_update_obj
        )

    # Assert
    assert updated_admin_dict is not None, "Update should return the updated admin dictionary."
    updated_admin = AdminInDB(**updated_admin_dict)

    # 1. Check what was passed to Firestore's .update() method
    mock_doc_ref_for_admin_uid.update.assert_called_once()
    args_to_update, _ = mock_doc_ref_for_admin_uid.update.call_args
    actual_update_payload = args_to_update[0]
    
    assert "password" not in actual_update_payload, "Plain password should not be in Firestore update payload."
    assert "hashed_password" not in actual_update_payload, "Hashed password should not be sent directly in this payload."
    assert actual_update_payload["first_name"] == admin_update_obj.first_name
    assert actual_update_payload["last_name"] == admin_update_obj.last_name
    assert actual_update_payload["email"] == admin_update_obj.email
    assert actual_update_payload["institution"] == admin_update_obj.institution
    assert actual_update_payload["full_name"] == expected_full_name_after_update
    assert actual_update_payload["updated_at"] == FIXED_DATETIME_LATER # This must be set by CRUDAdmin.update
    if admin_update_obj.is_active is not None:
        assert actual_update_payload["is_active"] == admin_update_obj.is_active

    # 2. Check the returned AdminInDB object (comes from the .get() call after update)
    assert updated_admin.first_name == admin_update_obj.first_name
    assert updated_admin.full_name == expected_full_name_after_update
    assert updated_admin.email == admin_update_obj.email
    assert updated_admin.institution == admin_update_obj.institution
    if admin_update_obj.is_active is not None:
        assert updated_admin.is_active == admin_update_obj.is_active
    else:
        assert updated_admin.is_active == original_doc_data_before_update["is_active"]

    assert updated_admin.updated_at == FIXED_DATETIME_LATER
    assert updated_admin.created_at == original_doc_data_before_update["created_at"], "created_at should not change."
    assert updated_admin.user_type.value == original_doc_data_before_update["user_type"], "user_type should not change by default."
    assert updated_admin.hashed_password == original_doc_data_before_update["hashed_password"], "hashed_password should not change."
    assert updated_admin.is_superuser == original_doc_data_before_update["is_superuser"], "is_superuser should not change."

@pytest.mark.asyncio
async def test_update_admin_ignores_password(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    mock_doc_snapshot: MagicMock # Represents current state in DB (before this specific test's update)
):
    # Arrange
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS)
    mock_doc_ref_for_admin_uid = mock_collection_ref.document(ADMIN_UID)

    original_doc_data = mock_doc_snapshot.to_dict()
    original_hashed_password = original_doc_data["hashed_password"]
    original_created_at = original_doc_data["created_at"]
    original_user_type_str = original_doc_data["user_type"] # e.g., "admin"
    original_is_superuser = original_doc_data["is_superuser"]
    original_is_active = original_doc_data["is_active"]


    update_payload_with_password = AdminUpdate(
        first_name="PasswordTestFirstName", # Changed field
        # last_name, email, institution will be None, so they shouldn't be in payload unless model_dump(exclude_none=False)
        # CRUDAdmin.update uses obj_in.model_dump(exclude_unset=True, exclude_none=True)
        # So only first_name and password (which is then deleted) will be in update_data from AdminUpdate.
        password="newfakepassword123" # This should be ignored by CRUDAdmin.update logic
    )

    # Data for snapshot returned *after* this specific update attempt.
    # Only first_name and updated_at should change. Password-related fields remain untouched.
    data_after_update_attempt_dict = {
        **original_doc_data, # Start with existing data
        "first_name": update_payload_with_password.first_name,
        # full_name should also update if first_name changes and last_name is present
        "full_name": f"{update_payload_with_password.first_name} {original_doc_data['last_name']}",
        "updated_at": FIXED_DATETIME_LATER, # This will be set by CRUDAdmin.update
        # Fields that should NOT change:
        "hashed_password": original_hashed_password,
        "created_at": original_created_at,
        "user_type": original_user_type_str,
        "email": original_doc_data["email"], # Unchanged as not in update_payload_with_password
        "last_name": original_doc_data["last_name"], # Unchanged
        "institution": original_doc_data["institution"], # Unchanged
        "is_superuser": original_is_superuser, # Unchanged
        "is_active": original_is_active, # Unchanged
    }
    mock_snapshot_after_update_attempt = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_update_attempt.exists = True
    mock_snapshot_after_update_attempt.to_dict.return_value = data_after_update_attempt_dict
    mock_snapshot_after_update_attempt.id = ADMIN_UID

    # Configure .get() on the specific doc ref to return the state *after* the update call
    mock_doc_ref_for_admin_uid.get = AsyncMock(return_value=mock_snapshot_after_update_attempt)

    with patch("app.crud.crud_admin.datetime") as mock_datetime_module:
        mock_datetime_module.now.return_value = FIXED_DATETIME_LATER # Time of update

        # Act
        updated_admin_dict = await crud_admin_instance.update(
            db=mock_firestore_db, doc_id=ADMIN_UID, obj_in=update_payload_with_password
        )

    # Assert
    assert updated_admin_dict is not None, "Update should return a dictionary even if only timestamps change."
    updated_admin = AdminInDB(**updated_admin_dict)

    # 1. Check what was passed to Firestore's .update() method
    mock_doc_ref_for_admin_uid.update.assert_called_once()
    args_to_update, _ = mock_doc_ref_for_admin_uid.update.call_args
    actual_update_payload = args_to_update[0]

    assert "password" not in actual_update_payload, "Plain password should NOT be in Firestore update payload."
    assert "hashed_password" not in actual_update_payload, "Hashed password should NOT be in this update payload."
    assert actual_update_payload["first_name"] == update_payload_with_password.first_name
    assert "last_name" not in actual_update_payload # Was not in AdminUpdate with exclude_none=True
    assert "email" not in actual_update_payload # Was not in AdminUpdate
    assert actual_update_payload["full_name"] == f"{update_payload_with_password.first_name} {original_doc_data['last_name']}"
    assert actual_update_payload["updated_at"] == FIXED_DATETIME_LATER

    # 2. Check the returned AdminInDB object
    assert updated_admin.first_name == update_payload_with_password.first_name
    assert updated_admin.full_name == f"{update_payload_with_password.first_name} {original_doc_data['last_name']}"
    assert updated_admin.email == original_doc_data["email"] # Unchanged
    assert updated_admin.hashed_password == original_hashed_password, "Hashed password must remain unchanged."
    assert updated_admin.updated_at == FIXED_DATETIME_LATER
    assert updated_admin.created_at == original_created_at, "created_at must remain unchanged."
    assert updated_admin.user_type.value == original_user_type_str, "user_type must remain unchanged."
    assert updated_admin.is_superuser == original_is_superuser
    assert updated_admin.is_active == original_is_active

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
    admin = AdminInDB(**admin_dict) # Uses data from mock_doc_snapshot.to_dict()

    # mock_doc_snapshot data is based on ADMIN_IN_DB_DICT_BASE and fixture timestamps
    assert admin.uid == ADMIN_UID
    assert admin.id == ADMIN_UID
    assert admin.email == ADMIN_IN_DB_DICT_BASE["email"]
    assert admin.full_name == ADMIN_IN_DB_DICT_BASE["full_name"]
    assert admin.first_name == ADMIN_IN_DB_DICT_BASE["first_name"]
    assert admin.last_name == ADMIN_IN_DB_DICT_BASE["last_name"]
    assert admin.institution == ADMIN_IN_DB_DICT_BASE["institution"]
    assert admin.is_superuser == ADMIN_IN_DB_DICT_BASE["is_superuser"]
    assert admin.is_active == ADMIN_IN_DB_DICT_BASE["is_active"]
    assert admin.user_type == UserType.ADMIN # Parsed as enum
    assert admin.created_at == FIXED_DATETIME_NOW # From mock_doc_snapshot fixture
    assert admin.updated_at == FIXED_DATETIME_NOW # From mock_doc_snapshot fixture

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
    mock_doc_snapshot: MagicMock # Snapshot for the first admin (ADMIN_UID, from ADMIN_IN_DB_DICT_BASE)
):
    # Arrange
    mock_collection_ref = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS)
    
    # Data for a second admin
    other_admin_id = "other-admin-uid"
    other_admin_email = "other.admin@example.com"
    other_admin_data_dict = {
        **ADMIN_IN_DB_DICT_BASE, # Start with base and override
        "uid": other_admin_id,
        "id": other_admin_id,
        "email": other_admin_email,
        "first_name": "OtherFirst",
        "last_name": "OtherLast",
        "full_name": "OtherFirst OtherLast",
        "institution": "Other University",
        # Timestamps can be different or same, using same for simplicity here
        "created_at": FIXED_DATETIME_NOW,
        "updated_at": FIXED_DATETIME_NOW,
        "user_type": UserType.ADMIN.value, # Stored as string
    }
    mock_doc_snapshot_other = MagicMock(spec=DocumentSnapshot)
    mock_doc_snapshot_other.exists = True
    mock_doc_snapshot_other.to_dict.return_value = other_admin_data_dict
    mock_doc_snapshot_other.id = other_admin_id
    
    # --- Test 1: Get multiple admins with default limit (expect both) ---
    async def stream_two_results(*args, **kwargs):
        yield mock_doc_snapshot # Represents ADMIN_UID data
        yield mock_doc_snapshot_other
    
    # Configure the mock for collection_ref.limit().stream() chain
    # CRUDBase.get_multi calls collection.limit(limit + skip).stream()
    # Default limit is 100, skip is 0. limit(100 + 0) = limit(100)
    mock_stream_obj_two_results = AsyncMock() # Object returned by .limit()
    mock_stream_obj_two_results.stream = stream_two_results # .stream() is the async generator
    mock_collection_ref.limit = MagicMock(return_value=mock_stream_obj_two_results)

    admins_list_two = await crud_admin_instance.get_multi(db=mock_firestore_db, limit=10) # Default skip=0

    assert len(admins_list_two) == 2
    mock_collection_ref.limit.assert_called_with(10 + 0) # limit + skip

    admin1 = admins_list_two[0]
    assert admin1.uid == ADMIN_UID
    assert admin1.email == ADMIN_IN_DB_DICT_BASE["email"]
    assert admin1.user_type == UserType.ADMIN
    assert admin1.created_at == FIXED_DATETIME_NOW
    assert admin1.updated_at == FIXED_DATETIME_NOW
    assert admin1.full_name == ADMIN_IN_DB_DICT_BASE["full_name"]

    admin2 = admins_list_two[1]
    assert admin2.uid == other_admin_id
    assert admin2.email == other_admin_email
    assert admin2.user_type == UserType.ADMIN
    assert admin2.created_at == FIXED_DATETIME_NOW
    assert admin2.updated_at == FIXED_DATETIME_NOW
    assert admin2.full_name == other_admin_data_dict["full_name"]

    # --- Test 2: Get multiple admins with limit=1 (expect only first one) ---
    async def stream_first_result_only(*args, **kwargs):
        yield mock_doc_snapshot

    mock_stream_obj_limit_1 = AsyncMock()
    mock_stream_obj_limit_1.stream = stream_first_result_only
    mock_collection_ref.limit = MagicMock(return_value=mock_stream_obj_limit_1)

    admins_list_limit_1 = await crud_admin_instance.get_multi(db=mock_firestore_db, limit=1, skip=0)
    
    assert len(admins_list_limit_1) == 1
    assert admins_list_limit_1[0].uid == ADMIN_UID
    mock_collection_ref.limit.assert_called_with(1 + 0) # limit=1, skip=0

    # --- Test 3: Get multiple admins with skip=1, limit=1 (expect only second one) ---
    # CRUDBase.get_multi fetches (limit + skip) items then skips in Python.
    # So, the stream should be configured to return both if available.
    async def stream_both_for_skip_test(*args, **kwargs):
        yield mock_doc_snapshot
        yield mock_doc_snapshot_other

    mock_stream_obj_skip_1 = AsyncMock()
    mock_stream_obj_skip_1.stream = stream_both_for_skip_test
    mock_collection_ref.limit = MagicMock(return_value=mock_stream_obj_skip_1)

    admins_list_skip_1 = await crud_admin_instance.get_multi(db=mock_firestore_db, limit=1, skip=1)

    assert len(admins_list_skip_1) == 1
    assert admins_list_skip_1[0].uid == other_admin_id # The second admin
    mock_collection_ref.limit.assert_called_with(1 + 1) # limit=1, skip=1 -> limit(2) called on Firestore

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
    # mock_doc_ref_to_delete is implicitly created by .document(ADMIN_UID)
    mock_doc_ref_admin_uid = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS).document(ADMIN_UID)
    # .delete is an AsyncMock from the main mock_firestore_db fixture setup for document references
    # (as part of mock_doc_ref = AsyncMock(spec=DocumentReference))
    
    # Act
    delete_result = await crud_admin_instance.remove(db=mock_firestore_db, doc_id=ADMIN_UID)
    
    # Assert
    assert delete_result is True # CRUDBase.remove returns True after calling delete
    mock_doc_ref_admin_uid.delete.assert_called_once() # Verify delete was called on the correct document

@pytest.mark.asyncio
async def test_remove_admin_non_existent(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient
):
    # Arrange
    non_existent_admin_id = "non-existent-admin-to-delete"
    mock_doc_ref_non_existent = mock_firestore_db.collection(settings.FIRESTORE_COLLECTION_ADMINS).document(non_existent_admin_id)
    # .delete is an AsyncMock from the main mock_firestore_db fixture setup

    # Act
    delete_result = await crud_admin_instance.remove(db=mock_firestore_db, doc_id=non_existent_admin_id)

    # Assert
    # Firestore's delete() method does not raise an error if the document doesn't exist.
    # CRUDBase.remove reflects this by returning True.
    assert delete_result is True
    mock_doc_ref_non_existent.delete.assert_called_once() # Ensure delete was called on the correct (non-existent) doc_ref

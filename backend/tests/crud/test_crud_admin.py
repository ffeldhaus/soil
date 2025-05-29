import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud.firestore_v1.document import DocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.async_collection import AsyncCollectionReference 

from app.crud.crud_admin import CRUDAdmin 
from app.schemas.admin import AdminCreate, AdminUpdate, AdminInDB
from app.core.config import settings

# --- Test Data ---
ADMIN_UID = "test-admin-uid"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "securepassword123"

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

ADMIN_IN_DB_DICT_FIRESTORE = {
    "uid": ADMIN_UID, 
    "id": ADMIN_UID, 
    "email": ADMIN_EMAIL,
    "hashed_password": "hashed_password_example",
    "full_name": "Test Admin User",
    "first_name": "Test",
    "last_name": "Admin",
    "institution": "Test University",
    "is_superuser": True,
    "is_active": True,
    "user_type": "admin", 
    "created_at": "2023-01-01T12:00:00Z",
    "updated_at": "2023-01-01T12:00:00Z"
}

# --- Pytest Fixtures ---

@pytest.fixture
def mock_firestore_db() -> AsyncFirestoreClient:
    mock_db = AsyncMock(spec=AsyncFirestoreClient)
    mock_collection_ref = AsyncMock(spec=AsyncCollectionReference)
    mock_db.collection = MagicMock(return_value=mock_collection_ref)
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
def firestore_doc_data() -> dict: 
    return ADMIN_IN_DB_DICT_FIRESTORE.copy()

@pytest.fixture
def mock_doc_ref() -> DocumentReference:
    return AsyncMock(spec=DocumentReference)

@pytest.fixture
def mock_doc_snapshot(firestore_doc_data: dict) -> DocumentSnapshot:
    snapshot = MagicMock(spec=DocumentSnapshot)
    snapshot.exists = True
    snapshot.to_dict.return_value = firestore_doc_data
    snapshot.id = firestore_doc_data["id"] 
    return snapshot

@pytest.fixture
def mock_doc_snapshot_non_existent() -> DocumentSnapshot:
    snapshot = MagicMock(spec=DocumentSnapshot)
    snapshot.exists = False
    snapshot.to_dict.return_value = None
    snapshot.id = "non-existent-admin-uid"
    return snapshot

# --- Test Cases ---

@pytest.mark.asyncio
async def test_create_admin_with_uid(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    admin_create_obj: AdminCreate,
    firestore_doc_data: dict 
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_doc_ref_new = AsyncMock(spec=DocumentReference)
    mock_collection_ref.document.return_value = mock_doc_ref_new
    mock_doc_ref_new.set = AsyncMock()

    # This data is what snapshot.to_dict() should return for the created document
    data_returned_by_snapshot = firestore_doc_data.copy()
    data_returned_by_snapshot.update({
        "email": admin_create_obj.email, "first_name": admin_create_obj.first_name,
        "last_name": admin_create_obj.last_name, "institution": admin_create_obj.institution,
        "full_name": f"{admin_create_obj.first_name} {admin_create_obj.last_name}",
        "hashed_password": "hashed_password_example", # This must match the patched return value
        "is_superuser": True, "is_active": True, "user_type": "admin",
        "uid": ADMIN_UID, "id": ADMIN_UID 
        # created_at/updated_at are from firestore_doc_data
    })

    mock_doc_snapshot_after_set = MagicMock(spec=DocumentSnapshot)
    mock_doc_snapshot_after_set.exists = True
    mock_doc_snapshot_after_set.to_dict.return_value = data_returned_by_snapshot
    mock_doc_snapshot_after_set.id = ADMIN_UID
    mock_doc_ref_new.get = AsyncMock(return_value=mock_doc_snapshot_after_set)

    # Patch target is 'app.crud.crud_admin.get_password_hash' because that's where it's imported and used.
    with patch("app.crud.crud_admin.get_password_hash", return_value="hashed_password_example"):
        created_admin_dict = await crud_admin_instance.create_with_uid(
            db=mock_firestore_db, uid=ADMIN_UID, obj_in=admin_create_obj
        )
    
    created_admin = AdminInDB(**created_admin_dict)

    args_to_set, _ = mock_doc_ref_new.set.call_args
    actual_set_data = args_to_set[0]
    
    assert actual_set_data["hashed_password"] == "hashed_password_example"
    assert "created_at" in actual_set_data 
    assert "updated_at" in actual_set_data
    assert created_admin.uid == ADMIN_UID
    assert created_admin.hashed_password == "hashed_password_example"
    assert created_admin.full_name == f"{admin_create_obj.first_name} {admin_create_obj.last_name}"

@pytest.mark.asyncio
async def test_get_admin_by_email_found(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    mock_doc_snapshot: DocumentSnapshot, 
    firestore_doc_data: dict 
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_query_obj = AsyncMock() 
    mock_limit_obj = AsyncMock() 
    mock_collection_ref.where.return_value = mock_query_obj
    # .limit() is a sync method on a query object, returning another query object
    mock_query_obj.limit = MagicMock(return_value=mock_limit_obj) 

    async def stream_results(*args, **kwargs): yield mock_doc_snapshot
    mock_limit_obj.stream = stream_results

    admin = await crud_admin_instance.get_by_email(db=mock_firestore_db, email=firestore_doc_data["email"])
    assert admin is not None
    assert admin.uid == firestore_doc_data["uid"]

@pytest.mark.asyncio
async def test_get_admin_by_email_not_found(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_query_obj = AsyncMock()
    mock_limit_obj = AsyncMock()
    mock_collection_ref.where.return_value = mock_query_obj
    mock_query_obj.limit = MagicMock(return_value=mock_limit_obj)

    async def stream_no_results(*args, **kwargs): 
        if False: yield
    mock_limit_obj.stream = stream_no_results
    
    admin = await crud_admin_instance.get_by_email(db=mock_firestore_db, email="nonexistent@example.com")
    assert admin is None

@pytest.mark.asyncio
async def test_update_admin(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    admin_update_obj: AdminUpdate,
    firestore_doc_data: dict 
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_doc_ref_to_update = AsyncMock(spec=DocumentReference)
    mock_collection_ref.document.return_value = mock_doc_ref_to_update
    mock_doc_ref_to_update.update = AsyncMock()

    data_after_update = firestore_doc_data.copy()
    # Apply updates from admin_update_obj
    if admin_update_obj.first_name: data_after_update["first_name"] = admin_update_obj.first_name
    if admin_update_obj.last_name: data_after_update["last_name"] = admin_update_obj.last_name
    if admin_update_obj.email: data_after_update["email"] = admin_update_obj.email
    if admin_update_obj.institution: data_after_update["institution"] = admin_update_obj.institution
    data_after_update["full_name"] = f"{data_after_update['first_name']} {data_after_update['last_name']}"
    data_after_update["updated_at"] = "2023-01-02T12:00:00Z" # Mock changed timestamp
    # Ensure id and uid are in the snapshot data for AdminInDB validation
    data_after_update["id"] = ADMIN_UID 
    data_after_update["uid"] = ADMIN_UID 
    
    mock_snapshot_after_update = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_after_update.exists = True
    mock_snapshot_after_update.to_dict.return_value = data_after_update
    mock_snapshot_after_update.id = ADMIN_UID
    mock_doc_ref_to_update.get = AsyncMock(return_value=mock_snapshot_after_update)

    updated_admin_dict = await crud_admin_instance.update(
        db=mock_firestore_db, doc_id=ADMIN_UID, obj_in=admin_update_obj
    )
    assert updated_admin_dict is not None
    updated_admin = AdminInDB(**updated_admin_dict)

    args_to_update, _ = mock_doc_ref_to_update.update.call_args
    actual_update_payload = args_to_update[0]
    
    # CRUDBase.update adds 'updated_at' to the payload sent to Firestore
    assert "updated_at" in actual_update_payload 
    assert actual_update_payload["first_name"] == admin_update_obj.first_name
    assert updated_admin.first_name == admin_update_obj.first_name
    assert updated_admin.updated_at != firestore_doc_data["updated_at"] # Verify it changed

@pytest.mark.asyncio
async def test_update_admin_non_existent(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    admin_update_obj: AdminUpdate,
    mock_doc_snapshot_non_existent: DocumentSnapshot
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_doc_ref_to_update = AsyncMock(spec=DocumentReference)
    mock_collection_ref.document.return_value = mock_doc_ref_to_update
    # CRUDBase.update calls get() after update(), get() will return non-existent snapshot
    mock_doc_ref_to_update.get = AsyncMock(return_value=mock_doc_snapshot_non_existent)
    updated_admin = await crud_admin_instance.update(
        db=mock_firestore_db, doc_id="non-existent-admin-uid", obj_in=admin_update_obj
    )
    assert updated_admin is None

@pytest.mark.asyncio
async def test_get_admin_by_id_found(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    mock_doc_snapshot: DocumentSnapshot, # This uses firestore_doc_data
    firestore_doc_data: dict
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_doc_ref_get = AsyncMock(spec=DocumentReference)
    mock_collection_ref.document.return_value = mock_doc_ref_get
    mock_doc_ref_get.get = AsyncMock(return_value=mock_doc_snapshot)
    admin = await crud_admin_instance.get(db=mock_firestore_db, doc_id=ADMIN_UID)
    assert admin is not None
    assert admin.uid == firestore_doc_data["uid"]

@pytest.mark.asyncio
async def test_get_admin_by_id_not_found(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    mock_doc_snapshot_non_existent: DocumentSnapshot
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_doc_ref_get = AsyncMock(spec=DocumentReference)
    mock_collection_ref.document.return_value = mock_doc_ref_get
    mock_doc_ref_get.get = AsyncMock(return_value=mock_doc_snapshot_non_existent)
    admin = await crud_admin_instance.get(db=mock_firestore_db, doc_id="non-existent-admin-uid")
    assert admin is None

@pytest.mark.asyncio
async def test_get_multi_admins(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient,
    mock_doc_snapshot: DocumentSnapshot, 
    firestore_doc_data: dict
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_query_limit = AsyncMock() 
    mock_collection_ref.limit.return_value = mock_query_limit # limit is sync, returns query obj
    
    other_admin_data = firestore_doc_data.copy()
    other_admin_data.update({"id": "other-admin-uid", "uid": "other-admin-uid", "email": "other@example.com"})
    mock_doc_snapshot_other = MagicMock(spec=DocumentSnapshot)
    mock_doc_snapshot_other.exists = True
    mock_doc_snapshot_other.to_dict.return_value = other_admin_data
    mock_doc_snapshot_other.id = other_admin_data["id"]
    
    async def stream_multi_results(*args, **kwargs):
        yield mock_doc_snapshot
        yield mock_doc_snapshot_other
    mock_query_limit.stream = stream_multi_results

    admins = await crud_admin_instance.get_multi(db=mock_firestore_db, limit=10)
    assert len(admins) == 2
    assert admins[0].uid == firestore_doc_data["uid"]
    assert admins[1].uid == other_admin_data["uid"]

@pytest.mark.asyncio
async def test_get_multi_admins_empty(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_query_limit = AsyncMock()
    mock_collection_ref.limit.return_value = mock_query_limit
    async def stream_empty_results(*args, **kwargs):
        if False: yield
    mock_query_limit.stream = stream_empty_results
    admins = await crud_admin_instance.get_multi(db=mock_firestore_db, limit=5)
    assert len(admins) == 0

@pytest.mark.asyncio
async def test_remove_admin(
    crud_admin_instance: CRUDAdmin,
    mock_firestore_db: AsyncFirestoreClient
):
    mock_collection_ref = mock_firestore_db.collection.return_value
    mock_doc_ref_to_delete = AsyncMock(spec=DocumentReference)
    mock_collection_ref.document.return_value = mock_doc_ref_to_delete
    mock_doc_ref_to_delete.delete = AsyncMock(return_value=None) 
    delete_result = await crud_admin_instance.remove(db=mock_firestore_db, doc_id=ADMIN_UID)
    assert delete_result is True

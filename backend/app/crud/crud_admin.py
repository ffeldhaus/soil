from typing import Any, Dict, Optional, Union

from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud.firestore_v1.base_client import BaseClient # For type hint of sync client if needed


from app.crud.base import CRUDBase
from app.schemas.admin import AdminCreate, AdminUpdate, AdminInDB
from app.core.security import get_password_hash # If you were to store hashed passwords yourself

# Collection name in Firestore for admins
ADMIN_COLLECTION = "admins"

class CRUDAdmin(CRUDBase[AdminInDB, AdminCreate, AdminUpdate]):
    """
    CRUD operations for Admin users stored in Firestore.
    """

    async def get_by_email(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, email: str
    ) -> Optional[AdminInDB]:
        """
        Get an admin by their email address.
        Firestore requires an index on 'email' for this query to be efficient.
        """
        # Note: Firestore queries are case-sensitive.
        # If you need case-insensitive email lookup, you should store a normalized version of the email.
        return await super().get_by_field(db, field_name="email", field_value=email)

    async def create_with_uid(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, uid: str, obj_in: AdminCreate
    ) -> Dict[str, Any]:
        """
        Create a new admin document in Firestore with a specific UID.
        The password from AdminCreate is for Firebase Auth and should not be stored directly.
        The obj_in here is AdminCreate, which includes password, but we exclude it.
        """
        # Start with all fields from AdminCreate model dump, exclude plain password by default
        admin_data_to_store = obj_in.model_dump(exclude={"password"})
        
        # Hash the password and add it to the data to be stored
        hashed_password = get_password_hash(obj_in.password)
        admin_data_to_store["hashed_password"] = hashed_password
        
        # Ensure user_type enum is stored as its value
        admin_data_to_store["user_type"] = obj_in.user_type.value
        
        # Set defaults for fields managed by UserInDBBase/AdminInDB if not already set by AdminCreate
        admin_data_to_store.setdefault("is_superuser", True) # Admins are superusers
        admin_data_to_store.setdefault("is_active", True)    # Active by default

        # Ensure full_name is consistent if first_name and last_name are primary
        # AdminCreate includes full_name from UserCreate, but also first_name, last_name.
        # If UserCreate's root_validator handles full_name, this might be redundant.
        # If not, or to be explicit:
        if obj_in.first_name and obj_in.last_name:
            admin_data_to_store["full_name"] = f"{obj_in.first_name} {obj_in.last_name}"
        
        # Remove fields that are part of AdminCreate but not directly stored or are handled otherwise
        # (e.g., if 'full_name' was only for validation in UserCreate and not direct storage if first/last are used)
        # For this example, assume all fields dumped (excluding 'password') are intended for storage
        # after the above transformations.

        return await super().create_with_uid(db, uid=uid, obj_in=admin_data_to_store)

    async def update(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, doc_id: str, obj_in: Union[AdminUpdate, Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Update an admin document in Firestore.
        If a new password is provided in AdminUpdate, it should be handled by updating
        Firebase Auth, not by storing a new hash directly here unless you have a specific reason.
        """
        update_data: Dict[str, Any]
        if isinstance(obj_in, AdminUpdate):
            update_data = obj_in.model_dump(exclude_unset=True, exclude_none=True)
            # If password is part of update_data, it implies Firebase Auth password update.
            # This CRUD method focuses on Firestore document update.
            # Password update logic should be in the endpoint, calling Firebase Auth.
            if "password" in update_data:
                del update_data["password"] # Do not store plain password or attempt to hash here
        else:
            update_data = dict(obj_in)
            if "password" in update_data: # Should not happen if using AdminUpdate schema
                del update_data["password"]


        return await super().update(db, doc_id=doc_id, obj_in=update_data)

    # You can add other admin-specific query methods here if needed
    # For example, to get all admins from a specific institution:
    # async def get_multi_by_institution(
    #     self, db: AsyncFirestoreClient, *, institution: str, skip: int = 0, limit: int = 100
    # ) -> List[AdminInDB]:
    #     query = db.collection(self.collection_name).where("institution", "==", institution).limit(limit + skip)
    #     # ... (rest of the get_multi logic for streaming and skipping)


# Instantiate the CRUDAdmin class with the collection name and Pydantic schema
crud_admin = CRUDAdmin(collection_name=ADMIN_COLLECTION, model_schema=AdminInDB)
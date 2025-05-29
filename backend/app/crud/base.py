from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from pydantic import BaseModel
from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
# from google.cloud.firestore_v1.base_query import AsyncବQuery # Removed problematic import
from google.cloud.firestore_v1.document import DocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.base_client import BaseClient # For type hint of sync client if needed

# Define TypeVars for Pydantic models
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)
ModelSchemaType = TypeVar("ModelSchemaType", bound=BaseModel) # For the schema representing the model in DB


class CRUDBase(Generic[ModelSchemaType, CreateSchemaType, UpdateSchemaType]):
    """
    Base class for CRUD operations on a Firestore collection.

    Attributes:
        collection_name (str): The name of the Firestore collection.
        model_schema (Type[ModelSchemaType]): The Pydantic schema for documents in this collection.
                                              Used for validating data retrieved from Firestore.
    """

    def __init__(self, collection_name: str, model_schema: Type[ModelSchemaType]):
        """
        Initialize the CRUDBase.

        Args:
            collection_name: The name of the Firestore collection.
            model_schema: The Pydantic schema for documents in this collection.
        """
        self.collection_name = collection_name
        self.model_schema = model_schema

    async def get(
        self, db: Union[AsyncFirestoreClient, BaseClient], doc_id: str
    ) -> Optional[ModelSchemaType]:
        """
        Get a single document by its ID.

        Args:
            db: Firestore client instance.
            doc_id: The ID of the document to retrieve.

        Returns:
            A Pydantic model instance of the document if found, otherwise None.
        """
        if not doc_id:
            return None
        doc_ref: DocumentReference = db.collection(self.collection_name).document(doc_id)
        snapshot: DocumentSnapshot = await doc_ref.get()
        if snapshot.exists:
            data = snapshot.to_dict()
            data["id"] = snapshot.id # Add document ID to the data
            # If your model_schema expects UID, ensure it's mapped correctly or present in data.
            # For UserInDBBase derived schemas, 'uid' is expected.
            # If Firestore stores it as 'uid', this is fine. If 'id' is the UID, adjust.
            if "uid" not in data and "id" in data and hasattr(self.model_schema, "uid"):
                 data["uid"] = data["id"] # Map 'id' to 'uid' if schema expects 'uid' as Firebase UID
            return self.model_schema(**data)
        return None

    async def get_by_field(
        self, db: Union[AsyncFirestoreClient, BaseClient], field_name: str, field_value: Any
    ) -> Optional[ModelSchemaType]:
        """
        Get a single document by a specific field's value.
        Note: Firestore queries on multiple fields might require composite indexes.

        Args:
            db: Firestore client instance.
            field_name: The name of the field to query by.
            field_value: The value of the field to match.

        Returns:
            A Pydantic model instance of the first matching document if found, otherwise None.
        """
        query = db.collection(self.collection_name).where(field=field_name, op_string="==", value=field_value).limit(1)
        
        async for snapshot in query.stream(): # Corrected: Iterate directly over async generator
            if snapshot.exists:
                data = snapshot.to_dict()
                data["id"] = snapshot.id
                if "uid" not in data and "id" in data and hasattr(self.model_schema, "uid"):
                    data["uid"] = data["id"]
                return self.model_schema(**data)
        return None


    async def get_multi(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, skip: int = 0, limit: int = 100
    ) -> List[ModelSchemaType]:
        """
        Get multiple documents with pagination.

        Args:
            db: Firestore client instance.
            skip: Number of documents to skip (Firestore uses cursors/start_after for true pagination).
                  This implementation is a simple offset which can be inefficient for large skips.
            limit: Maximum number of documents to return.

        Returns:
            A list of Pydantic model instances.
        """
        # Firestore's native pagination is cursor-based (start_after, end_before).
        # A simple offset (skip) can be inefficient for large datasets.
        # For robust pagination, you'd pass around document snapshots or specific field values.
        # This is a simplified version.
        query = db.collection(self.collection_name).limit(limit + skip) # Fetch more to simulate skip
        
        results = []
        count = 0
        async for snapshot in query.stream(): # Corrected: Iterate directly over async generator
            if count >= skip:
                data = snapshot.to_dict()
                data["id"] = snapshot.id
                if "uid" not in data and "id" in data and hasattr(self.model_schema, "uid"):
                    data["uid"] = data["id"]
                results.append(self.model_schema(**data))
            count += 1
            if len(results) >= limit:
                break
        return results

    async def create_with_uid(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, uid: str, obj_in: Union[CreateSchemaType, Dict[str, Any]]
    ) -> Dict[str, Any]: # Returns the raw dict from Firestore to include auto-timestamps
        """
        Create a new document with a specific UID (document ID).
        Useful when the UID comes from Firebase Auth.

        Args:
            db: Firestore client instance.
            uid: The UID to use as the document ID.
            obj_in: The Pydantic schema or dict containing data for the new document.

        Returns:
            The created document data as a dictionary, including its ID.
        """
        if isinstance(obj_in, BaseModel):
            obj_in_data = obj_in.model_dump(exclude_unset=True)
        else:
            obj_in_data = dict(obj_in)
            
        doc_ref: DocumentReference = db.collection(self.collection_name).document(uid)
        await doc_ref.set(obj_in_data) # Use set() to create or overwrite with a specific ID
        
        # Fetch the created document to include any server-side transformations (e.g., timestamps)
        snapshot = await doc_ref.get()
        if snapshot.exists:
            created_data = snapshot.to_dict()
            created_data["uid"] = snapshot.id # Ensure UID is part of the returned data
            created_data["id"] = snapshot.id # Also add 'id' for consistency if needed
            return created_data
        else:
            # This should ideally not happen if set() was successful
            raise Exception(f"Failed to retrieve document after creation with UID {uid}")


    async def create(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, obj_in: Union[CreateSchemaType, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create a new document with an auto-generated ID by Firestore.

        Args:
            db: Firestore client instance.
            obj_in: The Pydantic schema or dict containing data for the new document.

        Returns:
            The created document data as a dictionary, including its auto-generated ID.
        """
        if isinstance(obj_in, BaseModel):
            obj_in_data = obj_in.model_dump(exclude_unset=True)
        else:
            obj_in_data = dict(obj_in)

        # Add a document with an auto-generated ID
        update_time, doc_ref = await db.collection(self.collection_name).add(obj_in_data)
        
        snapshot = await doc_ref.get()
        if snapshot.exists:
            created_data = snapshot.to_dict()
            created_data["id"] = snapshot.id # Add the auto-generated ID
            if "uid" not in created_data and hasattr(self.model_schema, "uid"): # if model expects uid
                created_data["uid"] = snapshot.id
            return created_data
        else:
            raise Exception("Failed to retrieve document after creation with auto-ID")


    async def update(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, doc_id: str, obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Update an existing document by its ID.

        Args:
            db: Firestore client instance.
            doc_id: The ID of the document to update.
            obj_in: The Pydantic schema or dict containing data to update.
                      Fields not present will not be changed. To remove a field,
                      you might need to pass `firestore.DELETE_FIELD`.

        Returns:
            The updated document data as a dictionary, or None if the document doesn't exist.
        """
        doc_ref: DocumentReference = db.collection(self.collection_name).document(doc_id)
        
        if isinstance(obj_in, BaseModel):
            update_data = obj_in.model_dump(exclude_unset=True, exclude_none=True) # Don't send None values unless intended
        else:
            update_data = dict(obj_in)

        if not update_data: # Nothing to update
            snapshot = await doc_ref.get()
            if snapshot.exists:
                existing_data = snapshot.to_dict()
                existing_data["id"] = snapshot.id
                if "uid" not in existing_data and hasattr(self.model_schema, "uid"):
                     existing_data["uid"] = snapshot.id
                return existing_data
            return None

        await doc_ref.update(update_data)
        
        snapshot = await doc_ref.get() # Fetch the updated document
        if snapshot.exists:
            updated_data = snapshot.to_dict()
            updated_data["id"] = snapshot.id
            if "uid" not in updated_data and hasattr(self.model_schema, "uid"):
                 updated_data["uid"] = snapshot.id
            return updated_data
        return None # Should not happen if update was on existing doc, but good to handle

    async def remove(self, db: Union[AsyncFirestoreClient, BaseClient], *, doc_id: str) -> bool:
        """
        Remove a document by its ID.

        Args:
            db: Firestore client instance.
            doc_id: The ID of the document to remove.

        Returns:
            True if deletion was attempted (Firestore delete doesn't error if doc not found),
            False if doc_id was empty.
        """
        if not doc_id:
            return False
        doc_ref: DocumentReference = db.collection(self.collection_name).document(doc_id)
        await doc_ref.delete()
        return True # Firestore delete() doesn't raise an error if the document doesn't exist.
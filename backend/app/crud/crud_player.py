# File: backend/app/crud/crud_player.py
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timezone # Added
from app.schemas.user import UserType # Import UserType

from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud.firestore_v1.base_client import BaseClient # For type hint of sync client
from google.cloud.firestore_v1.async_query import AsyncQuery


from app.crud.base import CRUDBase
from app.schemas.player import PlayerCreate, PlayerUpdate, PlayerInDB
from app.core.security import get_password_hash # MODIFIED: Import password hashing utility

# Collection name in Firestore for players
PLAYER_COLLECTION = "players"

class CRUDPlayer(CRUDBase[PlayerInDB, PlayerCreate, PlayerUpdate]):
    """
    CRUD operations for Player users stored in Firestore.
    """

    async def get_by_email(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, email: str
    ) -> Optional[PlayerInDB]:
        """
        Get a player by their email address.
        Requires an index on 'email' in the 'players' collection.
        """
        return await super().get_by_field(db, field_name="email", field_value=email)

    async def create_with_uid(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, uid: str, obj_in: Union[PlayerCreate, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create a new player document in Firestore with a specific UID.
        The password from PlayerCreate is for Firebase Auth.
        A hash of this password (if it's a temp password) is stored in Firestore.
        """
        plain_password: Optional[str]
        player_data_for_firestore: Dict[str, Any]

        if isinstance(obj_in, PlayerCreate):
            player_data_for_firestore = obj_in.model_dump(exclude_unset=True)
            # Ensure plain password is not in the data to be stored, it's for hashing only.
            # PlayerCreate model should have the password field.
            plain_password = player_data_for_firestore.pop("password", obj_in.password) # Get it from model attr if not in dump
        else: # obj_in is a dict
            player_data_for_firestore = dict(obj_in)
            plain_password = player_data_for_firestore.pop("password", None)

        if plain_password:
            player_data_for_firestore["temp_password_hash"] = get_password_hash(plain_password)
        else:
            # Password is required by PlayerCreate, so if dict doesn't have it, it's an issue
            # or implies a scenario where temp_password_hash is not set.
            player_data_for_firestore.setdefault("temp_password_hash", None)

        player_data_for_firestore["uid"] = uid
        player_data_for_firestore["user_type"] = UserType.PLAYER.value # PlayerCreate has user_type, dict might not
        if isinstance(obj_in, PlayerCreate) and obj_in.user_type: # Respect user_type from Pydantic if provided
             player_data_for_firestore["user_type"] = obj_in.user_type.value


        player_data_for_firestore.setdefault("is_active", True)
        player_data_for_firestore.setdefault("is_superuser", False)

        current_time = datetime.now(timezone.utc)
        player_data_for_firestore["created_at"] = current_time
        player_data_for_firestore["updated_at"] = current_time
        
        return await super().create_with_uid(db, uid=uid, obj_in=player_data_for_firestore)

    async def update(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, doc_id: str, obj_in: Union[PlayerUpdate, Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Update a player document in Firestore.
        Password updates are handled via Firebase Auth, not directly here.
        If a temp_password_hash is updated to None (e.g., after first real login), it's handled here.
        """
        update_data: Dict[str, Any]
        if isinstance(obj_in, PlayerUpdate):
            update_data = obj_in.model_dump(exclude_unset=True, exclude_none=True)
            if "password" in update_data: # Password change is for Firebase Auth
                del update_data["password"]
        else:
            update_data = dict(obj_in)
            if "password" in update_data:
                del update_data["password"]
        
        update_data["updated_at"] = datetime.now(timezone.utc) # Add updated_at timestamp
        return await super().update(db, doc_id=doc_id, obj_in=update_data)

    async def get_players_by_game_id(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, game_id: str, limit: int = 100
    ) -> List[PlayerInDB]:
        """
        Get all players belonging to a specific game_id.
        Requires a composite index on ('game_id', <any other field for ordering if used>).
        Or a single field index on 'game_id' if no other ordering/filtering is applied here.
        """
        query: AsyncQuery = db.collection(self.collection_name).where(field="game_id", op_string="==", value=game_id).limit(limit)
        results = []
        async for snapshot in query.stream(): # type: ignore
            if snapshot.exists:
                data = snapshot.to_dict()
                data["id"] = snapshot.id
                if "uid" not in data and "id" in data and hasattr(self.model_schema, "uid"):
                    data["uid"] = data["id"]
                results.append(self.model_schema(**data))
        return results
    
    async def get_player_in_game_by_number(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, game_id: str, player_number: int
    ) -> Optional[PlayerInDB]:
        """
        Get a specific player in a game by their player_number.
        Requires a composite index on ('game_id', 'player_number').
        """
        query: AsyncQuery = (
            db.collection(self.collection_name)
            .where(field="game_id", op_string="==", value=game_id)
            .where(field="player_number", op_string="==", value=player_number)
            .limit(1)
        )
        # snapshots = await query.stream() # type: ignore # Incorrect usage
        # async for snapshot in snapshots:
        snapshot_result = None
        async for s in query.stream(): # Correctly iterate and expect one
            snapshot_result = s
            break # Since limit is 1, we only need the first one

        if snapshot_result and snapshot_result.exists:
            data = snapshot_result.to_dict()
            data["id"] = snapshot_result.id # Corrected indentation and variable name
            if "uid" not in data and "id" in data and hasattr(self.model_schema, "uid"):
                data["uid"] = data["id"]
            return self.model_schema(**data)
        return None

    async def clear_temp_password_hash(self, db: Union[AsyncFirestoreClient, BaseClient], *, player_uid: str) -> bool:
        """
        Clears the temp_password_hash for a player, typically after first successful login
        or when they set a permanent password.
        Returns the updated player data as a dictionary, or None if the update failed.
        """
        try:
            obj_to_update = {
                "temp_password_hash": None,
                "updated_at": datetime.now(timezone.utc) # Set updated_at timestamp
            }
            # Call super().update and return its result (which should be the updated player dict or None)
            updated_player_data = await super().update(db, doc_id=player_uid, obj_in=obj_to_update)
            return updated_player_data # Return the dict or None
        except Exception as e:
            # Log the exception (consider using logging module for production)
            print(f"Error clearing temp_password_hash for player {player_uid}: {e}")
            return None # Return None in case of an exception


# Instantiate the CRUDPlayer class
crud_player = CRUDPlayer(collection_name=PLAYER_COLLECTION, model_schema=PlayerInDB)
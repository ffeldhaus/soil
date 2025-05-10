from typing import Any, Dict, List, Optional, Union

from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud.firestore_v1.base_client import BaseClient # For type hint of sync client
from google.cloud.firestore_v1.base_query import AsyncବQuery


from app.crud.base import CRUDBase
from app.schemas.player import PlayerCreate, PlayerUpdate, PlayerInDB

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
        self, db: Union[AsyncFirestoreClient, BaseClient], *, uid: str, obj_in: PlayerCreate
    ) -> Dict[str, Any]:
        """
        Create a new player document in Firestore with a specific UID.
        The password from PlayerCreate is for Firebase Auth and is not stored here.
        """
        player_data = obj_in.model_dump(exclude_unset=True, exclude={"password"})
        player_data["user_type"] = obj_in.user_type.value # Store enum value
        
        # Ensure game_id is stored, it's mandatory in PlayerCreate
        # player_data["game_id"] = str(obj_in.game_id) # Already string from schema

        return await super().create_with_uid(db, uid=uid, obj_in=player_data)

    async def update(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, doc_id: str, obj_in: Union[PlayerUpdate, Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Update a player document in Firestore.
        Password updates are handled via Firebase Auth, not directly here.
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
        
        return await super().update(db, doc_id=doc_id, obj_in=update_data)

    async def get_players_by_game_id(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, game_id: str, limit: int = 100
    ) -> List[PlayerInDB]:
        """
        Get all players belonging to a specific game_id.
        Requires a composite index on ('game_id', <any other field for ordering if used>).
        Or a single field index on 'game_id' if no other ordering/filtering is applied here.
        """
        query: AsyncବQuery = db.collection(self.collection_name).where(field="game_id", op_string="==", value=game_id).limit(limit)
        snapshots = await query.stream() # type: ignore
        
        results = []
        async for snapshot in snapshots:
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
        query: AsyncବQuery = (
            db.collection(self.collection_name)
            .where(field="game_id", op_string="==", value=game_id)
            .where(field="player_number", op_string="==", value=player_number)
            .limit(1)
        )
        snapshots = await query.stream() # type: ignore
        async for snapshot in snapshots:
            if snapshot.exists:
                data = snapshot.to_dict()
                data["id"] = snapshot.id
                if "uid" not in data and "id" in data and hasattr(self.model_schema, "uid"):
                    data["uid"] = data["id"]
                return self.model_schema(**data)
        return None


# Instantiate the CRUDPlayer class
crud_player = CRUDPlayer(collection_name=PLAYER_COLLECTION, model_schema=PlayerInDB)
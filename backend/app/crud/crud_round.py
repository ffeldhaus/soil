from typing import Any, Dict, List, Optional, Union
from uuid import uuid4
from datetime import datetime

from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud.firestore_v1.base_client import BaseClient # For type hint of sync client
from google.cloud.firestore_v1.base_query import AsyncବQuery
from google.cloud.firestore_v1.document import DocumentReference

from app.crud.base import CRUDBase
from app.schemas.round import RoundCreate, RoundUpdate, RoundInDB, RoundDecisionBase
from app.schemas.parcel import ParcelInDB # For initializing default field state

# Collection name in Firestore for rounds
# This could be a top-level collection or a subcollection path pattern
# e.g., games/{game_id}/players/{player_id}/rounds
# For simplicity with CRUDBase, we'll treat it as if it's top-level for now,
# but the actual path will be constructed in methods.
ROUND_COLLECTION_NAME_TEMPLATE = "games/{game_id}/player_rounds" # Or just "player_rounds" if game_id/player_id are fields

# Collection name for field states (containing parcel data for a player-round)
FIELD_STATE_COLLECTION_NAME_TEMPLATE = "games/{game_id}/player_field_states" # Or "player_field_states"

class CRUDRound(CRUDBase[RoundInDB, RoundCreate, RoundUpdate]):
    """
    CRUD operations for Player Round data stored in Firestore.
    A round document typically stores player decisions for a specific round in a game.
    Parcel data is managed separately in a 'field_state' document.
    """

    def __init__(self, model_schema: type[RoundInDB]):
        # The collection name is dynamic based on game_id and player_id for subcollections.
        # CRUDBase's collection_name isn't directly used if we build paths dynamically.
        # We pass a dummy name or handle it in each method.
        # For now, we'll construct paths in each method.
        super().__init__(collection_name="player_rounds_placeholder", model_schema=model_schema)


    def _get_round_doc_ref(
        self, db: Union[AsyncFirestoreClient, BaseClient], game_id: str, player_id: str, round_number: int
    ) -> DocumentReference:
        """Helper to get a document reference for a specific player's round."""
        # Example of a composite ID structure if not using subcollections directly in CRUDBase
        # doc_id = f"{game_id}_{player_id}_{round_number}"
        # return db.collection(self.collection_name).document(doc_id)
        
        # Example using subcollections (adjust collection name/path as per your model)
        # Path: games/{game_id}/players/{player_id}/rounds/{round_number_str}
        # For this to work, player_id documents would need to exist or be created.
        # Simpler: games/{game_id}/player_rounds/{player_id_round_number}
        doc_id = f"{player_id}_round_{round_number}"
        collection_path = ROUND_COLLECTION_NAME_TEMPLATE.format(game_id=game_id)
        return db.collection(collection_path).document(doc_id)

    def _get_field_state_doc_ref(
        self, db: Union[AsyncFirestoreClient, BaseClient], game_id: str, player_id: str, round_number: int
    ) -> DocumentReference:
        """Helper to get a document reference for a player's field state for a specific round."""
        doc_id = f"{player_id}_round_{round_number}_field_state"
        collection_path = FIELD_STATE_COLLECTION_NAME_TEMPLATE.format(game_id=game_id)
        return db.collection(collection_path).document(doc_id)


    async def create_player_round(
        self,
        db: Union[AsyncFirestoreClient, BaseClient],
        *,
        obj_in: RoundCreate,
        initial_parcels: List[Dict[str, Any]] # List of parcel data dicts
    ) -> RoundInDB:
        """
        Creates a new round document for a player and an initial field_state document.
        This is typically called when a new game round starts for all players.
        """
        round_doc_ref = self._get_round_doc_ref(db, obj_in.game_id, obj_in.player_id, obj_in.round_number)
        
        round_data_to_create = obj_in.model_dump(exclude_unset=True)
        # Ensure decisions are stored as dicts if RoundDecisionBase is complex
        if isinstance(obj_in.decisions, BaseModel):
            round_data_to_create["decisions"] = obj_in.decisions.model_dump()
        
        # Firestore uses server timestamps for created_at/updated_at often,
        # but Pydantic defaults can also be used if preferred.
        round_data_to_create["created_at"] = datetime.now(datetime.UTC)
        round_data_to_create["updated_at"] = datetime.now(datetime.UTC)
        round_data_to_create["id"] = round_doc_ref.id # Store the doc ID in the document itself

        await round_doc_ref.set(round_data_to_create)

        # Create the corresponding initial field_state for this round
        field_state_doc_ref = self._get_field_state_doc_ref(db, obj_in.game_id, obj_in.player_id, obj_in.round_number)
        field_state_data = {
            "id": field_state_doc_ref.id,
            "game_id": obj_in.game_id,
            "player_id": obj_in.player_id,
            "round_number": obj_in.round_number,
            "parcels": initial_parcels, # List of ParcelInDB compatible dicts
            "created_at": datetime.now(datetime.UTC),
            "updated_at": datetime.now(datetime.UTC)
        }
        await field_state_doc_ref.set(field_state_data)
        
        # Return the created round data, parsed as RoundInDB
        return RoundInDB(**round_data_to_create)


    async def get_player_round(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, game_id: str, player_id: str, round_number: int
    ) -> Optional[RoundInDB]:
        """Get a specific round for a player."""
        round_doc_ref = self._get_round_doc_ref(db, game_id, player_id, round_number)
        snapshot = await round_doc_ref.get()
        if snapshot.exists:
            data = snapshot.to_dict()
            data["id"] = snapshot.id # Ensure ID is part of the data
            return self.model_schema(**data)
        return None

    async def get_player_field_state(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, game_id: str, player_id: str, round_number: int
    ) -> Optional[Dict[str, Any]]: # Returns raw dict, could be parsed by FieldState schema
        """Get the field state (parcels) for a player's specific round."""
        field_doc_ref = self._get_field_state_doc_ref(db, game_id, player_id, round_number)
        snapshot = await field_doc_ref.get()
        if snapshot.exists:
            return snapshot.to_dict()
        return None
        
    async def update_player_round_decisions(
        self,
        db: Union[AsyncFirestoreClient, BaseClient],
        *,
        game_id: str,
        player_id: str,
        round_number: int,
        obj_in: RoundUpdate, # Contains decisions and is_submitted flag
        updated_parcels_data: List[Dict[str, Any]] # Full list of updated parcel states
    ) -> Optional[RoundInDB]:
        """
        Updates a player's round with their decisions and submits it.
        Also updates the parcel data in the associated field_state document.
        """
        round_doc_ref = self._get_round_doc_ref(db, game_id, player_id, round_number)
        
        update_data_round = obj_in.model_dump(exclude_unset=True)
        if isinstance(obj_in.decisions, BaseModel):
             update_data_round["decisions"] = obj_in.decisions.model_dump()
        update_data_round["updated_at"] = datetime.now(datetime.UTC)
        if obj_in.is_submitted:
            update_data_round["submitted_at"] = datetime.now(datetime.UTC)

        await round_doc_ref.update(update_data_round)

        # Update the parcels in the field_state document
        field_state_doc_ref = self._get_field_state_doc_ref(db, game_id, player_id, round_number)
        await field_state_doc_ref.update({
            "parcels": updated_parcels_data,
            "updated_at": datetime.now(datetime.UTC)
        })
        
        updated_snapshot = await round_doc_ref.get()
        if updated_snapshot.exists:
            data = updated_snapshot.to_dict()
            data["id"] = updated_snapshot.id
            return self.model_schema(**data)
        return None


    async def get_all_player_rounds_for_game_round(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, game_id: str, round_number: int
    ) -> List[RoundInDB]:
        """
        Get all player round documents for a specific game_id and round_number.
        Requires a composite index on (game_id, round_number) if player_rounds is a top-level collection
        and game_id/round_number are fields.
        If using subcollections as per _get_round_doc_ref, this needs adjustment.
        This implementation assumes player_rounds are in a collection path derived from game_id.
        """
        collection_path = ROUND_COLLECTION_NAME_TEMPLATE.format(game_id=game_id)
        # This query fetches all documents in the subcollection for a game, then filters by round_number client-side
        # or requires round_number to be a field for server-side filtering.
        # If round_number is part of the document ID (e.g. playerID_round_X), this query changes.
        # Assuming round_number is a field in the document:
        query: AsyncବQuery = db.collection(collection_path).where(field="round_number", op_string="==", value=round_number)
        snapshots = await query.stream() # type: ignore
        
        results = []
        async for snapshot in snapshots:
            if snapshot.exists:
                data = snapshot.to_dict()
                data["id"] = snapshot.id
                results.append(self.model_schema(**data))
        return results
        
    async def set_round_calculated(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, game_id: str, player_id: str, round_number: int, result_id: str
    ) -> bool:
        """
        Marks a round as calculated by linking its result_id.
        (Placeholder - actual fields might vary)
        """
        round_doc_ref = self._get_round_doc_ref(db, game_id, player_id, round_number)
        try:
            await round_doc_ref.update({
                "result_id": result_id, # Assuming RoundInDB has a result_id field
                "status": "calculated", # Assuming a status field
                "updated_at": datetime.now(datetime.UTC)
            })
            return True
        except Exception:
            return False


# Instantiate the CRUDRound class
crud_round = CRUDRound(model_schema=RoundInDB)
from typing import Any, Dict, List, Optional, Union
from uuid import uuid4
from datetime import datetime
from pydantic import BaseModel # Added import

from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud.firestore_v1.base_client import BaseClient # For type hint of sync client
from google.cloud.firestore_v1.async_query import AsyncQuery # Corrected import
from google.cloud.firestore_v1.document import DocumentReference

from app.crud.base import CRUDBase
from app.schemas.result import ResultCreate, ResultInDB # ResultUpdate not typically needed

# Collection name in Firestore for results
# This could be a top-level collection or a subcollection path pattern
# e.g., games/{game_id}/player_results
RESULT_COLLECTION_NAME_TEMPLATE = "games/{game_id}/player_results" # Or just "player_results"

class CRUDResult(CRUDBase[ResultInDB, ResultCreate, Any]): # Using Any for UpdateSchema as direct updates are rare
    """
    CRUD operations for Player Round Results stored in Firestore.
    A result document stores the outcomes (financial, ecological) for a player's specific round.
    """

    def __init__(self, model_schema: type[ResultInDB]):
        # Similar to CRUDRound, collection_name is dynamic.
        super().__init__(collection_name="player_results_placeholder", model_schema=model_schema)

    def _get_result_doc_ref(
        self, db: Union[AsyncFirestoreClient, BaseClient], game_id: str, player_id: str, round_number: int
    ) -> DocumentReference:
        """Helper to get a document reference for a specific player's round result."""
        # Consistent ID with round and field_state for clarity
        doc_id = f"{player_id}_round_{round_number}_result"
        collection_path = RESULT_COLLECTION_NAME_TEMPLATE.format(game_id=game_id)
        return db.collection(collection_path).document(doc_id)

    async def create_player_round_result(
        self,
        db: Union[AsyncFirestoreClient, BaseClient],
        *,
        obj_in: ResultCreate
    ) -> ResultInDB:
        """
        Creates a new result document for a player's round.
        This is typically called by the game logic after processing round decisions.
        The document ID will be based on game_id, player_id, and round_number.
        """
        result_doc_ref = self._get_result_doc_ref(db, obj_in.game_id, obj_in.player_id, obj_in.round_number)
        
        result_data_to_create = obj_in.model_dump(exclude_unset=True)
        
        # Ensure nested Pydantic models (TotalIncome, TotalExpenses) are converted to dicts
        if isinstance(obj_in.income_details, BaseModel):
            result_data_to_create["income_details"] = obj_in.income_details.model_dump()
        if isinstance(obj_in.expense_details, BaseModel):
            result_data_to_create["expense_details"] = obj_in.expense_details.model_dump()

        result_data_to_create["calculated_at"] = datetime.now(datetime.UTC)
        result_data_to_create["id"] = result_doc_ref.id # Store the doc ID

        await result_doc_ref.set(result_data_to_create)
        
        # Return the created result data, parsed as ResultInDB
        return ResultInDB(**result_data_to_create)

    async def get_player_round_result(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, game_id: str, player_id: str, round_number: int
    ) -> Optional[ResultInDB]:
        """Get a specific result for a player's round."""
        result_doc_ref = self._get_result_doc_ref(db, game_id, player_id, round_number)
        snapshot = await result_doc_ref.get()
        if snapshot.exists:
            data = snapshot.to_dict()
            data["id"] = snapshot.id # Ensure ID is part of the data
            return self.model_schema(**data)
        return None

    async def get_all_results_for_player(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, game_id: str, player_id: str, limit: int = 50 # Max rounds
    ) -> List[ResultInDB]:
        """
        Get all results for a specific player in a game, ordered by round_number.
        Requires a composite index on (player_id, round_number) if 'player_results' is top-level.
        If using subcollections based on game_id, then index on round_number within that.
        """
        collection_path = RESULT_COLLECTION_NAME_TEMPLATE.format(game_id=game_id)
        # This query strategy depends on how documents are identified and stored.
        # If doc IDs are like "playerID_round_X_result", a prefix query might be complex.
        # Easier if player_id is a field:
        query: AsyncବQuery = (
            db.collection(collection_path)
            .where(field="player_id", op_string="==", value=player_id)
            .order_by("round_number") # Ascending by default
            .limit(limit)
        )
        snapshots = await query.stream() # type: ignore
        
        results = []
        async for snapshot in snapshots:
            if snapshot.exists:
                data = snapshot.to_dict()
                data["id"] = snapshot.id
                results.append(self.model_schema(**data))
        return results

    async def get_all_results_for_game_round(
        self, db: Union[AsyncFirestoreClient, BaseClient], *, game_id: str, round_number: int
    ) -> List[ResultInDB]:
        """
        Get results for all players for a specific game round.
        Useful for displaying a summary/comparison at the end of a round.
        """
        collection_path = RESULT_COLLECTION_NAME_TEMPLATE.format(game_id=game_id)
        query: AsyncବQuery = db.collection(collection_path).where(field="round_number", op_string="==", value=round_number)
        snapshots = await query.stream() # type: ignore
        
        results = []
        async for snapshot in snapshots:
            if snapshot.exists:
                data = snapshot.to_dict()
                data["id"] = snapshot.id
                results.append(self.model_schema(**data))
        return results

# Instantiate the CRUDResult class
crud_result = CRUDResult(model_schema=ResultInDB)
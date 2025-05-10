# File: backend/app/api/v1/endpoints/rounds.py
from typing import List, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Body, Path
from pydantic import BaseModel # Added for PlayerRoundSubmission

from app.api import deps
from app.schemas.token import TokenData
from app.schemas.round import RoundPublic, RoundUpdate, RoundDecisionBase, RoundWithFieldPublic # Updated import
from app.schemas.parcel import ParcelPublic, ParcelUpdate, PlantationType, FieldPublic # Added FieldPublic
from app.schemas.game import GameInDB # To check game status
from app.crud.crud_round import crud_round
from app.crud.crud_game import crud_game
# We might need a way to get/update individual parcels if they are not part of RoundUpdate directly
# from app.crud.crud_parcel import crud_parcel # If parcels are managed as separate documents

router = APIRouter()

# The path for these endpoints will likely be nested under a game
# e.g., /games/{game_id}/rounds/
# This router would be included in games.py or api.py with that prefix.
# For now, assuming game_id will be a path parameter here for clarity.


@router.get(
    "/games/{game_id}/current-round",
    response_model=RoundWithFieldPublic, # Changed to new combined schema
    summary="Get Current Round Details for Player"
)
async def get_player_current_round_details(
    game_id: str = Path(..., description="The ID of the game"),
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_player: TokenData = Depends(deps.get_current_player_in_game) # Ensures player & game_id in token
) -> Any:
    """
    Retrieves the current round's details for the authenticated player in the specified game.
    This includes their current decisions and the state of their field (parcels).
    """
    player_uid = current_player.sub
    if current_player.game_id != game_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not authorized for this game (token mismatch).")

    game = await crud_game.get(db, doc_id=game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found.")
    if game.game_status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Game is not active (status: {game.game_status}).")
    if player_uid not in game.player_uids:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not part of this game.")


    current_round_number = game.current_round_number
    if current_round_number == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game has not started its first round yet.")
    
    player_round_data_db = await crud_round.get_player_round(
        db, game_id=game_id, player_id=player_uid, round_number=current_round_number
    )
    if not player_round_data_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Round {current_round_number} data not found for player.")

    # Fetch the field state (parcels) for this player's current round
    player_field_state_dict = await crud_round.get_player_field_state(
        db, game_id=game_id, player_id=player_uid, round_number=current_round_number
    )
    
    parcels_public_list: List[ParcelPublic] = []
    if player_field_state_dict and "parcels" in player_field_state_dict:
        for parcel_data in player_field_state_dict["parcels"]:
            parcels_public_list.append(ParcelPublic.model_validate(parcel_data))
    
    field_public_data = FieldPublic(parcels=parcels_public_list)

    # Combine round data and field data into the RoundWithFieldPublic schema
    # RoundInDB (player_round_data_db) is compatible with RoundPublic parts of RoundWithFieldPublic
    combined_data = player_round_data_db.model_dump() # Start with round data
    combined_data["field_state"] = field_public_data.model_dump() # Add field state

    return RoundWithFieldPublic.model_validate(combined_data)


# This schema would combine round decisions and parcel plantation choices
class PlayerRoundSubmission(BaseModel): # Moved from original location as it's only used here
    round_decisions: RoundDecisionBase = Field(..., description="General decisions for the round")
    parcel_plantation_choices: Dict[int, PlantationType] = Field( # Key: parcel_number, Value: PlantationType
        ..., 
        description="Plantation choices for each parcel number. Only include parcels where plantation is changing."
    )


@router.put(
    "/games/{game_id}/current-round/submit",
    response_model=RoundPublic, # Or a success message
    summary="Submit Player Decisions for Current Round"
)
async def submit_player_round_decisions(
    game_id: str = Path(..., description="The ID of the game"),
    submission_data: PlayerRoundSubmission = Body(...),
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_player: TokenData = Depends(deps.get_current_player_in_game)
) -> Any:
    """
    Allows a player to submit their decisions for the current round.
    This includes general round decisions and plantation choices for their parcels.
    """
    player_uid = current_player.sub
    if current_player.game_id != game_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not authorized for this game (token mismatch).")

    game = await crud_game.get(db, doc_id=game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found.")
    if game.game_status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game is not active.")
    if player_uid not in game.player_uids:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not part of this game.")


    current_round_number = game.current_round_number
    if current_round_number == 0:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game has not started its first round yet.")

    player_current_round = await crud_round.get_player_round(
        db, game_id=game_id, player_id=player_uid, round_number=current_round_number
    )
    if not player_current_round:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Current round data not found for player.")
    if player_current_round.is_submitted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Decisions for this round have already been submitted.")

    # Fetch current field state (parcels) to update plantation choices
    current_field_state_dict = await crud_round.get_player_field_state(
        db, game_id=game_id, player_id=player_uid, round_number=current_round_number
    )
    if not current_field_state_dict or "parcels" not in current_field_state_dict:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve current field state for player.")

    updated_parcels_data = []
    existing_parcels_map = {p["parcel_number"]: p for p in current_field_state_dict["parcels"]}

    for parcel_num_str, new_plantation in submission_data.parcel_plantation_choices.items():
        parcel_num = int(parcel_num_str) # Keys in Dict from JSON body will be strings
        if parcel_num in existing_parcels_map:
            # Update the plantation for this parcel
            existing_parcels_map[parcel_num]["current_plantation"] = new_plantation.value # Store enum value
        else:
            # Handle error: player trying to update a non-existent parcel number for their field
            print(f"Warning: Player {player_uid} submitted plantation for non-existent parcel_number {parcel_num}")
            # Decide whether to ignore or raise error
    # The updated_parcels_data should be the full list of all parcels for that player's field
    updated_parcels_data = list(existing_parcels_map.values())


    # Prepare RoundUpdate object
    round_update_obj = RoundUpdate(
        decisions=submission_data.round_decisions,
        is_submitted=True # Submission implies setting this to true
    )

    updated_round = await crud_round.update_player_round_decisions(
        db,
        game_id=game_id,
        player_id=player_uid,
        round_number=current_round_number,
        obj_in=round_update_obj,
        updated_parcels_data=updated_parcels_data
    )

    if not updated_round:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to submit round decisions.")
    # The game server will later check if all players have submitted this round
    # and then trigger calculations and advance to the next round.
    return updated_round # Or a simpler success message
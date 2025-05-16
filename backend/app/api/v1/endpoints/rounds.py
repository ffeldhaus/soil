# File: backend/app/api/v1/endpoints/rounds.py
from typing import List, Any, Optional, Dict

from fastapi import APIRouter, Depends, HTTPException, status, Body, Path

from app.api import deps
from app.schemas.token import TokenData
from app.schemas.round import (
    RoundPublic, RoundUpdate, RoundDecisionBase, RoundWithFieldPublic, 
    PlayerRoundSubmissionPayload
)
from app.schemas.parcel import ParcelPublic, PlantationType, FieldPublic
from app.schemas.game import GameInDB, GameStatus # Added GameStatus
from app.schemas.result import ResultPublic # To help with merging data
from app.crud.crud_round import crud_round
from app.crud.crud_game import crud_game
from app.crud.crud_result import crud_result # Added crud_result

router = APIRouter()

async def _get_round_details_with_field_and_results(
    db: Any,
    game_id: str,
    player_id: str,
    round_number: int
) -> RoundWithFieldPublic:
    """Helper function to fetch round, field, and merge results."""
    player_round_data_db = await crud_round.get_player_round(
        db, game_id=game_id, player_id=player_id, round_number=round_number
    )
    if not player_round_data_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Round {round_number} data not found for player.")

    player_field_state_dict = await crud_round.get_player_field_state(
        db, game_id=game_id, player_id=player_id, round_number=round_number
    )
    
    parcels_public_list: List[ParcelPublic] = []
    if player_field_state_dict and "parcels" in player_field_state_dict:
        for parcel_data in player_field_state_dict["parcels"]:
            parcels_public_list.append(ParcelPublic.model_validate(parcel_data))
    
    field_public_data = FieldPublic(parcels=parcels_public_list)

    # Start with round data dictionary
    # Pydantic models are already configured for camelCase output, model_dump(by_alias=True) will produce camelCase keys
    combined_data_dict = player_round_data_db.model_dump(by_alias=True)
    combined_data_dict["fieldState"] = field_public_data.model_dump(by_alias=True) # Ensure fieldState is also camelCase

    # Merge result data if result_id exists
    if player_round_data_db.result_id:
        result_data_db = await crud_result.get(db, doc_id=player_round_data_db.result_id)
        if result_data_db:
            # ResultPublic is configured for camelCase output via its bases
            result_dict = ResultPublic.model_validate(result_data_db).model_dump(by_alias=True)
            # Merge result fields into combined_data, prioritizing result fields if overlap
            for key, value in result_dict.items():
                if key not in ["id", "gameId", "playerId", "roundNumber", "calculatedAt"]: # Avoid overwriting core round IDs
                    combined_data_dict[key] = value
            combined_data_dict["calculatedAt"] = result_dict.get("calculatedAt") # Specifically add calculatedAt
        else:
            print(f"Warning: Result document with ID {player_round_data_db.result_id} not found for round {round_number}.")
    
    # Ensure the final model validation uses a dict that Pydantic can map from (snake or camel based on config)
    # Since RoundWithFieldPublic is configured with alias_generator=to_camel, it expects camelCase keys primarily
    # if creating from a dict that itself is already camelCased.
    # However, model_validate can often handle snake_case dicts too if fields match.
    # To be safe, ensure combined_data_dict is what RoundWithFieldPublic expects or can robustly parse.
    # The model_dump(by_alias=True) should have already produced camelCase keys where appropriate.
    return RoundWithFieldPublic.model_validate(combined_data_dict)

@router.get(
    "/games/{game_id}/rounds/my-current-round", # Path for fetching current active round
    response_model=RoundWithFieldPublic,
    summary="Get Current Active Round Details for Player (Includes Field and Results if available)"
)
async def get_player_current_active_round_details(
    game_id: str = Path(..., description="The ID of the game"),
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_player: TokenData = Depends(deps.get_current_player_in_game)
) -> RoundWithFieldPublic:
    player_uid = current_player.sub
    if current_player.game_id != game_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not authorized for this game (token mismatch).")

    game = await crud_game.get(db, doc_id=game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found.")
    # Allow fetching current round even if game is FINISHED to see final state
    if game.game_status not in [GameStatus.ACTIVE.value, GameStatus.FINISHED.value]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Game is not active or finished (status: {game.game_status}).")
    if player_uid not in game.player_uids:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not part of this game.")

    current_round_number = game.current_round_number
    if current_round_number == 0 and game.game_status != GameStatus.FINISHED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game has not started its first round yet.")
    # If game finished and current_round_number is 0 (e.g. error state), try to get last round.
    # Or rely on game.number_of_rounds if current_round_number seems off for finished game.
    round_to_fetch = current_round_number if current_round_number > 0 else game.number_of_rounds

    return await _get_round_details_with_field_and_results(db, game_id, player_uid, round_to_fetch)

@router.get(
    "/games/{game_id}/rounds/{round_number}/my-details", # Path for fetching specific (e.g., past) round details
    response_model=RoundWithFieldPublic,
    summary="Get Specific Round Details for Player (Includes Field and Results if available)"
)
async def get_player_specific_round_details(
    game_id: str = Path(..., description="The ID of the game"),
    round_number: int = Path(..., description="The specific round number to fetch"),
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_player: TokenData = Depends(deps.get_current_player_in_game)
) -> RoundWithFieldPublic:
    player_uid = current_player.sub
    if current_player.game_id != game_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not authorized for this game (token mismatch).")
    
    game = await crud_game.get(db, doc_id=game_id) # Optional: verify player is part of game
    if not game or player_uid not in game.player_uids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Game not found or player not part of this game.")
    if round_number < 1 or round_number > game.number_of_rounds : # Check round_number validity
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Invalid round number {round_number}. Game has {game.number_of_rounds} rounds.")
    if round_number > game.current_round_number and game.game_status != GameStatus.FINISHED.value:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Round {round_number} has not occurred yet.")

    return await _get_round_details_with_field_and_results(db, game_id, player_uid, round_number)

@router.put(
    "/games/{game_id}/rounds/{round_number}/my-decisions", # Standardized path
    response_model=RoundPublic,
    summary="Submit Player Decisions for a Specific Round"
)
async def submit_player_round_decisions(
    game_id: str = Path(..., description="The ID of the game"),
    round_number: int = Path(..., description="The round number for which decisions are being submitted"),
    submission_data: PlayerRoundSubmissionPayload = Body(...),
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_player: TokenData = Depends(deps.get_current_player_in_game)
) -> Any:
    player_uid = current_player.sub
    if current_player.game_id != game_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not authorized for this game (token mismatch).")

    game = await crud_game.get(db, doc_id=game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found.")
    if game.game_status != GameStatus.ACTIVE.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game is not active.")
    if player_uid not in game.player_uids:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not part of this game.")
    
    # Player should only be able to submit for the game's current round number
    if round_number != game.current_round_number:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Decisions can only be submitted for the current round ({game.current_round_number}), not round {round_number}.")

    player_round_to_submit = await crud_round.get_player_round(
        db, game_id=game_id, player_id=player_uid, round_number=round_number
    )
    if not player_round_to_submit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Round {round_number} data not found for player.")
    if player_round_to_submit.is_submitted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Decisions for round {round_number} have already been submitted.")

    current_field_state_dict = await crud_round.get_player_field_state(
        db, game_id=game_id, player_id=player_uid, round_number=round_number
    )
    if not current_field_state_dict or "parcels" not in current_field_state_dict:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve current field state for player.")

    existing_parcels_map = {p["parcel_number"]: p for p in current_field_state_dict["parcels"]}
    
    for parcel_num_str, new_plantation in submission_data.parcel_plantation_choices.items():
        parcel_num = int(parcel_num_str) 
        if parcel_num in existing_parcels_map:
            existing_parcels_map[parcel_num]["current_plantation"] = new_plantation.value
        else:
            print(f"Warning: Player {player_uid} submitted plantation for non-existent parcel_number {parcel_num}")
            
    updated_parcels_data = list(existing_parcels_map.values())

    round_update_obj = RoundUpdate(
        decisions=submission_data.round_decisions,
        is_submitted=True
    )

    updated_round = await crud_round.update_player_round_decisions(
        db,
        game_id=game_id,
        player_id=player_uid,
        round_number=round_number,
        obj_in=round_update_obj,
        updated_parcels_data=updated_parcels_data
    )

    if not updated_round:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to submit round decisions.")
    return updated_round

@router.get("/games/{game_id}/rounds/my-rounds", response_model=List[RoundPublic])
async def get_player_rounds_in_game(
    game_id: str = Path(..., description="The ID of the game"),
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_player: TokenData = Depends(deps.get_current_player_in_game)
) -> List[RoundPublic]:
    player_uid = current_player.sub
    if current_player.game_id != game_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not authorized for this game (token mismatch).")
    
    game = await crud_game.get(db, doc_id=game_id)
    if not game or player_uid not in game.player_uids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Game not found or player not part of game.")

    # This should fetch summaries. If detailed merge is needed here, logic would be more complex.
    # Assuming crud_round.get_all_player_rounds_in_game returns List[RoundInDB] which can be RoundPublic
    # and if results are needed here, that CRUD method needs to do the merge.
    # For now, keeping it simple for list view.
    rounds = await crud_round.get_all_player_rounds_in_game(db, game_id=game_id, player_id=player_uid)
    return rounds

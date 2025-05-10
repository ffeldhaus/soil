from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from typing import List, Any

from app.api import deps
from app.schemas.token import TokenData
from app.schemas.result import ResultPublic
from app.crud.crud_result import crud_result
from app.crud.crud_game import crud_game # To verify game context if needed

router = APIRouter()

# These endpoints would typically be nested under a game context,
# e.g., /games/{game_id}/results or /players/me/games/{game_id}/results

@router.get(
    "/games/{game_id}/my-results",
    response_model=List[ResultPublic],
    summary="Get All Results for Authenticated Player in a Game"
)
async def get_my_results_for_game(
    game_id: str = Path(..., description="The ID of the game"),
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_player: TokenData = Depends(deps.get_current_player_in_game),
    limit: int = Query(default=50, ge=1, le=100, description="Maximum number of results to return (per game session)")
) -> List[ResultPublic]:
    """
    Retrieves all historical round results for the authenticated player
    within the specified game, ordered by round number.
    """
    player_uid = current_player.sub
    if current_player.game_id != game_id: # Basic check against token's game_id
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not authorized for this game (token mismatch).")

    # Optional: Verify game exists and player is part of it, though get_current_player_in_game might cover some of this
    game = await crud_game.get(db, doc_id=game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found.")
    if player_uid not in game.player_uids:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not part of this game.")

    results_in_db = await crud_result.get_all_results_for_player(
        db, game_id=game_id, player_id=player_uid, limit=limit
    )
    
    return [ResultPublic.model_validate(result.model_dump()) for result in results_in_db]


@router.get(
    "/games/{game_id}/rounds/{round_number}/my-result",
    response_model=ResultPublic,
    summary="Get Player's Result for a Specific Round"
)
async def get_my_result_for_specific_round(
    game_id: str = Path(..., description="The ID of the game"),
    round_number: int = Path(..., ge=1, description="The specific round number"),
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_player: TokenData = Depends(deps.get_current_player_in_game)
) -> ResultPublic:
    """
    Retrieves the result for the authenticated player for a specific round
    within the specified game.
    """
    player_uid = current_player.sub
    if current_player.game_id != game_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not authorized for this game (token mismatch).")

    # Optional: Verify game context
    game = await crud_game.get(db, doc_id=game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found.")
    if player_uid not in game.player_uids:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not part of this game.")
    if round_number > game.current_round_number and game.game_status != "finished": # Allow viewing results up to current round
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Results for round {round_number} are not yet available.")


    result_in_db = await crud_result.get_player_round_result(
        db, game_id=game_id, player_id=player_uid, round_number=round_number
    )
    if not result_in_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Result for round {round_number} not found for this player.")
    
    return ResultPublic.model_validate(result_in_db.model_dump())


@router.get(
    "/games/{game_id}/rounds/{round_number}/all-results",
    response_model=List[ResultPublic],
    summary="Get All Player Results for a Specific Game Round (e.g., for comparison)"
)
async def get_all_player_results_for_game_round(
    game_id: str = Path(..., description="The ID of the game"),
    round_number: int = Path(..., ge=1, description="The specific round number"),
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    # This endpoint could be restricted to admins, or open to players if they can see each other's results.
    # For now, let's make it accessible to authenticated players of that game.
    current_user: TokenData = Depends(deps.get_current_active_user) # General authenticated user
) -> List[ResultPublic]:
    """
    Retrieves the results for ALL players for a specific round within a game.
    Useful for end-of-round summaries or leaderboards.
    Ensure current_user is part of this game if they are a player.
    """
    game = await crud_game.get(db, doc_id=game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found.")

    # Authorization: If the user is a player, ensure they are part of this game. Admins can see any game's results.
    if current_user.role == 'player':
        if current_user.game_id != game_id or current_user.sub not in game.player_uids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Player not authorized for this game.")
    elif current_user.role == 'admin':
        # Admins might need to own the game, or have superuser access.
        # For now, if admin, assume they can view results of any game they know the ID of.
        # A stricter check: if game.admin_id != current_user.sub: raise HTTPException(...)
        pass # Admin is allowed

    if round_number > game.current_round_number and game.game_status != "finished":
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Results for round {round_number} are not yet available for all players.")

    results_in_db = await crud_result.get_all_results_for_game_round(
        db, game_id=game_id, round_number=round_number
    )
    if not results_in_db:
        # It's possible no results are found if the round hasn't been processed for anyone yet
        return [] 
        
    return [ResultPublic.model_validate(result.model_dump()) for result in results_in_db]
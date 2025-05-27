from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Any

from app.api import deps
from app.schemas.token import TokenData
from app.schemas.game import GamePublic # Or a more player-specific Game view
from app.schemas.player import PlayerPublic
from app.crud.crud_game import crud_game
from app.crud.crud_player import crud_player

router = APIRouter()

@router.get("/{game_id}", response_model=GamePublic)
async def get_player_game_details(
    game_id: str,
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_player: TokenData = Depends(deps.get_current_player_user) # Ensures user is a player
) -> Any:
    """
    Retrieve details for a specific game the authenticated player is part of.
    """
    player_uid = current_player.sub
    
    # Verify the token's game_id matches the requested game_id for added security
    # (though Firebase custom claims already link player to a game_id if set correctly)
    if not current_player.game_id or current_player.game_id != game_id:
        # This check assumes game_id is reliably in the player's custom JWT token.
        # Alternatively, fetch the game and check if player_uid is in game.player_uids.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Player not authorized for this game or token missing game ID."
        )

    game = await crud_game.get(db, doc_id=game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found.")

    # Verify player is actually part of this game (double check against game.player_uids)
    if player_uid not in game.player_uids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Player is not a participant in this game."
        )

    # Fetch details of all players in the game to populate the GamePublic response
    players_in_game_details: List[PlayerPublic] = []
    if game.player_uids:
        for p_uid in game.player_uids:
            player_data = await crud_player.get(db, doc_id=p_uid)
            if player_data:
                players_in_game_details.append(PlayerPublic.model_validate(player_data.model_dump()))
    
    game_dict = game.model_dump()
    game_dict["players"] = [p.model_dump() for p in players_in_game_details]
    
    # For a player, we might want to exclude the full weather/vermin sequence
    # The GamePublic schema already excludes them by default.
    # If GameDetailsPublic was used, it would include them.
    
    return GamePublic.model_validate(game_dict)


# Placeholder: Endpoint for a player to list games they are part of.
# This would require querying the 'games' collection where 'player_uids' array contains current_player.sub
# Firestore array-contains queries are efficient.
@router.get("", response_model=List[GamePublic]) # Or GameSimple
async def get_my_games(
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_player: TokenData = Depends(deps.get_current_player_user),
    limit: int = 10
) -> Any:
    """
    Retrieve a list of games the currently authenticated player is participating in.
    """
    player_uid = current_player.sub
    
    # Firestore query: Get games where 'player_uids' array contains player_uid
    query = db.collection(crud_game.collection_name).where(
        field="player_uids", op_string="array_contains", value=player_uid
    ).limit(limit) # Add ordering if needed, e.g., by created_at (requires index)

    snapshots = await query.stream() # type: ignore
    
    games_list = []
    async for snapshot in snapshots:
        if snapshot.exists:
            game_data_dict = snapshot.to_dict()
            game_data_dict["id"] = snapshot.id
            
            # For each game, fetch its player details to populate GamePublic
            players_details_for_this_game: List[PlayerPublic] = []
            if game_data_dict.get("player_uids"):
                for p_uid_in_game in game_data_dict["player_uids"]:
                    player_doc = await crud_player.get(db, doc_id=p_uid_in_game)
                    if player_doc:
                         players_details_for_this_game.append(PlayerPublic.model_validate(player_doc.model_dump()))
            
            game_data_dict["players"] = [p.model_dump() for p in players_details_for_this_game]
            games_list.append(GamePublic.model_validate(game_data_dict))
            
    return games_list
from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Any

from app.api import deps
from app.schemas.token import TokenData
from app.schemas.game import GameCreate, GamePublic, GameInDB, GameSimple
from app.schemas.player import PlayerCreate, PlayerPublic # For returning player info
from app.crud.crud_game import crud_game
from app.crud.crud_player import crud_player
from app.crud.crud_round import crud_round # For initializing round 0 or 1
from app.crud.crud_parcel import crud_parcel # We'll need a CRUD for initial parcels or a way to init them
from app.game_logic import game_rules # For initial parcel states
from app.db.firebase_setup import get_firestore_client, get_firebase_auth
from firebase_admin import auth as firebase_auth_admin, exceptions as firebase_exceptions
from app.core.config import settings


router = APIRouter()

# --- Helper for initializing parcels ---
# This might eventually live in a crud_field_state.py or game_setup_service.py
def get_initial_parcels_for_field(num_parcels: int = 40) -> List[Dict[str, Any]]:
    """Generates a list of initial parcel data."""
    parcels = []
    for i in range(1, num_parcels + 1):
        parcels.append({
            "parcel_number": i,
            "soil_quality": game_rules.INITIAL_PARCEL_SOIL_QUALITY,
            "nutrient_level": game_rules.INITIAL_PARCEL_NUTRIENT_LEVEL,
            "current_plantation": game_rules.INITIAL_PARCEL_PLANTATION, # PlantationType.FALLOW.value
            "previous_plantation": None,
            "pre_previous_plantation": None,
            "crop_sequence_effect": game_rules.CropSequenceEffect.NONE.value,
            "last_harvest_yield_dt": 0.0,
            "last_harvest_outcome_category": game_rules.HarvestOutcome.NONE.value,
        })
    return parcels


@router.post("/games", response_model=GamePublic, status_code=status.HTTP_201_CREATED)
async def create_game_by_admin(
    *,
    db: Any = Depends(deps.get_firestore_db_client_dependency), # Firestore client
    game_in: GameCreate,
    current_admin: TokenData = Depends(deps.get_current_admin_user)
) -> Any:
    """
    Admin endpoint to create a new game.
    This will:
    1. Create the Game document in Firestore.
    2. Create player accounts in Firebase Authentication.
    3. Create Player documents in Firestore.
    4. Add player UIDs to the Game document.
    5. Initialize Round 1 (or 0) and initial FieldState for each player.
    """
    admin_uid = current_admin.sub
    if not admin_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authentication failed.")

    # 1. Create the Game document
    try:
        created_game_dict = await crud_game.create_with_admin(db, obj_in=game_in, admin_id=admin_uid)
        # created_game_dict now includes the auto-generated game 'id' and sequences
        game_id = created_game_dict["id"]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create game document: {str(e)}")

    created_players_public_info: List[PlayerPublic] = []
    player_uids_for_game: List[str] = []

    # Determine number of AI players if any (not fully implemented yet)
    # num_ai_players = game_in.ai_player_count or 0
    # num_human_players = game_in.requested_player_slots
    # total_players_to_create = num_human_players + num_ai_players
    # if total_players_to_create > game_in.max_players:
    #     # This should be caught by GameCreate validator ideally, or here as a fallback
    #     await crud_game.remove(db, doc_id=game_id) # Rollback game creation
    #     raise HTTPException(status_code=400, detail="Total players (human + AI) exceeds max_players for game.")

    # For now, just creating based on requested_player_slots
    total_players_to_create = game_in.requested_player_slots


    # 2. Create Player accounts and documents
    initial_parcels_state = get_initial_parcels_for_field(num_parcels=40) # Assuming 40 parcels per player

    for i in range(1, total_players_to_create + 1):
        player_number = i
        # TODO: Make player email and password generation more robust / configurable
        player_email = f"player{player_number}.game{game_id[:8]}@{settings.EMAILS_FROM_EMAIL.split('@')[-1] if settings.EMAILS_FROM_EMAIL else 'soil.game'}"
        # Generate a simple, temporary password. Players might be prompted to change it.
        temp_password = f"pass{uuid4().hex[:6]}" # Example: pass<random6chars>
        player_username = f"Player {player_number}" # Default username

        try:
            # 2a. Create player in Firebase Authentication
            firebase_player_user = firebase_auth_admin.create_user(
                email=player_email,
                password=temp_password,
                display_name=player_username,
                email_verified=True # Or False if they need to verify/change password
            )
            player_uid = firebase_player_user.uid
            player_uids_for_game.append(player_uid)

            # 2b. Set custom claims for the player
            firebase_auth_admin.set_custom_user_claims(player_uid, {'role': 'player', 'game_id': game_id})
            
            # 2c. Create Player document in Firestore
            player_schema_in = PlayerCreate(
                email=player_email,
                password=temp_password, # Not stored in Firestore
                username=player_username,
                game_id=game_id,
                player_number=player_number,
                user_type='player' # Will be overridden by PlayerCreate default but good to be explicit
            )
            created_player_data = await crud_player.create_with_uid(db, uid=player_uid, obj_in=player_schema_in)
            
            # Store player info to return (excluding password)
            # Add the temporary password to the info returned to the admin for distribution
            player_public_data = PlayerPublic(**created_player_data, temp_password=temp_password).model_dump()
            player_public_data["temp_password"] = temp_password # Ensure it's there for admin
            created_players_public_info.append(PlayerPublic(**player_public_data))


            # 2d. Initialize Round 1 (or 0) and FieldState for this player
            # Game starts at current_round_number = 0 (setup) or 1 (first playable round)
            # Let's assume round 1 is the first playable round.
            # Initializing round 0 could be for a pre-game lobby/setup state.
            # For now, let's directly create structures for round 1.
            initial_round_data = {
                "game_id": game_id,
                "player_id": player_uid,
                "round_number": 1, # First playable round
                "is_submitted": False,
                "decisions": {} # Empty/default decisions
            }
            # The RoundCreate schema expects decisions to be RoundDecisionBase
            round_create_obj = PlayerCreate(**initial_round_data)
            await crud_round.create_player_round(
                db,
                obj_in=round_create_obj,
                initial_parcels=initial_parcels_state
            )

        except firebase_exceptions.FirebaseError as fb_error:
            # TODO: Implement rollback logic - if a player creation fails,
            # delete previously created players for this game and the game document itself.
            # This is complex and requires careful error handling.
            print(f"Firebase error creating player {player_number} for game {game_id}: {fb_error}")
            # Attempt to delete the game document if player creation fails critically
            await crud_game.remove(db, doc_id=game_id)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creating player {player_number} in Firebase: {str(fb_error)}")
        except Exception as e:
            print(f"Error setting up player {player_number} for game {game_id}: {e}")
            await crud_game.remove(db, doc_id=game_id) # Rollback
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error setting up player {player_number}: {str(e)}")

    # 3. Update Game document with player UIDs (if not done incrementally)
    # Using ArrayUnion per player is better for atomicity if players are added one by one.
    # If all UIDs are collected first, a single update can set the player_uids list.
    # Here, we've added them one by one conceptually to Firebase claims and Firestore player docs.
    # Now, update the game document's player_uids list.
    try:
        # This replaces the existing list. If adding incrementally, use ArrayUnion.
        await db.collection(crud_game.collection_name).document(game_id).update({"player_uids": player_uids_for_game})
    except Exception as e:
        # TODO: Rollback player creations if this fails
        raise HTTPException(status_code=500, detail=f"Failed to link players to game: {str(e)}")

    # Construct the GamePublic response
    # Fetch the full game again to get all updated fields
    final_game_doc = await crud_game.get(db, doc_id=game_id)
    if not final_game_doc:
        raise HTTPException(status_code=500, detail="Failed to retrieve created game for response.")

    # Manually add player details to the GamePublic response
    # This is because GamePublic has `players: Optional[List[PlayerPublic]]`
    # We've collected `created_players_public_info`
    # The `GameInDB` model fetched by `crud_game.get` won't have these hydrated by default.
    response_game = GamePublic(
        **final_game_doc.model_dump(),
        players=created_players_public_info # Inject the created player info
    )
    return response_game


@router.get("/games", response_model=List[GameSimple])
async def get_admin_games(
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_admin: TokenData = Depends(deps.get_current_admin_user),
    skip: int = 0,
    limit: int = 20
) -> List[GameSimple]:
    """
    Retrieve games created by the currently authenticated admin.
    """
    admin_uid = current_admin.sub
    games_in_db = await crud_game.get_games_by_admin_id(db, admin_id=admin_uid, limit=limit) # Skip not directly supported by this simple query
    
    # Convert GameInDB to GameSimple for the list response
    return [GameSimple.model_validate(game.model_dump()) for game in games_in_db]


@router.get("/games/{game_id}", response_model=GamePublic) # Or GameDetailsPublic for more info
async def get_admin_game_details(
    game_id: str,
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_admin: TokenData = Depends(deps.get_current_admin_user)
) -> Any:
    """
    Retrieve details for a specific game owned by the admin.
    Includes player information.
    """
    admin_uid = current_admin.sub
    game = await crud_game.get(db, doc_id=game_id)
    if not game or game.admin_id != admin_uid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found or not owned by this admin.")

    # Fetch player details for this game
    players_in_game: List[PlayerPublic] = []
    if game.player_uids:
        for player_uid in game.player_uids:
            player_doc = await crud_player.get(db, doc_id=player_uid)
            if player_doc:
                # Note: PlayerPublic doesn't have temp_password by default.
                # If admin needs to see temp passwords again, this would require special handling or storage.
                players_in_game.append(PlayerPublic.model_validate(player_doc.model_dump()))
    
    # The GamePublic schema expects a 'players' field.
    # We need to ensure the game object returned by crud_game.get() is combined with player data.
    game_dict = game.model_dump()
    game_dict["players"] = [p.model_dump() for p in players_in_game]
    
    return GamePublic.model_validate(game_dict)


@router.post("/games/{game_id}/start-next-round", response_model=GamePublic)
async def start_next_game_round_by_admin(
    game_id: str,
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_admin: TokenData = Depends(deps.get_current_admin_user)
) -> Any:
    """
    Admin action to advance the game to the next round or start it (from 0 to 1).
    - Updates the game's current_round_number.
    - For new rounds (not round 0 to 1, which is handled at game creation),
      it initializes new RoundInDB and FieldState documents for each player.
    """
    admin_uid = current_admin.sub
    game_doc = await crud_game.get(db, doc_id=game_id)

    if not game_doc or game_doc.admin_id != admin_uid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found or not owned by this admin.")

    if game_doc.game_status == "finished" or game_doc.current_round_number >= game_doc.number_of_rounds:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game is already finished or all rounds played.")

    next_round_number = game_doc.current_round_number + 1
    
    # Update game document
    updated_game_data = {"current_round_number": next_round_number, "updated_at": datetime.now(datetime.UTC)}
    if game_doc.game_status == "pending" and next_round_number == 1:
        updated_game_data["game_status"] = "active"
    
    updated_game_dict = await crud_game.update(db, doc_id=game_id, obj_in=updated_game_data)
    if not updated_game_dict:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update game to next round.")

    # If this isn't the very first round being started (round 0->1 was handled at game creation)
    # We need to create new round/field_state documents for players for this `next_round_number`
    if next_round_number > 1: # Round 1 was initialized at game creation. This is for round 2 onwards.
        for player_uid in game_doc.player_uids:
            # Fetch previous round's field state to carry over parcel data
            previous_round_field_state_dict = await crud_round.get_player_field_state(
                db, game_id=game_id, player_id=player_uid, round_number=(next_round_number - 1)
            )
            if not previous_round_field_state_dict or "parcels" not in previous_round_field_state_dict:
                # Handle error: previous state missing, cannot initialize next round's field
                # This might require a more robust way to get initial parcels if it's the first "real" round after setup
                print(f"Warning: Previous field state not found for player {player_uid}, round {next_round_number -1}. Using default parcels.")
                initial_parcels_for_new_round = get_initial_parcels_for_field()
            else:
                initial_parcels_for_new_round = previous_round_field_state_dict["parcels"]


            new_round_create_obj = RoundCreate(
                game_id=game_id,
                player_id=player_uid,
                round_number=next_round_number,
                is_submitted=False,
                decisions=RoundDecisionBase() # Default decisions
            )
            try:
                await crud_round.create_player_round(
                    db,
                    obj_in=new_round_create_obj,
                    initial_parcels=initial_parcels_for_new_round
                )
            except Exception as e:
                # TODO: More robust error handling/rollback if setting up a round for one player fails
                print(f"Failed to initialize round {next_round_number} for player {player_uid}: {e}")
                # Potentially mark game as errored or attempt retry
    
    # Fetch full game details again to reflect changes for the response
    final_game_doc_after_round_start = await crud_game.get(db, doc_id=game_id)
    # Populate players if needed for GamePublic (similar to get_admin_game_details)
    players_info = []
    if final_game_doc_after_round_start and final_game_doc_after_round_start.player_uids:
        for p_uid in final_game_doc_after_round_start.player_uids:
            player = await crud_player.get(db, doc_id=p_uid)
            if player: players_info.append(PlayerPublic.model_validate(player.model_dump()))
    
    response_data = final_game_doc_after_round_start.model_dump()
    response_data["players"] = [p.model_dump() for p in players_info]

    return GamePublic.model_validate(response_data)


# TODO: Endpoint for admin to delete a game (soft delete or hard delete)
# TODO: Endpoint for admin to view game results / player progress
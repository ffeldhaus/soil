# File: backend/app/api/v1/endpoints/admin.py
from uuid import uuid4 
from datetime import datetime 
from typing import List, Any, Dict, Optional # MODIFIED: Added Optional
import random 

from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel 

from app.api import deps
from app.schemas.token import TokenData, Token # MODIFIED: Added Token for response
from app.schemas.game import GameCreate, GamePublic, GameInDB, GameSimple
from app.schemas.player import PlayerCreate, PlayerPublic, UserType 
from app.schemas.round import RoundCreate, RoundDecisionBase 
from app.crud.crud_game import crud_game
from app.crud.crud_player import crud_player
from app.crud.crud_round import crud_round 
from app.crud.crud_result import crud_result 
from app.game_logic import game_rules
from app.game_logic.ai_player import AIStrategyType 
from app.db.firebase_setup import get_firestore_client 
from firebase_admin import auth as firebase_auth_admin, exceptions as firebase_exceptions
from app.core.config import settings
from app.services.game_state_service import get_game_state_service, GameStateService 
from app.services.email_service import get_email_service, EmailService 
from app.core import security # MODIFIED: Added security for token creation

router = APIRouter()

# --- Helper for initializing parcels ---
def get_initial_parcels_for_field(num_parcels: int = 40) -> List[Dict[str, Any]]:
    """Generates a list of initial parcel data."""
    parcels = []
    for i in range(1, num_parcels + 1):
        parcels.append({
            "parcel_number": i,
            "soil_quality": game_rules.INITIAL_PARCEL_SOIL_QUALITY,
            "nutrient_level": game_rules.INITIAL_PARCEL_NUTRIENT_LEVEL,
            "current_plantation": game_rules.INITIAL_PARCEL_PLANTATION,
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
    db: Any = Depends(deps.get_firestore_db_client_dependency), 
    game_in: GameCreate,
    current_admin: TokenData = Depends(deps.get_current_admin_user),
    email_service: EmailService = Depends(get_email_service) 
) -> Any:
    """
    Admin endpoint to create a new game, including human and AI players.
    Sends an email to the admin with human player credentials upon successful creation.
    """
    admin_uid = current_admin.sub
    if not admin_uid: 
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authentication failed.")

    admin_doc = await crud_admin.get(db, doc_id=admin_uid) # type: ignore
    admin_name_for_email = "Admin"
    if admin_doc and admin_doc.first_name: 
        admin_name_for_email = admin_doc.first_name
    elif current_admin.email: 
        admin_name_for_email = current_admin.email.split('@')[0]


    try:
        created_game_dict = await crud_game.create_with_admin(db, obj_in=game_in, admin_id=admin_uid)
        game_id = created_game_dict["id"]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create game document: {str(e)}")

    created_players_public_info_for_response: List[PlayerPublic] = []
    player_credentials_for_email: List[Dict[str, Any]] = [] 

    player_uids_for_game: List[str] = []
    ai_player_strategies_map: Dict[str, str] = {} 

    initial_parcels_state = get_initial_parcels_for_field(num_parcels=game_rules.DEFAULT_NUMBER_OF_PARCELS_PER_PLAYER)
    
    human_player_count = game_in.requested_player_slots
    ai_player_count = game_in.ai_player_count if game_in.ai_player_count is not None else 0
    
    available_ai_strategies = [
        AIStrategyType.BALANCED, AIStrategyType.PROFIT_MAXIMIZER, 
        AIStrategyType.ECO_CONSCIOUS, AIStrategyType.RANDOM_EXPLORER
    ]

    current_player_number = 0
    # Create Human Players
    for i in range(human_player_count):
        current_player_number += 1
        player_is_ai = False
        player_username = f"Player {current_player_number}"
        player_email_domain = settings.EMAILS_FROM_EMAIL.split('@')[-1] if settings.EMAILS_FROM_EMAIL and '@' in settings.EMAILS_FROM_EMAIL else 'soil.game'
        player_email = f"player{current_player_number}.game{game_id[:6]}@{player_email_domain}"
        temp_password = f"s0il_{uuid4().hex[:6]}"

        try:
            firebase_player_user = firebase_auth_admin.create_user(
                email=player_email, password=temp_password, display_name=player_username, email_verified=True
            )
            player_uid = firebase_player_user.uid
            player_uids_for_game.append(player_uid)
            # MODIFIED: Add player_number to claims
            human_claims = {
                'role': UserType.PLAYER.value, 
                'game_id': game_id, 
                'is_ai': player_is_ai,
                'player_number': current_player_number
            }
            await firebase_auth_admin.set_custom_user_claims(player_uid, human_claims)
            # MODIFIED END

            player_schema_in = PlayerCreate(
                email=player_email, password=temp_password, username=player_username,
                game_id=game_id, player_number=current_player_number, 
                user_type=UserType.PLAYER, is_ai=player_is_ai
            )
            # crud_player.create_with_uid now handles password hashing internally
            created_player_data_dict = await crud_player.create_with_uid(db, uid=player_uid, obj_in=player_schema_in)
            
            player_public_dict_for_response = created_player_data_dict.copy()
            player_public_dict_for_response["temp_password"] = temp_password # Add for email, not for DB
            created_players_public_info_for_response.append(PlayerPublic.model_validate(player_public_dict_for_response))
            
            player_credentials_for_email.append({
                "player_number": current_player_number, "username": player_username, 
                "email": player_email, "temp_password": temp_password
            })

            initial_round_create_obj = RoundCreate(game_id=game_id, player_id=player_uid, round_number=1)
            await crud_round.create_player_round(db, obj_in=initial_round_create_obj, initial_parcels=initial_parcels_state)

        except Exception as e: 
            print(f"ERROR creating human player {current_player_number} for game {game_id}: {e}")
            await crud_game.remove(db, doc_id=game_id) # type: ignore 
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error for human player {current_player_number}: {str(e)}")

    # Create AI Players
    for i in range(ai_player_count):
        current_player_number += 1
        player_is_ai = True
        ai_strategy = available_ai_strategies[i % len(available_ai_strategies)]
        player_username = f"AI Player {i+1} ({ai_strategy.capitalize()})" 
        
        player_email_domain = settings.EMAILS_FROM_EMAIL.split('@')[-1] if settings.EMAILS_FROM_EMAIL and '@' in settings.EMAILS_FROM_EMAIL else 'soil.ai.game'
        player_email = f"ai.player{i+1}.game{game_id[:6]}@{player_email_domain}"
        ai_password = f"ai_pass_{uuid4().hex[:10]}" 

        try:
            firebase_player_user = firebase_auth_admin.create_user(
                email=player_email, password=ai_password, display_name=player_username, email_verified=True
            )
            player_uid = firebase_player_user.uid
            player_uids_for_game.append(player_uid)
            ai_player_strategies_map[player_uid] = ai_strategy 
            # MODIFIED: Add player_number to claims
            ai_claims = {
                'role': UserType.PLAYER.value, 
                'game_id': game_id, 
                'is_ai': player_is_ai, 
                'ai_strategy': ai_strategy,
                'player_number': current_player_number
            }
            await firebase_auth_admin.set_custom_user_claims(player_uid, ai_claims)
            # MODIFIED END

            player_schema_in = PlayerCreate(
                email=player_email, password=ai_password, username=player_username,
                game_id=game_id, player_number=current_player_number, 
                user_type=UserType.PLAYER, is_ai=player_is_ai
            )
            # crud_player.create_with_uid handles password hashing (though less critical for AI)
            created_player_data_dict = await crud_player.create_with_uid(db, uid=player_uid, obj_in=player_schema_in)
            
            created_players_public_info_for_response.append(PlayerPublic.model_validate(created_player_data_dict))

            initial_round_create_obj = RoundCreate(game_id=game_id, player_id=player_uid, round_number=1)
            await crud_round.create_player_round(db, obj_in=initial_round_create_obj, initial_parcels=initial_parcels_state)
            
        except Exception as e:
            print(f"ERROR creating AI player {i+1} for game {game_id}: {e}")
            await crud_game.remove(db, doc_id=game_id) # type: ignore
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error for AI player {i+1}: {str(e)}")

    try:
        game_update_payload = {
            "player_uids": player_uids_for_game,
            "ai_player_strategies": ai_player_strategies_map,
            "updated_at": datetime.now(datetime.UTC)
        }
        await db.collection(crud_game.collection_name).document(game_id).update(game_update_payload)
    except Exception as e:
        await crud_game.remove(db, doc_id=game_id) # type: ignore
        raise HTTPException(status_code=500, detail=f"Failed to link players/AI strategies to game: {str(e)}")

    final_game_doc = await crud_game.get(db, doc_id=game_id)
    if not final_game_doc:
        raise HTTPException(status_code=500, detail="Failed to retrieve created game for final response.")

    if player_credentials_for_email and current_admin.email:
        email_sent = await email_service.send_new_game_credentials_email(
            admin_email=current_admin.email,
            admin_name=admin_name_for_email,
            game_name=final_game_doc.name,
            game_id=game_id,
            players_credentials=player_credentials_for_email
        )
        if not email_sent:
            print(f"WARNING: Failed to send new game credentials email to admin {current_admin.email} for game {game_id}.")

    response_game_dict = final_game_doc.model_dump()
    response_game_dict["players"] = [p.model_dump(exclude_none=True) for p in created_players_public_info_for_response]
    return GamePublic.model_validate(response_game_dict)


@router.get("/games", response_model=List[GameSimple])
async def get_admin_games(
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_admin: TokenData = Depends(deps.get_current_admin_user),
    limit: int = 20
) -> List[GameSimple]:
    admin_uid = current_admin.sub
    games_in_db = await crud_game.get_games_by_admin_id(db, admin_id=admin_uid, limit=limit)
    return [GameSimple.model_validate(game.model_dump()) for game in games_in_db]


@router.get("/games/{game_id}", response_model=GamePublic)
async def get_admin_game_details(
    game_id: str,
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_admin: TokenData = Depends(deps.get_current_admin_user)
) -> Any:
    admin_uid = current_admin.sub
    game = await crud_game.get(db, doc_id=game_id)
    if not game or game.admin_id != admin_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Game not found or not owned by this admin.")

    players_in_game: List[PlayerPublic] = []
    if game.player_uids:
        for player_uid in game.player_uids:
            player_doc = await crud_player.get(db, doc_id=player_uid)
            if player_doc:
                players_in_game.append(PlayerPublic.model_validate(player_doc.model_dump()))
    
    game_dict = game.model_dump()
    game_dict["players"] = [p.model_dump() for p in players_in_game]
    return GamePublic.model_validate(game_dict)


@router.post("/games/{game_id}/advance-to-next-round", response_model=GamePublic)
async def advance_game_to_next_round_by_admin(
    game_id: str,
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    game_state_service: GameStateService = Depends(get_game_state_service),
    current_admin: TokenData = Depends(deps.get_current_admin_user)
) -> Any:
    admin_uid = current_admin.sub
    game = await crud_game.get(db, doc_id=game_id)

    if not game or game.admin_id != admin_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Game not found or not owned by this admin.")

    if game.game_status == "finished":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game is already finished and cannot be advanced.")
    
    updated_game_doc: Optional[GameInDB] = None # MODIFIED

    if game.game_status == "pending" and game.current_round_number == 0:
        updated_game_data = {"current_round_number": 1, "game_status": "active", "updated_at": datetime.now(datetime.UTC)}
        updated_game_dict_from_db = await crud_game.update(db, doc_id=game_id, obj_in=updated_game_data)
        if not updated_game_dict_from_db:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to start game to round 1.")
        updated_game_doc = GameInDB(**updated_game_dict_from_db)
        print(f"INFO: Game {game_id} successfully started by admin {admin_uid}, now at round 1.")
    
    elif game.game_status == "active":
        print(f"INFO: Admin {admin_uid} triggered advance for game {game_id}, round {game.current_round_number}. Delegating to GameStateService.")
        
        updated_game_doc = await game_state_service.process_round_end_and_advance(game_id=game_id)
        
        if not updated_game_doc:
            current_game_state_after_attempt = await crud_game.get(db, doc_id=game_id) 
            detail_message = f"Failed to process round {game.current_round_number} or advance the game."
            
            if current_game_state_after_attempt and current_game_state_after_attempt.current_round_number == game.current_round_number:
                 if not await game_state_service.are_all_players_submitted_for_current_round(game_id): 
                     detail_message = f"Round {game.current_round_number} cannot be advanced. Not all human players have submitted their decisions."
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=detail_message + " Check service logs for more details."
            )
        print(f"INFO: Game {game_id} successfully processed by admin {admin_uid}. New state: Round {updated_game_doc.current_round_number}, Status {updated_game_doc.game_status}")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Game is in an unhandled state ({game.game_status}) for advancing rounds."
        )

    players_info = []
    if updated_game_doc and updated_game_doc.player_uids: # MODIFIED: Check if updated_game_doc is not None
        for p_uid in updated_game_doc.player_uids:
            player = await crud_player.get(db, doc_id=p_uid)
            if player: players_info.append(PlayerPublic.model_validate(player.model_dump()))
    
    response_data_dict = updated_game_doc.model_dump() if updated_game_doc else {} # MODIFIED
    response_data_dict["players"] = [p.model_dump() for p in players_info]
    
    return GamePublic.model_validate(response_data_dict)

@router.post("/games/{game_id}/impersonate/{player_id}", response_model=Token)
async def impersonate_player(
    game_id: str,
    player_id: str, # This is the UID of the player to impersonate
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_admin: TokenData = Depends(deps.get_current_admin_user),
) -> Token:
    """
    Admin endpoint to impersonate a player in a specific game.
    Returns an access token that allows the admin to act as the specified player.
    """
    admin_uid = current_admin.sub
    if not admin_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authentication failed.")

    # 1. Fetch the game
    game = await crud_game.get(db, doc_id=game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found.")
    
    # 2. Verify admin owns the game (optional, but good practice)
    if game.admin_id != admin_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin does not own this game.")

    # 3. Fetch the player to impersonate
    player_to_impersonate = await crud_player.get(db, doc_id=player_id)
    if not player_to_impersonate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player to impersonate not found.")

    # 4. Ensure the player belongs to the game
    if player_to_impersonate.game_id != game_id or player_id not in game.player_uids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Player is not part of the specified game.")

    # 5. Generate impersonation token
    # Ensure the player's email is available for the token data
    player_email = player_to_impersonate.email
    if not player_email: # Should always have an email
        firebase_user = await firebase_auth_admin.get_user(player_id)
        player_email = firebase_user.email
        
    if not player_email: # Still no email, this is unexpected
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve player email for impersonation token.")


    token_data = {
        "sub": player_id,  # Subject is the player being impersonated
        "role": UserType.PLAYER.value, # Role is player
        "game_id": game_id,
        "email": player_email, # Player's email
        "original_sub": admin_uid,  # Store the admin's original UID
        "is_impersonating": True # Explicit flag for impersonation
    }
    
    # Use default token expiry from settings
    access_token_expires_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES 
    
    impersonation_token_str = security.create_access_token(
        data=token_data, expires_delta_minutes=access_token_expires_minutes
    )

    return Token(
        access_token=impersonation_token_str, 
        token_type="bearer",
        user_info= { # Basic info about the impersonated user
            "uid": player_id,
            "email": player_email,
            "role": UserType.PLAYER.value,
            "game_id": game_id,
            "impersonator_uid": admin_uid
        }
    )


@router.delete("/games/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_game_by_admin(
    game_id: str,
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    current_admin: TokenData = Depends(deps.get_current_admin_user)
) -> None:
    admin_uid = current_admin.sub
    game = await crud_game.get(db, doc_id=game_id)
    if not game or game.admin_id != admin_uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Game not found or not owned by this admin.")
    
    print(f"INFO: Admin {admin_uid} attempting to delete game {game_id}. Initiating cleanup.")

    player_uids_to_delete = list(game.player_uids) # Make a copy

    # 1. Delete Firebase Authentication users
    if player_uids_to_delete:
        try:
            delete_users_result = firebase_auth_admin.delete_users(player_uids_to_delete)
            print(f"INFO: Attempted to delete {len(player_uids_to_delete)} Firebase Auth users for game {game_id}.")
            print(f"  Successfully deleted: {delete_users_result.success_count}")
            if delete_users_result.failure_count > 0:
                 print(f"  WARNING: Failed to delete {delete_users_result.failure_count} Firebase Auth users:")
                 for error_info in delete_users_result.errors:
                     print(f"    Error for UID (index {error_info.index}): {error_info.reason}") 
        except firebase_exceptions.FirebaseError as fe:
            print(f"ERROR: A Firebase error occurred during bulk user deletion for game {game_id}: {fe}")
        except Exception as e: 
            print(f"ERROR: An unexpected error occurred during Firebase Auth user deletion for game {game_id}: {e}")

    batch_limit = 490 
    
    if player_uids_to_delete:
        print(f"INFO: Deleting {len(player_uids_to_delete)} player documents from Firestore for game {game_id}...")
        for i in range(0, len(player_uids_to_delete), batch_limit):
            batch = db.batch() # type: ignore
            player_uid_chunk = player_uids_to_delete[i:i + batch_limit]
            for player_uid in player_uid_chunk:
                player_ref = db.collection(crud_player.collection_name).document(player_uid) # type: ignore
                batch.delete(player_ref)
            try:
                await batch.commit()
                print(f"  Deleted batch of {len(player_uid_chunk)} player documents.")
            except Exception as e:
                print(f"  ERROR: Failed to delete a batch of player documents: {e}")
    
    async def delete_subcollection_docs(collection_path_template: str):
        collection_path = collection_path_template.format(game_id=game_id)
        print(f"INFO: Attempting to delete documents in subcollection path: {collection_path}")
        try:
            while True:
                docs_snapshot = await db.collection(collection_path).limit(batch_limit).get() # type: ignore
                if not docs_snapshot: 
                    break
                batch = db.batch() # type: ignore
                for doc in docs_snapshot:
                    batch.delete(doc.reference)
                await batch.commit()
                print(f"  Deleted batch of {len(docs_snapshot)} documents from {collection_path}.")
                if len(docs_snapshot) < batch_limit: 
                    break
        except Exception as e:
            print(f"  ERROR deleting documents from {collection_path}: {e}")

    await delete_subcollection_docs(crud_round.ROUND_COLLECTION_NAME_TEMPLATE)
    await delete_subcollection_docs(crud_round.FIELD_STATE_COLLECTION_NAME_TEMPLATE)
    await delete_subcollection_docs(crud_result.RESULT_COLLECTION_NAME_TEMPLATE.format(game_id=game_id))

    print(f"INFO: Deleting main game document {game_id}...")
    deleted_game_doc_success = await crud_game.remove(db, doc_id=game_id) # crud_game.remove returns bool
    if not deleted_game_doc_success:
        print(f"ERROR: Failed to delete main game document {game_id}.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete main game document {game_id}, but associated data might have been removed.")
    
    print(f"INFO: Game {game_id} and associated data deletion process completed by admin {admin_uid}.")
    return None

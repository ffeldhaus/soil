# File: backend/app/services/game_state_service.py
from typing import Any, List, Optional, Dict 
from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from datetime import datetime 
from fastapi import Depends # Added this line

from app.crud.crud_game import crud_game
from app.crud.crud_round import crud_round, RoundUpdate # Added RoundUpdate
from app.crud.crud_player import crud_player
from app.crud.crud_result import crud_result
from app.schemas.game import GameInDB
from app.schemas.round import RoundInDB, RoundCreate, RoundDecisionBase 
from app.schemas.parcel import ParcelInDB, PlantationType 
from app.game_logic.calculation_engine import orchestrate_round_calculations, PlayerRoundInputBundle
from app.game_logic.ai_player import generate_ai_player_decisions, AIStrategyType # Added AI
from app.schemas.result import ResultCreate
from app.api import deps 


class GameStateService:
    """
    Service layer for managing game state transitions, round processing,
    and orchestrating game logic.
    """

    def __init__(self, db: AsyncFirestoreClient):
        self.db = db

    async def are_all_players_submitted_for_current_round(self, game_id: str) -> bool:
        """
        Checks if all active players in a game have submitted their decisions
        for the game's current round.
        """
        game = await crud_game.get(self.db, doc_id=game_id)
        if not game:
            print(f"GameStateService: Game not found with ID {game_id}")
            return False

        if not game.player_uids:
            print(f"GameStateService: Game {game_id} has no players.")
            return True 

        if game.current_round_number == 0:
            print(f"GameStateService: Game {game_id} is at round 0, submissions not applicable yet.")
            return False

        all_submitted = True
        for player_uid in game.player_uids:
            player_round_data = await crud_round.get_player_round(
                self.db,
                game_id=game_id,
                player_id=player_uid,
                round_number=game.current_round_number
            )
            if not player_round_data or not player_round_data.is_submitted:
                all_submitted = False
                break
        
        return all_submitted

    async def _ensure_ai_player_decisions_submitted(self, game: GameInDB) -> bool:
        """
        For a given active game and its current round, ensures all AI players
        have their decisions generated and submitted.
        Returns True if all AI submissions are successful, False otherwise.
        """
        if not game.ai_player_strategies: # No AI players defined for this game
            return True

        current_round_number = game.current_round_number
        if current_round_number == 0: # No decisions for round 0
            return True

        all_ai_submissions_successful = True
        for player_uid, ai_strategy_name in game.ai_player_strategies.items():
            player_doc = await crud_player.get(self.db, doc_id=player_uid)
            if not player_doc or not player_doc.is_ai:
                print(f"WARNING: Player {player_uid} listed in ai_player_strategies not found or not marked as AI. Skipping AI decision.")
                continue

            # Check if AI has already "submitted" for this round
            ai_round_doc = await crud_round.get_player_round(
                self.db, game_id=game.id, player_id=player_uid, round_number=current_round_number
            )
            if ai_round_doc and ai_round_doc.is_submitted:
                print(f"INFO: AI Player {player_uid} (Strat: {ai_strategy_name}) already submitted for round {current_round_number}.")
                continue
            
            if not ai_round_doc:
                print(f"ERROR: Round document for AI player {player_uid}, round {current_round_number} not found. Cannot generate decisions.")
                all_ai_submissions_successful = False
                continue

            print(f"INFO: Generating decisions for AI Player {player_uid} (Strat: {ai_strategy_name}) for round {current_round_number}...")
            
            current_field_state_dict = await crud_round.get_player_field_state(
                self.db, game_id=game.id, player_id=player_uid, round_number=current_round_number
            )
            if not current_field_state_dict or "parcels" not in current_field_state_dict:
                print(f"ERROR: Field state for AI player {player_uid}, round {current_round_number} not found. Cannot generate decisions.")
                all_ai_submissions_successful = False
                continue
            
            current_parcels_for_ai: List[ParcelInDB] = [
                ParcelInDB.model_validate(p_data) for p_data in current_field_state_dict["parcels"]
            ]

            previous_ai_result: Optional[ResultCreate] = None
            if current_round_number > 1:
                prev_res_db = await crud_result.get_player_round_result(
                    self.db, game_id=game.id, player_id=player_uid, round_number=current_round_number -1
                )
                if prev_res_db:
                    previous_ai_result = ResultCreate.model_validate(prev_res_db.model_dump())

            ai_round_decisions, ai_parcel_choices = generate_ai_player_decisions(
                player_id=player_uid,
                current_field_state=current_parcels_for_ai,
                strategy=ai_strategy_name,
                current_round_number=current_round_number,
                previous_result=previous_ai_result
            )

            # "Submit" these decisions for the AI
            # This involves updating the RoundInDB and its associated FieldState parcels
            ai_round_update_obj = RoundUpdate(decisions=ai_round_decisions, is_submitted=True)
            
            # Prepare updated parcels data based on AI choices
            updated_ai_parcels_data_list = []
            existing_ai_parcels_map = {p.parcel_number: p.model_dump() for p in current_parcels_for_ai}
            for parcel_num, new_plantation_choice in ai_parcel_choices.items():
                if parcel_num in existing_ai_parcels_map:
                    existing_ai_parcels_map[parcel_num]["current_plantation"] = new_plantation_choice.value
            updated_ai_parcels_data_list = list(existing_ai_parcels_map.values())

            try:
                await crud_round.update_player_round_decisions(
                    self.db,
                    game_id=game.id,
                    player_id=player_uid,
                    round_number=current_round_number,
                    obj_in=ai_round_update_obj,
                    updated_parcels_data=updated_ai_parcels_data_list
                )
                print(f"INFO: AI Player {player_uid} decisions for round {current_round_number} submitted successfully.")
            except Exception as e:
                print(f"ERROR: Failed to submit AI Player {player_uid} decisions for round {current_round_number}: {e}")
                all_ai_submissions_successful = False
        
        return all_ai_submissions_successful


    async def process_round_end_and_advance(self, game_id: str) -> Optional[GameInDB]:
        """
        Orchestrates the end-of-round processing and advances the game to the next round.
        """
        print(f"INFO: Starting round end processing for game: {game_id}")
        game = await crud_game.get(self.db, doc_id=game_id)
        if not game:
            print(f"ERROR: Game {game_id} not found for round processing. Aborting.")
            return None
        
        if game.game_status != "active":
            print(f"ERROR: Game {game_id} is not active (Status: {game.game_status}). Aborting round processing.")
            return None

        if game.current_round_number == 0:
            print(f"ERROR: Game {game_id} is at round 0. Cannot process round end directly via this method.")
            return None

        current_processing_round_number = game.current_round_number
        print(f"INFO: Game {game_id} - Current processing round: {current_processing_round_number}")

        # Ensure AI players have their decisions submitted before checking all players
        print(f"INFO: Game {game_id} - Ensuring AI player decisions are submitted for round {current_processing_round_number}.")
        ai_submissions_ok = await self._ensure_ai_player_decisions_submitted(game)
        if not ai_submissions_ok:
            print(f"ERROR: Game {game_id} - Failed to submit decisions for one or more AI players. Halting round processing.")
            # Consider setting game to an error state
            return None
        print(f"INFO: Game {game_id} - AI player decision submission check complete for round {current_processing_round_number}.")

        # Now check if ALL players (human + AI) are submitted
        if not await self.are_all_players_submitted_for_current_round(game_id):
            print(f"ERROR: Not all players (human or AI) have submitted for round {current_processing_round_number} in game {game_id}. Halting.")
            return None


        # Step 1: Data Gathering (for calculation engine)
        all_player_inputs: List[PlayerRoundInputBundle] = []
        player_processing_errors: Dict[str, str] = {} 

        for player_uid in game.player_uids:
            try:
                player_doc = await crud_player.get(self.db, doc_id=player_uid)
                if not player_doc:
                    raise ValueError(f"Player document not found for UID {player_uid}")

                player_submitted_round_doc = await crud_round.get_player_round(
                    self.db, game_id=game_id, player_id=player_uid, round_number=current_processing_round_number
                )
                # This check is now theoretically redundant due to are_all_players_submitted_for_current_round
                if not player_submitted_round_doc or not player_submitted_round_doc.is_submitted:
                    raise ValueError(f"Player {player_uid} has not submitted for round {current_processing_round_number} (should have been caught).")

                field_state_dict = await crud_round.get_player_field_state(
                    self.db, game_id=game_id, player_id=player_uid, round_number=current_processing_round_number
                )
                if not field_state_dict or "parcels" not in field_state_dict:
                    raise ValueError(f"Field state for round {current_processing_round_number} not found for player {player_uid}")
                
                parcels_with_choices: List[ParcelInDB] = [
                    ParcelInDB.model_validate(p_data) for p_data in field_state_dict["parcels"]
                ]
                plantation_choices: Dict[int, PlantationType] = {
                    p.parcel_number: p.current_plantation for p in parcels_with_choices
                }

                previous_result_doc: Optional[ResultCreate] = None
                if current_processing_round_number > 1:
                    prev_result_db = await crud_result.get_player_round_result(
                        self.db, game_id=game_id, player_id=player_uid, round_number=current_processing_round_number - 1
                    )
                    if prev_result_db:
                        previous_result_doc = ResultCreate.model_validate(prev_result_db.model_dump())
                    else:
                        print(f"WARNING: Previous round result for player {player_uid}, round {current_processing_round_number -1} not found. Defaults will be used.")
                
                all_player_inputs.append(PlayerRoundInputBundle(
                    player_doc=player_doc,
                    player_round_doc=player_submitted_round_doc,
                    parcel_plantation_choices=plantation_choices,
                    initial_field_state_for_this_round=parcels_with_choices,
                    previous_round_result_for_player=previous_result_doc
                ))
            except ValueError as e:
                player_processing_errors[player_uid] = str(e)
                print(f"ERROR: Data gathering failed for player {player_uid} in game {game_id}: {e}")
            except Exception as e: 
                player_processing_errors[player_uid] = f"Unexpected error during data gathering: {str(e)}"
                print(f"CRITICAL ERROR: Unexpected error during data gathering for player {player_uid} in game {game_id}: {e}")


        if player_processing_errors or not all_player_inputs:
             print(f"ERROR: Halting round processing for game {game_id} due to data gathering errors: {player_processing_errors}")
             return None

        # Step 2: Call the calculation engine
        print(f"INFO: Calling calculation engine for game {game_id}, round {current_processing_round_number} with {len(all_player_inputs)} player inputs.")
        try:
            all_player_outputs = await orchestrate_round_calculations(self.db, game, all_player_inputs)
            print(f"INFO: Calculation engine finished for game {game_id}, round {current_processing_round_number}.")
        except Exception as e:
            print(f"CRITICAL ERROR: Calculation engine failed for game {game_id}, round {current_processing_round_number}: {e}")
            return None

        # Step 3: Persist results for the current round
        persistence_successful_for_all_players = True
        for output_bundle in all_player_outputs:
            try:
                await crud_result.create_player_round_result(
                    self.db, obj_in=output_bundle.calculated_result_for_this_round
                )
                print(f"INFO: Result for player {output_bundle.player_id}, round {output_bundle.round_number} persisted.")
            except Exception as e:
                print(f"CRITICAL ERROR: Failed to persist result for player {output_bundle.player_id}, round {output_bundle.round_number}: {e}.")
                player_processing_errors[output_bundle.player_id] = f"Result persistence failed: {str(e)}"
                persistence_successful_for_all_players = False
        
        if not persistence_successful_for_all_players:
            print(f"ERROR: Halting game advancement for game {game_id} due to result persistence errors: {player_processing_errors}")
            return None 

        # Step 4: Determine next round and game status
        next_round_number = current_processing_round_number + 1
        is_game_finished = next_round_number > game.number_of_rounds
        updated_game_data: Dict[str, Any] = {"updated_at": datetime.now(datetime.UTC)}

        if is_game_finished:
            updated_game_data["game_status"] = "finished"
            updated_game_data["current_round_number"] = game.number_of_rounds 
            print(f"INFO: Game {game_id} finished after round {game.current_round_number}.")
        else:
            updated_game_data["current_round_number"] = next_round_number
            print(f"INFO: Game {game_id} advancing to round {next_round_number}.")

            # Step 5: For each player, create new RoundInDB and FieldState for the *next* round
            setup_next_round_successful_for_all = True
            for output_bundle in all_player_outputs: 
                initial_parcels_for_next_round = [p.model_dump() for p in output_bundle.field_state_for_next_round_start]
                
                new_round_doc_for_player = RoundCreate(
                    game_id=game_id,
                    player_id=output_bundle.player_id,
                    round_number=next_round_number,
                    is_submitted=False,
                    decisions=RoundDecisionBase() 
                )
                try:
                    await crud_round.create_player_round(
                        self.db,
                        obj_in=new_round_doc_for_player,
                        initial_parcels=initial_parcels_for_next_round
                    )
                    print(f"INFO: Initialized round {next_round_number} and field state for player {output_bundle.player_id}.")
                except Exception as e:
                    print(f"CRITICAL ERROR: Failed to initialize round {next_round_number} for player {output_bundle.player_id}: {e}.")
                    player_processing_errors[output_bundle.player_id] = f"Next round setup failed: {str(e)}"
                    setup_next_round_successful_for_all = False
            
            if not setup_next_round_successful_for_all:
                print(f"ERROR: Halting game advancement for game {game_id} due to errors setting up next round: {player_processing_errors}")
                return None

        # Step 6: Update the main game document 
        try:
            updated_game_dict = await crud_game.update(self.db, doc_id=game_id, obj_in=updated_game_data)
            if not updated_game_dict:
                raise Exception("crud_game.update returned None")
            print(f"INFO: Game {game_id} successfully updated. New round: {updated_game_dict.get('current_round_number')}, Status: {updated_game_dict.get('game_status')}")
            return GameInDB(**updated_game_dict)
        except Exception as e:
            print(f"CRITICAL ERROR: Failed to update game {game_id} document after round {current_processing_round_number} processing: {e}.")
            return None


# Dependency to get an instance of the service
def get_game_state_service(db: AsyncFirestoreClient = Depends(deps.get_firestore_db_client_dependency)) -> GameStateService:
    return GameStateService(db=db)
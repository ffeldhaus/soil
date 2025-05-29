# File: backend/app/schemas/game.py
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timezone

from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from pydantic.alias_generators import to_camel # Import to_camel
from enum import Enum

from .player import PlayerPublic # PlayerPublic will need its own camelCase config
from app.core.config import settings

class GameStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    FINISHED = "finished"
    ARCHIVED = "archived"

class GameStage(str, Enum):
    INITIAL_SETUP = "initial_setup"
    REGISTRATION = "registration"
    PRE_ROUND = "pre_round"
    MID_ROUND = "mid_round"
    POST_ROUND = "post_round"
    GAME_OVER = "game_over"

class GameBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100, description="Name of the game session")
    number_of_rounds: int = Field(
        default=settings.DEFAULT_GAME_ROUNDS,
        ge=5, 
        le=50, 
        description="Total number of rounds in the game"
    )
    max_players: int = Field(
        default=settings.MAX_PLAYERS_PER_GAME,
        ge=settings.MIN_PLAYERS_PER_GAME, 
        le=10, 
        description="Maximum number of players allowed in the game"
    )
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True # In case enums are added here directly later
    )


class GameCreate(GameBase):
    requested_player_slots: int = Field(
        ...,
        ge=0, 
        description="Number of human player slots requested for this game"
    )
    ai_player_count: Optional[int] = Field(
        default=0,
        ge=0,
        description="Number of AI players to add. Total players (human + AI) must not exceed max_players."
    )
    # This model is for request, aliasing config in GameBase might affect it if not overridden.
    # For requests, if frontend sends snake_case, GameBase config is fine.
    # If frontend sends camelCase for GameBase fields, this is also fine due to GameBase config.

    @model_validator(mode='after')
    def check_total_players_not_exceed_max(cls, data: Any) -> Any:
        # This validator uses attribute names directly (snake_case)
        if isinstance(data, BaseModel): 
            requested_slots = data.requested_player_slots
            ai_count = data.ai_player_count if data.ai_player_count is not None else 0
            max_p = data.max_players
            # Ensure GameBase fields are accessed by their Python attribute names
        elif isinstance(data, dict): 
            # If validating raw dict, use original keys or consider alias if populated by alias
            requested_slots = data.get('requested_player_slots', data.get('requestedPlayerSlots',0))
            ai_count = data.get('ai_player_count', data.get('aiPlayerCount',0))
            max_p = data.get('max_players', data.get('maxPlayers', settings.MAX_PLAYERS_PER_GAME))
        else: 
            return data

        total_players = requested_slots + ai_count
        if total_players > max_p:
            raise ValueError(f"Total players ({total_players}) cannot exceed max_players ({max_p}).")
        if total_players < settings.MIN_PLAYERS_PER_GAME:
             raise ValueError(f"Total players ({total_players}) must be at least {settings.MIN_PLAYERS_PER_GAME}.")
        if requested_slots == 0 and ai_count == 0: 
            raise ValueError("A game must have at least one player (human or AI).")
        return data

class GameUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    model_config = ConfigDict(extra='forbid') # Primarily for request validation


class GameInDBBase(GameBase):
    id: str = Field(default_factory=lambda: str(uuid4()), description="Unique ID for the game (Firestore Document ID)")
    admin_id: str = Field(..., description="UID of the admin who created the game")
    current_round_number: int = Field(default=0, description="Current active round number (0 means game not started or just finished)")
    game_status: GameStatus = Field(default=GameStatus.PENDING, description="Status of the game")
    game_stage: GameStage = Field(default=GameStage.INITIAL_SETUP, description="Current stage of the game lifecycle")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    weather_sequence: List[str] = Field(default_factory=list, description="Sequence of weather events for each round")
    vermin_sequence: List[str] = Field(default_factory=list, description="Sequence of vermin events for each round")
    player_uids: List[str] = Field(default_factory=list)
    ai_player_strategies: Optional[Dict[str, str]] = Field(default_factory=dict, description="Strategies assigned to AI players by their UID")

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )


class GameInDB(GameInDBBase):
    pass # Inherits config


class GamePublic(GameInDBBase):
    players: Optional[List[PlayerPublic]] = Field(default_factory=list, description="List of players in the game")
    # Inherits GameInDBBase config, so will output camelCase.
    # PlayerPublic items will be camelCased by PlayerPublic's own config.
    
class GameDetailsPublic(GamePublic):
    # weather_sequence, vermin_sequence, ai_player_strategies are already part of GameInDBBase
    # This class inherits the config from GamePublic -> GameInDBBase and will serialize to camelCase.
    # No separate config needed unless overriding behavior.
    pass 

class GameSimple(BaseModel):
    id: str
    name: str
    current_round_number: int
    game_status: str
    admin_id: str
    max_players: int
    # player_count: Optional[int] = None # Example: if you want to add this field explicitly
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )

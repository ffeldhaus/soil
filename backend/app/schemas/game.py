# File: backend/app/schemas/game.py
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timezone # MODIFIED: Import timezone

from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator 

from .player import PlayerPublic 
from app.core.config import settings 

class GameBase(BaseModel):
    """
    Base properties for a Game.
    """
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
    model_config = ConfigDict(use_enum_values=True)


class GameCreate(GameBase):
    """
    Properties to receive via API on game creation.
    Typically created by an Admin.
    """
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

    @model_validator(mode='after')
    def check_total_players_not_exceed_max(cls, data: Any) -> Any:
        if isinstance(data, BaseModel): 
            requested_slots = data.requested_player_slots
            ai_count = data.ai_player_count if data.ai_player_count is not None else 0
            max_p = data.max_players
        elif isinstance(data, dict): 
            requested_slots = data.get('requested_player_slots', 0)
            ai_count = data.get('ai_player_count', 0)
            max_p = data.get('max_players', settings.MAX_PLAYERS_PER_GAME)
        else: 
            return data

        total_players = requested_slots + ai_count
        
        if total_players > max_p:
            raise ValueError(
                f"Total players ({total_players} = {requested_slots} human + {ai_count} AI) "
                f"cannot exceed max_players ({max_p})."
            )
        if total_players < settings.MIN_PLAYERS_PER_GAME:
             raise ValueError(
                f"Total players ({total_players}) must be at least {settings.MIN_PLAYERS_PER_GAME}."
            )
        if requested_slots == 0 and ai_count == 0: 
            raise ValueError("A game must have at least one player (human or AI).")
            
        return data


class GameUpdate(BaseModel):
    """
    Properties to receive via API on game update.
    """
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    model_config = ConfigDict(extra='forbid')


class GameInDBBase(GameBase):
    """
    Base properties for a Game as stored in the database.
    """
    id: str = Field(default_factory=lambda: str(uuid4()), description="Unique ID for the game (Firestore Document ID)")
    admin_id: str = Field(..., description="UID of the admin who created the game")
    current_round_number: int = Field(default=0, description="Current active round number (0 means game not started or just finished)")
    game_status: str = Field(default="pending", description="Status: pending, active, finished, archived") 

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) # MODIFIED
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) # MODIFIED

    weather_sequence: List[str] = Field(default_factory=list, description="Sequence of weather events for each round")
    vermin_sequence: List[str] = Field(default_factory=list, description="Sequence of vermin events for each round")
    player_uids: List[str] = Field(default_factory=list)
    ai_player_strategies: Optional[Dict[str, str]] = Field(default_factory=dict, description="Strategies assigned to AI players by their UID")


    model_config = ConfigDict(from_attributes=True)


class GameInDB(GameInDBBase):
    """
    Represents a Game object as stored in the database.
    """
    pass


class GamePublic(GameInDBBase):
    """
    Properties to return to the client for a game.
    """
    players: Optional[List[PlayerPublic]] = Field(default_factory=list, description="List of players in the game")
    
class GameDetailsPublic(GamePublic):
    """
    More detailed public representation of a game, potentially for an admin
    or for a player within that specific game, might include sequences.
    """
    weather_sequence: List[str] 
    vermin_sequence: List[str]  
    ai_player_strategies: Optional[Dict[str, str]] 

class GameSimple(BaseModel):
    id: str
    name: str
    current_round_number: int
    game_status: str
    admin_id: str
    max_players: int
    model_config = ConfigDict(from_attributes=True)
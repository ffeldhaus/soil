from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict, field_validator

from .player import PlayerPublic # To show players in a game
from app.core.config import settings # For default game rounds

class GameBase(BaseModel):
    """
    Base properties for a Game.
    """
    name: str = Field(..., min_length=3, max_length=100, description="Name of the game session")
    number_of_rounds: int = Field(
        default=settings.DEFAULT_GAME_ROUNDS,
        ge=5, # Minimum 5 rounds
        le=50, # Maximum 50 rounds, can be adjusted
        description="Total number of rounds in the game"
    )
    max_players: int = Field(
        default=settings.MAX_PLAYERS_PER_GAME,
        ge=settings.MIN_PLAYERS_PER_GAME, # Ensure it's at least min_players
        le=10, # Absolute max, can be adjusted
        description="Maximum number of players allowed in the game"
    )
    # current_round_number will be managed by the game logic, not set directly on creation
    # game_status: str = Field(default="pending", description="Status: pending, active, finished")

    model_config = ConfigDict(use_enum_values=True)


class GameCreate(GameBase):
    """
    Properties to receive via API on game creation.
    Typically created by an Admin.
    """
    # admin_id: str = Field(..., description="UID of the admin creating the game") # This will be derived from the authenticated admin
    # Number of human players requested. AI players might fill the rest up to max_players.
    requested_player_slots: int = Field(
        ...,
        ge=1, # At least one human player initially
        description="Number of human player slots requested for this game"
    )
    # ai_player_count: Optional[int] = Field(0, ge=0, description="Number of AI players to add")

    @field_validator('requested_player_slots')
    @classmethod
    def check_player_slots(cls, value: int, info: 'ConfigDict') -> int:
        # info.data will contain the values already processed.
        # We need to access max_players from the values passed to the model instance.
        # This validation is a bit tricky here if max_players isn't set yet or comes from defaults.
        # It's better to validate this in the endpoint/service layer after model creation.
        # For Pydantic v2, info.data gives access to other fields.
        max_players_val = info.data.get('max_players', settings.MAX_PLAYERS_PER_GAME) # Get max_players or its default
        if value > max_players_val:
            raise ValueError(f"Requested player slots ({value}) cannot exceed max players ({max_players_val})")
        return value

    # Optional: Password for players to join this specific game, if not using direct admin assignment
    # game_password: Optional[str] = Field(None, min_length=4, max_length=20, description="Optional password for players to join this game")


class GameUpdate(BaseModel):
    """
    Properties to receive via API on game update.
    Only certain fields might be updatable, e.g., game name before it starts.
    """
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    # game_status: Optional[str] = None # e.g., to start or end a game
    # Potentially other fields an admin might want to change before game start.

    model_config = ConfigDict(extra='forbid')


class GameInDBBase(GameBase):
    """
    Base properties for a Game as stored in the database.
    """
    id: str = Field(default_factory=lambda: str(uuid4()), description="Unique ID for the game (Firestore Document ID)")
    admin_id: str = Field(..., description="UID of the admin who created the game")
    
    current_round_number: int = Field(default=0, description="Current active round number (0 means game not started or just finished)")
    game_status: str = Field(default="pending", description="Status: pending, active, finished, archived") # pending, active, paused, completed

    # Timestamps (Firestore can manage these automatically)
    created_at: datetime = Field(default_factory=lambda: datetime.now(datetime.UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(datetime.UTC))

    # Store the actual weather and vermin sequence for the game
    # These would be generated upon game creation based on number_of_rounds
    weather_sequence: List[str] = Field(default_factory=list, description="Sequence of weather events for each round")
    vermin_sequence: List[str] = Field(default_factory=list, description="Sequence of vermin events for each round")
    
    # List of player UIDs participating in this game
    # This helps in querying games a player is in, or fetching all player details for a game.
    player_uids: List[str] = Field(default_factory=list)


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
    # Basic game info is inherited.
    # We might want to include player details.
    players: Optional[List[PlayerPublic]] = Field(default_factory=list, description="List of players in the game")
    
    # We might not want to expose the full weather/vermin sequence upfront to players
    # current_weather: Optional[str] = None # Weather for the *current* round
    # current_vermin: Optional[str] = None  # Vermin for the *current* round

    # Exclude sequences from general public view if they are secret until round start
    weather_sequence: Optional[List[str]] = Field(default_factory=list, exclude=True) # Exclude by default
    vermin_sequence: Optional[List[str]] = Field(default_factory=list, exclude=True)  # Exclude by default


class GameDetailsPublic(GamePublic):
    """
    More detailed public representation of a game, potentially for an admin
    or for a player within that specific game, might include sequences.
    """
    weather_sequence: List[str] # Override to include for this specific view
    vermin_sequence: List[str]  # Override to include for this specific view

# Minimal representation for lists or links
class GameSimple(BaseModel):
    id: str
    name: str
    current_round_number: int
    game_status: str
    admin_id: str
    max_players: int
    
    model_config = ConfigDict(from_attributes=True)
# File: backend/app/schemas/player.py
from typing import Optional, List, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from pydantic.alias_generators import to_camel # Import to_camel

from .user import UserBase, UserCreate, UserInDBBase, UserPublic, UserType

class PlayerBase(UserBase):
    user_type: UserType = Field(default=UserType.PLAYER, frozen=True, description="Type of the user, fixed to player")
    username: Optional[str] = Field(None, max_length=50, description="Player's display name or username in the game")
    game_id: Optional[str] = Field(None, description="ID of the game the player belongs to (Firestore document ID or custom ID)")
    player_number: Optional[int] = Field(None, ge=1, description="Player's number within the game")
    is_ai: bool = Field(default=False, description="Is this player controlled by AI?")
    ai_strategy: Optional[str] = Field(None, description="Strategy name if player is AI") # Added ai_strategy

    # Configure for camelCase output, inherited by PlayerInDB and PlayerPublic
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )

class PlayerCreate(UserCreate, PlayerBase):
    user_type: UserType = Field(default=UserType.PLAYER, frozen=True) 
    email: EmailStr = Field(..., description="Player's email address")
    password: str = Field(..., min_length=6, description="Player's password")
    username: Optional[str] = Field(None, max_length=50)
    game_id: str = Field(..., description="ID of the game the player is being added to")
    player_number: Optional[int] = Field(None, ge=1)
    is_ai: bool = Field(default=False)
    ai_strategy: Optional[str] = Field(None) # Added ai_strategy
    # Request model - aliasing for request parsing depends on UserCreate and PlayerBase config.
    # If UserCreate has no alias config, its fields (email, password) are expected as snake_case/single word.
    # PlayerBase fields will be converted from camelCase if sent that way due to its config.

class PlayerUpdate(BaseModel):
    username: Optional[str] = Field(None, max_length=50)
    password: Optional[str] = Field(None, min_length=6)
    is_active: Optional[bool] = Field(None)
    model_config = ConfigDict(
        extra='forbid', 
        populate_by_name=True, 
        alias_generator=to_camel # If request body for update can be camelCase
    ) 

class PlayerInDB(UserInDBBase, PlayerBase):
    game_id: str = Field(..., description="ID of the game the player belongs to")
    is_ai: bool = Field(default=False)
    temp_password_hash: Optional[str] = Field(None, description="Hash of the temporary password")
    current_capital: float = Field(default=0.0, description="Player's current capital in the game") # Added current_capital
    # Inherits UserInDBBase config (needs camelCase) and PlayerBase config (has camelCase)
    # Explicitly define config to ensure from_attributes and aliasing are combined.
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )

class PlayerPublic(UserPublic, PlayerBase):
    username: Optional[str] = Field(None, max_length=50)
    game_id: Optional[str] = Field(None)
    player_number: Optional[int] = Field(None, ge=1)
    is_ai: bool = Field(default=False)
    current_capital: Optional[float] = Field(None) # Added current_capital
    ai_strategy: Optional[str] = Field(None) # Added ai_strategy

    # UserPublic also needs to be configured for camelCase output.
    # The effective config here will depend on how Pydantic merges configs from multiple base classes.
    # It's often safer to be explicit on the final response model if there's ambiguity.
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )

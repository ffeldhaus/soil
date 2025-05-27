from typing import Optional, Any, Dict # Changed from Any to Dict for user_info
from pydantic import BaseModel, Field, ConfigDict # Added ConfigDict
from pydantic.alias_generators import to_camel # Added to_camel

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    # user_info dict keys are constructed as camelCase in auth.py
    user_info: Optional[Dict[str, Any]] = Field(None, description="Basic user information") 

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True # In case enums are ever added
    )

class TokenData(BaseModel):
    sub: str = Field(..., description="Subject of the token, typically user ID (UID from Firebase)")
    exp: Optional[int] = Field(None, description="Expiration time (Unix timestamp)")
    role: Optional[str] = Field(None, description="User role (e.g., admin, player)")
    email: Optional[str] = Field(None, description="User's email")
    game_id: Optional[str] = Field(None, description="Game ID, relevant for players")
    player_number: Optional[int] = Field(None, description="Player number in the game") # Added from auth.py logic
    is_ai: Optional[bool] = Field(None, description="Whether the player is AI") # Added from auth.py logic
    original_sub: Optional[str] = Field(None, description="Original subject/admin ID if impersonating")
    is_impersonating: Optional[bool] = Field(False, description="True if this token is for an impersonation session")
    # No alias generator needed here as this is for JWT internal structure, not direct API response body key casing.

class FirebaseIdToken(BaseModel):
    id_token: str = Field(..., description="Firebase ID Token obtained from client-side Firebase SDK")
    # If frontend sends {"idToken": "..."}, then this would need:
    # model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    # Assuming frontend sends {"id_token": "..."} for now.

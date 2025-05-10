from typing import Optional, Any
from pydantic import BaseModel, Field

class Token(BaseModel):
    """
    Schema for the access token response.
    This is what the /login/id-token endpoint will return.
    """
    access_token: str
    token_type: str = "bearer"
    user_info: Optional[dict[str, Any]] = None # To include basic user info like uid, role, email


class TokenData(BaseModel):
    """
    Schema for the data embedded within a JWT access token (the payload).
    This is used when decoding a token to access its contents.
    'sub' is the standard JWT claim for the subject (user identifier).
    """
    sub: str = Field(..., description="Subject of the token, typically user ID (UID from Firebase)")
    exp: Optional[int] = Field(None, description="Expiration time (Unix timestamp)")
    # Custom claims
    role: Optional[str] = Field(None, description="User role (e.g., admin, player)")
    email: Optional[str] = Field(None, description="User's email")
    game_id: Optional[str] = Field(None, description="Game ID, relevant for players")
    # Add any other custom data you want to store in the token payload

class FirebaseIdToken(BaseModel):
    """
    Schema for the request body when the client sends a Firebase ID token.
    """
    id_token: str = Field(..., description="Firebase ID Token obtained from client-side Firebase SDK")
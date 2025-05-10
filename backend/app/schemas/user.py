# File: backend/app/schemas/user.py
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from enum import Enum

# --- Enums ---
class UserType(str, Enum):
    ADMIN = "admin"
    PLAYER = "player"
    # Add SUPERUSER if you implement a separate superuser type

# --- Base User Properties ---
class UserBase(BaseModel):
    """
    Base schema for user properties.
    """
    email: EmailStr = Field(..., description="User's email address (must be unique for Firebase Auth)")
    user_type: UserType = Field(UserType.PLAYER, description="Type of the user (admin or player)")
    
    # Optional fields that might be common
    is_active: bool = Field(True, description="Whether the user account is active")
    # Firebase Auth UID will be the primary ID, not stored directly here for creation,
    # but will be part of UserInDB.

    model_config = ConfigDict(use_enum_values=True) # Store enum values as strings

# --- Properties to receive via API on creation ---
class UserCreate(UserBase):
    """
    Schema for creating a new user. Includes password.
    This is a generic base, specific AdminCreate and PlayerCreate will inherit/extend.
    """
    password: str = Field(..., min_length=8, description="User's password (at least 8 characters)")

# --- Properties stored in DB ---
class UserInDBBase(UserBase):
    """
    Base schema for user properties as stored in the database (e.g., Firestore).
    Includes the Firebase UID as the primary identifier.
    """
    uid: str = Field(..., description="Firebase Authentication User ID (UID)")
    # Timestamps that Firestore typically manages automatically, but good to have in schema
    # created_at: Optional[datetime] = Field(default_factory=datetime.now(timezone.utc))
    # updated_at: Optional[datetime] = Field(default_factory=datetime.now(timezone.utc))

    model_config = ConfigDict(from_attributes=True) # Allow creating from ORM models or dicts with these attrs


class UserInDB(UserInDBBase):
    """
    Represents a user object as stored in the database.
    This can be a generic representation.
    """
    # Potentially add other common fields here if they apply to all user types
    pass


# --- Properties to return to client (Public User Information) ---
class UserPublic(UserBase):
    """
    Schema for publicly available user information.
    Does NOT include sensitive data like password hashes or UIDs if not needed by client.
    Firebase UID is often needed by the client for Firebase interactions.
    """
    uid: str = Field(..., description="Firebase Authentication User ID (UID)")
    # You might not want to expose user_type directly to all clients,
    # or it might be part of a more specific response model (AdminPublic, PlayerPublic).
    # For now, including it for clarity.

    # Override user_type if you want to control its presence in the public model
    # user_type: Optional[UserType] = None

    model_config = ConfigDict(from_attributes=True)
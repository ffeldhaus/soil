# File: backend/app/schemas/user.py
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from pydantic.alias_generators import to_camel # Import to_camel
from enum import Enum

# --- Enums ---
class UserType(str, Enum):
    ADMIN = "admin"
    PLAYER = "player"

# --- Base User Properties ---
class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User's email address (must be unique for Firebase Auth)")
    user_type: UserType = Field(UserType.PLAYER, description="Type of the user (admin or player)")
    is_active: bool = Field(True, description="Whether the user account is active")

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True # Store enum values as strings
    )

# --- Properties to receive via API on creation ---
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="User's password (at least 8 characters)")
    # Inherits model_config from UserBase. If frontend sends camelCase for UserBase fields,
    # it will be correctly parsed.

# --- Properties stored in DB ---
class UserInDBBase(UserBase):
    uid: str = Field(..., description="Firebase Authentication User ID (UID)")
    # Timestamps can be added here if managed by application logic alongside Firestore auto-timestamps
    # created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    # updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(
        from_attributes=True, 
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )

class UserInDB(UserInDBBase):
    pass # Inherits config

# --- Properties to return to client (Public User Information) ---
class UserPublic(UserBase):
    uid: str = Field(..., description="Firebase Authentication User ID (UID)")
    # display_name: Optional[str] = Field(None, description="User's display name from Firebase or profile") # Example if needed

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )

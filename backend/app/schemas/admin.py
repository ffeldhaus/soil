# File: backend/app/schemas/admin.py
from typing import Optional, List
from datetime import datetime # Ensure datetime is imported

from pydantic import BaseModel, EmailStr, Field, HttpUrl, ConfigDict
from pydantic.alias_generators import to_camel

from .user import UserBase, UserCreate, UserInDBBase, UserPublic, UserType

class AdminBase(UserBase):
    user_type: UserType = Field(default=UserType.ADMIN, frozen=True, description="Type of the user, fixed to admin")
    first_name: Optional[str] = Field(None, max_length=128, description="Admin's first name")
    last_name: Optional[str] = Field(None, max_length=128, description="Admin's last name")
    full_name: Optional[str] = Field(None, description="Admin's full name")
    institution: Optional[str] = Field(None, max_length=128, description="Admin's institution")

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )

class AdminCreate(UserCreate, AdminBase):
    user_type: UserType = Field(default=UserType.ADMIN, frozen=True, exclude=True) # Exclude from openapi schema if fixed
    email: EmailStr = Field(..., description="Admin's email address")
    password: str = Field(..., min_length=8, description="Admin's password (at least 8 characters)")
    first_name: str = Field(..., max_length=128, description="Admin's first name")
    last_name: str = Field(..., max_length=128, description="Admin's last name")
    institution: str = Field(..., min_length=3, max_length=128, description="Admin's institution")

class AdminUpdate(BaseModel):
    email: Optional[EmailStr] = Field(None, description="Admin's email address")
    first_name: Optional[str] = Field(None, max_length=128, description="Admin's first name")
    last_name: Optional[str] = Field(None, max_length=128, description="Admin's last name")
    institution: Optional[str] = Field(None, max_length=128, description="Admin's institution")
    is_active: Optional[bool] = Field(None, description="Whether the admin account is active")
    password: Optional[str] = Field(None, min_length=8, description="New password (if changing)")

    model_config = ConfigDict(
        extra='forbid',
        populate_by_name=True, 
        alias_generator=to_camel
    )

class AdminInDB(UserInDBBase, AdminBase):
    # Inherits created_at, updated_at from UserInDBBase
    # These fields are now expected to be present.
    # If UserInDBBase does not define them, they need to be added here:
    # created_at: datetime = Field(..., description="Timestamp of admin creation")
    # updated_at: datetime = Field(..., description="Timestamp of last admin update")
    # However, UserInDBBase SHOULD define them if it's a base for database models.
    # Assuming UserInDBBase already has created_at and updated_at:
    pass # No new fields, just inheriting and using combined model_config

    # If UserInDBBase does NOT have created_at/updated_at, define them:
    # created_at: Optional[datetime] = Field(None, description="Timestamp of admin creation")
    # updated_at: Optional[datetime] = Field(None, description="Timestamp of last admin update")
    # The previous worker report indicated 'AttributeError: 'AdminInDB' object has no attribute 'updated_at''
    # This means UserInDBBase might not have it, or it was optional and not set.
    # Forcing them here to ensure they are part of the model.
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True, # Enables ORM mode (parsing from db objects)
        populate_by_name=True, # Allows creating model from dict with Python field names
        alias_generator=to_camel, # Generates camelCase aliases for serialization
        use_enum_values=True # Ensures enum values are used in serialization
    )


class AdminPublic(UserPublic, AdminBase):
    # Inherits fields from UserPublic and AdminBase
    # UserPublic typically excludes sensitive fields like hashed_password
    # and includes created_at/updated_at if they are public.
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )

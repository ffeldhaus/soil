# File: backend/app/schemas/admin.py
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field, HttpUrl, ConfigDict
from pydantic.alias_generators import to_camel # Import to_camel

from .user import UserBase, UserCreate, UserInDBBase, UserPublic, UserType

class AdminBase(UserBase):
    user_type: UserType = Field(default=UserType.ADMIN, frozen=True, description="Type of the user, fixed to admin")
    first_name: Optional[str] = Field(None, max_length=128, description="Admin's first name")
    last_name: Optional[str] = Field(None, max_length=128, description="Admin's last name")
    institution: Optional[str] = Field(None, max_length=128, description="Admin's institution")

    # UserBase is already configured for camelCase output.
    # This model_config ensures AdminBase-specific fields are also camelCased.
    # And it merges/overrides UserBase.model_config settings if necessary.
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )

class AdminCreate(UserCreate, AdminBase):
    user_type: UserType = Field(default=UserType.ADMIN, frozen=True, exclude=True)
    email: EmailStr = Field(..., description="Admin's email address")
    password: str = Field(..., min_length=8, description="Admin's password (at least 8 characters)")
    first_name: str = Field(..., max_length=128, description="Admin's first name")
    last_name: str = Field(..., max_length=128, description="Admin's last name")
    institution: str = Field(..., min_length=3, max_length=128, description="Admin's institution")
    # This is a request model. It inherits config from UserCreate (via UserBase) and AdminBase.
    # So, it will correctly parse camelCase fields from the request body for those base model fields.

class AdminUpdate(BaseModel):
    email: Optional[EmailStr] = Field(None, description="Admin's email address")
    first_name: Optional[str] = Field(None, max_length=128, description="Admin's first name")
    last_name: Optional[str] = Field(None, max_length=128, description="Admin's last name")
    institution: Optional[str] = Field(None, max_length=128, description="Admin's institution")
    is_active: Optional[bool] = Field(None, description="Whether the admin account is active")
    password: Optional[str] = Field(None, min_length=8, description="New password (if changing)")

    model_config = ConfigDict(
        extra='forbid',
        populate_by_name=True, # To allow camelCase input for these fields
        alias_generator=to_camel
    )

class AdminInDB(UserInDBBase, AdminBase):
    # UserInDBBase and AdminBase are configured for camelCase output & from_attributes.
    # This model_config ensures correct combination for AdminInDB specific needs.
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )

class AdminPublic(UserPublic, AdminBase):
    # UserPublic and AdminBase are configured for camelCase output & from_attributes.
    # This model_config ensures correct combination for AdminPublic.
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True
    )

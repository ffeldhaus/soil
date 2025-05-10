# File: backend/app/schemas/admin.py
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field, HttpUrl, ConfigDict

from .user import UserBase, UserCreate, UserInDBBase, UserPublic, UserType
# from .game import GameSimple # To be created - for listing games an admin owns


# --- Properties shared by models stored in DB ---
class AdminBase(UserBase):
    """
    Base properties for an Admin user.
    """
    user_type: UserType = Field(default=UserType.ADMIN, frozen=True, description="Type of the user, fixed to admin")
    first_name: Optional[str] = Field(None, max_length=128, description="Admin's first name")
    last_name: Optional[str] = Field(None, max_length=128, description="Admin's last name")
    institution: Optional[str] = Field(None, max_length=128, description="Admin's institution")

    model_config = ConfigDict(use_enum_values=True)


# --- Properties to receive via API on creation ---
class AdminCreate(UserCreate, AdminBase): # Multiple inheritance
    """
    Schema for creating a new Admin.
    Inherits email and password from UserCreate, and other fields from AdminBase.
    """
    # Ensure user_type is not settable during creation and defaults to ADMIN
    user_type: UserType = Field(default=UserType.ADMIN, frozen=True, exclude=True) # Exclude from request body, set by server

    # Override fields from UserCreate or AdminBase if specific validation is needed for admin creation
    email: EmailStr = Field(..., description="Admin's email address")
    password: str = Field(..., min_length=8, description="Admin's password (at least 8 characters)")
    first_name: str = Field(..., max_length=128, description="Admin's first name")
    last_name: str = Field(..., max_length=128, description="Admin's last name")
    institution: str = Field(..., min_length=3, max_length=128, description="Admin's institution")

    # confirm_success_url: Optional[HttpUrl] = Field(None, description="URL to redirect to after email confirmation (if applicable)")
    # This was in the original Rails app, Firebase handles confirmation links.
    # Client can specify redirect URL when initiating Firebase's sendEmailVerification.

# --- Properties to receive via API on update ---
class AdminUpdate(BaseModel):
    """
    Schema for updating an Admin. All fields are optional.
    """
    email: Optional[EmailStr] = Field(None, description="Admin's email address")
    first_name: Optional[str] = Field(None, max_length=128, description="Admin's first name")
    last_name: Optional[str] = Field(None, max_length=128, description="Admin's last name")
    institution: Optional[str] = Field(None, max_length=128, description="Admin's institution")
    is_active: Optional[bool] = Field(None, description="Whether the admin account is active")
    password: Optional[str] = Field(None, min_length=8, description="New password (if changing)")

    model_config = ConfigDict(extra='forbid') # Forbid extra fields during update


# --- Properties stored in DB ---
class AdminInDB(UserInDBBase, AdminBase): # Multiple inheritance
    """
    Schema for Admin properties as stored in the database.
    Inherits uid from UserInDBBase, and other fields from AdminBase.
    """
    # Add any admin-specific fields that are stored in the DB but not in AdminBase
    pass


# --- Properties to return to client (Public Admin Information) ---
class AdminPublic(UserPublic, AdminBase): # Multiple inheritance
    """
    Schema for publicly available Admin information.
    Inherits uid from UserPublic, and other fields from AdminBase.
    Excludes sensitive information like password.
    """
    # Exclude fields from AdminBase if they shouldn't be public, or from UserPublic
    # Example:
    # email: EmailStr = Field(..., description="Admin's email address") # Already in UserPublic
    
    # If you want to include a list of games managed by the admin:
    # games: Optional[List[GameSimple]] = [] # Assuming GameSimple schema is defined

    model_config = ConfigDict(from_attributes=True)
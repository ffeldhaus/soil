# File: backend/app/api/deps.py
from typing import Generator, Optional, Any, Callable, Type, TypeVar

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from pydantic import ValidationError
from firebase_admin import firestore # For type hinting Firestore client

from app.core import security
from app.core.config import settings
from app.db.firebase_setup import get_firestore_client, get_firebase_auth # Assuming get_firebase_auth might be used later
from app.schemas.token import TokenData
from app.schemas.user import UserType
# Import your user models from Firestore CRUD operations once they are defined
# from app.crud.crud_user import crud_user # Or specific admin/player CRUD
# from app.models.user import User # This would be your Firestore representation if you map it to a class

# OAuth2 scheme for extracting the token from the Authorization header
# The tokenUrl should point to your login endpoint that issues the custom JWT
# For now, pointing to the Firebase ID token login, though that one *issues* our token,
# and subsequent requests use *our* token. This is a bit of a nuance.
# If you have a dedicated endpoint that consumes username/password and issues your custom JWT,
# point tokenUrl there. Otherwise, this is more for documentation purposes if clients
# obtain the custom JWT via /login/id-token.
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login/id-token", # Or your custom token endpoint
    auto_error=False # Set to False to handle missing token manually if desired, or True to let FastAPI raise error
)

T = TypeVar("T") # Generic type for CRUD operations

# --- Database Dependency ---
def get_firestore_db_client_dependency() -> Generator[firestore.Client, None, None]:
    """
    FastAPI dependency to get a Firestore client.
    Ensures Firebase is initialized.
    """
    try:
        db_client = get_firestore_client()
        yield db_client
    except RuntimeError as e: # Catch if Firebase init failed
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        # Handle other potential exceptions during client retrieval if necessary
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error getting Firestore client: {str(e)}")
    # No explicit close needed for Firestore client typically

# --- Authentication and Authorization Dependencies ---

async def get_token_data(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[TokenData]:
    """
    Dependency to decode and validate the JWT access token.
    Returns TokenData if valid, otherwise raises HTTPException.
    """
    if token is None:
        # This case is hit if oauth2_scheme has auto_error=False and no token is provided
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated: No token provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        token_data = security.decode_access_token(token)
        if not token_data or not token_data.sub: # Ensure subject (user ID) is present
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, # Or 401
                detail="Invalid token: Subject (user ID) missing.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return token_data
    except JWTError as e: # Catches expired, invalid signature, etc.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, # More appropriate for token validation issues
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except ValidationError: # If TokenData schema validation fails
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, # Or 401
            detail="Invalid token payload structure.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    token_data: TokenData = Depends(get_token_data),
    # db: firestore.Client = Depends(get_firestore_db_client_dependency) # Uncomment if fetching user from DB
) -> TokenData: # Returns TokenData directly for now, can be expanded to full User object
    """
    Dependency to get the current user from the token data.
    Currently returns the raw TokenData.
    Can be expanded to fetch the full user object from Firestore if needed.
    """
    # If you need to fetch the full user object from Firestore based on token_data.sub (UID):
    # user_uid = token_data.sub
    # user_doc = await db.collection("users").document(user_uid).get() # Example
    # if not user_doc.exists:
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in database.")
    # user = UserInDB(**user_doc.to_dict(), uid=user_uid) # Assuming UserInDB schema
    # return user
    
    # For now, just return the validated token data which includes UID, role, etc.
    if not token_data: # Should not happen if get_token_data raises appropriately
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or token invalid."
        )
    return token_data


async def get_current_active_user(
    current_user: TokenData = Depends(get_current_user),
    # db: firestore.Client = Depends(get_firestore_db_client_dependency) # If fetching full user from DB
) -> TokenData: # Or your UserInDB model
    """
    Dependency to get the current active user.
    Checks if the user (from token or DB) is marked as active.
    """
    # If fetching full user object that has an 'is_active' field:
    # if not current_user.is_active: # Assuming current_user is a UserInDB model instance
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user.")
    # return current_user

    # If just using TokenData and relying on Firebase Auth for user disabling:
    # Firebase's verify_id_token(check_revoked=True) and UserDisabledError in auth.py
    # already handle disabled users at the Firebase ID token verification stage.
    # If our custom JWT is issued, we assume the user was active at that point.
    # Further checks for 'is_active' would typically involve fetching the user's current state
    # from Firestore on each request, which might be an overhead.
    # For now, this is a pass-through if using TokenData directly.
    return current_user


# --- Permission-based Dependencies ---

def require_user_role(required_role: UserType) -> Callable[[TokenData], TokenData]:
    """
    Factory for creating a dependency that requires a specific user role.
    """
    async def role_checker(current_user: TokenData = Depends(get_current_active_user)) -> TokenData:
        if not current_user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User role not defined in token."
            )
        if UserType(current_user.role) != required_role: # Compare enum members
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted: Requires '{required_role.value}' role.",
            )
        return current_user
    return role_checker

# Specific role dependencies
get_current_admin_user = require_user_role(UserType.ADMIN)
get_current_player_user = require_user_role(UserType.PLAYER)


async def get_current_player_in_game(
    current_player: TokenData = Depends(get_current_player_user),
    game_id_path: str = None, # This would be passed from the path parameter, e.g., Path(...)
                               # Or a specific game_id could be checked against token's game_id
) -> TokenData:
    """
    Ensures the current user is a player and optionally that they belong to the
    game specified in the path (if game_id_path is provided and compared).
    """
    if not current_player.game_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Player not associated with any game in token."
        )
    # Example: If you need to check against a game_id from the URL path
    # if game_id_path and current_player.game_id != game_id_path:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Player not authorized for this game."
    #     )
    return current_player
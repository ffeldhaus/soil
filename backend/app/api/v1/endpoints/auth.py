# File: backend/app/api/v1/endpoints/auth.py
from typing import Any, Optional, Dict # MODIFIED: Added Dict

from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from fastapi.security import OAuth2PasswordRequestForm 

from firebase_admin import auth as firebase_auth_admin, exceptions as firebase_exceptions

from app.api import deps
from app.core import security
from app.core.config import settings
from app.schemas.token import Token, TokenData, FirebaseIdToken
from app.schemas.user import UserType
from app.schemas.admin import AdminCreate, AdminPublic 
from app.crud.crud_admin import crud_admin
from app.crud.crud_player import crud_player
from app.db.firebase_setup import get_firestore_client
from app.services.email_service import get_email_service, EmailService 

router = APIRouter()

class PlayerCredentialsLogin(BaseModel): # MODIFIED: New schema for player credential login
    game_id: str
    player_number: int
    password: str

@router.post("/register/admin", response_model=AdminPublic, status_code=status.HTTP_201_CREATED)
async def register_admin(
    *,
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    admin_in: AdminCreate,
    email_service: EmailService = Depends(get_email_service) 
) -> Any:
    """
    Register a new Admin user in Firebase Authentication and Firestore.
    Sends a confirmation email (handled by Firebase or custom).
    """
    try:
        existing_admin_firestore = await crud_admin.get_by_email(db, email=admin_in.email)
        if existing_admin_firestore:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An admin with this email already exists in the database.",
            )
        
        firebase_user = firebase_auth_admin.create_user(
            email=admin_in.email,
            password=admin_in.password,
            display_name=f"{admin_in.first_name} {admin_in.last_name}",
            email_verified=False 
        )
        admin_uid = firebase_user.uid

        await firebase_auth_admin.set_custom_user_claims(admin_uid, {"role": UserType.ADMIN.value})

        admin_firestore_data = await crud_admin.create_with_uid(
            db, uid=admin_uid, obj_in=admin_in
        )
        
        return AdminPublic.model_validate(admin_firestore_data)

    except firebase_exceptions.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists in Firebase Authentication.",
        )
    except firebase_exceptions.FirebaseError as fe:
        print(f"Firebase error during admin registration: {fe}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Firebase error: {str(fe)}")
    except Exception as e:
        print(f"Unexpected error during admin registration: {e}")
        if 'admin_uid' in locals() and admin_uid:
            try:
                await firebase_auth_admin.delete_user(admin_uid) # type: ignore
                print(f"Cleaned up Firebase user {admin_uid} due to Firestore error.")
            except Exception as cleanup_e:
                print(f"Error during Firebase user cleanup: {cleanup_e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")


@router.post("/login/id-token", response_model=Token)
async def login_with_firebase_id_token(
    *,
    db: Any = Depends(deps.get_firestore_db_client_dependency), 
    token_in: FirebaseIdToken = Body(...)
) -> Any:
    """
    Authenticates a user via a Firebase ID token.
    Verifies the token, extracts custom claims (role, game_id),
    and issues a custom JWT access token for this application's backend.
    """
    try:
        decoded_firebase_token = firebase_auth_admin.verify_id_token(token_in.id_token, check_revoked=True)
    except firebase_exceptions.RevokedIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ID token has been revoked.")
    except firebase_exceptions.UserDisabledError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is disabled.")
    except firebase_exceptions.InvalidIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Firebase ID token.")
    except Exception as e: 
        print(f"Firebase ID token verification error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not verify Firebase ID token.")

    uid = decoded_firebase_token.get("uid")
    email = decoded_firebase_token.get("email")
    role = decoded_firebase_token.get("role")
    game_id_from_token = decoded_firebase_token.get("game_id") 
    is_ai_from_token = decoded_firebase_token.get("is_ai", False) 
    player_number_from_token = decoded_firebase_token.get("player_number") # MODIFIED: Get player_number

    if not uid or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing UID or role information."
        )

    token_payload_data = {
        "sub": uid,
        "role": role,
        "email": email,
    }
    user_public_info: Dict[str, Any] = {"uid": uid, "email": email, "role": role, "is_ai": is_ai_from_token}


    if role == UserType.PLAYER.value:
        if not game_id_from_token:
             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Player token missing game_id claim.")
        token_payload_data["game_id"] = game_id_from_token
        user_public_info["game_id"] = game_id_from_token
        if player_number_from_token: # MODIFIED
             token_payload_data["player_number"] = player_number_from_token # MODIFIED
             user_public_info["player_number"] = player_number_from_token # MODIFIED

        player_doc = await crud_player.get(db, doc_id=uid)
        if player_doc:
            user_public_info["username"] = player_doc.username
            # player_number already added from claims if available
            if not user_public_info.get("player_number") and player_doc.player_number:
                 user_public_info["player_number"] = player_doc.player_number


    elif role == UserType.ADMIN.value:
        admin_doc = await crud_admin.get(db, doc_id=uid) # type: ignore
        if admin_doc:
            user_public_info["first_name"] = admin_doc.first_name
            user_public_info["last_name"] = admin_doc.last_name
            user_public_info["institution"] = admin_doc.institution
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unknown user role.")

    access_token = security.create_access_token(data=token_payload_data)
    return Token(access_token=access_token, user_info=user_public_info)


# MODIFIED START: New endpoint for player login with credentials
@router.post("/login/player-credentials", response_model=Dict[str, str])
async def login_player_with_credentials(
    *,
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    login_data: PlayerCredentialsLogin = Body(...)
) -> Dict[str, str]:
    """
    Authenticates a player using game_id, player_number, and password.
    If successful, returns a Firebase Custom Token.
    """
    player_doc = await crud_player.get_player_in_game_by_number(
        db, game_id=login_data.game_id, player_number=login_data.player_number
    )

    if not player_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found in the specified game with that player number.",
        )

    if not player_doc.temp_password_hash:
        # This could mean the temp password was already used/cleared,
        # or was never set (e.g., AI player or error during creation).
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Temporary password not available or already used. Please contact admin if this is unexpected.",
        )

    if not security.verify_password(login_data.password, player_doc.temp_password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password for player.",
        )

    # Credentials are valid, mint a Firebase Custom Token
    try:
        developer_claims = {
            "role": UserType.PLAYER.value,
            "game_id": player_doc.game_id,
            "player_number": player_doc.player_number,
            "is_ai": player_doc.is_ai
        }
        custom_token = firebase_auth_admin.create_custom_token(player_doc.uid, developer_claims=developer_claims)
        
        # Optionally, clear the temp_password_hash after first successful use
        # await crud_player.clear_temp_password_hash(db, player_uid=player_doc.uid)
        # print(f"INFO: Temporary password hash cleared for player {player_doc.uid} in game {login_data.game_id}")
        # For now, let's not clear it automatically. This might be a feature for later (e.g., prompt user to set new password).


        return {"customToken": custom_token}
    except firebase_exceptions.FirebaseError as fe:
        print(f"Firebase error minting custom token for player {player_doc.uid}: {fe}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate login token.")
    except Exception as e:
        print(f"Unexpected error minting custom token for player {player_doc.uid}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login token generation failed.")
# MODIFIED END


@router.post("/request-password-reset", status_code=status.HTTP_202_ACCEPTED)
async def request_password_reset(
    email: EmailStr = Body(..., embed=True), # type: ignore
    email_service: EmailService = Depends(get_email_service),
    db: Any = Depends(deps.get_firestore_db_client_dependency) 
):
    """
    Initiates a password reset process for the given email.
    Sends an email with a password reset link generated by Firebase.
    """
    try:
        firebase_user = firebase_auth_admin.get_user_by_email(email) # type: ignore
        if not firebase_user: 
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User with this email not found.")

        username_for_email = firebase_user.display_name or email.split('@')[0] # type: ignore
        
        frontend_password_reset_path = "/auth/reset-password" 
        frontend_base_url = settings.BACKEND_CORS_ORIGINS.split(',')[0].strip() 
        
        action_code_settings = firebase_auth_admin.ActionCodeSettings(
            url=f"{frontend_base_url}{frontend_password_reset_path}",
            handle_code_in_app=True 
        )
        reset_link = firebase_auth_admin.generate_password_reset_link( # type: ignore
            email, action_code_settings=action_code_settings
        )

        email_sent = await email_service.send_password_reset_email(
            recipient_email=email,
            username=username_for_email,
            reset_link=reset_link
        )

        if not email_sent:
            print(f"ERROR: Password reset email failed to send for {email}, but responding with success.")
        
        return {"msg": "If an account with this email exists, a password reset link has been sent."}

    except firebase_exceptions.UserNotFoundError:
        print(f"INFO: Password reset requested for non-existent email: {email}")
        return {"msg": "If an account with this email exists, a password reset link has been sent."}
    except firebase_exceptions.FirebaseError as fe:
        print(f"Firebase error during password reset request for {email}: {fe}")
        return {"msg": "If an account with this email exists, a password reset link has been sent."}
    except Exception as e:
        print(f"Unexpected error during password reset request for {email}: {e}")
        return {"msg": "If an account with this email exists, a password reset link has been sent."}
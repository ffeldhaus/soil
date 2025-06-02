# File: backend/app/api/v1/endpoints/auth.py
from typing import Any, Optional, Dict

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

# Import Pydantic utils for model config
from pydantic import BaseModel, ConfigDict, EmailStr
from pydantic.alias_generators import to_camel

router = APIRouter()

class PlayerCredentialsLogin(BaseModel):
    game_id: str
    player_number: int
    password: str

    model_config = ConfigDict(
        populate_by_name=True, # Allow population by alias
        alias_generator=to_camel # Converts camelCase keys from JSON to snake_case attributes
    )

@router.post("/register/admin", response_model=AdminPublic, status_code=status.HTTP_201_CREATED)
async def register_admin(
    *,
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    admin_in: AdminCreate,
    email_service: EmailService = Depends(get_email_service) 
) -> Any:
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
        
        # AdminPublic is already configured for camelCase output in its own schema file
        return admin_firestore_data # Pydantic will handle serialization based on AdminPublic config

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
    player_number_from_token = decoded_firebase_token.get("player_number")

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
    # Construct user_info with camelCase keys
    user_public_info: Dict[str, Any] = {"uid": uid, "email": email, "role": role, "isAi": is_ai_from_token}

    if role == UserType.PLAYER.value:
        if not game_id_from_token:
             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Player token missing game_id claim.")
        token_payload_data["game_id"] = game_id_from_token
        user_public_info["gameId"] = game_id_from_token # camelCase
        if player_number_from_token:
             token_payload_data["player_number"] = player_number_from_token
             user_public_info["playerNumber"] = player_number_from_token # camelCase

        player_doc = await crud_player.get(db, doc_id=uid)
        if player_doc:
            user_public_info["username"] = player_doc.username
            # Ensure playerNumber is consistently sourced or overridden
            if "playerNumber" not in user_public_info and player_doc.player_number:
                 user_public_info["playerNumber"] = player_doc.player_number # camelCase
            if "isAi" not in user_public_info: # is_ai from player_doc might be more authoritative if not in token
                 user_public_info["isAi"] = player_doc.is_ai

    elif role == UserType.ADMIN.value:
        admin_doc = await crud_admin.get(db, doc_id=uid) # type: ignore
        if admin_doc: # AdminPublic schema will handle camelCasing these if model_dump(by_alias=True) is used
            user_public_info["firstName"] = admin_doc.first_name
            user_public_info["lastName"] = admin_doc.last_name
            user_public_info["institution"] = admin_doc.institution
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unknown user role.")

    access_token = security.create_access_token(data=token_payload_data)
    # Token model itself should be configured for camelCase if its field names require it (access_token, token_type)
    # user_info is a Dict, so its keys are as constructed above.
    return Token(access_token=access_token, token_type="bearer", user_info=user_public_info)


@router.post("/login/player-credentials", response_model=Dict[str, str])
async def login_player_with_credentials(
    *,
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    login_data: PlayerCredentialsLogin = Body(...)
) -> Dict[str, str]:
    # login_data will have game_id and player_number due to alias generator
    player_doc = await crud_player.get_player_in_game_by_number(
        db, game_id=login_data.game_id, player_number=login_data.player_number
    )

    if not player_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found in the specified game with that player number.",
        )

    if not player_doc.temp_password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Temporary password not available or already used. Please contact admin if this is unexpected.",
        )

    if not security.verify_password(login_data.password, player_doc.temp_password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password for player.",
        )

    try:
        developer_claims = {
            "role": UserType.PLAYER.value,
            "game_id": player_doc.game_id, # Use snake_case for Firebase claims if that's the convention there
            "player_number": player_doc.player_number,
            "is_ai": player_doc.is_ai
        }
        custom_token_str = firebase_auth_admin.create_custom_token(player_doc.uid, developer_claims=developer_claims)
        
        # Consider clearing temp_password_hash here for enhanced security
        # await crud_player.update(db, doc_id=player_doc.uid, obj_in={"temp_password_hash": None})

        return {"customToken": custom_token_str} # camelCase key for JSON response
    except firebase_exceptions.FirebaseError as fe:
        print(f"Firebase error minting custom token for player {player_doc.uid}: {fe}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate login token.")
    except Exception as e:
        print(f"Unexpected error minting custom token for player {player_doc.uid}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login token generation failed.")

@router.post("/request-password-reset", status_code=status.HTTP_202_ACCEPTED)
async def request_password_reset(
    email: EmailStr = Body(..., embed=True), # type: ignore
    email_service: EmailService = Depends(get_email_service),
    db: Any = Depends(deps.get_firestore_db_client_dependency) 
):
    try:
        firebase_user = firebase_auth_admin.get_user_by_email(email) # type: ignore
        if not firebase_user: 
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User with this email not found.")

        username_for_email = firebase_user.display_name or email.split('@')[0] # type: ignore
        
        frontend_password_reset_path = "/auth/reset-password" 
        # Ensure BACKEND_CORS_ORIGINS is correctly parsed and the first one is a valid URL for this.
        frontend_base_url = settings.CORS_ORIGINS_LIST[0] if settings.CORS_ORIGINS_LIST else "http://localhost:4200" 
        
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

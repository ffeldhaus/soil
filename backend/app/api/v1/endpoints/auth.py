# File: backend/app/api/v1/endpoints/auth.py
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from fastapi.security import OAuth2PasswordRequestForm # For username/password form

from firebase_admin import auth as firebase_auth_admin, exceptions as firebase_exceptions

from app.api import deps
from app.core import security
from app.core.config import settings
from app.schemas.token import Token, TokenData, FirebaseIdToken
from app.schemas.user import UserType
from app.schemas.admin import AdminCreate, AdminPublic # For admin registration
from app.crud.crud_admin import crud_admin
from app.crud.crud_player import crud_player # To check if player email exists
from app.db.firebase_setup import get_firestore_client
from app.services.email_service import get_email_service, EmailService # Added EmailService


router = APIRouter()

@router.post("/register/admin", response_model=AdminPublic, status_code=status.HTTP_201_CREATED)
async def register_admin(
    *,
    db: Any = Depends(deps.get_firestore_db_client_dependency),
    admin_in: AdminCreate,
    email_service: EmailService = Depends(get_email_service) # Inject EmailService
) -> Any:
    """
    Register a new Admin user in Firebase Authentication and Firestore.
    Sends a confirmation email (handled by Firebase or custom).
    """
    try:
        # Check if admin email already exists in Firestore (optional, Firebase Auth will also check)
        existing_admin_firestore = await crud_admin.get_by_email(db, email=admin_in.email)
        if existing_admin_firestore:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An admin with this email already exists in the database.",
            )
        
        # Create user in Firebase Authentication
        firebase_user = firebase_auth_admin.create_user(
            email=admin_in.email,
            password=admin_in.password,
            display_name=f"{admin_in.first_name} {admin_in.last_name}",
            email_verified=False # Or True if you want to skip Firebase's verification email
        )
        admin_uid = firebase_user.uid

        # Set custom claims (role) in Firebase Auth
        await firebase_auth_admin.set_custom_user_claims(admin_uid, {"role": UserType.ADMIN.value})

        # Create admin document in Firestore
        # AdminCreate already has user_type defaulted, but explicitly passing for clarity.
        admin_firestore_data = await crud_admin.create_with_uid(
            db, uid=admin_uid, obj_in=admin_in
        )
        
        # If email_verified is False, Firebase might send its own verification email.
        # If you want to send a custom one (or supplemental welcome):
        # confirmation_link = firebase_auth_admin.generate_email_verification_link(admin_in.email)
        # await email_service.send_registration_confirmation_email(
        #     recipient_email=admin_in.email,
        #     username=admin_in.first_name,
        #     confirmation_link=confirmation_link
        # )
        # print(f"Admin registration: Confirmation email potentially sent by Firebase for {admin_in.email}")


        return AdminPublic.model_validate(admin_firestore_data) # Use .model_validate for dicts

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
        # Potentially delete Firebase user if Firestore creation failed
        if 'admin_uid' in locals() and admin_uid:
            try:
                await firebase_auth_admin.delete_user(admin_uid)
                print(f"Cleaned up Firebase user {admin_uid} due to Firestore error.")
            except Exception as cleanup_e:
                print(f"Error during Firebase user cleanup: {cleanup_e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")


@router.post("/login/id-token", response_model=Token)
async def login_with_firebase_id_token(
    *,
    db: Any = Depends(deps.get_firestore_db_client_dependency), # For potential DB checks
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
    except Exception as e: # Catch any other Firebase related errors
        print(f"Firebase ID token verification error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not verify Firebase ID token.")

    uid = decoded_firebase_token.get("uid")
    email = decoded_firebase_token.get("email")
    # Custom claims set during user creation/update
    role = decoded_firebase_token.get("role")
    game_id_from_token = decoded_firebase_token.get("game_id") # For players
    is_ai_from_token = decoded_firebase_token.get("is_ai", False) # For players

    if not uid or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing UID or role information."
        )

    # Prepare data for our custom JWT
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
        # Optionally fetch player details from Firestore to include in user_info
        player_doc = await crud_player.get(db, doc_id=uid)
        if player_doc:
            user_public_info["username"] = player_doc.username
            user_public_info["player_number"] = player_doc.player_number

    elif role == UserType.ADMIN.value:
        # Optionally fetch admin details
        admin_doc = await crud_admin.get(db, doc_id=uid)
        if admin_doc:
            user_public_info["first_name"] = admin_doc.first_name
            user_public_info["last_name"] = admin_doc.last_name
            user_public_info["institution"] = admin_doc.institution
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unknown user role.")

    access_token = security.create_access_token(data=token_payload_data)
    return Token(access_token=access_token, user_info=user_public_info)


@router.post("/request-password-reset", status_code=status.HTTP_202_ACCEPTED)
async def request_password_reset(
    email: EmailStr = Body(..., embed=True),
    email_service: EmailService = Depends(get_email_service),
    db: Any = Depends(deps.get_firestore_db_client_dependency) # To get user's name
):
    """
    Initiates a password reset process for the given email.
    Sends an email with a password reset link generated by Firebase.
    """
    try:
        firebase_user = firebase_auth_admin.get_user_by_email(email)
        if not firebase_user: # Should not happen if get_user_by_email doesn't raise NoResultFound
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User with this email not found.")

        # Determine user's display name for the email
        username_for_email = firebase_user.display_name or email.split('@')[0]
        # If you store names separately in Firestore and want to use that:
        # user_doc = await crud_admin.get_by_email(db, email=email) # Check admin first
        # if not user_doc:
        #     user_doc = await crud_player.get_by_email(db, email=email) # Then player
        # if user_doc and hasattr(user_doc, 'first_name') and user_doc.first_name:
        #     username_for_email = user_doc.first_name
        # elif user_doc and hasattr(user_doc, 'username') and user_doc.username:
        #     username_for_email = user_doc.username


        # Generate the password reset link using Firebase Admin SDK
        # The link will point to Firebase's password reset handler page,
        # or your custom action handler URL if configured in Firebase project settings.
        # The client (Angular app) needs to have a route that handles this Firebase action code if using custom handler.
        # Example frontend_url might be settings.CLIENT_PASSWORD_RESET_URL or derived.
        # This link is typically handled by Firebase UI or client-side SDKs.
        # If a custom action URL is set in Firebase console: Authentication > Templates > Password Reset
        # then that URL will be used.
        
        # For frontend_url, provide the base URL of your Angular app where password reset can be handled.
        # Firebase will append action codes (oobCode) to this link.
        frontend_password_reset_path = "/auth/reset-password" # Example Angular route
        frontend_base_url = settings.BACKEND_CORS_ORIGINS.split(',')[0].strip() # Use the first CORS origin as frontend base
        
        action_code_settings = firebase_auth_admin.ActionCodeSettings(
            url=f"{frontend_base_url}{frontend_password_reset_path}",
            handle_code_in_app=True # Important for SPAs
        )
        reset_link = firebase_auth_admin.generate_password_reset_link(
            email, action_code_settings=action_code_settings
        )

        email_sent = await email_service.send_password_reset_email(
            recipient_email=email,
            username=username_for_email,
            reset_link=reset_link
        )

        if not email_sent:
            # Log the error but don't reveal to user if email failed to send,
            # as per common security practice for password resets.
            print(f"ERROR: Password reset email failed to send for {email}, but responding with success.")
        
        return {"msg": "If an account with this email exists, a password reset link has been sent."}

    except firebase_exceptions.UserNotFoundError:
        # Do not reveal if user exists or not for security. Respond as if successful.
        print(f"INFO: Password reset requested for non-existent email: {email}")
        return {"msg": "If an account with this email exists, a password reset link has been sent."}
    except firebase_exceptions.FirebaseError as fe:
        print(f"Firebase error during password reset request for {email}: {fe}")
        # Generic success message to user
        return {"msg": "If an account with this email exists, a password reset link has been sent."}
    except Exception as e:
        print(f"Unexpected error during password reset request for {email}: {e}")
        # Generic success message to user
        return {"msg": "If an account with this email exists, a password reset link has been sent."}

# TODO: Endpoint for actually resetting the password if not handled by Firebase's UI
# This would typically involve the frontend:
# 1. User clicks link in email, goes to Firebase page or your custom page with oobCode.
# 2. Frontend verifies oobCode (Firebase client SDK: firebase.auth().verifyPasswordResetCode(oobCode)).
# 3. Frontend prompts for new password.
# 4. Frontend calls Firebase client SDK: firebase.auth().confirmPasswordReset(oobCode, newPassword).
# The backend is usually not directly involved in the confirmPasswordReset step if using Firebase client SDKs.
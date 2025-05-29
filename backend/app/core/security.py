from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings
from app.schemas.token import TokenData # We'll define this schema soon

# Password hashing context (primarily if you were to store passwords yourself,
# Firebase Auth handles password hashing for its users)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = settings.ALGORITHM
SECRET_KEY = settings.SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against a hashed password.
    Not directly used if all auth is via Firebase ID tokens, but useful for custom user stores.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hashes a password.
    Not directly used if all auth is via Firebase ID tokens.
    """
    return pwd_context.hash(password)


def create_access_token(
    data: dict, expires_delta_minutes: Optional[int] = None
) -> str:
    """
    Creates a new JWT access token.

    Args:
        data: Data to be encoded in the token (e.g., {"sub": user_id, "role": "admin"}).
        expires_delta_minutes: Optional token expiry time in minutes. Uses setting if None.

    Returns:
        The encoded JWT token as a string.
    """
    to_encode = data.copy()
    if expires_delta_minutes:
        expire = datetime.now(timezone.utc) + timedelta(minutes=expires_delta_minutes)
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    # Add "iat" (issued at) claim for good practice
    to_encode.update({"iat": datetime.now(timezone.utc)})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenData]:
    """
    Decodes a JWT access token and returns its payload.

    Args:
        token: The JWT token string.

    Returns:
        TokenData Pydantic model if the token is valid, None otherwise or if an error occurs.
        Raises JWTError for various token validation issues.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Extract standard claims
        token_sub: Optional[str] = payload.get("sub")
        token_exp: Optional[int] = payload.get("exp")

        if token_sub is None or token_exp is None:
            # Essential claims are missing
            raise JWTError("Token is missing essential claims (sub or exp)")

        # You can add more validation here if needed (e.g., audience, issuer)

        # Extract custom claims like role, game_id
        role: Optional[str] = payload.get("role")
        email: Optional[str] = payload.get("email")
        game_id: Optional[str] = payload.get("game_id") # Specific to player tokens
        original_sub: Optional[str] = payload.get("original_sub") # For impersonation
        is_impersonating: Optional[bool] = payload.get("is_impersonating", False) # For impersonation

        return TokenData(
            sub=token_sub,
            exp=token_exp,
            role=role,
            email=email,
            game_id=game_id,
            original_sub=original_sub,
            is_impersonating=is_impersonating
        )
    except JWTError as e:
        # This will catch expired tokens, invalid signatures, etc.
        # print(f"JWT Decode Error: {e}") # Log this for debugging
        raise  # Re-raise the JWTError to be handled by dependency or endpoint
    except Exception as e:
        # Catch any other unexpected errors during decoding
        # print(f"Unexpected error decoding token: {e}") # Log this
        raise JWTError(f"Unexpected error decoding token: {str(e)}")


# Example usage (not part of the module's direct API but for illustration)
if __name__ == "__main__":
    # --- Password Hashing Example ---
    # password = "testpassword"
    # hashed = get_password_hash(password)
    # print(f"Plain: {password}")
    # print(f"Hashed: {hashed}")
    # print(f"Verification: {verify_password(password, hashed)}")
    # print(f"Verification (wrong): {verify_password('wrong', hashed)}")

    # --- Token Creation Example ---
    user_data = {"sub": "user123", "role": "player", "game_id": "gameABC", "custom_info": "hello"}
    token = create_access_token(data=user_data)
    print(f"Generated Token: {token}")

    # --- Token Decoding Example ---
    try:
        decoded_payload = decode_access_token(token)
        if decoded_payload:
            print(f"Decoded Payload (sub): {decoded_payload.sub}")
            print(f"Decoded Payload (role): {decoded_payload.role}")
            print(f"Decoded Payload (game_id): {decoded_payload.game_id}")
            print(f"Decoded Payload (exp): {datetime.fromtimestamp(decoded_payload.exp, timezone.utc)}")
            # print(f"Decoded Payload (all): {decoded_payload.model_dump()}")
    except JWTError as e:
        print(f"Error decoding token: {e}")

    # --- Expired Token Example ---
    # expired_token = create_access_token(data={"sub": "test_expiry"}, expires_delta_minutes=-5)
    # print(f"Generated Expired Token: {expired_token}")
    # try:
    #     decode_access_token(expired_token)
    # except JWTError as e:
    #     print(f"Error decoding expired token: {e}")
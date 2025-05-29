from typing import List, Union, Optional
import pathlib

from pydantic import AnyHttpUrl, EmailStr, field_validator, ValidationInfo
from pydantic_settings import BaseSettings, SettingsConfigDict

# Project Directories
ROOT_DIR = pathlib.Path(__file__).resolve().parent.parent.parent
APP_DIR = ROOT_DIR / "app"


class Settings(BaseSettings):
    # --- Application Core Settings ---
    PROJECT_NAME: str = "Soil Game Backend"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development" # development, staging, production

    # --- Security Settings ---
    # Generate a strong secret key, e.g., using: openssl rand -hex 32
    SECRET_KEY: str = "your_default_secret_key_change_this_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # --- CORS Settings ---
    # A list of origins that should be permitted to make cross-origin requests.
    # e.g., ["http://localhost:4200", "https://yourfrontend.com"]
    # Loaded as a comma-separated string from .env, then parsed.
    BACKEND_CORS_ORIGINS: str = "http://localhost:4200,http://127.0.0.1:4200"
    CORS_ORIGINS_LIST: List[AnyHttpUrl] = []

    @field_validator("CORS_ORIGINS_LIST", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]], info: ValidationInfo) -> Union[List[AnyHttpUrl], str]:
        if isinstance(v, str) and not v.startswith("["):
            # If it's a string from .env (not already a list representation)
            # and BACKEND_CORS_ORIGINS is present in values
            if "BACKEND_CORS_ORIGINS" in info.data:
                raw_origins = info.data["BACKEND_CORS_ORIGINS"]
                return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
        elif isinstance(v, list):
            return v
        return [] # Default to empty list if no valid origins are found

    # --- Firebase / Google Cloud Settings ---
    GCP_PROJECT_ID: Optional[str] = None
    # Path to Firebase Admin SDK service account key.
    # Relative paths will be resolved from the project root.
    # In Cloud Run, this is often not needed if Workload Identity is used.
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None

    # --- Firestore Collection Names ---
    FIRESTORE_COLLECTION_ADMINS: str = "admins"
    FIRESTORE_COLLECTION_USERS: str = "users" # General users/players
    FIRESTORE_COLLECTION_GAMES: str = "games"
    FIRESTORE_COLLECTION_ROUNDS: str = "rounds" # Subcollection of games or players
    FIRESTORE_COLLECTION_RESULTS: str = "results" # Subcollection of games or players
    FIRESTORE_COLLECTION_PARCEL_STATES: str = "parcel_states" # Subcollection of games or players


    # --- Email Settings (for notifications, password reset, etc.) ---
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = 587
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[EmailStr] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[EmailStr] = "noreply@example.com"
    EMAILS_FROM_NAME: Optional[str] = "Soil Game"

    @property
    def emails_enabled(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_PORT and self.EMAILS_FROM_EMAIL)

    # --- Game Default Settings ---
    DEFAULT_GAME_ROUNDS: int = 15
    MAX_PLAYERS_PER_GAME: int = 8
    MIN_PLAYERS_PER_GAME: int = 1 # Allows for single player (vs AI) or AI filling spots

    # --- Database Settings (Optional: if using Cloud SQL/Spanner alongside Firestore) ---
    # POSTGRES_SERVER: Optional[str] = "localhost"
    # POSTGRES_USER: Optional[str] = "postgres"
    # POSTGRES_PASSWORD: Optional[str] = "password"
    # POSTGRES_DB: Optional[str] = "soil_game_db"
    # DATABASE_URL: Optional[str] = None

    # @validator("DATABASE_URL", pre=True)
    # def assemble_db_connection(cls, v: Optional[str], values: dict) -> Any:
    #     if isinstance(v, str):
    #         return v
    #     return PostgresDsn.build(
    #         scheme="postgresql+asyncpg",
    #         username=values.get("POSTGRES_USER"),
    #         password=values.get("POSTGRES_PASSWORD"),
    #         host=values.get("POSTGRES_SERVER"),
    #         path=f"/{values.get('POSTGRES_DB') or ''}",
    #     )

    # Configure Pydantic to load from a .env file
    model_config = SettingsConfigDict(
        env_file=f"{ROOT_DIR}/.env", # Specify .env file at the project root
        env_file_encoding='utf-8',
        case_sensitive=True,
        extra='ignore' # Ignore extra fields from .env that are not defined in the model
    )

# Instantiate the settings
settings = Settings()

# Output settings for verification during development startup (optional)
if settings.ENVIRONMENT == "development":
    print("--- Application Settings Loaded ---")
    for key, value in settings.model_dump().items():
        if "KEY" in key.upper() or "PASSWORD" in key.upper() or "SECRET" in key.upper():
             print(f"{key}: ******")
        else:
            print(f"{key}: {value}")
    print("----------------------------------")
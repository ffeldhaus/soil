from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.v1.api import api_router as api_router_v1
from app.core.config import settings
from app.db.firebase_setup import initialize_firebase_app # Removed close_firebase_app

# Define a lifespan event handler for application startup and shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Firebase
    print("Application startup: Initializing Firebase...")
    initialize_firebase_app()
    print("Firebase initialized.")
    yield
    # Shutdown: Clean up resources, e.g., close Firebase app if necessary
    print("Application shutdown: Cleaning up Firebase...")
    # Firebase Admin SDK typically doesn't require an explicit close for client apps,
    # but if specific cleanup is needed, it would go here.
    # For example, if you had other database connections or background tasks.
    # close_firebase_app() # Uncomment if you implement this
    print("Firebase cleanup complete.")

# Initialize the FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version="0.1.0", # You can manage versioning more dynamically if needed
    lifespan=lifespan # Use the lifespan context manager
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    origins = [origin.strip() for origin in settings.BACKEND_CORS_ORIGINS.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"], # Allows all methods
        allow_headers=["*"], # Allows all headers
    )
else:
    # Allow all origins if not specified (useful for local development, but be cautious in production)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include the API router for version 1
app.include_router(api_router_v1, prefix=settings.API_V1_STR)

# Root endpoint (optional, good for health checks or simple welcome)
@app.get("/", tags=["Root"])
async def read_root():
    """
    Welcome endpoint for the Soil Game API.
    """
    return {"message": f"Welcome to the {settings.PROJECT_NAME} API"}

# Example of how to run directly for development (though `uvicorn app.main:app --reload` is preferred)
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)
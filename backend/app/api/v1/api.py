# File: backend/app/api/v1/api.py
from fastapi import APIRouter

from app.api.v1.endpoints import auth, admin, games, rounds # Add other endpoint modules as they are created

api_router = APIRouter()

# Include authentication routes
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Include admin-specific routes
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])

# Include game routes
api_router.include_router(games.router, prefix="/games", tags=["Games"])

# Include round routes (likely nested under games or specific game instances)
api_router.include_router(rounds.router, prefix="/rounds", tags=["Rounds"])


# Example of how you might add more routers later:
# from app.api.v1.endpoints import parcels, results
# api_router.include_router(parcels.router, prefix="/parcels", tags=["Parcels"])
# api_router.include_router(results.router, prefix="/results", tags=["Results"])
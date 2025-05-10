# Soil Game - Backend

This is the backend service for the Soil educational game, rebuilt with Python, FastAPI, and designed for Google Cloud deployment.

## Overview

The backend provides the API endpoints for game logic, player and admin authentication, and data persistence.

## Tech Stack

*   **Programming Language:** Python 3.13+
*   **Framework:** FastAPI
*   **Authentication:** Firebase Authentication (recommended), or custom JWT with passlib
*   **Database:** Firestore (primary for game state, player data), potentially Cloud Spanner for relational admin/game metadata if complex queries are needed.
*   **Deployment:** Google Cloud Run (containerized)
*   **Infrastructure as Code:** Terraform
*   **Dependency Management:** Poetry
*   **Linting & Formatting:** Ruff, Black
*   **Type Checking:** MyPy

## Project Structure

```
backend/
├── app/                  # Main application source code
│   ├── __init__.py
│   ├── api/              # API versioning and routers
│   │   ├── __init__.py
│   │   ├── deps.py       # Dependency injection functions
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── endpoints/  # Endpoint modules (users, games, rounds, etc.)
│   │       │   ├── __init__.py
│   │       │   ├── auth.py
│   │       │   ├── admin.py
│   │       │   ├── games.py
│   │       │   ├── players.py
│   │       │   └── rounds.py
│   │       └── api.py      # Main v1 API router
│   ├── core/             # Core application logic, settings, security
│   │   ├── __init__.py
│   │   ├── config.py     # Application settings (Pydantic BaseSettings)
│   │   └── security.py   # Password hashing, token generation
│   ├── crud/             # Create, Read, Update, Delete operations (database interactions)
│   │   ├── __init__.py
│   │   ├── base.py       # Base CRUD class
│   │   ├── crud_user.py
│   │   ├── crud_game.py
│   │   └── crud_player.py
│   ├── db/               # Database session management, Firebase initialization
│   │   ├── __init__.py
│   │   └── firebase_setup.py
│   ├── game_logic/       # Core game mechanics, calculations, AI
│   │   ├── __init__.py
│   │   ├── calculation_engine.py
│   │   ├── decision_impacts.py
│   │   ├── game_rules.py
│   │   └── ai_player.py  # (Optional AI logic)
│   ├── models/           # Data models (e.g., for database interactions, not Pydantic schemas)
│   │   ├── __init__.py   # Firestore interactions might not need separate ORM-like models
│   ├── schemas/          # Pydantic schemas for API request/response validation & serialization
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── game.py
│   │   ├── player.py
│   │   ├── round.py
│   │   ├── parcel.py
│   │   ├── result.py
│   │   └── token.py
│   ├── services/         # Business logic services (e.g., email sending)
│   │   ├── __init__.py
│   │   └── email_service.py
│   └── main.py           # FastAPI application instance and main router
├── tests/                # Unit and integration tests
│   ├── __init__.py
│   ├── conftest.py       # Pytest fixtures and configuration
│   └── api/
│       └── v1/
│           ├── __init__.py
│           ├── test_auth.py
│           ├── test_games.py
│           └── ...
├── .env.example          # Example environment variables
├── .gitignore
├── Dockerfile            # For containerizing the application
├── poetry.lock
├── pyproject.toml
└── README.md             # This file
```

## Setup and Installation

1.  **Prerequisites:**
    *   Python 3.13+
    *   Poetry (Python dependency manager)
    *   Google Cloud SDK (gcloud CLI)
    *   Firebase Admin SDK credentials (service account JSON file) - if using Firebase

2.  **Clone the repository (this backend part):**
    ```bash
    # Assuming you are in the root of the overall project
    git clone <your-repo-url>
    cd <your-repo-url>/backend
    ```

3.  **Install dependencies using Poetry:**
    ```bash
    poetry install
    ```

4.  **Environment Variables:**
    *   Copy `.env.example` to `.env`:
        ```bash
        cp .env.example .env
        ```
    *   Fill in the required values in `.env`. This will typically include:
        *   `PROJECT_ID`: Your Google Cloud Project ID.
        *   `GOOGLE_APPLICATION_CREDENTIALS`: Path to your Firebase service account key JSON file (e.g., `path/to/your/serviceAccountKey.json`).
        *   `SECRET_KEY`: A secret key for JWT token generation (if not using Firebase Auth exclusively).
        *   `ALGORITHM`: Algorithm for JWT (e.g., `HS256`).
        *   `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiry time.
        *   Email server settings (if implementing email confirmations).

5.  **Firebase Setup (if applicable):**
    *   Ensure your `serviceAccountKey.json` is correctly referenced in `GOOGLE_APPLICATION_CREDENTIALS`.
    *   Enable Firebase Authentication and Firestore in your Firebase project.

## Running Locally

Activate the Poetry shell and run Uvicorn:

```bash
poetry shell
uvicorn app.main:app --reload
```

The API will typically be available at `http://127.0.0.1:8000`.
API documentation (Swagger UI) will be at `http://127.0.0.1:8000/docs`.
Alternative API documentation (ReDoc) will be at `http://127.0.0.1:8000/redoc`.

## Running Tests

```bash
poetry shell
pytest
```

## Linting and Formatting

```bash
poetry shell
ruff check . --fix
black .
mypy app
```

Or run them via pre-commit hooks (recommended):
```bash
pre-commit install
# Now linters/formatters will run automatically before each commit
```

## Deployment

This backend is designed to be deployed as a containerized application on Google Cloud Run.
Terraform configurations for deploying the necessary Google Cloud services (Cloud Run, Firestore, Firebase Auth, Load Balancer, etc.) will be located in the main project's `terraform/` directory.

A `Dockerfile` is provided to build the container image.
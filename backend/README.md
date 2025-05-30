# Soil Game - Backend

This is the backend service for the Soil educational game, rebuilt with Python, FastAPI, and designed for Google Cloud deployment.

## Overview

The backend provides the API endpoints for game logic, player and admin authentication, and data persistence.

## Tech Stack

*   **Programming Language:** Python 3.13+
*   **Framework:** FastAPI
*   **Authentication:** Firebase Authentication (primary), with custom JWTs for session management.
*   **Database:** Firestore (primary for game state, player data, rounds, results, field states).
*   **Deployment:** Google Cloud Run (containerized)
*   **Infrastructure as Code:** Terraform (managed in root project `terraform/` directory)
*   **Dependency Management:** uv
*   **Linting & Formatting:** Ruff, Black
*   **Type Checking:** MyPy
*   **Email:** `aiosmtplib` for asynchronous email sending.

## Project Structure

```
backend/
├── app/                  # Main application source code
│   ├── __init__.py
│   ├── api/              # API versioning and routers
│   │   ├── __init__.py
│   │   ├── deps.py       # Dependency injection functions (DB, auth)
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── endpoints/  # Endpoint modules (auth, admin, games, players, rounds, results)
│   │       └── api.py      # Main v1 API router
│   ├── core/             # Core application logic, settings, security
│   │   ├── __init__.py
│   │   ├── config.py     # Application settings (Pydantic BaseSettings)
│   │   └── security.py   # Password hashing (if used), JWT generation/decoding
│   ├── crud/             # Create, Read, Update, Delete operations for Firestore
│   │   ├── __init__.py
│   │   ├── base.py       # Base CRUD class for Firestore
│   │   ├── crud_user.py  # (Placeholder, user logic split into admin/player)
│   │   ├── crud_admin.py
│   │   ├── crud_player.py
│   │   ├── crud_game.py
│   │   ├── crud_round.py   # Manages round decisions and field states (parcels)
│   │   └── crud_result.py
│   ├── db/               # Database session management, Firebase initialization
│   │   ├── __init__.py
│   │   └── firebase_setup.py # Initializes Firebase Admin SDK
│   ├── game_logic/       # Core game mechanics, calculations
│   │   ├── __init__.py
│   │   ├── calculation_engine.py # Orchestrates round calculations
│   │   ├── decision_impacts.py   # Calculates effects of decisions on parcels, financials
│   │   ├── game_rules.py         # Constants for game mechanics, costs, yields
│   │   └── ai_player.py          # Logic for AI player decisions
│   ├── schemas/          # Pydantic schemas for API request/response validation & serialization
│   │   ├── __init__.py
│   │   ├── admin.py, player.py, user.py (UserType enum)
│   │   ├── game.py, round.py, parcel.py, result.py, financials.py
│   │   └── token.py
│   ├── services/         # Business logic services
│   │   ├── __init__.py
│   │   ├── email_service.py
│   │   └── game_state_service.py # Manages game flow, round processing, AI submissions
│   └── main.py           # FastAPI application instance and main router
├── tests/                # Unit and integration tests
│   ├── __init__.py
│   ├── conftest.py       # Pytest fixtures and configuration
│   ├── game_logic/       # Tests for game_rules, decision_impacts, calculation_engine
│   │   └── test_decision_impacts.py # (Initial tests present)
│   │   └── test_calculation_engine.py # (Initial tests present)
│   └── services/
│       └── test_game_state_service.py # (To be created)
│   └── api/
│       └── v1/           # Tests for API endpoints (To be created)
├── .env.example          # Example environment variables
├── .gitignore
├── Dockerfile            # For containerizing the application
├── uv.lock
├── pyproject.toml
└── README.md             # This file
```

## Setup and Installation

1.  **Prerequisites:**
    *   Python 3.13+
    *   uv (Python project and virtual environment manager): Install via `pip install uv` or see [official uv documentation](https://github.com/astral-sh/uv).
    *   Google Cloud SDK (gcloud CLI) - Optional for local dev if not deploying yet, but needed for Firebase interaction if GOOGLE_APPLICATION_CREDENTIALS is not manually set.
    *   Firebase Admin SDK credentials (a JSON service account key file) for local development. Download this from your Firebase project settings: Project settings > Service accounts > Generate new private key.

2.  **Clone the repository (this backend part):**
    ```bash
    # Assuming you are in the root of the overall project
    git clone <your-repo-url>
    cd <your-repo-url>/backend
    ```

3.  **Create a virtual environment and install dependencies using uv:**
    ```bash
    uv venv # Create a virtual environment (e.g., .venv)
    uv sync # Install dependencies from pyproject.toml and uv.lock
    ```
    This will create a virtual environment (usually `.venv/` inside the `backend` directory) and install all dependencies listed in `pyproject.toml` and `uv.lock`. Remember to activate the environment for your shell session (e.g., `source .venv/bin/activate`).

4.  **Environment Variables:**
    *   Copy `.env.example` to `.env`:
        ```bash
        cp .env.example .env
        ```
    *   **Crucial:** Fill in the required values in `.env`.
        *   `PROJECT_NAME`: (Optional, defaults in `config.py`)
        *   `SECRET_KEY`: **Important for security!** Generate a strong key (e.g., `openssl rand -hex 32`).
        *   `GOOGLE_APPLICATION_CREDENTIALS`: Path to your Firebase service account key JSON file (e.g., `../serviceAccountKey.json` if placed one level up from `backend`, or an absolute path).
        *   `GCP_PROJECT_ID`: Your Google Cloud Project ID (should match the project of your service account key).
        *   `BACKEND_CORS_ORIGINS`: Comma-separated list of frontend URLs (e.g., `http://localhost:4200,http://127.0.0.1:4200`).
        *   **SMTP Settings (for emails):**
            *   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAILS_FROM_EMAIL`, `EMAILS_FROM_NAME`.
            *   For local development without sending real emails, you can omit these or use a local SMTP debugging server (like `python -m smtpd -c DebuggingServer -n localhost:1025`). The `EmailService` will print to console if SMTP is not fully configured.

5.  **Firebase Project Setup:**
    *   Ensure you have a Firebase project created.
    *   Enable **Firebase Authentication** (with Email/Password sign-in method).
    *   Enable **Firestore** in Native mode.
    *   (Optional) Configure your Authentication email templates in the Firebase console if you want Firebase to handle verification/password reset emails with its own UI. If you want to use custom action handlers (frontend routes), configure them in Firebase Authentication settings.

## Running Locally

1.  **Activate the virtual environment (if not already active):**
    ```bash
    source .venv/bin/activate 
    ```
    (This step might be optional if your IDE or terminal automatically uses the project's virtualenv).

2.  **Run the FastAPI application using Uvicorn (via uv):**
    ```bash
    uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```
    Or, if Uvicorn is installed in your activated virtual environment:
    ```bash
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```
    *   `--reload`: Enables auto-reloading when code changes (for development).
    *   `--host 0.0.0.0`: Makes the server accessible from outside the Docker container if you run it containerized locally, or from other devices on your network.
    *   `--port 8000`: Specifies the port.

The API will typically be available at `http://127.0.0.1:8000` (or `http://localhost:8000`).
API documentation (Swagger UI) will be at `http://127.0.0.1:8000/docs`.
Alternative API documentation (ReDoc) will be at `http://127.0.0.1:8000/redoc`.

## Running Tests

Unit and integration tests are written using `pytest`.

1.  **Activate the virtual environment (if not already active):**
    ```bash
    source .venv/bin/activate
    ```

2.  **Run all tests (via uv):**
    ```bash
    uv run pytest
    ```
    Or, if pytest is installed in your activated virtual environment:
    ```bash
    pytest
    ```
    You can also run specific test files or directories:
    ```bash
    uv run pytest tests/game_logic/test_decision_impacts.py
    uv run pytest tests/services/
    ```

**Current Testing Status:**
*   Initial unit tests for `app.game_logic.decision_impacts` and `app.game_logic.calculation_engine` have been created (`tests/game_logic/`). These cover some core game mechanic calculations.
*   More comprehensive tests for game logic, CRUD operations, services (like `GameStateService`), and API endpoints are still required.

**Firebase Emulator Suite (Recommended for Advanced Local Testing):**
For more thorough local testing of Firestore and Firebase Authentication interactions without affecting your live Firebase project, consider setting up and using the [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite). Your application can be configured (e.g., via environment variables) to connect to the emulators when running locally or in CI.

## Linting and Formatting

This project uses Ruff for linting and Black for code formatting. MyPy is used for static type checking. These are configured in `pyproject.toml`.

It's highly recommended to use `pre-commit` to automatically run these tools before each commit:

1.  **Install pre-commit (if not already installed globally or in your project):**
    ```bash
    pip install pre-commit 
    # or uv pip install pre-commit (if you prefer to manage it via uv for the project)
    ```
2.  **Install the pre-commit hooks defined in `.pre-commit-config.yaml` (to be created in the project root):**
    ```bash
    pre-commit install
    ```
Now, Ruff and Black (and potentially MyPy) will run on changed files automatically when you `git commit`.

To run them manually (ensure your virtual environment is active or use `uv run`):
```bash
# Activate environment if not already: source .venv/bin/activate
uv run ruff check . --fix
uv run black .
uv run mypy app
# Or, if environment is active:
# ruff check . --fix
# black .
# mypy app
```

## Deployment

This backend is designed to be deployed as a containerized application on Google Cloud Run.
A `Dockerfile` is provided to build the container image.
Terraform configurations for deploying the necessary Google Cloud services (Cloud Run, Firestore, Firebase Auth, Load Balancer, Cloud Storage for static assets if frontend is also hosted this way) will be located in the main project's `terraform/` directory.

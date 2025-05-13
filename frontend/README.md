# Soil Game - Frontend

This is the Angular frontend for the Soil educational game.

## Overview

The frontend provides the user interface for players and administrators to interact with the Soil game. It communicates with the Python/FastAPI backend to fetch game data, submit decisions, and manage game sessions.

## Tech Stack

*   **Framework:** Angular 19+
*   **UI Components:** Angular Material
*   **State Management:** (To be decided - RxJS patterns, NgRx, or Akita, starting simple)
*   **Authentication:** Firebase Authentication (client-side SDK) integrated with the backend's JWT system.
*   **Styling:** SCSS
*   **Build Tool:** Angular CLI

## Project Structure (Initial - will evolve)

```
frontend/
├── src/
│   ├── app/                # Main application module and components
│   │   ├── core/           # Core services, guards, interceptors
│   │   ├── features/       # Feature modules (e.g., auth, admin, game)
│   │   ├── shared/         # Shared components, directives, pipes, models
│   │   ├── app-routing.module.ts
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   ├── app.component.ts
│   │   └── app.module.ts
│   ├── assets/             # Static assets (images, fonts, etc.)
│   ├── environments/       # Environment-specific configurations
│   ├── index.html          # Main HTML page
│   ├── main.ts             # Main entry point of the application
│   ├── polyfills.ts        # Polyfills for browser compatibility
│   ├── styles.scss         # Global styles
│   └── test.ts             # Main entry point for unit tests
├── .editorconfig
├── .eslintrc.json
├── .gitignore
├── angular.json          # Angular CLI configuration
├── karma.conf.js         # Karma test runner configuration
├── package.json
├── postcss.config.js     # PostCSS configuration (if needed beyond Angular's defaults)
├── README.md             # This file
├── tsconfig.app.json
├── tsconfig.json
└── tsconfig.spec.json
```

## Prerequisites

*   Node.js (LTS version recommended - check Angular 19 compatibility, likely v18 or v20+)
*   npm (comes with Node.js) or Yarn
*   Angular CLI: `npm install -g @angular/cli@latest` (or use `npx`)

## Setup and Installation

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Environment Configuration:**
    *   Copy `src/environments/environment.ts.template` to `src/environments/environment.ts`.
    *   Fill in your Firebase client configuration details in `src/environments/environment.ts`. These include API key, auth domain, project ID, etc., obtained from your Firebase project settings.
    *   The backend API URL defaults to `http://localhost:8000/api/v1` for local development.
    *   For production, configure `src/environments/environment.prod.ts` similarly, pointing to your production Firebase project and backend URL.

## Running Locally

1.  **Serve the application:**
    ```bash
    ng serve
    # or
    # npm start
    # or
    # yarn start
    ```
    This will compile the application and serve it locally, usually at `http://localhost:4200/`. The app will automatically reload if you change any source files.

## Local Development Testing (Using Predefined Defaults)

To streamline local testing, the development environment (`ng serve`) includes predefined default values:

1.  **Admin Login:**
    *   When you navigate to the login page, the form will be pre-filled with:
        *   **Email:** `admin@local.dev`
        *   **Password:** `password`
    *   You can use these credentials to log in directly as the admin.

2.  **Game Creation:**
    *   After logging in as the admin, navigate to the "Create Game" page.
    *   The form will be pre-filled with settings for a simple test game:
        *   **Name:** `Dev Test Game`
        *   **Human Players:** 1
        *   **AI Players:** 1
        *   (Other defaults like rounds, max players may also be set).
    *   You can adjust these or use them as is.

3.  **Human Player Credentials:**
    *   **Important:** The *password* for the human player is **not** predefined in the frontend.
    *   After you submit the "Create Game" form using the pre-filled defaults, the **backend** will generate the human player(s) and their unique passwords.
    *   These player credentials (including the password) will typically be sent to the **admin's email address** (`admin@local.dev` in this case). You will need to check this email (or the backend logs/database if email sending isn't fully set up) to get the player's login details (Game ID, Player Number, Password).

4.  **Console Logs:**
    *   The predefined default values are also logged to the browser's developer console when the application starts with `ng serve` for easy reference.

**Note:** These defaults are **only active** when using `ng serve` (development mode) and are **not included** in production builds (`ng build --configuration production`).

## Building for Production

```bash
ng build --configuration production
# or
# npm run build
# or
# yarn build
```
The build artifacts will be stored in the `dist/soil-frontend/browser` directory.

## Running Unit Tests

```bash
ng test
# or
# npm test
# or
# yarn test
```
This will launch the Karma test runner and execute unit tests.

## Linting

```bash
ng lint
# or
# npm run lint
# or
# yarn lint
```
This will check the codebase for linting errors and warnings based on the ESLint configuration.

## Internationalization (I18N)

The frontend will support English (en) and German (de). Angular's built-in I18N tools will be used.
*   Source text will primarily be in English.
*   Translation files (`messages.de.xlf` or similar) will be used for German.
*   The application will need a mechanism to switch locales (e.g., based on browser settings or user preference).

## Further Development Steps

*   Set up Firebase client SDK.
*   Create core services for authentication and API interaction.
*   Implement routing modules for different application sections.
*   Develop components for authentication (login, registration - admin only for now).
*   Develop components for admin game management.
*   Develop components for the player game interface.


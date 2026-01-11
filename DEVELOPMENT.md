---
trigger: always_on
---

# Development Guide & Rules

This document outlines the local development strategy, testing procedures, and core mandates for both human and AI programmers.

## Core Mandates

- **Conventions**: Rigorously adhere to existing project conventions. Analyze surrounding code, tests, and configuration before modifying.
- **Style & Structure**: Mimic the style (formatting, naming), structure, and architectural patterns of existing code. Keep Angular components modular to ensure that individual files (especially HTML templates) remain manageable in size (ideally under 500 lines). Avoid extremely large inline templates; prefer separate `.html` files if the template exceeds 50 lines. This improves maintainability and ensures better performance for AI code generation tools like Gemini CLI.
- **Idiomatic Changes**: Ensure changes integrate naturally and idiomatically within the local context.
- **Comments**: Add comments sparingly, focusing on _why_ something is done rather than _what_.
- **Dependencies**: Verify established usage in `package.json` before employing new libraries. Prefer stable versions.
- **Modals**: Consistently use HTML/CSS modals instead of native browser dialogs (alert/confirm/prompt).
- **Manual**: Ensure the User Manual (`src/app/manual/manual.ts`) is kept up to date whenever game logic or crop properties change.
- **Sitemap & SEO**: Ensure the Sitemap (`public/sitemap.xml`) and `public/robots.txt` are kept up to date whenever public routes are added or changed.
- **Compliance**: All public pages and views must include a link to the Impressum page.
- **Search**: NEVER run a `grep` recursively in the project without excluding files/folders from `.gitignore`. Use tools like `ripgrep` or properly configured search tools that respect project ignore patterns to avoid excessive output and token consumption.

## Prerequisites

- Node.js (v24 recommended)
- npm
- Firebase CLI (`npm install -g firebase-tools`)
- Java (required for Firebase Emulators)
- [lychee](https://github.com/lycheeverse/lychee) (required for link checking)

## Local Development Environment

We use the **Firebase Emulator Suite** to mirror the production environment locally. This ensures that our local testing is accurate and safe.

### Starting the Environment

To start the full local development environment, including Angular and Firebase Emulators:

```bash
npm run start:emulators
```

This will:

1. Build the Angular application in watch mode.
2. Start the Firebase Emulators (Auth, Firestore, Functions, Hosting, Storage).
3. Serve the application at `http://localhost:5005` (Hosting Emulator port).

_Note: You can also use `ng serve` for rapid UI-only development, but it will not have full backend emulation unless configured to connect to emulators._

## Development Workflow

1. **Understand**: Thoroughly understand the codebase context before proposing changes.
2. **Plan**: Formulate a clear, grounded plan and share a concise summary before implementation.
3. **Implement**: Follow the plan iteratively.
4. **Commit**: Always commit changes as soon as a task is completed. You **do not** need to run linting, formatting, or unit tests manually before committing.
5. **Verify (Automated)**:
   - **Pre-commit Hook**: Automatically runs linting, formatting, and unit tests. If any check fails, the commit will be blocked.
   - **Pre-push Hook**: Automatically runs the full E2E test suite. This ensures that no regressions are pushed to the repository.
6. **Finalize**: Only after the commit has succeeded (meaning all automated checks passed) should the task be considered complete.

## Testing Strategy

The project uses automated hooks to maintain code quality and stability.

### 1. Pre-commit Hooks (Fast)
These run automatically on every `git commit`:
- **Biome**: Lints and formats the code.
- **lychee**: Checks for broken links.
- **Vitest**: Runs frontend unit tests.
- **Mocha**: Runs backend (Cloud Functions) unit tests.
- **File Size Check**: Ensures no file exceeds manageable size limits (see `scripts/check-file-size.js`).

### 2. Pre-push Hooks (Comprehensive)
These run automatically on `git push`:
- **Cypress**: Runs the complete E2E test suite.

### Manual Commands (If needed)
While hooks handle the heavy lifting, you can still run checks manually:
- **Frontend Unit Tests**: `npm run test:unit`
- **Backend Unit Tests**: `npm run test:functions`
- **E2E Tests**: `npm run test:e2e`
- **Linting**: `npm run lint`

### 3. Continuous Integration (CI) & Standards

Before pushing code, you can ensure everything is perfect with the full suite.

- **Full Test Suite**: `npm run test:ci`
- **Linting (Functions)**: `npm run lint --prefix functions`

## Performance, SEO & Accessibility

- **Performance**: Ensure fast load times and smooth interactions.
- **Accessibility**: Adhere to WCAG standards using semantic HTML and ARIA labels.
- **SEO**: Optimize metadata and semantic structure following Google Search best practices.
- **Lighthouse**: Regularly run audits. Aim for high scores in Performance, Accessibility, Best Practices, and SEO.

## Versioning & Diagnostics

- **Manual Versioning**: Increment the version in `package.json` for significant changes.
- **Consistency**: Ensure the `app-version` meta tag in `src/index.html` matches `package.json`.
- **Diagnostics**: Print the current application version to the developer console on first load.
- **Dynamic Versioning**: The application picks up the version automatically during the build process using `git describe` and build IDs.

## Git & Commits

- **Review**: Always run `git status` and `git diff` before committing.
- **Commit Frequency**: Commit every time a task is completed. Do not bundle multiple unrelated tasks into a single commit.
- **Messages**: Propose clear, concise commit messages focusing on "why". Match existing project style.
- **Automation**: Trust the pre-commit hooks. They handle linting, formatting, testing, and building. If a commit fails, fix the reported errors and try again.
- **Success**: Confirm successful commits with `git status`. Never push without explicit instruction.

## Release Process

We use semantic versioning managed in `package.json` and tagged in Git. For a full release including backend components:

1. Ensure `main` is up to date.
2. Run `npm run deploy [patch | minor | major | <version>]`. This script will:
   - Use the provided increment type or version, or prompt if no argument is given.
   - Update `package.json`.
   - Deploy backend components (Functions, Firestore, Storage) to Firebase.
3. The script will automatically commit the `package.json` change and create a git tag.
4. The script will prompt to push the changes and tags to GitHub.

> [!NOTE]
> The frontend deployment is triggered automatically by the push to `main`.

## CI/CD & Deployment

- **Firebase App Hosting**: Deployment of the frontend is automated via GitHub merges to `main`.
- **Backend Deployment**: Use `npm run deploy:backend` to manually deploy Functions, Firestore, and Storage components.
- **Regional Constraints**: Use Firebase services exclusively in **EU (europe-west4)**.
- **Cloud Build**: Monitor CI/CD builds for success; fix errors and address warnings promptly.
- **Post-Deployment**: Verify the live version matches the intended `package.json` version.

## Localization Check

Periodically run `ng extract-i18n` to update `messages.xlf` and `messages.en.xlf`.

### I18N Metadata

Always provide **meaning** and **description** for I18N strings if they provide crucial context for translators. Use the following format for metadata:

- **In HTML templates**: `i18n="meaning|description@@custom_id"`
- **In TypeScript files**: `$localize \`:meaning|description@@custom_id:German Text\``

Example: `i18n="Main Heading|Title of the dashboard@@dashboard.title"`

## Future Improvements & TODOs

- **Cognitive Complexity**: Refactor `functions/src/game-engine.ts` (specifically `calculateRound`) to reduce cognitive complexity from ~54 to below 15.
- **Biome HTML**: Re-enable Biome's HTML linter and formatter once the parser better supports Tailwind's opacity syntax (`/30`) in Angular class bindings.
- **Naming Conventions**: Periodically review and align project naming conventions closer to Biome defaults (e.g., removing the need for `$`, `_`, or `CONSTANT_CASE` object properties where possible).


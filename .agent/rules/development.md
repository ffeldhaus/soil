---
trigger: always_on
---

# Development Rules

## Core Mandates
- **Conventions**: Rigorously adhere to existing project conventions. Analyze surrounding code, tests, and configuration before modifying.
- **Style & Structure**: Mimic the style (formatting, naming), structure, and architectural patterns of existing code.
- **Idiomatic Changes**: Ensure changes integrate naturally and idiomatically within the local context.
- **Comments**: Add comments sparingly, focusing on *why* something is done rather than *what*.
- **Dependencies**: Verify established usage in `package.json` before employing new libraries. Prefer stable versions.
- **Modals**: Consistently use HTML/CSS modals instead of native browser dialogs (alert/confirm/prompt).
- **Compliance**: All public pages and views must include a link to the Impressum page.

## Development Workflow
1.  **Understand**: Use `search_file_content`, `glob`, and `read_file` to thoroughly understand the codebase context before proposing changes.
2.  **Plan**: Formulate a clear, grounded plan and share a concise summary before implementation.
3.  **Implement**: Follow the plan iteratively. Write unit tests alongside feature code.
4.  **Verify (Tests)**:
    - Root unit tests: `npm run test:unit`
    - Functions unit tests: `npm run test:functions`
    - Full test suite: `npm run test:ci`
    - E2E tests: `npm run test:e2e` (Ensure emulators are started or use the command which handles it)
5.  **Verify (Standards)**: Run linting in `functions` directory: `npm run lint --prefix functions`.
6.  **Finalize**: Only after all verifications pass should the task be considered complete.

## Performance, SEO & Accessibility
- **Performance**: Ensure fast load times and smooth interactions.
- **Accessibility**: Adhere to WCAG standards using semantic HTML and ARIA labels.
- **SEO**: Optimize metadata and semantic structure following Google Search best practices.
- **Lighthouse**: Regularly run audits. Aim for high scores in Performance, Accessibility, Best Practices, and SEO.

## Versioning & Diagnostics
- **Manual Versioning**: Increment the version in `package.json` for significant changes.
- **Consistency**: Ensure the `app-version` meta tag in `src/index.html` matches `package.json`.
- **Diagnostics**: Print the current application version to the developer console on first load.

## Git & Commits
- **Review**: Always run `git status` and `git diff` before committing.
- **Messages**: Propose clear, concise commit messages focusing on "why". Match existing project style.
- **Success**: Confirm successful commits with `git status`. Never push without explicit instruction.

## CI/CD & Deployment
- **Firebase App Hosting**: Deployment is automated via GitHub merges to `main`.
- **Localization**: Builds are automatically performed with localization as per `apphosting.yaml`.
- **Regional Constraints**: Use Firebase services exclusively in **EU (europe-west4)**.
- **Cloud Build**: Monitor CI/CD builds for success; fix errors and address warnings promptly.
- **Post-Deployment**: Verify the live version matches the intended `package.json` version.

## Testing & Local Development
- **Testing Mandatory**: All changes must include relevant unit tests and, for critical flows, E2E tests.
- **Firebase Emulators**: Use `npm run start:emulators` for all local development and testing.
- **Localization Check**: Periodically run `ng extract-i18n` to update `messages.xlf` and `messages.de.xlf`.
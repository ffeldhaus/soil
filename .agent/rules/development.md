---
trigger: always_on
---

# Development Rules

## General Standards
- **Dependencies**: Keep dependencies up to date, preferring stable/LTS versions.
- **Code Quality**: Maintain a clean, readable, and well-documented codebase.
- **Modals**: Consistently use HTML/CSS modals instead of native browser dialogs (alert/confirm/prompt).
- **Compliance**: All public pages and views must include a link to the Impressum page.

## Performance, SEO & Accessibility
- **Performance**: The application must be highly performant, ensuring fast load times and smooth interactions.
- **Accessibility**: Adhere to accessibility standards (WCAG) to ensure the application is usable by everyone. Use semantic HTML and appropriate ARIA labels.
- **SEO**: Optimize for search engines following Google Search best practices (metadata, semantic structure, sitemaps).
- **Lighthouse**: Regularly test for compliance using Google Lighthouse. Aim for high scores across Performance, Accessibility, Best Practices, and SEO.

## Versioning & Diagnostics
- **Manual Versioning**: Increment the version number in `package.json` when making significant changes.
- **Consistency**: Ensure the `app-version` meta tag in `src/index.html` matches the `package.json` version.
- **Diagnostics**: Always print the current application version to the developer console on the first load of the application.

## CI/CD & Deployment
- **Firebase App Hosting**: Deployment is fully automated via Firebase App Hosting, triggered by merges or pushes to the `main` branch on GitHub.
- **Localization**: Builds are automatically performed with localization as specified in `apphosting.yaml`. Do not use manual deployment scripts for production.
- **Regional Constraints**: Use Firebase services exclusively in the **EU (europe-west4)**.
- **Cloud Build**: Check the Cloud Build triggered by CI/CD and monitor it is running succesfull - fix errors and try to address warnings
- **Post-Deployment**: After a successful CI/CD run, verify that the live version matches the intended `package.json` version.

## Testing & Local Development Strategy
- **Testing Mandatory**: All code changes must be accompanied by relevant unit tests and, for critical UI/UX flows, E2E tests.
- **Local Verification**:
  - Run `npm test` to execute unit tests.
  - Run `./run-e2e.sh` to execute E2E tests against local emulators.
- **Lighthouse Verification**: Run Google Lighthouse audits on local builds or staging deployments to verify performance, SEO, and accessibility compliance before merging major changes.
- **Firebase Emulators**: Use the Firebase Emulators (`firebase emulators:start`) for all local development and testing to mirror the production environment (Firestore, Auth, Functions).
- **Localization Check**: Periodically run `ng extract-i18n` to ensure all new strings are captured for translation in the corresponding locale files (e.g., `messages.de.xlf`).
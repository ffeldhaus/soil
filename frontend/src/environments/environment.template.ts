// THIS FILE IS A TEMPLATE. DO NOT EDIT MANUALLY FOR LOCAL DEV.
// Placeholders below (__PLACEHOLDER__) are replaced by the CI/CD pipeline.
// For local development, configure environment.ts directly.

export const environment = {
  production: __PRODUCTION_FLAG__, // Will be true for staging/prod, false for dev CI build
  useMocks: false, // Default to false for CI/CD builds; overridden by environment.ts for local 'ng serve'
  apiUrl: '__API_URL__',
  playerEmailDomain: '__PLAYER_EMAIL_DOMAIN__', // Example: soil.dev.app, soil.staging.app, soil.app

  firebase: {
    apiKey: '__FIREBASE_API_KEY__',
    authDomain: '__FIREBASE_AUTH_DOMAIN__',
    projectId: '__FIREBASE_PROJECT_ID__',
    storageBucket: '__FIREBASE_STORAGE_BUCKET__',
    messagingSenderId: '__FIREBASE_MESSAGING_SENDER_ID__',
    appId: '__FIREBASE_APP_ID__',
    measurementId: '__FIREBASE_MEASUREMENT_ID__' // Optional
  },
  devDefaults: null // Ensure dev defaults are not included in CI builds
};

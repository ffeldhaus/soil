// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  useMocks: true, // Enable mocks for local development
  // API URL for the backend
  apiUrl: 'http://localhost:8000/api/v1', // Default for local backend
  playerEmailDomain: 'soil.game.local', // For player email generation during login

  // Firebase configuration (replace with your actual Firebase project config)
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_FIREBASE_AUTH_DOMAIN', // e.g., your-project-id.firebaseapp.com
    projectId: 'YOUR_FIREBASE_PROJECT_ID',
    storageBucket: 'YOUR_FIREBASE_STORAGE_BUCKET', // e.g., your-project-id.appspot.com
    messagingSenderId: 'YOUR_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'YOUR_FIREBASE_APP_ID',
    // measurementId: 'YOUR_FIREBASE_MEASUREMENT_ID' // Optional, for Google Analytics
  },
  useEmulators: true, // Set to true to use Firebase Emulators
  emulatorAuthHost: '127.0.0.1',
  emulatorAuthPort: 9099,
  emulatorFirestoreHost: '127.0.0.1',
  emulatorFirestorePort: 8080,
  // Add development defaults
  devDefaults: {
    adminEmail: 'admin@local.dev',
    adminPassword: 'password',
    game: {
      name: 'Dev Test Game',
      humanPlayers: 1,
      aiPlayers: 1,
      rounds: 10 // Example default rounds
    }
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

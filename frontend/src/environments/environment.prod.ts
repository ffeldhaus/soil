export const environment = {
  production: true,
  // API URL for the backend - This should point to your deployed backend URL
  apiUrl: 'https://your-deployed-backend-url.com/api/v1', // Example: https://soil-backend-asdf123.a.run.app/api/v1
  playerEmailDomain: 'soil.app', // For player email generation during login on production

  // Firebase configuration (replace with your actual Firebase project config)
  // Ensure this is your PRODUCTION Firebase project if you have separate dev/prod projects.
  firebase: {
    apiKey: 'YOUR_PRODUCTION_FIREBASE_API_KEY',
    authDomain: 'YOUR_PRODUCTION_FIREBASE_AUTH_DOMAIN',
    projectId: 'YOUR_PRODUCTION_FIREBASE_PROJECT_ID',
    storageBucket: 'YOUR_PRODUCTION_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_PRODUCTION_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'YOUR_PRODUCTION_FIREBASE_APP_ID',
    // measurementId: 'YOUR_PRODUCTION_FIREBASE_MEASUREMENT_ID'
  }
};
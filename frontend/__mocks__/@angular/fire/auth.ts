
// frontend/__mocks__/@angular/fire/auth.ts

import { User as FirebaseUser, IdTokenResult } from '@firebase/auth-types';

// Exported Mock Functions
export const mockSignInWithEmailAndPassword = jest.fn();
export const mockSignInWithCustomToken = jest.fn();
export const mockSignOut = jest.fn();
export const mockGetIdTokenResult = jest.fn();

// Mock onAuthStateChanged Logic
let authStateCallback: ((user: Partial<FirebaseUser> | null) => void) | null = null;
export const mockOnAuthStateChanged = jest.fn((authInstance: any, callback: any) => {
  console.log('>>> MOCK onAuthStateChanged CALLED <<<');
  authStateCallback = callback;
  return () => {
    console.log('>>> MOCK onAuthStateChanged UNSUBSCRIBED <<<');
    authStateCallback = null;
  };
});

// Helper to Simulate State Change
export const simulateAuthStateChange = (user: Partial<FirebaseUser> | null) => {
  console.log('>>> MOCK simulateAuthStateChange CALLED with:', user);
  console.trace('simulateAuthStateChange TRACE'); // DEBUG TRACE
  if (authStateCallback) {
    authStateCallback(user);
  } else {
    console.warn('>>> MOCK simulateAuthStateChange: No callback registered! <<<');
  }
};

// Mock the Auth class - accept argument in constructor
export const Auth = jest.fn().mockImplementation((injectedArg: any) => { // Accept arg
  console.log('>>> MOCK Auth CONSTRUCTOR CALLED <<<');
  return { /* Mock instance properties/methods if needed */ };
});

// Export the mocks for actual use by the service (Jest replaces the real ones)
export const signInWithEmailAndPassword = mockSignInWithEmailAndPassword;
export const signInWithCustomToken = mockSignInWithCustomToken;
export const signOut = mockSignOut;
export const onAuthStateChanged = mockOnAuthStateChanged;
export const getIdTokenResult = mockGetIdTokenResult;

// Helper export to reset all mocks
export const resetAuthMocks = () => {
  console.log('>>> MOCK resetAuthMocks CALLED <<<');
  mockSignInWithEmailAndPassword.mockReset();
  mockSignInWithCustomToken.mockReset();
  mockSignOut.mockReset();
  mockGetIdTokenResult.mockReset();
  mockOnAuthStateChanged.mockClear();
  authStateCallback = null;
  (Auth as jest.Mock).mockClear();
};

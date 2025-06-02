
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Auth, User as FirebaseUser, IdTokenResult } from '@angular/fire/auth';
import { Router } from '@angular/router';
// HttpClient, PLATFORM_ID removed
// import { Observable } from 'rxjs'; // of, throwError, Subject, firstValueFrom removed. Observable removed.
import { take } from 'rxjs/operators'; // filter removed

import { AuthService } from './auth.service';
import { User, UserRole } from '../models/user.model';
import { AuthResponse } from '../models/auth-response.model';
import { environment } from '../../../environments/environment';

interface FirebaseAuthMock {
    Auth: jest.Mock;
    mockSignInWithEmailAndPassword: jest.Mock;
    mockSignInWithCustomToken: jest.Mock;
    mockSignOut: jest.Mock;
    mockGetIdTokenResult: jest.Mock;
    mockOnAuthStateChanged: jest.Mock;
    simulateAuthStateChange: (user: Partial<FirebaseUser> | null) => void;
    resetAuthMocks: () => void;
}

describe('AuthService (Real Implementation with Jest Manual Mock)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let authInstanceMock: Auth;
  let router: Router;

  // Mock Firebase Admin User details
  const mockFbAdminUser: Partial<FirebaseUser> = {
    uid: 'admin-uid-fb',
    email: 'admin@example.com',
    displayName: 'Firebase Admin User',
    getIdToken: jest.fn().mockResolvedValue('fb-admin-id-token-original'),
  };

  // Mock Admin ID Token Result
  const mockAdminIdTokenResult: Partial<IdTokenResult> = {
    token: 'fb-admin-id-token-original',
    claims: { role: UserRole.ADMIN },
  };

  // Mock Backend Admin AuthResponse
  const backendAdminAuthResponse: AuthResponse = {
    access_token: 'backend-admin-jwt-original',
    token_type: 'Bearer', // Corrected to token_type
    user_info: { uid: 'admin-uid-fb', email: 'admin@example.com', role: UserRole.ADMIN, displayName: 'Backend Admin User' } // Corrected to user_info
  };

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const firebaseAuthMock = require('@angular/fire/auth') as FirebaseAuthMock;

  // Helper to setup admin state
  const setupAdminUser = fakeAsync(() => {
    firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockAdminIdTokenResult as IdTokenResult);
    firebaseAuthMock.simulateAuthStateChange(mockFbAdminUser);
    tick(); // onAuthStateChanged -> processFirebaseUser (starts) -> getIdTokenResult (mock resolves)
    tick(); // Allow the http.post from fetchAndStoreBackendToken to be made

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
    expect(req.request.method).toBe('POST');
    req.flush(backendAdminAuthResponse); // Resolve the http.post
    tick(); // Allow fetchAndStoreBackendToken to complete
    tick(); // Ensure currentUser$ has emitted
    expect(service.currentUser()?.role).toBe(UserRole.ADMIN);
    expect(service.backendToken()).toBe(backendAdminAuthResponse.access_token);
    expect(service.isImpersonating()).toBe(false);
  });


  beforeEach(fakeAsync(() => {
    firebaseAuthMock.resetAuthMocks();
    authInstanceMock = new firebaseAuthMock.Auth({}); // Create a new instance for each test

    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]), // Basic router stub
      ],
      providers: [
        AuthService,
        { provide: Auth, useValue: authInstanceMock },
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router); // Inject Router

    // Spy on router navigation and localStorage
    jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(Storage.prototype, 'getItem');
    jest.spyOn(Storage.prototype, 'setItem');
    jest.spyOn(Storage.prototype, 'removeItem');


    firebaseAuthMock.simulateAuthStateChange(null); // Start as logged out
    tick();
  }));

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
    jest.restoreAllMocks(); // Restore all jest spies, including localStorage and router
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(firebaseAuthMock.mockOnAuthStateChanged).toHaveBeenCalled();
  });

  it('initial state should be logged out', fakeAsync(() => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.firebaseUser()).toBeNull();
  }));

  describe('Admin Login', () => {
    const testEmail = 'admin@example.com'; // Using email from mockFbAdminUser
    const testPassword = 'adminPassword';

    it('adminLogin success should authenticate and set user', fakeAsync(() => {
      firebaseAuthMock.mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockFbAdminUser as FirebaseUser });
      // mockGetIdTokenResult is already configured in the global setup for admin,
      // but if a specific test needs different claims, it can be overridden here.
      // For this basic login, the global setup should suffice.

      let loggedInUser: User | null = null;
      service.adminLogin(testEmail, testPassword).pipe(take(1)).subscribe(user => {
        loggedInUser = user;
      });
      
      // Tick for signInWithEmailAndPassword to resolve
      tick();

      // At this point, signInWithEmailAndPassword has resolved.
      // The Firebase SDK would trigger onAuthStateChanged.
      // Ensure mocks are ready for what onAuthStateChanged -> processFirebaseUser will do.
      firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockAdminIdTokenResult as IdTokenResult);
      firebaseAuthMock.simulateAuthStateChange(mockFbAdminUser); // This calls processFirebaseUser internally

      // Ticks for processFirebaseUser:
      tick(); // 1. onAuthStateChanged -> processFirebaseUser -> getIdTokenResult (promise created)
      tick(); // 2. getIdTokenResult resolves -> appUser is set (partially) -> fetchAndStoreBackendToken is called (http.post promise created)
      
      // Expect and flush the backend token request
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
      expect(req.request.method).toBe('POST');
      req.flush(backendAdminAuthResponse);
      
      tick(); // 3. http.post promise resolves in fetchAndStoreBackendToken -> backendToken is set, appUser potentially updated from response
      tick(); // 4. fetchAndStoreBackendToken completes, processFirebaseUser completes.

      // Tick for the switchMap in adminLogin to complete, which depends on currentUser$ emitting
      // and the filter condition (user being set AND backend token being set).
      tick();

      expect(loggedInUser).toBeTruthy();
      if(loggedInUser) { // Type guard for loggedInUser
        expect(loggedInUser.role).toBe(UserRole.ADMIN);
      }
      expect(service.isAuthenticated()).toBe(true);
      expect(service.backendToken()).toBe(backendAdminAuthResponse.access_token);
      expect(firebaseAuthMock.mockGetIdTokenResult).toHaveBeenCalledWith(mockFbAdminUser, true); // Ensure it was called during processFirebaseUser
      expect(firebaseAuthMock.mockSignInWithEmailAndPassword).toHaveBeenCalledWith(authInstanceMock, testEmail, testPassword);
    }));

    it('adminLogin failure from Firebase should clear data', fakeAsync(() => {
        const error = new Error('Firebase auth error');
        firebaseAuthMock.mockSignInWithEmailAndPassword.mockRejectedValue(error);

        let actualError: any; // Changed from unknown to any
        service.adminLogin(testEmail, testPassword).subscribe({
          next: () => fail('should have failed'),
          error: (err: any) => actualError = err // Added type for err
        });

        tick(); // Allow signInWithEmailAndPassword rejection and catchError logic

        expect(actualError).toBe(error);
        expect(service.isAuthenticated()).toBe(false);
        expect(service.currentUser()).toBeNull();
        expect(service.backendToken()).toBeNull();
    }));
  });

  // Player Login tests remain largely the same but will benefit from the more robust beforeEach

  describe('Player Login with Credentials', () => {
    const testGameId = 'game123';
    const testPlayerNumber = 456; // Changed from testPlayerId (string) to testPlayerNumber (number)
    const testPassword = 'playerPassword';

    const mockFbPlayerUser: Partial<FirebaseUser> = {
      uid: 'player-uid-from-fb',
      email: `player${testPlayerNumber}@player.com`, // Example email using number
      displayName: 'Mock Player User',
      getIdToken: jest.fn().mockResolvedValue('fb-player-id-token'),
    };

    const mockPlayerIdTokenResult: Partial<IdTokenResult> = {
        token: 'fb-player-id-token',
        claims: { role: UserRole.PLAYER, gameId: testGameId, player_number: testPlayerNumber }, // Changed playerId to player_number
    };

    const backendPlayerAuthResponse: AuthResponse = {
      access_token: 'backend-player-jwt',
      token_type: 'Bearer', // Corrected to token_type
      // Ensure userInfo matches User model (uses playerNumber, not playerId)
      user_info: { uid: mockFbPlayerUser.uid!, email: mockFbPlayerUser.email!, role: UserRole.PLAYER, gameId: testGameId, playerNumber: testPlayerNumber, displayName: 'Player User from Backend' } // Corrected to user_info
    };

    it('playerLoginWithCredentials success should authenticate and set player user', fakeAsync(() => {
      const customTokenResponse = { customToken: 'a-custom-firebase-token' };
      firebaseAuthMock.mockSignInWithCustomToken.mockResolvedValue({ user: mockFbPlayerUser as FirebaseUser });
      firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockPlayerIdTokenResult as IdTokenResult);

      let loggedInUser: User | null = null;
      service.playerLoginWithCredentials(testGameId, testPlayerNumber, testPassword).pipe(take(1)).subscribe(user => {
        loggedInUser = user;
      });

      const playerCredentialsReq = httpMock.expectOne(`${environment.apiUrl}/auth/login/player-credentials`);
      expect(playerCredentialsReq.request.method).toBe('POST');
      // Backend controller for player-credentials expects playerNumber
      expect(playerCredentialsReq.request.body).toEqual({ gameId: testGameId, playerNumber: testPlayerNumber, password: testPassword });
      playerCredentialsReq.flush(customTokenResponse);

      // Tick for the first switchMap (HTTP call) to resolve and signInWithCustomToken to be called
      tick();
      // signInWithCustomToken promise resolves, Firebase SDK would trigger onAuthStateChanged.
      // Ensure mocks are ready for what onAuthStateChanged -> processFirebaseUser will do for the player.
      firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockPlayerIdTokenResult as IdTokenResult);
      firebaseAuthMock.simulateAuthStateChange(mockFbPlayerUser); // This calls processFirebaseUser internally

      // Ticks for processFirebaseUser (for player):
      tick(); // 1. onAuthStateChanged -> processFirebaseUser -> getIdTokenResult (promise created)
      tick(); // 2. getIdTokenResult resolves -> appUser is set (partially) -> fetchAndStoreBackendToken is called (http.post promise created)

      // Expect and flush the backend token request for the player
      const idTokenReq = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
      expect(idTokenReq.request.method).toBe('POST');
      idTokenReq.flush(backendPlayerAuthResponse);

      tick(); // 3. http.post promise resolves in fetchAndStoreBackendToken -> backendToken is set, appUser potentially updated
      tick(); // 4. fetchAndStoreBackendToken completes, processFirebaseUser completes.

      // Tick for the final switchMap in playerLoginWithCredentials to complete
      tick();

      expect(loggedInUser).toBeTruthy();
      if(loggedInUser) { // Type guard
        expect(loggedInUser.role).toBe(UserRole.PLAYER);
      }
      expect(loggedInUser!.gameId).toBe(testGameId);
      expect(loggedInUser!.playerNumber).toBe(testPlayerNumber); // Changed from playerId to playerNumber
      expect(service.isAuthenticated()).toBe(true);
      expect(service.backendToken()).toBe(backendPlayerAuthResponse.access_token);
      expect(firebaseAuthMock.mockSignInWithCustomToken).toHaveBeenCalledWith(authInstanceMock, customTokenResponse.customToken);
      expect(firebaseAuthMock.mockGetIdTokenResult).toHaveBeenCalledWith(mockFbPlayerUser, true);
    }));

    it('playerLogin - backend fails to provide custom token (empty response)', fakeAsync(() => {
      let actualError: any;
      service.playerLoginWithCredentials(testGameId, testPlayerNumber, testPassword).subscribe({
        next: () => fail('should have failed'),
        error: (err: any) => actualError = err,
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/player-credentials`);
      req.flush({});
      tick();

      expect(actualError).toBeTruthy();
      expect(actualError.message).toContain('Failed to retrieve custom token from backend.'); // Align with service error
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
    }));

    it('playerLogin - backend returns HTTP error for custom token', fakeAsync(() => {
      let actualError: any;
      service.playerLoginWithCredentials(testGameId, testPlayerNumber, testPassword).subscribe({
        next: () => fail('should have failed'),
        error: (err: any) => actualError = err,
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/player-credentials`);
      req.flush({ message: 'Backend auth error' }, { status: 401, statusText: 'Unauthorized' });
      tick();

      expect(actualError).toBeTruthy();
      expect(actualError.status).toBe(401); // Service should propagate HttpErrorResponse
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
    }));

    it('playerLogin - signInWithCustomToken fails', fakeAsync(() => {
      const customTokenResponse = { customToken: 'a-custom-firebase-token' };
      const firebaseError = new Error('Firebase custom sign in error');
      firebaseAuthMock.mockSignInWithCustomToken.mockRejectedValue(firebaseError);

      let actualError: any;
      service.playerLoginWithCredentials(testGameId, testPlayerNumber, testPassword).subscribe({
        next: () => fail('should have failed'),
        error: (err: any) => actualError = err,
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/player-credentials`);
      req.flush(customTokenResponse);
      tick();

      expect(actualError.message).toBe(firebaseError.message);
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
    }));
  });

  describe('Admin Register', () => {
    it('adminRegister should make a POST request and complete', fakeAsync(() => {
      const registerPayload = { email: 'newadmin@example.com', password: 'newPassword123', displayName: 'New Admin' };
      let completed = false;
      service.adminRegister(registerPayload).subscribe({
        complete: () => completed = true,
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register/admin`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerPayload);
      req.flush({}, { status: 201, statusText: 'Created' });
      tick();

      expect(completed).toBe(true);
    }));
  });

  describe('Request Password Reset', () => {
    it('requestPasswordReset should make a POST request and complete', fakeAsync(() => {
      const testEmail = 'resetme@example.com';
      let completed = false;
      service.requestPasswordReset(testEmail).subscribe({
        complete: () => completed = true,
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/request-password-reset`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: testEmail });
      req.flush(null, { status: 204, statusText: 'No Content' });
      tick();

      expect(completed).toBe(true);
    }));
  });

  describe('Logout', () => {
    it('logout should clear user data and call Firebase signOut', fakeAsync(() => {
      // Setup admin user to ensure a clean logged-in state
      setupAdminUser();
      // setupAdminUser already calls tick sufficiently to settle the login state.

      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.role).toBe(UserRole.ADMIN);
      expect(service.backendToken()).toBe(backendAdminAuthResponse.access_token);

      firebaseAuthMock.mockSignOut.mockResolvedValue(undefined);

      service.logout(); // Call logout on the service

      tick(); // Allow signOut promise within service.logout() to resolve.
              // This should trigger the onAuthStateChanged(null) by the mock if signOut was successful.

      // Simulate Firebase SDK's onAuthStateChanged(null) after signOut completes
      firebaseAuthMock.simulateAuthStateChange(null);
      tick(); // Allow onAuthStateChanged(null) handler to execute and clear data.

      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(service.backendToken()).toBeNull();
      expect(service.firebaseUser()).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith('soil_game_backend_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('soil_game_original_admin_token'); // Ensure this is also cleared
      expect(firebaseAuthMock.mockSignOut).toHaveBeenCalledWith(authInstanceMock);
      expect(router.navigate).toHaveBeenCalledWith(['/frontpage/login']);
    }));
  });

  describe('Impersonation', () => {
    const gameIdToImpersonate = 'gameImpersonate1';
    const playerNumberToImpersonate = 789;

    const impersonationAuthResponse: AuthResponse = {
      access_token: 'impersonation-jwt',
      token_type: 'Bearer', // Corrected to token_type
      user_info: { // Corrected to user_info
        uid: 'impersonated-player-uid',
        email: 'impersonated@player.com',
        role: UserRole.PLAYER,
        gameId: gameIdToImpersonate,
        playerNumber: playerNumberToImpersonate, // Changed from playerId
        displayName: 'Impersonated Player',
        impersonatorUid: mockFbAdminUser.uid
      }
    };

    describe('impersonatePlayer', () => {
      beforeEach(fakeAsync(() => {
        // Setup admin user (this is essentially setupAdminUser)
        firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockAdminIdTokenResult as IdTokenResult);
        firebaseAuthMock.simulateAuthStateChange(mockFbAdminUser);
        tick(); // onAuthStateChanged -> processFirebaseUser (starts) -> getIdTokenResult (mock resolves)
        tick(); // Allow the http.post from fetchAndStoreBackendToken to be made
        const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
        expect(req.request.method).toBe('POST');
        req.flush(backendAdminAuthResponse);
        tick(); // Allow fetchAndStoreBackendToken to complete
        tick(); // Ensure currentUser$ has emitted & processFirebaseUser completes
        expect(service.currentUser()?.role).toBe(UserRole.ADMIN);
        expect(service.backendToken()).toBe(backendAdminAuthResponse.access_token);
        expect(service.isImpersonating()).toBe(false);
      }));

      it('should successfully impersonate a player', fakeAsync(async () => {
        const originalAdminToken = service.backendToken();
        expect(originalAdminToken).toBe(backendAdminAuthResponse.access_token);

        await service.impersonatePlayer(gameIdToImpersonate, playerNumberToImpersonate.toString());

        // Expect the impersonation HTTP call
        const impersonateReq = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameIdToImpersonate}/impersonate/${playerNumberToImpersonate}`);
        expect(impersonateReq.request.method).toBe('POST');
        impersonateReq.flush(impersonationAuthResponse);
        tick(); // Allow impersonation to complete

        expect(service.isImpersonating()).toBe(true);
        expect(service.backendToken()).toBe(impersonationAuthResponse.access_token);
        const currentUser = service.currentUser();
        expect(currentUser?.role).toBe(UserRole.PLAYER);
        expect(currentUser?.gameId).toBe(gameIdToImpersonate);
        expect(currentUser?.playerNumber).toBe(playerNumberToImpersonate); // Check playerNumber
        expect(currentUser?.impersonatorUid).toBe(mockFbAdminUser.uid);
        expect(localStorage.setItem).toHaveBeenCalledWith('soil_game_original_admin_token', originalAdminToken); // Use string literal
        expect(localStorage.setItem).toHaveBeenCalledWith('soil_game_backend_token', impersonationAuthResponse.access_token); // Use string literal
        expect(router.navigate).toHaveBeenCalledWith(['/game', gameIdToImpersonate, 'dashboard']);
      }));

      it('should throw error if not admin or no token', fakeAsync(async () => {
        // Ensure logged out state
        service.logout(); // Call logout
        tick(); // Allow signOut to complete
        firebaseAuthMock.simulateAuthStateChange(null); // Simulate auth state changed to null
        tick(); // Allow onAuthStateChanged handler to complete
        
        expect(service.isAuthenticated()).toBe(false); // Pre-condition

        try {
          await service.impersonatePlayer(gameIdToImpersonate, playerNumberToImpersonate.toString());
          fail('should have thrown');
        } catch (e: any) { // Explicitly type 'e' as any or Error
          expect(e.message).toContain('Admin not logged in or token unavailable.');
        }
      }));
      
      it('should throw error if already impersonating', fakeAsync(async () => {
        // Admin is logged in from the describe's beforeEach
        // First impersonation
        await service.impersonatePlayer(gameIdToImpersonate, playerNumberToImpersonate.toString());
        tick(); // Start the http.post
        const req1 = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameIdToImpersonate}/impersonate/${playerNumberToImpersonate}`);
        req1.flush(impersonationAuthResponse);
        tick(); // Complete the first impersonation
        expect(service.isImpersonating()).toBe(true);

        // Attempt to impersonate again
        try {
          await service.impersonatePlayer('anotherGame', 'anotherPlayer');
          fail('should have thrown');
        } catch (e: any) { // Explicitly type 'e' as any or Error
          expect(e.message).toContain('Already impersonating. Stop current impersonation first.');
        }
      }));

      it('should throw error and preserve state on backend HTTP error', fakeAsync(async () => {
        // Admin is logged in from the describe's beforeEach
        const originalAdminToken = service.backendToken();
        const originalUser = service.currentUser();

        let impersonationError;
        try {
          // No 'await' here if we want to flush the HTTP request that's part of this async call
          service.impersonatePlayer(gameIdToImpersonate, playerNumberToImpersonate.toString()).catch(e => impersonationError = e);
          tick(); // Start the async operation and allow the HTTP call to be made
        } catch (err) {
            // This catch might not be reached if the promise rejection is handled by the test's try/catch later
        }

        const req = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameIdToImpersonate}/impersonate/${playerNumberToImpersonate}`);
        req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
        tick(); // Allow the error from http.post to propagate and be caught by impersonatePlayer

        expect(impersonationError).toBeTruthy();
        // Check the error message that impersonatePlayer itself throws
        expect((impersonationError as Error).message).toContain('Impersonation HTTP request failed');


        expect(service.isImpersonating()).toBe(false);
        expect(service.backendToken()).toBe(originalAdminToken);
        expect(service.currentUser())?.toEqual(originalUser); // Use toEqual for object comparison
        // Check that setItem for originalAdminToken was NOT called because impersonation failed before that step
        expect(localStorage.setItem).not.toHaveBeenCalledWith('soil_game_original_admin_token', expect.anything());
      }));
    });

    describe('stopImpersonation', () => {
      // This beforeEach sets up a state where admin is logged in AND is impersonating a player.
      beforeEach(fakeAsync(async () => {
        // 1. Setup Admin User
        firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockAdminIdTokenResult as IdTokenResult);
        firebaseAuthMock.simulateAuthStateChange(mockFbAdminUser);
        tick(); // onAuthStateChanged -> processFirebaseUser (starts) -> getIdTokenResult (mock resolves)
        tick(); // Allow the http.post from fetchAndStoreBackendToken to be made
        const adminLoginReq = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
        adminLoginReq.flush(backendAdminAuthResponse);
        tick(); // Allow fetchAndStoreBackendToken to complete
        tick(); // Ensure currentUser$ has emitted & processFirebaseUser completes
        expect(service.currentUser()?.role).toBe(UserRole.ADMIN);

        // 2. Perform Impersonation
        await service.impersonatePlayer(gameIdToImpersonate, playerNumberToImpersonate.toString());
        tick(); // Start the impersonatePlayer async call (http.post)
        const impReq = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameIdToImpersonate}/impersonate/${playerNumberToImpersonate}`);
        impReq.flush(impersonationAuthResponse);
        tick(); // Complete all async operations within impersonatePlayer (state updates)

        expect(service.isImpersonating()).toBe(true);
        expect(service.currentUser()?.uid).toBe(impersonationAuthResponse.user_info.uid);

        // Clear mockGetIdTokenResult calls from admin setup to ensure we're testing stopImpersonation's call correctly
        firebaseAuthMock.mockGetIdTokenResult.mockClear(); 
      }));

      it('should successfully stop impersonation and restore admin state', fakeAsync(async () => {
        // Ensure that when processFirebaseUser is called for the original admin, it gets the admin's IdTokenResult
        firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockAdminIdTokenResult as IdTokenResult);

        await service.stopImpersonation();

        // Ticks for stopImpersonation's call to processFirebaseUser(adminFirebaseUser):
        tick(); // 1. stopImpersonation calls processFirebaseUser -> getIdTokenResult (promise created for admin)
        tick(); // 2. getIdTokenResult resolves for admin -> fetchAndStoreBackendToken is called (http.post promise created for admin)

        // Expect and flush the backend token request for restoring admin
        const restoreAdminReq = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
        expect(restoreAdminReq.request.method).toBe('POST');
        // This flush is for restoring the original admin's backend session using their Firebase ID token.
        restoreAdminReq.flush(backendAdminAuthResponse);

        tick(); // 3. http.post promise resolves in fetchAndStoreBackendToken
        tick(); // 4. fetchAndStoreBackendToken completes, processFirebaseUser (for admin) completes.
        tick(); // 5. Allow router.navigate and any final state updates/effects to settle.

        expect(service.isImpersonating()).toBe(false);
        expect(service.backendToken()).toBe(backendAdminAuthResponse.access_token); // Original admin token restored
        const currentUser = service.currentUser();
        expect(currentUser?.role).toBe(UserRole.ADMIN);
        expect(currentUser?.uid).toBe(mockFbAdminUser.uid);
        expect(localStorage.removeItem).toHaveBeenCalledWith('soil_game_original_admin_token');
        expect(localStorage.setItem).toHaveBeenCalledWith('soil_game_backend_token', backendAdminAuthResponse.access_token);
        expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
      }));

      // This test needs a different beforeEach or setup, as the default one leaves the service in an impersonating state.
      it('should do nothing if not impersonating', fakeAsync(() => {
        // 1. Reset to a clean admin state (not impersonating)
        // Logout from current (impersonated) state from beforeEach
        firebaseAuthMock.mockSignOut.mockResolvedValue(undefined);
        service.logout(); // This will try to logout the impersonated user
        tick();
        firebaseAuthMock.simulateAuthStateChange(null); // Firebase user becomes null
        tick(); // Process logout
        httpMock.expectNone(`${environment.apiUrl}/auth/login/id-token`); // No restore attempt during this logout

        // 2. Setup Admin User again (freshly logged in, not impersonating)
        firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockAdminIdTokenResult as IdTokenResult);
        firebaseAuthMock.simulateAuthStateChange(mockFbAdminUser);
        tick(); tick();
        const adminLoginReq = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
        adminLoginReq.flush(backendAdminAuthResponse);
        tick(); tick();
        
        expect(service.isImpersonating()).toBe(false); // Pre-condition: not impersonating
        const originalToken = service.backendToken();
        const originalUser = service.currentUser();
        const routerNavigateSpy = jest.spyOn(router, 'navigate'); // Re-spy after setup
        const localStorageRemoveSpy = jest.spyOn(Storage.prototype, 'removeItem');

        service.stopImpersonation(); // Call stopImpersonation
        tick(); // Allow any potential async (though it should be sync in this path)

        expect(service.isImpersonating()).toBe(false); // Still false
        expect(service.backendToken()).toBe(originalToken); // Unchanged
        expect(service.currentUser())?.toEqual(originalUser); // Unchanged
        expect(routerNavigateSpy).not.toHaveBeenCalledWith(['/admin/dashboard']); // No navigation
        expect(localStorageRemoveSpy).not.toHaveBeenCalledWith('soil_game_original_admin_token'); // No token removal
      }));
      
      it('should call logout if original admin Firebase user is lost during stopImpersonation', fakeAsync(async () => {
        // State from beforeEach: admin was logged in, then impersonation started.
        // service.isImpersonating() is true.
        // service.firebaseUserInternal() currently holds the admin Firebase user.
        
        // Simulate FirebaseUser being lost before stopImpersonation attempts to use it
        (service as any).firebaseUserInternal.set(null);

        const logoutSpy = jest.spyOn(service, 'logout').mockImplementation(() => Promise.resolve()); // Spy and mock implementation

        await service.stopImpersonation();
        tick(); // Allow async operations in stopImpersonation (like calling logout)

        expect(logoutSpy).toHaveBeenCalled();
        // Further state assertions depend on what logout() does, which is already tested elsewhere.
        // For example, router navigation to login page might be expected if logout is called.
        // expect(router.navigate).toHaveBeenCalledWith(['/frontpage/login']);
      }));
    });
  });
});

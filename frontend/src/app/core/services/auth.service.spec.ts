
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
      
      tick(); // For signInWithEmailAndPassword to resolve and adminLogin's switchMap to potentially start.

      tick(); // For signInWithEmailAndPassword to resolve.

      firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockAdminIdTokenResult as IdTokenResult);

      firebaseAuthMock.simulateAuthStateChange(mockFbAdminUser); // Triggers onAuthStateChanged
      
      firebaseAuthMock.simulateAuthStateChange(mockFbAdminUser); // Triggers onAuthStateChanged

      // Let's try a slightly longer, more explicit series of ticks.
      tick(); // #1: onAuthStateChanged starts, processFirebaseUser called, getIdTokenResult (mock) called & promise scheduled
      tick(); // #2: getIdTokenResult promise resolves, appUserInternal set from claims, fetchAndStoreBackendToken called
      tick(); // #3: fetchAndStoreBackendToken calls http.post - request should be pending now.
      // Adding one more just in case there's an extra microtask layer with firstValueFrom.
      tick();


      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
      expect(req.request.method).toBe('POST');
      req.flush(backendAdminAuthResponse);

      tick(); // #A: firstValueFrom(http.post) promise resolves, backendTokenInternal set, appUserInternal potentially updated.
      tick(); // #B: processFirebaseUser (async) completes.
      tick(); // #C: switchMap in adminLogin (which awaits currentUser$) resolves and emits.
      tick(); // #D: Final safety tick for any effects or chained operations.
      
      expect(loggedInUser).toBeTruthy();
      expect(loggedInUser!.role).toBe(UserRole.ADMIN);
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
      tick();

      firebaseAuthMock.simulateAuthStateChange(mockFbPlayerUser);

      tick(); // #1
      tick(); // #2
      tick(); // #3
      tick(); // #4 - extra tick

      const idTokenReq = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
      expect(idTokenReq.request.method).toBe('POST');
      idTokenReq.flush(backendPlayerAuthResponse);

      tick(); // #A
      tick(); // #B
      tick(); // #C
      tick(); // #D

      expect(loggedInUser).toBeTruthy();
      expect(loggedInUser!.role).toBe(UserRole.PLAYER);
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
      const loggedInFbUser: Partial<FirebaseUser> = { uid: 'test-uid' };
      const loggedInIdTokenResult: Partial<IdTokenResult> = { token: 'test-token', claims: { role: UserRole.PLAYER } };
      const backendLoginResponse: AuthResponse = { access_token: 'backend-test-jwt', token_type: 'Bearer', user_info: { uid: 'test-uid', email: 'test@test.com', role: UserRole.PLAYER, playerNumber: 1 } }; // Corrected tokenType and userInfo

      firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(loggedInIdTokenResult as IdTokenResult);
      // Setup for initial login state
      firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(loggedInIdTokenResult as IdTokenResult);
      firebaseAuthMock.simulateAuthStateChange(loggedInFbUser);

      tick(); // #1
      tick(); // #2
      tick(); // #3
      tick(); // #4 - extra tick

      const loginReq = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
      expect(loginReq.request.method).toBe('POST');
      loginReq.flush(backendLoginResponse);

      tick(); // #A
      tick(); // #B
      tick(); // #C
      tick(); // #D

      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.uid).toBe('test-uid');
      expect(service.backendToken()).toBe(backendLoginResponse.access_token);

      firebaseAuthMock.mockSignOut.mockResolvedValue(undefined);
      service.logout();
      tick();

      firebaseAuthMock.simulateAuthStateChange(null);
      tick();

      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(service.backendToken()).toBeNull();
      expect(firebaseAuthMock.mockSignOut).toHaveBeenCalledWith(authInstanceMock);
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
      // Inlined setupAdminUser logic here to avoid nested fakeAsync
      beforeEach(fakeAsync(() => {
        firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockAdminIdTokenResult as IdTokenResult);
        firebaseAuthMock.simulateAuthStateChange(mockFbAdminUser);
        tick();
        tick();
        const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
        expect(req.request.method).toBe('POST');
        req.flush(backendAdminAuthResponse);
        tick();
        tick();
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
        service.logout();
        tick();
        firebaseAuthMock.simulateAuthStateChange(null);
        tick();
        
        try {
          await service.impersonatePlayer(gameIdToImpersonate, playerNumberToImpersonate.toString());
          fail('should have thrown');
        } catch (e: any) {
          expect(e.message).toContain('Admin not logged in or token unavailable.');
        }
      }));
      
      it('should throw error if already impersonating', fakeAsync(async () => {
        await service.impersonatePlayer(gameIdToImpersonate, playerNumberToImpersonate.toString());
        tick();
        const req1 = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameIdToImpersonate}/impersonate/${playerNumberToImpersonate}`);
        req1.flush(impersonationAuthResponse);
        tick();
        expect(service.isImpersonating()).toBe(true);

        try {
          await service.impersonatePlayer('anotherGame', 'anotherPlayer');
          fail('should have thrown');
        } catch (e: any) {
          expect(e.message).toContain('Already impersonating. Stop current impersonation first.');
        }
      }));

      it('should throw error and preserve state on backend HTTP error', fakeAsync(async () => {
        const originalAdminToken = service.backendToken();
        const originalUser = service.currentUser();

        try {
          await service.impersonatePlayer(gameIdToImpersonate, playerNumberToImpersonate.toString());
          fail('should have thrown');
        } catch (err: any) {
          expect(err.message).toContain('Impersonation HTTP request failed'); // Check for the specific error message
        }
        tick();

        const req = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameIdToImpersonate}/impersonate/${playerNumberToImpersonate}`);
        req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
        tick();

        expect(service.isImpersonating()).toBe(false);
        expect(service.backendToken()).toBe(originalAdminToken);
        expect(service.currentUser()).toEqual(originalUser);
        expect(localStorage.setItem).not.toHaveBeenCalledWith('soil_game_original_admin_token', expect.anything());
      }));
    });

    describe('stopImpersonation', () => {
      // Inlined setupAdminUser logic and initial impersonation for these tests
      beforeEach(fakeAsync(async () => {
        // Setup admin user first
        firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockAdminIdTokenResult as IdTokenResult);
        firebaseAuthMock.simulateAuthStateChange(mockFbAdminUser);
        tick(); tick();
        const adminLoginReq = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
        adminLoginReq.flush(backendAdminAuthResponse);
        tick(); tick();

        // Then impersonate
        await service.impersonatePlayer(gameIdToImpersonate, playerNumberToImpersonate.toString());
        tick();
        const impReq = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameIdToImpersonate}/impersonate/${playerNumberToImpersonate}`);
        impReq.flush(impersonationAuthResponse);
        tick();
        expect(service.isImpersonating()).toBe(true);
        firebaseAuthMock.mockGetIdTokenResult.mockClear(); 
      }));

      it('should successfully stop impersonation and restore admin state', fakeAsync(async () => {
        firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockAdminIdTokenResult as IdTokenResult);

        await service.stopImpersonation();
        // stopImpersonation calls processFirebaseUser, which calls fetchAndStoreBackendToken for the admin
        tick(); // Allow processFirebaseUser to start and getIdTokenResult to resolve
        tick(); // Allow fetchAndStoreBackendToken to be called and http.post to be made for admin restoration

        const restoreAdminReq = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
        expect(restoreAdminReq.request.method).toBe('POST');
        restoreAdminReq.flush(backendAdminAuthResponse); // This is for restoring the original admin session

        tick(); // Resolve http.post promise
        tick(); // Resolve processFirebaseUser promise
        tick(); // Allow currentUser$ to settle

        expect(service.isImpersonating()).toBe(false);
        expect(service.backendToken()).toBe(backendAdminAuthResponse.access_token);
        const currentUser = service.currentUser();
        expect(currentUser?.role).toBe(UserRole.ADMIN);
        expect(currentUser?.uid).toBe(mockFbAdminUser.uid);
        expect(localStorage.removeItem).toHaveBeenCalledWith('soil_game_original_admin_token'); // Use string literal
        expect(localStorage.setItem).toHaveBeenCalledWith('soil_game_backend_token', backendAdminAuthResponse.access_token); // Use string literal
        expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
      }));

      it('should do nothing if not impersonating', fakeAsync(async () => {
        service.logout(); tick(); firebaseAuthMock.simulateAuthStateChange(null); tick();
        setupAdminUser();
        
        const originalToken = service.backendToken();
        const originalUser = service.currentUser();

        await service.stopImpersonation();
        tick();

        expect(service.isImpersonating()).toBe(false);
        expect(service.backendToken()).toBe(originalToken);
        expect(service.currentUser()).toEqual(originalUser);
        expect(router.navigate).not.toHaveBeenCalledWith(['/admin/dashboard']);
        expect(localStorage.removeItem).not.toHaveBeenCalledWith('soil_game_original_admin_token');
      }));
      
      it('should call logout if original admin Firebase user is lost', fakeAsync(async () => {
        expect(service.isImpersonating()).toBe(true);
        
        (service as any).firebaseUserInternal.set(null);

        const logoutSpy = jest.spyOn(service, 'logout');

        try {
          await service.stopImpersonation();
          // This case might not throw if it directly calls logout.
          // If logout is called, the subsequent expectations on state will fail if not handled.
          // The service logic is: if adminFirebaseUser is null, it calls this.logout()
        } catch (err: any) {
          // Depending on exact implementation, it might throw or just log out.
          // If it doesn't throw, this catch block may not be hit.
          // The key is that logoutSpy should be called.
        }
        tick(); // allow async operations in stopImpersonation/logout to complete

        expect(logoutSpy).toHaveBeenCalled();
      }));
    });
  });
});


import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Auth, User as FirebaseUser, IdTokenResult } from '@angular/fire/auth';
// HttpClient, Router, PLATFORM_ID removed
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
import { Router } from '@angular/router';

// ... (other imports remain the same)

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
    accessToken: 'backend-admin-jwt-original',
    tokenType: 'Bearer',
    userInfo: { uid: 'admin-uid-fb', email: 'admin@example.com', role: UserRole.ADMIN, displayName: 'Backend Admin User' }
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
    req.flush(backendAdminAuthResponse);
    tick(); // Allow fetchAndStoreBackendToken to complete
    tick(); // Ensure currentUser$ has emitted
    expect(service.currentUser()?.role).toBe(UserRole.ADMIN);
    expect(service.backendToken()).toBe(backendAdminAuthResponse.accessToken);
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
      
      tick(); // signInWithEmailAndPassword mock resolves & switchMap in adminLogin starts waiting on currentUser$
      
      firebaseAuthMock.simulateAuthStateChange(mockFbAdminUser); // Triggers onAuthStateChanged
      tick(); // onAuthStateChanged -> processFirebaseUser (starts) -> getIdTokenResult (mock resolves)
      tick(); // Allow the http.post from fetchAndStoreBackendToken to be made

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
      expect(req.request.method).toBe('POST');
      req.flush(backendAdminResponse); // Resolve the http.post
      
      tick(); // Allow fetchAndStoreBackendToken to complete
      tick(); // Ensure currentUser$ has emitted

      expect(loggedInUser).toBeTruthy();
      expect(loggedInUser!.role).toBe(UserRole.ADMIN);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.backendToken()).toBe(backendAdminAuthResponse.accessToken);
      expect(firebaseAuthMock.mockGetIdTokenResult).toHaveBeenCalledWith(mockFbAdminUser, true); // Ensure it was called during processFirebaseUser
      expect(firebaseAuthMock.mockSignInWithEmailAndPassword).toHaveBeenCalledWith(authInstanceMock, testEmail, testPassword);
    }));

    it('adminLogin failure from Firebase should clear data', fakeAsync(() => {
        const error = new Error('Firebase auth error');
        firebaseAuthMock.mockSignInWithEmailAndPassword.mockRejectedValue(error);

        let actualError: unknown;
        service.adminLogin(testEmail, testPassword).subscribe({
          next: () => fail('should have failed'),
          error: (err) => actualError = err
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
    const testPlayerId = 'player456';
    const testPassword = 'playerPassword';

    const mockFbPlayerUser: Partial<FirebaseUser> = {
      uid: 'player-uid-from-fb', // This UID might be different from testPlayerId if custom token maps it so
      email: `${testPlayerId}@player.com`, // Example email
      displayName: 'Mock Player User',
      getIdToken: jest.fn().mockResolvedValue('fb-player-id-token'),
    };

    const mockPlayerIdTokenResult: Partial<IdTokenResult> = {
        token: 'fb-player-id-token',
        claims: { role: UserRole.PLAYER, gameId: testGameId, playerId: testPlayerId },
    };

    const backendPlayerAuthResponse: AuthResponse = {
      accessToken: 'backend-player-jwt',
      tokenType: 'Bearer',
      userInfo: { uid: mockFbPlayerUser.uid!, email: mockFbPlayerUser.email!, role: UserRole.PLAYER, gameId: testGameId, playerId: testPlayerId, displayName: 'Player User from Backend' }
    };

    it('playerLoginWithCredentials success should authenticate and set player user', fakeAsync(() => {
      // 1. Backend provides custom token
      const customTokenResponse = { customToken: 'a-custom-firebase-token' };
      firebaseAuthMock.mockSignInWithCustomToken.mockResolvedValue({ user: mockFbPlayerUser as FirebaseUser });
      firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockPlayerIdTokenResult as IdTokenResult);

      let loggedInUser: User | null = null;
      service.playerLoginWithCredentials(testGameId, testPlayerId, testPassword).pipe(take(1)).subscribe(user => {
        loggedInUser = user;
      });

      const playerCredentialsReq = httpMock.expectOne(`${environment.apiUrl}/auth/login/player-credentials`);
      expect(playerCredentialsReq.request.method).toBe('POST');
      expect(playerCredentialsReq.request.body).toEqual({ gameId: testGameId, playerId: testPlayerId, password: testPassword });
      playerCredentialsReq.flush(customTokenResponse);
      tick(); // HTTP response for custom token, signInWithCustomToken mock resolves

      firebaseAuthMock.simulateAuthStateChange(mockFbPlayerUser); // Triggers onAuthStateChanged
      tick(); // onAuthStateChanged -> processFirebaseUser (starts) -> getIdTokenResult (mock resolves)
      tick(); // Allow the http.post from fetchAndStoreBackendToken to be made

      const idTokenReq = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
      expect(idTokenReq.request.method).toBe('POST');
      idTokenReq.flush(backendPlayerAuthResponse);
      tick(); // Allow fetchAndStoreBackendToken to complete
      tick(); // Ensure currentUser$ has emitted

      expect(loggedInUser).toBeTruthy();
      expect(loggedInUser!.role).toBe(UserRole.PLAYER);
      expect(loggedInUser!.gameId).toBe(testGameId);
      expect(loggedInUser!.playerId).toBe(testPlayerId);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.backendToken()).toBe('backend-player-jwt');
      expect(firebaseAuthMock.mockSignInWithCustomToken).toHaveBeenCalledWith(authInstanceMock, customTokenResponse.customToken);
      expect(firebaseAuthMock.mockGetIdTokenResult).toHaveBeenCalledWith(mockFbPlayerUser, true);
    }));

    it('playerLogin - backend fails to provide custom token (empty response)', fakeAsync(() => {
      let actualError: any;
      service.playerLoginWithCredentials(testGameId, testPlayerId, testPassword).subscribe({
        next: () => fail('should have failed'),
        error: (err) => actualError = err,
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/player-credentials`);
      req.flush({}); // Empty response, no customToken
      tick();

      expect(actualError).toBeTruthy();
      expect(actualError.message).toContain('Custom token is missing in the response');
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
    }));

    it('playerLogin - backend returns HTTP error for custom token', fakeAsync(() => {
      let actualError: any;
      service.playerLoginWithCredentials(testGameId, testPlayerId, testPassword).subscribe({
        next: () => fail('should have failed'),
        error: (err) => actualError = err,
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/player-credentials`);
      req.flush({ message: 'Backend auth error' }, { status: 401, statusText: 'Unauthorized' });
      tick();

      expect(actualError).toBeTruthy();
      expect(actualError.status).toBe(401);
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
    }));

    it('playerLogin - signInWithCustomToken fails', fakeAsync(() => {
      const customTokenResponse = { customToken: 'a-custom-firebase-token' };
      const firebaseError = new Error('Firebase custom sign in error');
      firebaseAuthMock.mockSignInWithCustomToken.mockRejectedValue(firebaseError);

      let actualError: any;
      service.playerLoginWithCredentials(testGameId, testPlayerId, testPassword).subscribe({
        next: () => fail('should have failed'),
        error: (err) => actualError = err,
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/player-credentials`);
      req.flush(customTokenResponse);
      tick();

      expect(actualError).toBe(firebaseError);
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
    }));
  });

  // Admin Register tests remain largely the same
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
      req.flush({}, { status: 201, statusText: 'Created' }); // Assuming 201 Created with no body or specific success message
      tick();

      expect(completed).toBe(true);
    }));
  });

  // Request Password Reset tests remain largely the same
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
      req.flush(null, { status: 204, statusText: 'No Content' }); // Assuming 204 No Content response
      tick();

      expect(completed).toBe(true);
    }));
  });

  // Logout tests remain largely the same
  describe('Logout', () => {
    it('logout should clear user data and call Firebase signOut', fakeAsync(() => {
      const loggedInFbUser: Partial<FirebaseUser> = { uid: 'test-uid' }; // Generic user for logout test
      const loggedInIdTokenResult: Partial<IdTokenResult> = { token: 'test-token', claims: { role: UserRole.PLAYER } };
      const backendLoginResponse: AuthResponse = { accessToken: 'backend-test-jwt', tokenType: 'Bearer', userInfo: { uid: 'test-uid', email: 'test@test.com', role: UserRole.PLAYER } };

      firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(loggedInIdTokenResult as IdTokenResult);
      firebaseAuthMock.simulateAuthStateChange(loggedInFbUser);
      tick(); 
      tick(); 

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
      req.flush(backendLoginResponse);
      tick(); 
      tick(); 

      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.uid).toBe('test-uid');
      expect(service.backendToken()).toBe('backend-test-jwt');

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
    const playerIdToImpersonate = 'playerImpersonateXYZ';

    const impersonationAuthResponse: AuthResponse = {
      accessToken: 'impersonation-jwt',
      tokenType: 'Bearer',
      userInfo: {
        uid: 'impersonated-player-uid', // This is the Firebase UID the impersonated player will appear to have
        email: 'impersonated@player.com',
        role: UserRole.PLAYER,
        gameId: gameIdToImpersonate,
        playerId: playerIdToImpersonate,
        displayName: 'Impersonated Player',
        impersonatorUid: mockFbAdminUser.uid // Crucial: links back to original admin
      }
    };

    describe('impersonatePlayer', () => {
      beforeEach(fakeAsync(() => {
        setupAdminUser(); // Ensure admin is logged in before each impersonation test
      }));

      it('should successfully impersonate a player', fakeAsync(() => {
        const originalAdminToken = service.backendToken();
        expect(originalAdminToken).toBe(backendAdminAuthResponse.accessToken);

        service.impersonatePlayer(gameIdToImpersonate, playerIdToImpersonate).subscribe();
        tick();

        const req = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameIdToImpersonate}/impersonate/${playerIdToImpersonate}`);
        expect(req.request.method).toBe('POST');
        req.flush(impersonationAuthResponse);
        tick();

        expect(service.isImpersonating()).toBe(true);
        expect(service.originalAdminToken()).toBe(originalAdminToken);
        expect(service.backendToken()).toBe(impersonationAuthResponse.accessToken);
        const currentUser = service.currentUser();
        expect(currentUser?.role).toBe(UserRole.PLAYER);
        expect(currentUser?.gameId).toBe(gameIdToImpersonate);
        expect(currentUser?.playerId).toBe(playerIdToImpersonate);
        expect(currentUser?.impersonatorUid).toBe(mockFbAdminUser.uid);
        expect(localStorage.setItem).toHaveBeenCalledWith(service['ORIGINAL_ADMIN_TOKEN_KEY'], originalAdminToken);
        expect(localStorage.setItem).toHaveBeenCalledWith(service['BACKEND_JWT_KEY'], impersonationAuthResponse.accessToken);
        expect(router.navigate).toHaveBeenCalledWith(['/game', gameIdToImpersonate, 'dashboard']);
      }));

      it('should throw error if not admin or no token', fakeAsync(() => {
        service.logout(); // Ensure logged out / no admin token
        tick();
        firebaseAuthMock.simulateAuthStateChange(null);
        tick();
        
        expect(() => service.impersonatePlayer(gameIdToImpersonate, playerIdToImpersonate).subscribe())
          .toThrowError('Admin not logged in or token unavailable.');
      }));
      
      it('should throw error if already impersonating', fakeAsync(() => {
        // First impersonation
        service.impersonatePlayer(gameIdToImpersonate, playerIdToImpersonate).subscribe();
        tick();
        const req1 = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameIdToImpersonate}/impersonate/${playerIdToImpersonate}`);
        req1.flush(impersonationAuthResponse);
        tick();
        expect(service.isImpersonating()).toBe(true);

        // Attempt second impersonation
        expect(() => service.impersonatePlayer('anotherGame', 'anotherPlayer').subscribe())
          .toThrowError('Already impersonating. Stop current impersonation first.');
      }));

      it('should throw error and preserve state on backend HTTP error', fakeAsync(() => {
        const originalAdminToken = service.backendToken();
        const originalUser = service.currentUser();

        service.impersonatePlayer(gameIdToImpersonate, playerIdToImpersonate).subscribe({
          error: (err) => expect(err).toBeTruthy()
        });
        tick();

        const req = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameIdToImpersonate}/impersonate/${playerIdToImpersonate}`);
        req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
        tick();

        expect(service.isImpersonating()).toBe(false);
        expect(service.originalAdminToken()).toBeNull();
        expect(service.backendToken()).toBe(originalAdminToken);
        expect(service.currentUser()).toEqual(originalUser);
        expect(localStorage.setItem).not.toHaveBeenCalledWith(service['ORIGINAL_ADMIN_TOKEN_KEY'], expect.anything());
      }));
    });

    describe('stopImpersonation', () => {
      beforeEach(fakeAsync(() => {
        setupAdminUser(); // Ensure admin is logged in
        // Successfully impersonate a player first
        service.impersonatePlayer(gameIdToImpersonate, playerIdToImpersonate).subscribe();
        tick();
        const impReq = httpMock.expectOne(`${environment.apiUrl}/admin/games/${gameIdToImpersonate}/impersonate/${playerIdToImpersonate}`);
        impReq.flush(impersonationAuthResponse);
        tick();
        expect(service.isImpersonating()).toBe(true);
        // Clear mocks that might have been called during impersonation's processFirebaseUser if any
        firebaseAuthMock.mockGetIdTokenResult.mockClear(); 
      }));

      it('should successfully stop impersonation and restore admin state', fakeAsync(() => {
        // Ensure that when processFirebaseUser is called for the *original admin Firebase user*,
        // it resolves with the admin's original claims.
        firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockAdminIdTokenResult as IdTokenResult);
        // (service as any).firebaseUserInternal.set(mockFbAdminUser as FirebaseUser); // Ensure firebaseUser is set to admin

        service.stopImpersonation().subscribe();
        tick(); // stopImpersonation logic starts, originalAdminToken used

        // processFirebaseUser for the original admin will be triggered.
        // This involves getIdTokenResult (mocked above) and then fetchAndStoreBackendToken.
        const idTokenReq = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
        expect(idTokenReq.request.method).toBe('POST');
        // We need to flush the *original* admin's backend auth response
        idTokenReq.flush(backendAdminAuthResponse);
        tick(); // processFirebaseUser completes, currentUser updates
        tick(); // allow currentUser$ to emit fully

        expect(service.isImpersonating()).toBe(false);
        expect(service.originalAdminToken()).toBeNull();
        expect(service.backendToken()).toBe(backendAdminAuthResponse.accessToken);
        const currentUser = service.currentUser();
        expect(currentUser?.role).toBe(UserRole.ADMIN);
        expect(currentUser?.uid).toBe(mockFbAdminUser.uid);
        expect(localStorage.removeItem).toHaveBeenCalledWith(service['ORIGINAL_ADMIN_TOKEN_KEY']);
        expect(localStorage.setItem).toHaveBeenCalledWith(service['BACKEND_JWT_KEY'], backendAdminAuthResponse.accessToken);
        expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']); // Or wherever admin goes
      }));

      it('should do nothing if not impersonating', fakeAsync(() => {
        // Reset to a non-impersonating admin state first
        // This requires logging out the impersonated user and re-logging in admin,
        // or more simply, re-initialize service in a clean admin state for this specific test.
        service.logout(); tick(); firebaseAuthMock.simulateAuthStateChange(null); tick(); // Clear current state
        setupAdminUser(); // Fresh admin state
        
        const originalToken = service.backendToken();
        const originalUser = service.currentUser();

        service.stopImpersonation().subscribe();
        tick();

        expect(service.isImpersonating()).toBe(false);
        expect(service.backendToken()).toBe(originalToken);
        expect(service.currentUser()).toEqual(originalUser);
        expect(router.navigate).not.toHaveBeenCalledWith(['/admin/dashboard']); // Or any navigation specific to stopImpersonation
        expect(localStorage.removeItem).not.toHaveBeenCalledWith(service['ORIGINAL_ADMIN_TOKEN_KEY']);
      }));
      
      it('should call logout if original admin Firebase user is lost', fakeAsync(() => {
        // Current state: impersonating player.
        expect(service.isImpersonating()).toBe(true);
        
        // Simulate original Firebase admin user being lost
        (service as any).firebaseUserInternal.set(null); // Directly manipulate the signal for this test
        // OR firebaseAuthMock.simulateAuthStateChange(null); tick(); if it doesn't auto-logout impersonation

        const logoutSpy = jest.spyOn(service, 'logout');

        service.stopImpersonation().subscribe({
            error: (err) => expect(err.message).toContain('Original admin Firebase user not found during stop impersonation')
        });
        tick();

        expect(logoutSpy).toHaveBeenCalled();
      }));
    });
  });
});

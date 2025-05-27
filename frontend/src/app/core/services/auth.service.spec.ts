
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Auth, User as FirebaseUser, IdTokenResult } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { of, throwError, Subject, firstValueFrom, Observable } from 'rxjs';
import { take, filter } from 'rxjs/operators';

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
  let authInstanceMock: any;

  const firebaseAuthMock = require('@angular/fire/auth') as FirebaseAuthMock;

  beforeEach(fakeAsync(() => {
    firebaseAuthMock.resetAuthMocks();
    authInstanceMock = new firebaseAuthMock.Auth({});

    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
      ],
      providers: [
        AuthService,
        { provide: Auth, useValue: authInstanceMock },
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    firebaseAuthMock.simulateAuthStateChange(null);
    tick(); 
  }));

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
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
    const testEmail = 'admin@test.com';
    const testPassword = 'password';

    const mockFbAdminUser: Partial<FirebaseUser> = {
      uid: 'admin-uid',
      email: testEmail,
      displayName: 'Mock Admin User',
      getIdToken: jest.fn().mockResolvedValue('fb-admin-id-token'),
    };

    const mockIdTokenResult: Partial<IdTokenResult> = {
        token: 'fb-admin-id-token',
        claims: { role: UserRole.ADMIN },
    };

    const backendAdminResponse: AuthResponse = {
      access_token: 'backend-admin-jwt',
      token_type: 'Bearer',
      user_info: { uid: 'admin-uid', email: testEmail, role: UserRole.ADMIN, displayName: 'Admin User' }
    };

    it('adminLogin success should authenticate and set user', fakeAsync(() => {
      firebaseAuthMock.mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockFbAdminUser as FirebaseUser });
      firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(mockIdTokenResult as IdTokenResult);

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
      
      tick(); // Allow fetchAndStoreBackendToken to complete its .then/.pipe, and appUserInternal to be updated
      tick(); // *** ADDED TICK: Ensure currentUser$ has emitted the updated user before firstValueFrom in adminLogin completes

      expect(loggedInUser).toBeTruthy();
      expect(loggedInUser!.role).toBe(UserRole.ADMIN);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.backendToken()).toBe('backend-admin-jwt');
      expect(firebaseAuthMock.mockGetIdTokenResult).toHaveBeenCalledWith(mockFbAdminUser, true);
      expect(firebaseAuthMock.mockSignInWithEmailAndPassword).toHaveBeenCalledWith(authInstanceMock, testEmail, testPassword);
    }));

    it('adminLogin failure from Firebase should clear data', fakeAsync(() => { 
        const error = new Error('Firebase auth error');
        firebaseAuthMock.mockSignInWithEmailAndPassword.mockRejectedValue(error);
        
        let actualError: any;
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

  describe('Logout', () => {
    it('logout should clear user data and call Firebase signOut', fakeAsync(() => {
      const loggedInFbUser: Partial<FirebaseUser> = { uid: 'test-uid' };
      const loggedInIdTokenResult: Partial<IdTokenResult> = { token: 'test-token', claims: { role: UserRole.PLAYER } };
      const backendLoginResponse: AuthResponse = { access_token: 'backend-test-jwt', token_type: 'Bearer', user_info: { uid: 'test-uid', email: 'test@test.com', role: UserRole.PLAYER } };

      firebaseAuthMock.mockGetIdTokenResult.mockResolvedValue(loggedInIdTokenResult as IdTokenResult);
      firebaseAuthMock.simulateAuthStateChange(loggedInFbUser); // Trigger login state change
      tick(); // onAuthStateChanged -> processFirebaseUser -> getIdTokenResult
      tick(); // Allow http.post from fetchAndStoreBackendToken
      
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login/id-token`);
      req.flush(backendLoginResponse);
      tick(); // process http response and update appUserInternal
      tick(); // *** ADDED TICK: ensure currentUser$ is updated from this login sequence before proceeding

      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.uid).toBe('test-uid'); 
      expect(service.backendToken()).toBe('backend-test-jwt');

      firebaseAuthMock.mockSignOut.mockResolvedValue(undefined);
      service.logout();
      tick(); // signOut promise

      firebaseAuthMock.simulateAuthStateChange(null);
      tick(); // onAuthStateChanged -> clearAuthData

      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(service.backendToken()).toBeNull();
      expect(firebaseAuthMock.mockSignOut).toHaveBeenCalledWith(authInstanceMock);
    }));
  });
});

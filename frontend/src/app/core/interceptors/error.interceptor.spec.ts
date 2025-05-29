import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse, HttpRequest, HttpEvent } from '@angular/common/http';
import { Router } from '@angular/router';
import { throwError, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PLATFORM_ID } from '@angular/core';

import { errorInterceptor } from './error.interceptor';
import { NotificationService } from '../services/notification.service';
import { IAuthService } from '../services/auth.service.interface';
import { AUTH_SERVICE_TOKEN } from '../services/injection-tokens';
import { User } from '../models/user.model'; // For User type if needed in mock

describe('ErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let authServiceMock: jest.Mocked<IAuthService>;
  let routerMock: jest.Mocked<Router>;

  const testUrl = '/api/test';

  function performRequest(expectError: boolean = true) {
    const request = httpClient.get(testUrl);
    return expectError 
      ? request.pipe(catchError(err => of(err))) 
      : request;
  }

  function setupTestBed(platform: 'browser' | 'server') {
    notificationServiceMock = {
      showError: jest.fn(),
      showInfo: jest.fn(), // Added to satisfy jest.Mocked if NotificationService has these
      showSuccess: jest.fn(), // Added
      showWarning: jest.fn(), // Added
    } as unknown as jest.Mocked<NotificationService>; // Using unknown for brevity

    // Comprehensive IAuthService Mock
    authServiceMock = {
      currentUser$: of(null),
      firebaseUser$: of(null),
      backendToken$: of(null),
      isAuthenticated$: of(false),
      isDoneLoading$: of(true),
      
      currentUser: jest.fn().mockReturnValue(null),
      firebaseUser: jest.fn().mockReturnValue(null),
      backendToken: jest.fn().mockReturnValue(null),
      isAuthenticated: jest.fn().mockReturnValue(false),
      isUserPlayer: jest.fn().mockReturnValue(false),
      isUserAdmin: jest.fn().mockReturnValue(false),
      isUserSuperAdmin: jest.fn().mockReturnValue(false),
      isAdmin: jest.fn().mockReturnValue(false),
      isPlayer: jest.fn().mockReturnValue(false),
      canImpersonate: jest.fn().mockReturnValue(false),
      isImpersonating: jest.fn().mockReturnValue(false),
      isProduction: jest.fn().mockReturnValue(false),
      isEmulator: jest.fn().mockReturnValue(false),
      isLoggedIn: jest.fn().mockReturnValue(false),

      logout: jest.fn().mockReturnValue(Promise.resolve()),
      login: jest.fn().mockResolvedValue(undefined),
      registerPlayer: jest.fn().mockResolvedValue(undefined),
      adminRegister: jest.fn().mockResolvedValue(undefined),
      handleSignInWithPopup: jest.fn().mockResolvedValue({} as any), // userCredential mock
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      impersonateUser: jest.fn().mockResolvedValue(undefined),
      stopImpersonation: jest.fn().mockResolvedValue(undefined),
      getRedirectResult: jest.fn().mockResolvedValue(null),
      loginWithGoogle: jest.fn().mockResolvedValue({} as any), // userCredential mock
      registerAdmin: jest.fn().mockResolvedValue(undefined), 
      updateUserRole: jest.fn().mockResolvedValue(undefined),
      updateUserProfile: jest.fn().mockResolvedValue(undefined),
      deleteTestUser: jest.fn().mockResolvedValue(undefined),
      getCurrentFirebaseIdToken: jest.fn().mockResolvedValue(null),
      adminLogin: jest.fn().mockResolvedValue(undefined),
      validateAdminRegistrationCode: jest.fn().mockResolvedValue(false),
      refreshBackendToken: jest.fn().mockResolvedValue(false),
      triggerPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      playerLoginWithCredentials: jest.fn().mockResolvedValue(undefined),
      requestPasswordReset: jest.fn().mockResolvedValue(undefined),
      getStoredBackendTokenSnapshot: jest.fn().mockReturnValue(null),
      impersonatePlayer: jest.fn().mockResolvedValue(undefined)
    } as jest.Mocked<IAuthService>;
    
    routerMock = {
      navigate: jest.fn()
    } as unknown as jest.Mocked<Router>;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { 
          provide: HTTP_INTERCEPTORS, 
          useValue: (req: HttpRequest<unknown>, next: (req: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>) => 
            TestBed.runInInjectionContext(() => errorInterceptor(req, next)), 
          multi: true 
        },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: AUTH_SERVICE_TOKEN, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpMock.verify();
  });
  
  describe('Error handling in browser environment', () => {
    beforeEach(() => {
      setupTestBed('browser');
    });

    it('should show "Client-side error" and re-throw for ErrorEvent', (done) => {
      performRequest().subscribe(response => {
        expect(response).toBeInstanceOf(Error);
        expect(response.message).toMatch(/Client-side error: Test client error/);
        expect(notificationServiceMock.showError).toHaveBeenCalledWith('Client-side error: Test client error');
        done();
      });
      const req = httpMock.expectOne(testUrl);
      req.error(new ErrorEvent('Network error', { message: 'Test client error' }));
    });

    it('should handle 401 Unauthorized, call logout, and show notification', (done) => {
      performRequest().subscribe(response => {
        expect(response).toBeInstanceOf(Error);
        expect(response.message).toBe('Your session has expired or you are not authorized. Please log in again.');
        expect(notificationServiceMock.showError).toHaveBeenCalledWith('Your session has expired or you are not authorized. Please log in again.');
        expect(authServiceMock.logout).toHaveBeenCalled();
        done();
      });
      const req = httpMock.expectOne(testUrl);
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });
    
    it('should handle 403 Forbidden and show notification', (done) => {
      performRequest().subscribe(response => {
        expect(response).toBeInstanceOf(Error);
        expect(response.message).toBe('You do not have permission to access this resource or perform this action.');
        expect(notificationServiceMock.showError).toHaveBeenCalledWith('You do not have permission to access this resource or perform this action.');
        done();
      });
      const req = httpMock.expectOne(testUrl);
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 400 Bad Request with detail message and show notification', (done) => {
      const detailMessage = 'Invalid input provided.';
      performRequest().subscribe(response => {
        expect(response).toBeInstanceOf(Error);
        expect(response.message).toBe(detailMessage);
        expect(notificationServiceMock.showError).toHaveBeenCalledWith(`Request error: ${detailMessage}`);
        done();
      });
      const req = httpMock.expectOne(testUrl);
      req.flush({ error: { detail: detailMessage } }, { status: 400, statusText: 'Bad Request' });
    });
    
    it('should handle 400 Bad Request with string error and show notification', (done) => {
        const stringErrorMsg = 'A specific bad request error string.';
        performRequest().subscribe(response => {
          expect(response).toBeInstanceOf(Error);
          expect(response.message).toBe(stringErrorMsg);
          expect(notificationServiceMock.showError).toHaveBeenCalledWith(`Request error: ${stringErrorMsg}`);
          done();
        });
        const req = httpMock.expectOne(testUrl);
        req.flush({ error: stringErrorMsg }, { status: 400, statusText: 'Bad Request' });
      });

    it('should handle 404 Not Found and show notification with error message', (done) => {
      const errDetail = 'The requested item does not exist.';
      performRequest().subscribe(response => {
        expect(response).toBeInstanceOf(Error);
        expect(response.message).toBe(errDetail);
        expect(notificationServiceMock.showError).toHaveBeenCalledWith(`Resource not found: ${errDetail}`);
        done();
      });
      const req = httpMock.expectOne(testUrl);
      req.flush({ error: { detail: errDetail } }, { status: 404, statusText: 'Not Found' });
    });

    it('should handle 500 Internal Server Error and show generic server error notification', (done) => {
      performRequest().subscribe(response => {
        expect(response).toBeInstanceOf(Error);
        expect(response.message).toBe('A server error occurred. Please try again later.');
        expect(notificationServiceMock.showError).toHaveBeenCalledWith('A server error occurred. Please try again later.');
        done();
      });
      const req = httpMock.expectOne(testUrl);
      req.flush({ error: 'Server broke' }, { status: 500, statusText: 'Internal Server Error' });
    });
    
    it('should handle status 0 (network error) and show network error notification', (done) => {
      performRequest().subscribe(response => {
        expect(response).toBeInstanceOf(Error);
        expect(response.message).toBe('Could not connect to the server. Please check your network connection.');
        expect(notificationServiceMock.showError).toHaveBeenCalledWith('Could not connect to the server. Please check your network connection.');
        done();
      });
      const req = httpMock.expectOne(testUrl);
      req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    });

    it('should handle default error and show notification with status and message', (done) => {
      const detailMessage = 'Some other error';
      performRequest().subscribe(response => {
        expect(response).toBeInstanceOf(Error);
        expect(response.message).toBe(detailMessage);
        expect(notificationServiceMock.showError).toHaveBeenCalledWith(`Error 418: ${detailMessage}`);
        done();
      });
      const req = httpMock.expectOne(testUrl);
      req.flush({ error: { detail: detailMessage } }, { status: 418, statusText: 'I\'m a teapot' });
    });
    
    it('should pass through successful responses without interference', (done) => {
        const testData = { data: 'success' };
        performRequest(false).subscribe(response => {
          expect(response).toEqual(testData);
          expect(notificationServiceMock.showError).not.toHaveBeenCalled();
          expect(authServiceMock.logout).not.toHaveBeenCalled();
          done();
        });
        const req = httpMock.expectOne(testUrl);
        req.flush(testData); 
      });
  });
  
  describe('Error handling in server (SSR) environment', () => {
    beforeEach(() => {
      setupTestBed('server');
    });

    it('should NOT show "Client-side error" for ErrorEvent, but use server-side path', (done) => {
      const serverErrorMessage = 'Simulated server error during SSR';
      performRequest().subscribe(response => {
        expect(response).toBeInstanceOf(Error);
        expect(response.message).toBe(serverErrorMessage);
        expect(notificationServiceMock.showError).toHaveBeenCalledWith(`Error 503: ${serverErrorMessage}`);
        done();
      });
      const req = httpMock.expectOne(testUrl);
      req.flush({ error: { detail: serverErrorMessage } }, { status: 503, statusText: 'Service Unavailable' });
    });
    
    it('should NOT show network error for status 0, as it is not a browser network issue', (done) => {
        performRequest().subscribe(response => {
          expect(response).toBeInstanceOf(Error);
          expect(response.message).toMatch(/Server error: 0 -/);
          expect(notificationServiceMock.showError).not.toHaveBeenCalled(); 
          done();
        });
        const req = httpMock.expectOne(testUrl);
        req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' }); 
      });
  });
});

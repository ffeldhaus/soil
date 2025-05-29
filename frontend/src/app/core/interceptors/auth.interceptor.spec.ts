import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { IAuthService, AUTH_SERVICE_TOKEN } from '../services/auth/auth.service.interface';
import { authInterceptor } from './auth.interceptor';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let authServiceMock: Partial<IAuthService>;
  let nextHandlerMock: jasmine.Spy<HttpHandlerFn>;

  const testApiUrl = 'http://localhost:3000/api'; // Example API URL

  beforeEach(() => {
    // Mock environment directly
    (window as any).environment = { ...environment, apiUrl: testApiUrl };


    authServiceMock = {
      getStoredBackendTokenSnapshot: () => null, // Default to null
    };

    nextHandlerMock = jasmine.createSpy('next').and.returnValue(of({} as HttpEvent<any>));

    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SERVICE_TOKEN, useValue: authServiceMock },
      ],
    });
  });

  afterEach(() => {
    // Clean up the global environment mock
    delete (window as any).environment;
  });

  it('should add Authorization header for backend API request when token exists', () => {
    authServiceMock.getStoredBackendTokenSnapshot = () => 'test-token';
    const request = new HttpRequest<any>('GET', `${testApiUrl}/data`);

    TestBed.runInInjectionContext(() => authInterceptor(request, nextHandlerMock));

    expect(nextHandlerMock).toHaveBeenCalledTimes(1);
    const modifiedReq = nextHandlerMock.calls.first().args[0] as HttpRequest<any>;
    expect(modifiedReq.url).toBe(`${testApiUrl}/data`);
    expect(modifiedReq.headers.has('Authorization')).toBeTrue();
    expect(modifiedReq.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('should not add Authorization header for backend API request when no token exists', () => {
    authServiceMock.getStoredBackendTokenSnapshot = () => null;
    const request = new HttpRequest<any>('GET', `${testApiUrl}/data`);

    TestBed.runInInjectionContext(() => authInterceptor(request, nextHandlerMock));

    expect(nextHandlerMock).toHaveBeenCalledTimes(1);
    const passedReq = nextHandlerMock.calls.first().args[0] as HttpRequest<any>;
    expect(passedReq).toBe(request); // Or check for essential equality if cloning occurs
    expect(passedReq.headers.has('Authorization')).toBeFalse();
  });

  it('should not add Authorization header for non-backend API request even if token exists', () => {
    authServiceMock.getStoredBackendTokenSnapshot = () => 'test-token';
    const request = new HttpRequest<any>('GET', 'https://other.api/data');

    TestBed.runInInjectionContext(() => authInterceptor(request, nextHandlerMock));

    expect(nextHandlerMock).toHaveBeenCalledTimes(1);
    const passedReq = nextHandlerMock.calls.first().args[0] as HttpRequest<any>;
    expect(passedReq).toBe(request);
    expect(passedReq.headers.has('Authorization')).toBeFalse();
  });

  it('should not add Authorization header for non-backend API request when no token exists', () => {
    authServiceMock.getStoredBackendTokenSnapshot = () => null;
    const request = new HttpRequest<any>('GET', 'https://another.api/info');

    TestBed.runInInjectionContext(() => authInterceptor(request, nextHandlerMock));

    expect(nextHandlerMock).toHaveBeenCalledTimes(1);
    const passedReq = nextHandlerMock.calls.first().args[0] as HttpRequest<any>;
    expect(passedReq).toBe(request);
    expect(passedReq.headers.has('Authorization')).toBeFalse();
  });

  it('should use the actual environment.apiUrl for backend requests', () => {
    // Reset global mock to use actual environment value for this specific test
    delete (window as any).environment;
    // Ensure environment is imported if not already
    // import { environment } from '../../../environments/environment'; // (already imported)

    authServiceMock.getStoredBackendTokenSnapshot = () => 'test-token-for-actual-url';
    // Use the actual environment.apiUrl
    const request = new HttpRequest<any>('GET', `${environment.apiUrl}/realdata`);

    TestBed.runInInjectionContext(() => authInterceptor(request, nextHandlerMock));

    expect(nextHandlerMock).toHaveBeenCalledTimes(1);
    const modifiedReq = nextHandlerMock.calls.first().args[0] as HttpRequest<any>;
    expect(modifiedReq.url).toBe(`${environment.apiUrl}/realdata`);
    expect(modifiedReq.headers.has('Authorization')).toBeTrue();
    expect(modifiedReq.headers.get('Authorization')).toBe('Bearer test-token-for-actual-url');

    // Re-apply the mock for other tests if needed, or ensure cleanup in afterEach
    (window as any).environment = { ...environment, apiUrl: testApiUrl };
  });
});

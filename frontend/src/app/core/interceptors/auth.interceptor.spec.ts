import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { IAuthService } from '../services/auth.service.interface'; // IAuthService for type
import { AUTH_SERVICE_TOKEN } from '../services/injection-tokens'; // Corrected token import
import { authInterceptor } from './auth.interceptor';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let authServiceMock: Partial<IAuthService>;
  let nextHandlerMock: jest.MockedFn<HttpHandlerFn>;

  // const testApiUrl = 'http://localhost:3000/api'; // No longer needed

  beforeEach(() => {
    // No longer manipulating (window as any).environment

    authServiceMock = {
      getStoredBackendTokenSnapshot: () => null,
    };

    nextHandlerMock = jest.fn().mockReturnValue(of({} as HttpEvent<any>));

    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SERVICE_TOKEN, useValue: authServiceMock },
      ],
    });
  });

  afterEach(() => {
    // No window.environment to clean up
  });

  it('should add Authorization header for backend API request when token exists', () => {
    authServiceMock.getStoredBackendTokenSnapshot = () => 'test-token';
    // Use the actual imported environment.apiUrl for the request
    const requestUrl = `${environment.apiUrl}/data`;
    const request = new HttpRequest<any>('GET', requestUrl);

    TestBed.runInInjectionContext(() => authInterceptor(request, nextHandlerMock));

    expect(nextHandlerMock).toHaveBeenCalledTimes(1);
    const modifiedReq = nextHandlerMock.mock.calls[0][0] as HttpRequest<any>;
    expect(modifiedReq.url).toBe(requestUrl);
    expect(modifiedReq.headers.has('Authorization')).toBe(true);
    expect(modifiedReq.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('should not add Authorization header for backend API request when no token exists', () => {
    authServiceMock.getStoredBackendTokenSnapshot = () => null;
    // Use the actual imported environment.apiUrl for the request
    const requestUrl = `${environment.apiUrl}/data`;
    const request = new HttpRequest<any>('GET', requestUrl);

    TestBed.runInInjectionContext(() => authInterceptor(request, nextHandlerMock));

    expect(nextHandlerMock).toHaveBeenCalledTimes(1);
    const passedReq = nextHandlerMock.mock.calls[0][0] as HttpRequest<any>;
    expect(passedReq).toBe(request);
    expect(passedReq.headers.has('Authorization')).toBe(false);
  });

  it('should not add Authorization header for non-backend API request even if token exists', () => {
    authServiceMock.getStoredBackendTokenSnapshot = () => 'test-token';
    const request = new HttpRequest<any>('GET', 'https://other.api/data');

    TestBed.runInInjectionContext(() => authInterceptor(request, nextHandlerMock));

    expect(nextHandlerMock).toHaveBeenCalledTimes(1);
    const passedReq = nextHandlerMock.mock.calls[0][0] as HttpRequest<any>; // Changed to mock.calls[0][0]
    expect(passedReq).toBe(request);
    expect(passedReq.headers.has('Authorization')).toBe(false); // Changed to toBe(false)
  });

  it('should not add Authorization header for non-backend API request when no token exists', () => {
    authServiceMock.getStoredBackendTokenSnapshot = () => null;
    const request = new HttpRequest<any>('GET', 'https://another.api/info');

    TestBed.runInInjectionContext(() => authInterceptor(request, nextHandlerMock));

    expect(nextHandlerMock).toHaveBeenCalledTimes(1);
    const passedReq = nextHandlerMock.mock.calls[0][0] as HttpRequest<any>; // Changed to mock.calls[0][0]
    expect(passedReq).toBe(request);
    expect(passedReq.headers.has('Authorization')).toBe(false); // Changed to toBe(false)
  });

  it('should use the actual environment.apiUrl for backend requests', () => {
    // This test now inherently uses the actual environment.apiUrl because window manipulation was removed.
    authServiceMock.getStoredBackendTokenSnapshot = () => 'test-token-for-actual-url';
    const requestUrl = `${environment.apiUrl}/realdata`;
    const request = new HttpRequest<any>('GET', requestUrl);

    TestBed.runInInjectionContext(() => authInterceptor(request, nextHandlerMock));

    expect(nextHandlerMock).toHaveBeenCalledTimes(1);
    const modifiedReq = nextHandlerMock.mock.calls[0][0] as HttpRequest<any>;
    expect(modifiedReq.url).toBe(requestUrl);
    expect(modifiedReq.headers.has('Authorization')).toBe(true);
    expect(modifiedReq.headers.get('Authorization')).toBe('Bearer test-token-for-actual-url');
  });
});

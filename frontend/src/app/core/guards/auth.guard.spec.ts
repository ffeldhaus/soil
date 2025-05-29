import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, UrlTree, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';

import { authGuard } from './auth.guard';
import { IAuthService } from '../services/auth.service.interface';
import { AUTH_SERVICE_TOKEN } from '../services/injection-tokens';
import { User, UserRole } from '../models/user.model';

describe('authGuard', () => {
  let authServiceMock: { currentUser$: BehaviorSubject<User | null | undefined> };
  let routerMock: { navigate: jest.Mock, parseUrl: jest.Mock };
  let guard: CanActivateFn;

  // Mock ActivatedRouteSnapshot and RouterStateSnapshot
  const mockActivatedRouteSnapshot = {} as ActivatedRouteSnapshot;
  const mockRouterStateSnapshot = { url: '/test-url' } as RouterStateSnapshot;

  beforeEach(() => {
    authServiceMock = {
      currentUser$: new BehaviorSubject<User | null | undefined>(null)
    };

    routerMock = {
      navigate: jest.fn(),
      parseUrl: jest.fn((url: string) => {
        // A simple mock for UrlTree, real UrlTree is more complex
        return {
          toString: () => url,
          queryParams: {},
          fragment: null,
          root: {
            children: [],
            segments: [],
            parent: null,
            pathFromRoot: []
          },
          hasChildren: () => false,
          numberOfChildren: 0
        } as unknown as UrlTree;
      })
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule], // Useful for router-related testing utilities
      providers: [
        // authGuard is a function, not a class, so we don't provide it directly here.
        // We will call it directly in tests, but its dependencies need to be mocked via TestBed's DI.
        { provide: AUTH_SERVICE_TOKEN, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
    
    // The guard is a function, so we get its instance by using TestBed.runInInjectionContext
    // to resolve its dependencies (authService and router) from the TestBed injector.
    guard = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => 
      TestBed.runInInjectionContext(() => authGuard(route, state));
  });

  it('should be created (conceptually, as it is a function)', () => {
    // We don't instantiate functional guards directly, but we test their behavior.
    // This test mainly ensures the setup is correct.
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true and not navigate if the user is authenticated', (done) => {
      const dummyUser: User = { uid: '123', email: 'test@example.com', role: UserRole.PLAYER };
      authServiceMock.currentUser$.next(dummyUser);

      const result = guard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

      if (result instanceof Observable) {
        result.subscribe(canActivate => {
          expect(canActivate).toBe(true);
          expect(routerMock.navigate).not.toHaveBeenCalled();
          done();
        });
      } else {
        // Should be an Observable based on guard implementation
        fail('Expected an Observable from authGuard');
      }
    });

    it('should return false and navigate to login if the user is not authenticated', (done) => {
      authServiceMock.currentUser$.next(null); // No user

      const result = guard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);
      
      if (result instanceof Observable) {
        result.subscribe(canActivate => {
          expect(canActivate).toBe(false); // The tap operator doesn't change emission, map does.
          expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/login'], { queryParams: { returnUrl: '/test-url' } });
          done();
        });
      } else {
         // Should be an Observable based on guard implementation
        fail('Expected an Observable from authGuard');
      }
    });
    
    it('should return false and navigate to login if the user is undefined', (done) => {
      authServiceMock.currentUser$.next(undefined); // Undefined user

      const result = guard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);
      
      if (result instanceof Observable) {
        result.subscribe(canActivate => {
          expect(canActivate).toBe(false);
          expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/login'], { queryParams: { returnUrl: '/test-url' } });
          done();
        });
      } else {
        fail('Expected an Observable from authGuard');
      }
    });
  });
});

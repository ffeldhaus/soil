import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { UserRole, User } from '../models/user.model';
import { IAuthService, AUTH_SERVICE_TOKEN } from '../services/auth/auth.service.interface';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  let authServiceMock: Partial<IAuthService>;
  let routerMock: Partial<Router>;

  beforeEach(() => {
    authServiceMock = {
      currentUser$: of(null), // Default to null, individual tests will override
    };

    routerMock = {
      navigate: jasmine.createSpy('navigate'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SERVICE_TOKEN, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should return true for an admin user', () => {
    authServiceMock.currentUser$ = of({ id: '1', name: 'Admin User', email: 'admin@example.com', role: UserRole.ADMIN });
    const guardResult = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
    expect(guardResult).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should return false and navigate to login for a non-admin user', () => {
    authServiceMock.currentUser$ = of({ id: '2', name: 'Player User', email: 'player@example.com', role: UserRole.PLAYER });
    const guardResult = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
    expect(guardResult).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/login']);
  });

  it('should return false and navigate to login when no user is logged in (null)', () => {
    authServiceMock.currentUser$ = of(null);
    const guardResult = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
    expect(guardResult).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/login']);
  });

  it('should return false and navigate to login when no user is logged in (undefined)', () => {
    authServiceMock.currentUser$ = of(undefined);
    const guardResult = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
    expect(guardResult).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/login']);
  });
});

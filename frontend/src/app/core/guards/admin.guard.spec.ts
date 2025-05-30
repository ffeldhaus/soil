import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of, firstValueFrom } from 'rxjs'; // Added Observable and firstValueFrom
import { UserRole, User } from '../models'; // Use barrel import
import { IAuthService } from '../services/auth.service.interface'; // Keep for type
import { AUTH_SERVICE_TOKEN } from '../services/injection-tokens'; // Corrected token import
import { adminGuard } from './admin.guard';
import { signal } from '@angular/core'; // For mocking IAuthService signals
import { User as FirebaseUser } from '@angular/fire/auth'; // For FirebaseUser type in mock

describe('adminGuard', () => {
  let mockAuthService: jest.Mocked<IAuthService>;
  let routerMock: jest.Mocked<Router>; // Changed to full Router mock for parseUrl

  beforeEach(() => {
    // Full mock for IAuthService, similar to other spec files
    mockAuthService = {
      adminLogin: jest.fn(),
      playerLoginWithCredentials: jest.fn(),
      logout: jest.fn().mockResolvedValue(undefined),
      impersonatePlayer: jest.fn().mockResolvedValue(undefined),
      stopImpersonation: jest.fn().mockResolvedValue(undefined),
      adminRegister: jest.fn().mockReturnValue(of({})),
      requestPasswordReset: jest.fn().mockReturnValue(of(undefined)),
      getCurrentFirebaseIdToken: jest.fn().mockResolvedValue(null),
      getStoredBackendTokenSnapshot: jest.fn().mockReturnValue(null),
      firebaseUser: signal(null as FirebaseUser | null | undefined),
      currentUser: signal(null as User | null | undefined), // Will be set per test
      backendToken: signal(null as string | null),
      isAuthenticated: signal(false),
      isAdmin: signal(false), // Will be effectively tested by the guard
      isPlayer: signal(false),
      isImpersonating: signal(false),
      firebaseUser$: of(null as FirebaseUser | null | undefined),
      currentUser$: of(null as User | null | undefined), // This is the one used by the guard
    } as unknown as jest.Mocked<IAuthService>;

    routerMock = {
      navigate: jest.fn(),
      parseUrl: jest.fn().mockImplementation((url: string) => TestBed.inject(Router).parseUrl(url)), // Mock parseUrl
    } as unknown as jest.Mocked<Router>;

    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SERVICE_TOKEN, useValue: mockAuthService },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should return true for an admin user', async () => { // Made test async
    // Set up the currentUser$ part of the mock specifically for this test
    (mockAuthService as { currentUser$: Observable<User | null | undefined> }).currentUser$ = of({ uid: '1', displayName: 'Admin User', email: 'admin@example.com', role: UserRole.ADMIN } as User);

    const guardResult = TestBed.runInInjectionContext(() => adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

    expect(guardResult instanceof Observable).toBe(true);
    const result = await firstValueFrom(guardResult as Observable<boolean>);
    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should return false and navigate to login for a non-admin user', async () => { // Made test async
    (mockAuthService as { currentUser$: Observable<User | null | undefined> }).currentUser$ = of({ uid: '2', displayName: 'Player User', email: 'player@example.com', role: UserRole.PLAYER } as User);

    const guardResult = TestBed.runInInjectionContext(() => adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

    expect(guardResult instanceof Observable).toBe(true);
    const result = await firstValueFrom(guardResult as Observable<boolean>);
    expect(result).toBe(false); // Guard's map operator should result in false
    // Navigation happens in tap operator, which runs due to subscription by firstValueFrom
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/login']);
  });

  it('should return false and navigate to login when no user is logged in (null)', async () => { // Made test async
    (mockAuthService as { currentUser$: Observable<User | null | undefined> }).currentUser$ = of(null);

    const guardResult = TestBed.runInInjectionContext(() => adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

    expect(guardResult instanceof Observable).toBe(true);
    const result = await firstValueFrom(guardResult as Observable<boolean>);
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/login']);
  });

  it('should return false and navigate to login when no user is logged in (undefined)', async () => { // Made test async
    (mockAuthService as { currentUser$: Observable<User | null | undefined> }).currentUser$ = of(undefined);

    const guardResult = TestBed.runInInjectionContext(() => adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

    expect(guardResult instanceof Observable).toBe(true);
    const result = await firstValueFrom(guardResult as Observable<boolean>);
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/login']);
  });
});

import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, convertToParamMap, ParamMap, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of, firstValueFrom, BehaviorSubject } from 'rxjs'; // Added BehaviorSubject, firstValueFrom, Observable
import { UserRole, User } from '../models'; // Changed to use barrel import
import { IAuthService } from '../services/auth.service.interface';
import { AUTH_SERVICE_TOKEN } from '../services/injection-tokens'; // Corrected token import
import { playerGuard } from './player.guard';
// No need for full IAuthService mock from admin.guard.spec.ts if only currentUser$ is used by player.guard.ts

describe('playerGuard', () => {
  let currentUserSource: BehaviorSubject<User | null | undefined>;
  let mockAuthService: Pick<IAuthService, 'currentUser$'>; // Mock only what's needed
  let routerMock: jest.Mocked<Router>;
  let routeMockState: { paramMap: ParamMap };

  beforeEach(() => {
    currentUserSource = new BehaviorSubject<User | null | undefined>(null);
    mockAuthService = {
      currentUser$: currentUserSource.asObservable(),
    };

    routerMock = {
      navigate: jest.fn(),
      parseUrl: jest.fn().mockImplementation((url: string) => TestBed.inject(Router).parseUrl(url)),
    } as unknown as jest.Mocked<Router>;

    routeMockState = {
      paramMap: convertToParamMap({})
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SERVICE_TOKEN, useValue: mockAuthService },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  const executeGuard = () => {
    const mockSnapshot: Partial<ActivatedRouteSnapshot> = {
      paramMap: routeMockState.paramMap
    };
    // The guard expects ActivatedRouteSnapshot and RouterStateSnapshot
    return TestBed.runInInjectionContext(() => playerGuard(mockSnapshot as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  };

  it('should return true for an authorized player in the correct game', async () => { // Made async
    currentUserSource.next({ uid: '1', email: 'player@example.com', role: UserRole.PLAYER, gameId: 'game123' } as User);
    routeMockState.paramMap = convertToParamMap({ gameId: 'game123' });

    const guardResult = executeGuard() as Observable<boolean | UrlTree>;
    const result = await firstValueFrom(guardResult);

    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should return false and navigate to overview for a player in a different game', async () => { // Made async
    currentUserSource.next({ uid: '1', email: 'player@example.com', role: UserRole.PLAYER, gameId: 'game123' } as User);
    routeMockState.paramMap = convertToParamMap({ gameId: 'game456' });

    const guardResult = executeGuard() as Observable<boolean | UrlTree>;
    const result = await firstValueFrom(guardResult);

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/overview']);
  });

  it('should return false and navigate to overview for a player with no gameId in route', async () => { // Made async
    currentUserSource.next({ uid: '1', email: 'player@example.com', role: UserRole.PLAYER, gameId: 'game123' } as User);
    routeMockState.paramMap = convertToParamMap({});

    const guardResult = executeGuard() as Observable<boolean | UrlTree>;
    const result = await firstValueFrom(guardResult);

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/overview']);
  });

  it('should return false and navigate to overview for a player with no gameId in user profile', async () => { // Made async
    currentUserSource.next({ uid: '1', email: 'player@example.com', role: UserRole.PLAYER, gameId: undefined } as User);
    routeMockState.paramMap = convertToParamMap({ gameId: 'game123' });

    const guardResult = executeGuard() as Observable<boolean | UrlTree>;
    const result = await firstValueFrom(guardResult);

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/overview']);
  });

  it('should return false and navigate to overview for a non-player user (Admin)', async () => { // Made async
    currentUserSource.next({ uid: '2', email: 'admin@example.com', role: UserRole.ADMIN } as User);
    routeMockState.paramMap = convertToParamMap({ gameId: 'game123' });

    const guardResult = executeGuard() as Observable<boolean | UrlTree>;
    const result = await firstValueFrom(guardResult);

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/overview']);
  });

  it('should return false and navigate to overview when no user is logged in (null)', async () => { // Made async
    currentUserSource.next(null);
    routeMockState.paramMap = convertToParamMap({ gameId: 'game123' });

    const guardResult = executeGuard() as Observable<boolean | UrlTree>;
    const result = await firstValueFrom(guardResult);

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/overview']);
  });
});

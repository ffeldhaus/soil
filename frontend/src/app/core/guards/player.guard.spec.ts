import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { UserRole, User } from '../models/user.model';
import { IAuthService, AUTH_SERVICE_TOKEN } from '../services/auth/auth.service.interface';
import { playerGuard } from './player.guard';

describe('playerGuard', () => {
  let authServiceMock: Partial<IAuthService>;
  let routerMock: Partial<Router>;
  let routeMock: ActivatedRouteSnapshot;

  beforeEach(() => {
    authServiceMock = {
      currentUser$: of(null), // Default to null, individual tests will override
    };

    routerMock = {
      navigate: jasmine.createSpy('navigate'),
    };

    routeMock = new ActivatedRouteSnapshot(); // Base mock, will be customized per test

    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SERVICE_TOKEN, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should return true for an authorized player in the correct game', () => {
    authServiceMock.currentUser$ = of({ id: '1', name: 'Player User', email: 'player@example.com', role: UserRole.PLAYER, gameId: 'game123' });
    routeMock.paramMap = convertToParamMap({ gameId: 'game123' });
    const guardResult = TestBed.runInInjectionContext(() => playerGuard(routeMock, {} as any));
    expect(guardResult).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should return false and navigate to overview for a player in a different game', () => {
    authServiceMock.currentUser$ = of({ id: '1', name: 'Player User', email: 'player@example.com', role: UserRole.PLAYER, gameId: 'game123' });
    routeMock.paramMap = convertToParamMap({ gameId: 'game456' });
    const guardResult = TestBed.runInInjectionContext(() => playerGuard(routeMock, {} as any));
    expect(guardResult).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/overview']);
  });

  it('should return false and navigate to overview for a player with no gameId in route', () => {
    authServiceMock.currentUser$ = of({ id: '1', name: 'Player User', email: 'player@example.com', role: UserRole.PLAYER, gameId: 'game123' });
    routeMock.paramMap = convertToParamMap({}); // No gameId
    const guardResult = TestBed.runInInjectionContext(() => playerGuard(routeMock, {} as any));
    expect(guardResult).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/overview']);
  });

  it('should return false and navigate to overview for a player with no gameId in user profile', () => {
    authServiceMock.currentUser$ = of({ id: '1', name: 'Player User', email: 'player@example.com', role: UserRole.PLAYER, gameId: null });
    routeMock.paramMap = convertToParamMap({ gameId: 'game123' });
    const guardResult = TestBed.runInInjectionContext(() => playerGuard(routeMock, {} as any));
    expect(guardResult).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/overview']);
  });

  it('should return false and navigate to overview for a non-player user (Admin)', () => {
    authServiceMock.currentUser$ = of({ id: '2', name: 'Admin User', email: 'admin@example.com', role: UserRole.ADMIN });
    routeMock.paramMap = convertToParamMap({ gameId: 'game123' }); // gameId in route doesn't matter here
    const guardResult = TestBed.runInInjectionContext(() => playerGuard(routeMock, {} as any));
    expect(guardResult).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/overview']);
  });

  it('should return false and navigate to overview when no user is logged in (null)', () => {
    authServiceMock.currentUser$ = of(null);
    routeMock.paramMap = convertToParamMap({ gameId: 'game123' }); // gameId in route doesn't matter here
    const guardResult = TestBed.runInInjectionContext(() => playerGuard(routeMock, {} as any));
    expect(guardResult).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/frontpage/overview']);
  });
});

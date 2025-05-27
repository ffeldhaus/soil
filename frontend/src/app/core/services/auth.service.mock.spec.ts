import { TestBed } from '@angular/core/testing';
import { MockAuthService } from './auth.service.mock';
import { UserRole, User } from '../models/user.model';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

describe('MockAuthService', () => {
  let service: MockAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockAuthService]
    });
    service = TestBed.inject(MockAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('initial state should be logged out', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeUndefined(); // Initial signal state is undefined
    expect(service.firebaseUser()).toBeUndefined();
    expect(service.backendToken()).toBeNull();
  });

  describe('mockLoginAsAdmin', () => {
    it('should set admin user and token', async () => {
      service.mockLoginAsAdmin({ uid: 'custom-admin', email: 'custom@admin.com' });
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isAdmin()).toBe(true);
      expect(service.isPlayer()).toBe(false);
      
      const currentUser = service.currentUser();
      expect(currentUser).toBeTruthy();
      expect(currentUser?.uid).toBe('custom-admin');
      expect(currentUser?.email).toBe('custom@admin.com');
      expect(currentUser?.role).toBe(UserRole.ADMIN);

      const fbUser = service.firebaseUser();
      expect(fbUser).toBeTruthy();
      expect(fbUser?.uid).toBe('custom-admin');
      expect(await fbUser?.getIdToken()).toBe('mock-firebase-id-token-admin');
      expect(service.backendToken()).toBe('mock-backend-jwt-admin-token');
    });
  });

  describe('mockLoginAsPlayer', () => {
    it('should set player user and token', async () => {
      service.mockLoginAsPlayer({ uid: 'custom-player', email: 'custom@player.com', gameId: 'g1', playerNumber: 2 });
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isPlayer()).toBe(true);
      expect(service.isAdmin()).toBe(false);

      const currentUser = service.currentUser();
      expect(currentUser).toBeTruthy();
      expect(currentUser?.uid).toBe('custom-player');
      expect(currentUser?.email).toBe('custom@player.com');
      expect(currentUser?.role).toBe(UserRole.PLAYER);
      expect(currentUser?.gameId).toBe('g1');
      expect(currentUser?.playerNumber).toBe(2);

      const fbUser = service.firebaseUser();
      expect(fbUser).toBeTruthy();
      expect(fbUser?.uid).toBe('custom-player');
      expect(await fbUser?.getIdToken()).toBe('mock-firebase-id-token-player');
      expect(service.backendToken()).toBe('mock-backend-jwt-player-token');
    });
  });

  describe('mockLogout', () => {
    it('should clear user and token', () => {
      service.mockLoginAsAdmin(); // Start logged in
      expect(service.isAuthenticated()).toBe(true);
      service.mockLogout();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(service.firebaseUser()).toBeNull();
      expect(service.backendToken()).toBeNull();
    });
  });

  describe('adminLogin method', () => {
    it('should login with devDefaults if no specific mock credentials match', async () => {
        const user = await firstValueFrom(service.adminLogin(environment.devDefaults.adminEmail, environment.devDefaults.adminPassword));
        expect(user).toBeTruthy();
        expect(user?.email).toBe(environment.devDefaults.adminEmail);
        expect(service.isAuthenticated()).toBe(true);
        expect(service.isAdmin()).toBe(true);
    });

    it('should return error for invalid credentials', async () => {
        try {
            await firstValueFrom(service.adminLogin('wrong@admin.com', 'wrongpass'));
            fail('should have thrown an error');
        } catch (e: any) {
            expect(e.message).toContain('Mock Admin Login Failed');
            expect(service.isAuthenticated()).toBe(false);
        }
    });
  });
  
  // TODO: Add tests for playerLoginWithCredentials, adminRegister, requestPasswordReset methods of MockAuthService
});

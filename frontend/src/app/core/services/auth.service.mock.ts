// File: frontend/src/app/core/services/auth.service.mock.ts
import { Injectable, signal, WritableSignal, computed, Signal, inject } from '@angular/core';
import { Router } from '@angular/router'; // Import Router for navigation
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { User as AppUser, UserRole } from '../models/user.model'; 
import { User as FirebaseUser } from '@angular/fire/auth'; 
import { IAuthService } from './auth.service.interface';
import { toObservable } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';

interface MockFirebaseUserInternal {
  uid: string;
  email: string | null;
  displayName: string | null;
  getIdToken(forceRefresh?: boolean): Promise<string>; 
  emailVerified: boolean; 
  isAnonymous: boolean;
  metadata: unknown; // Changed any to unknown
  providerData: unknown[]; // Changed any[] to unknown[]
  providerId: string;
  refreshToken: string;
  tenantId: string | null;
  delete: () => Promise<void>;
  getIdTokenResult: (forceRefresh?: boolean) => Promise<import('@angular/fire/auth').IdTokenResult>;
  reload: () => Promise<void>;
  toJSON: () => object;
}

@Injectable()
export class MockAuthService implements IAuthService {
  private router = inject(Router); // Inject router for navigation

  private _firebaseUser: WritableSignal<MockFirebaseUserInternal | null | undefined> = signal(undefined);
  private _currentUser: WritableSignal<AppUser | null | undefined> = signal(undefined);
  private _backendToken: WritableSignal<string | null> = signal(null);
  private _originalAdminToken: WritableSignal<string | null> = signal(null); // For impersonation
  private _originalAdminUser: WritableSignal<AppUser | null | undefined> = signal(undefined); // Store original admin user

  firebaseUser: Signal<FirebaseUser | null | undefined> = this._firebaseUser as Signal<FirebaseUser | null | undefined>; 
  currentUser: Signal<AppUser | null | undefined> = this._currentUser.asReadonly();
  backendToken: Signal<string | null> = this._backendToken.asReadonly();

  firebaseUser$: Observable<FirebaseUser | null | undefined> = toObservable(this.firebaseUser);
  currentUser$: Observable<AppUser | null | undefined> = toObservable(this.currentUser);

  isAuthenticated: Signal<boolean> = computed(() => !!this._firebaseUser() && !!this._currentUser());
  isAdmin: Signal<boolean> = computed(() => this._currentUser()?.role === UserRole.ADMIN && !this.isImpersonating());
  isPlayer: Signal<boolean> = computed(() => this._currentUser()?.role === UserRole.PLAYER || this.isImpersonating());
  isImpersonating: Signal<boolean> = computed(() => !!this._originalAdminToken()); // Based on originalAdminToken

  constructor() {
    // console.log('MockAuthService initialized');
  }

  public mockLoginAsAdmin(adminDetails?: Partial<AppUser>): void {
    const uid = adminDetails?.uid || 'mock-admin-uid';
    const email = adminDetails?.email || 'admin@mock.com';
    const displayName = adminDetails?.displayName || 'Mock Admin';
    
    const mockFbUser: MockFirebaseUserInternal = {
      uid,
      email,
      displayName,
      getIdToken: async () => 'mock-firebase-id-token-admin',
      emailVerified: true, isAnonymous: false, metadata: {}, providerData: [], providerId: 'password',
      refreshToken: 'mock-refresh-token', tenantId: null, delete: async () => {},
      getIdTokenResult: async () => ({} as import('@angular/fire/auth').IdTokenResult),
      reload: async () => {}, toJSON: () => ({}),
    };
    const appUser: AppUser = {
      uid,
      email,
      displayName,
      role: UserRole.ADMIN,
      ...adminDetails
    };
    this._firebaseUser.set(mockFbUser);
    this._currentUser.set(appUser);
    this._backendToken.set('mock-backend-jwt-admin-token');
    // console.log('MockAuthService: mockLoginAsAdmin complete. Current user:', this._currentUser(), 'Token:', this._backendToken());
  }

  public mockLoginAsPlayer(playerDetails?: Partial<AppUser>): void {
    const uid = playerDetails?.uid || 'mock-player-uid';
    const email = playerDetails?.email || 'player@mock.com';
    const displayName = playerDetails?.displayName || 'Mock Player';

    const mockFbUser: MockFirebaseUserInternal = {
      uid, email, displayName,
      getIdToken: async () => 'mock-firebase-id-token-player',
      emailVerified: true, isAnonymous: false, metadata: {}, providerData: [], providerId: 'custom',
      refreshToken: 'mock-refresh-token', tenantId: null, delete: async () => {},
      getIdTokenResult: async () => ({} as import('@angular/fire/auth').IdTokenResult),
      reload: async () => {}, toJSON: () => ({}),
    };
    const appUser: AppUser = {
      uid, email, displayName,
      role: UserRole.PLAYER,
      gameId: playerDetails?.gameId || 'mock-game-id',
      playerNumber: playerDetails?.playerNumber || 1,
      isAi: playerDetails?.isAi || false,
      ...playerDetails
    };
    this._firebaseUser.set(mockFbUser);
    this._currentUser.set(appUser);
    this._backendToken.set('mock-backend-jwt-player-token');
  }

  public mockLogout(): void {
    this.clearUserState();
  }

  private clearUserState(): void {
    this._firebaseUser.set(null);
    this._currentUser.set(null);
    this._backendToken.set(null);
    this._originalAdminToken.set(null);
    this._originalAdminUser.set(null);
  }

  async getCurrentFirebaseIdToken(forceRefresh?: boolean): Promise<string | null> {
    const fbUser = this._firebaseUser();
    if (!fbUser) return null;
    try {
      return await fbUser.getIdToken(forceRefresh);
    } catch { // Removed e
      // console.error('MockAuthService: Error in getCurrentFirebaseIdToken');
      return null;
    }
  }

  adminLogin(email: string, password: string): Observable<AppUser | null> {
    // console.log('MockAuthService: adminLogin attempt for:', email);
    const defaultAdminEmail = environment.devDefaults?.adminEmail ?? 'admin@local.dev';
    const defaultAdminPassword = environment.devDefaults?.adminPassword ?? 'password';
    if (email === defaultAdminEmail && password === defaultAdminPassword) {
      this.mockLoginAsAdmin({ email, displayName: 'Dev Admin' });
      return of(this._currentUser()!).pipe(delay(50)); 
    }
    return throwError(() => new Error('Mock Admin Login Failed: Invalid credentials'));
  }

  playerLoginWithCredentials(gameId: string, playerNumber: number, password: string): Observable<AppUser | null> {
    // console.log('MockAuthService: playerLogin for game:', gameId, 'player:', playerNumber);
    if (password === 'password') { // Simple mock check
        this.mockLoginAsPlayer({ gameId, playerNumber, email: `player${playerNumber}@${gameId}.mock`, uid: `mock-player-${playerNumber}` });
        return of(this._currentUser()!).pipe(delay(50));
    }
    return throwError(() => new Error('Mock Player Login Failed: Invalid credentials'));
  }

  adminRegister(/* _payload: unknown */): Observable<unknown> { // Removed _payload
    return of({ success: true, message: 'Admin registered successfully (mock)' }).pipe(delay(50));
  }

  requestPasswordReset(/* _email: string */): Observable<void> { // Removed _email
    return of(undefined).pipe(delay(50));
  }

  async logout(): Promise<void> {
    // console.log('MockAuthService: logout called');
    this.mockLogout();
    this.router.navigate(['/frontpage/login']);
  }

  getStoredBackendTokenSnapshot(): string | null {
    return this._backendToken();
  }

  // Impersonation methods for IAuthService
  async impersonatePlayer(gameId: string, playerId: string): Promise<void> {
    // console.log(`MockAuthService: impersonatePlayer called for gameId: ${gameId}, playerId: ${playerId}`);
    const adminToken = this._backendToken();
    const adminUser = this._currentUser();

    if (!adminToken || !adminUser || adminUser.role !== UserRole.ADMIN) {
      // console.error('MockAuthService: Cannot impersonate. Admin not logged in or not an admin.');
      throw new Error('Mock: Admin not logged in or not an admin.');
    }
    if (this.isImpersonating()) {
      // console.warn('MockAuthService: Already impersonating.');
      throw new Error('Mock: Already impersonating.');
    }

    // Store admin state
    this._originalAdminToken.set(adminToken);
    this._originalAdminUser.set(adminUser);

    // Create impersonated player state
    const impersonatedPlayer: AppUser = {
      uid: playerId,
      email: `player-${playerId.substring(0,5)}@example.mock`,
      displayName: `Impersonated Player (${playerId.substring(0,5)})`,
      role: UserRole.PLAYER,
      gameId: gameId,
      playerNumber: Math.floor(Math.random() * 10) + 1, // Mock player number
      isAi: false,
      impersonatorUid: adminUser.uid
    };
    this._currentUser.set(impersonatedPlayer);
    this._backendToken.set(`mock-impersonation-token-for-${playerId}`); // New mock token
    // In a real scenario, _firebaseUser might also need to change or be handled carefully.
    // For mock, we might not need to change _firebaseUser if it's not strictly checked by player views.

    // console.log('MockAuthService: Impersonation successful. Now user:', this._currentUser());
    this.router.navigate(['/game', gameId, 'dashboard']);
  }

  async stopImpersonation(): Promise<void> {
    // console.log('MockAuthService: stopImpersonation called');
    const originalToken = this._originalAdminToken();
    const originalUser = this._originalAdminUser();

    if (!originalToken || !originalUser) {
      // console.warn('MockAuthService: No original admin state to restore.');
      // Might still clear current state to avoid being stuck as player
      this.mockLoginAsAdmin(); // Or some other default admin state
      return;
    }

    this._currentUser.set(originalUser);
    this._backendToken.set(originalToken);
    this._originalAdminToken.set(null);
    this._originalAdminUser.set(null);
    
    // console.log('MockAuthService: Impersonation stopped. Restored admin user:', this._currentUser());
    this.router.navigate(['/admin/dashboard']);
  }
}

// File: frontend/src/app/core/services/auth.service.ts
import { Injectable, inject, signal, WritableSignal, computed, effect, PLATFORM_ID, Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Auth, signInWithCustomToken, signOut, onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, getIdTokenResult } from '@angular/fire/auth';
import { Observable, from, BehaviorSubject, of, throwError, firstValueFrom } from 'rxjs';
import { map, switchMap, catchError, tap, filter, take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import { User, UserRole } from '../models/user.model';
import { AuthResponse } from '../models/auth-response.model';
import { environment } from '../../../environments/environment';
import { IAuthService } from './auth.service.interface';

const BACKEND_JWT_KEY = 'soil_game_backend_token';
const ORIGINAL_ADMIN_TOKEN_KEY = 'soil_game_original_admin_token'; // For impersonation

@Injectable({ providedIn: 'root' })
export class AuthService implements IAuthService {
  private auth: Auth = inject(Auth);
  private http: HttpClient = inject(HttpClient);
  private router: Router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  // MODIFIED: Added public getter for testing/logging, but direct signal access is fine for internal use.
  public get _backendTokenInternalSignal() { return this.backendTokenInternal; }

  protected firebaseUserInternal: WritableSignal<FirebaseUser | null | undefined> = signal(undefined); // Changed to protected for mocks if they extend
  protected appUserInternal: WritableSignal<User | null | undefined> = signal(undefined); // Changed to protected
  protected backendTokenInternal: WritableSignal<string | null> = signal(null); // Changed to protected
  protected originalAdminTokenInternal: WritableSignal<string | null> = signal(null); // Changed to protected

  public firebaseUser: Signal<FirebaseUser | null | undefined> = this.firebaseUserInternal.asReadonly();
  public currentUser: Signal<User | null | undefined> = this.appUserInternal.asReadonly();
  public backendToken: Signal<string | null> = this.backendTokenInternal.asReadonly();

  public readonly firebaseUser$: Observable<FirebaseUser | null | undefined> = toObservable(this.firebaseUserInternal);
  public readonly currentUser$: Observable<User | null | undefined> = toObservable(this.appUserInternal);

  public isAuthenticated: Signal<boolean> = computed(() => !!this.firebaseUserInternal() && !!this.appUserInternal());
  public isAdmin: Signal<boolean> = computed(() => this.currentUser()?.role === UserRole.ADMIN && !this.isImpersonating());
  public isPlayer: Signal<boolean> = computed(() => this.currentUser()?.role === UserRole.PLAYER || this.isImpersonating());
  public isImpersonating: Signal<boolean> = computed(() => !!this.originalAdminTokenInternal());

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.backendTokenInternal.set(localStorage.getItem(BACKEND_JWT_KEY));
      this.originalAdminTokenInternal.set(localStorage.getItem(ORIGINAL_ADMIN_TOKEN_KEY));
      console.log('AuthService Constructor: Initial backendTokenInternal from localStorage:', this.backendTokenInternal());
      console.log('AuthService Constructor: Initial originalAdminTokenInternal from localStorage:', this.originalAdminTokenInternal());
    }
    
    onAuthStateChanged(this.auth, async (fbUser) => {
      this.firebaseUserInternal.set(fbUser);
      if (fbUser) {
        console.log('AuthService: Firebase user state changed - Logged In', fbUser.uid, 'Is Impersonating:', this.isImpersonating());
        if (this.isImpersonating()) {
            console.log('AuthService: Currently impersonating. Backend token and app user will not be auto-updated from Firebase admin user.');
        } else {
            await this.processFirebaseUser(fbUser);
        }
      } else {
        console.log('AuthService: Firebase user state changed - Logged Out');
        this.clearAuthData(true);
      }
    }, (error) => {
      console.error('AuthService: onAuthStateChanged error:', error);
      this.clearAuthData(true);
    });

    effect(() => {
      console.log('AuthService Effect: App User changed:', this.currentUser());
      console.log('AuthService Effect: Is Impersonating:', this.isImpersonating());
      console.log('AuthService Effect: Current Backend Token:', this.backendTokenInternal());
    });
  }

  protected async processFirebaseUser(firebaseUser: FirebaseUser): Promise<void> { // Changed to protected
    console.log('AuthService: processFirebaseUser for UID:', firebaseUser.uid);
    try {
      const idTokenResult = await getIdTokenResult(firebaseUser, true);
      const claims = idTokenResult.claims;
      const role = claims['role'] as UserRole | undefined;
      const gameId = claims['game_id'] as string | undefined;
      const isAi = claims['is_ai'] as boolean | undefined;
      const playerNumber = claims['player_number'] as number | undefined;

      const appUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        role: role || null,
        gameId: gameId,
        playerNumber: playerNumber,
        isAi: isAi,
      };
      this.appUserInternal.set(appUser);
      console.log('AuthService: App user processed from Firebase claims:', appUser);

      await this.fetchAndStoreBackendToken(idTokenResult.token);

    } catch (error) {
      console.error("AuthService: Error processing Firebase user or fetching backend token:", error);
      await this.logoutOnError();
    }
  }

  protected async fetchAndStoreBackendToken(firebaseIdToken: string): Promise<void> { // Changed to protected
    if (!firebaseIdToken) {
      console.warn('AuthService: No Firebase ID token available to fetch backend token.');
      this.clearBackendToken();
      return;
    }
    console.log('AuthService: fetchAndStoreBackendToken called with Firebase ID token (first 50 chars): ', firebaseIdToken.substring(0,50));
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login/id-token`, { id_token: firebaseIdToken })
      );
      if (response && response.access_token) {
        this.storeBackendToken(response.access_token);
        if (response.user_info) {
            const newUser = response.user_info as User;
            this.appUserInternal.set(newUser);
            console.log('AuthService: AppUser updated from backend token user_info:', newUser);
        }
      } else {
        console.warn('AuthService: Backend token not found in response.');
        this.clearBackendToken();
      }
    } catch (error) {
      console.error("AuthService: Error fetching backend token:", error);
      this.clearBackendToken(); // Ensure token is cleared on error
    }
  }

  protected storeBackendToken(token: string): void { // Changed to protected
    console.log('AuthService: storeBackendToken saving token (first 50 chars):', token.substring(0,50));
    if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(BACKEND_JWT_KEY, token);
    }
    this.backendTokenInternal.set(token);
  }
  
  protected clearAuthData(isFullLogout: boolean = false): void { // Changed to protected
    console.log('AuthService: clearAuthData called. isFullLogout:', isFullLogout);
    this.appUserInternal.set(null);
    this.clearBackendToken();
    if (isFullLogout) {
        this.firebaseUserInternal.set(null);
        this.clearOriginalAdminToken();
    }
  }

  protected clearBackendToken(): void { // Changed to protected
    console.log('AuthService: clearBackendToken called. Current value:', this.backendTokenInternal());
    if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem(BACKEND_JWT_KEY);
    }
    this.backendTokenInternal.set(null);
  }

  protected storeOriginalAdminToken(token: string): void { // Changed to protected
    console.log('AuthService: storeOriginalAdminToken saving token (first 50 chars):', token.substring(0,50));
    if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(ORIGINAL_ADMIN_TOKEN_KEY, token);
    }
    this.originalAdminTokenInternal.set(token);
  }

  protected clearOriginalAdminToken(): void { // Changed to protected
    console.log('AuthService: clearOriginalAdminToken called. Current value:', this.originalAdminTokenInternal());
    if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem(ORIGINAL_ADMIN_TOKEN_KEY);
    }
    this.originalAdminTokenInternal.set(null);
  }

  protected async logoutOnError(): Promise<void> { // Changed to protected
    console.warn("AuthService: Logging out due to an error during auth processing.");
    if (this.auth) {
        try {
            await signOut(this.auth);
        } catch (err) {
            console.error("Error during forced sign out:", err);
            this.clearAuthData(true);
        }
    }
  }

  public async getCurrentFirebaseIdToken(forceRefresh: boolean = false): Promise<string | null> {
    const user = this.firebaseUserInternal();
    if (!user) return null;
    try {
      return await user.getIdToken(forceRefresh);
    } catch (error) {
      console.error("Error getting Firebase ID token:", error);
      return null;
    }
  }

  adminLogin(email: string, password: string): Observable<User | null> {
    console.log('AuthService: adminLogin attempt for email:', email);
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(async (userCredential) => {
        console.log('AuthService: Admin Firebase login successful for UID:', userCredential.user.uid);
        // processFirebaseUser will be called by onAuthStateChanged
        const appUser = await firstValueFrom(this.currentUser$.pipe(
          filter((user): user is User | null => user !== undefined && user?.uid === userCredential.user.uid && !!this.backendTokenInternal()), // Also ensure backend token is set
          take(1)
        ));
        console.log('AuthService: Admin app user resolved after login and token fetch:', appUser);
        return appUser;
      }),
      catchError(error => {
        console.error('AuthService: Admin login failed:', error);
        this.clearAuthData(true);
        return throwError(() => error);
      })
    );
  }
  
  playerLoginWithCredentials(gameId: string, playerNumber: number, password: string): Observable<User | null> {
    console.log(`AuthService: playerLoginWithCredentials for game ${gameId}, player ${playerNumber}`);
    return this.http.post<{ customToken: string }>(
      `${environment.apiUrl}/auth/login/player-credentials`,
      { game_id: gameId, player_number: playerNumber, password: password }
    ).pipe(
      switchMap(response => {
        if (!response || !response.customToken) {
          return throwError(() => new Error('Failed to retrieve custom token from backend.'));
        }
        console.log('AuthService: Received custom token for player, attempting Firebase signInWithCustomToken');
        return from(signInWithCustomToken(this.auth, response.customToken));
      }),
      switchMap(async (userCredential) => {
        console.log('AuthService: Player Firebase custom token login successful for UID:', userCredential.user.uid);
        const appUser = await firstValueFrom(this.currentUser$.pipe(
          filter((user): user is User | null => user !== undefined && user?.uid === userCredential.user.uid && !!this.backendTokenInternal()),
          take(1)
        ));
        console.log('AuthService: Player app user resolved after login and token fetch:', appUser);
        return appUser;
      }),
      catchError(error => {
        console.error('AuthService: Player login with custom token failed:', error);
        this.clearAuthData(true);
        return throwError(() => error);
      })
    );
  }

  adminRegister(payload: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/register/admin`, payload).pipe(
      tap(() => console.log('Admin registration request sent to backend.'))
    );
  }

  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/request-password-reset`, { email }).pipe(
      tap(() => console.log(`Password reset sent for ${email}.`))
    );
  }

  async logout(): Promise<void> {
    console.log('AuthService: logout called. IsImpersonating:', this.isImpersonating());
    try {
      if (this.auth) { 
        await signOut(this.auth);
      }
      if (!this.firebaseUserInternal()) {
           this.clearAuthData(true);
      }
      console.log('AuthService: Firebase signOut called or user already null.');
      if (isPlatformBrowser(this.platformId)) {
        this.router.navigate(['/frontpage/login']); 
      }
    } catch (error) {
      console.error('AuthService: Logout failed:', error);
      this.clearAuthData(true); 
      if (isPlatformBrowser(this.platformId)) {
          this.router.navigate(['/frontpage/login']);
      }
    }
  }

  public getStoredBackendTokenSnapshot(): string | null {
    if (isPlatformBrowser(this.platformId)) {
        return this.backendTokenInternal();
    }
    return null;
  }

  // --- Impersonation Methods ---
  async impersonatePlayer(gameId: string, playerId: string): Promise<void> {
    console.log('AuthService: impersonatePlayer attempt for gameId:', gameId, 'playerId:', playerId);
    console.log('AuthService: Current backendTokenInternal value before getting token:', this.backendTokenInternal());
    const currentAdminToken = this.backendTokenInternal();
    if (!currentAdminToken) {
      console.error('AuthService Error: Admin token is missing during impersonation attempt.');
      throw new Error('Admin not logged in or token unavailable.');
    }
    if (this.isImpersonating()) {
      console.warn('AuthService Warning: Attempted to impersonate while already impersonating.');
      throw new Error('Already impersonating. Stop current impersonation first.');
    }

    try {
      console.log('AuthService: Calling backend to impersonate...');
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/admin/games/${gameId}/impersonate/${playerId}`, {})
      );
      console.log('AuthService: Impersonation backend response received:', response);

      if (response && response.access_token && response.user_info) {
        this.storeOriginalAdminToken(currentAdminToken);
        this.storeBackendToken(response.access_token);    
        
        const impersonatedUser: User = {
            uid: response.user_info.uid,
            email: response.user_info.email,
            displayName: response.user_info.displayName || `Player ${response.user_info.playerNumber}`,
            role: response.user_info.role as UserRole,
            gameId: response.user_info.gameId,
            playerNumber: response.user_info.playerNumber,
            isAi: response.user_info.isAi,
            impersonatorUid: response.user_info.impersonatorUid 
        };
        this.appUserInternal.set(impersonatedUser);

        console.log('AuthService: Impersonation successful. Acting as player:', impersonatedUser.uid, 'New backend token (first 50 chars):', response.access_token.substring(0,50));
        if (impersonatedUser.gameId) {
            this.router.navigate(['/game', impersonatedUser.gameId, 'dashboard']);
        } else {
            this.router.navigate(['/']);
        }
      } else {
        console.error('AuthService Error: Impersonation failed due to invalid server response.', response);
        throw new Error('Impersonation failed: Invalid response from server.');
      }
    } catch (error) {
      console.error('AuthService: Impersonation http.post failed:', error);
      throw error;
    }
  }

  async stopImpersonation(): Promise<void> {
    console.log('AuthService: stopImpersonation called.');
    const originalToken = this.originalAdminTokenInternal();
    if (!originalToken) {
      console.warn("AuthService Warning: Stop Impersonation called but no original admin token found.");
      return;
    }
    console.log('AuthService: Restoring original admin token (first 50 chars):', originalToken.substring(0,50));
    this.storeBackendToken(originalToken);
    this.clearOriginalAdminToken();

    const adminFirebaseUser = this.firebaseUserInternal();
    if (adminFirebaseUser) {
        console.log('AuthService: Stopping impersonation. Re-processing original admin Firebase user UID:', adminFirebaseUser.uid);
        await this.processFirebaseUser(adminFirebaseUser);
    } else {
        console.error("AuthService Error: Cannot stop impersonation properly. Admin Firebase user not found.");
        await this.logout(); 
    }
    this.router.navigate(['/admin/dashboard']);
  }
}

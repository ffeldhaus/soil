// File: frontend/src/app/core/services/auth.service.ts
import { Injectable, inject, signal, WritableSignal, computed, effect, PLATFORM_ID, Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Auth, signInWithCustomToken, signOut, onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, getIdTokenResult } from '@angular/fire/auth';
import { Observable, from, throwError, firstValueFrom } from 'rxjs'; // Removed BehaviorSubject, of
import { switchMap, catchError, tap, filter, take } from 'rxjs/operators'; // Removed map
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
  // public get _backendTokenInternalSignal() { return this.backendTokenInternal; } // Removed getter for private signal

  private firebaseUserInternal: WritableSignal<FirebaseUser | null | undefined> = signal(undefined); // Changed to private
  private appUserInternal: WritableSignal<User | null | undefined> = signal(undefined); // Changed to private
  private backendTokenInternal: WritableSignal<string | null> = signal(null); // Changed to private
  private originalAdminTokenInternal: WritableSignal<string | null> = signal(null); // Changed to private

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
    }
    
    onAuthStateChanged(this.auth, async (fbUser) => {
      this.firebaseUserInternal.set(fbUser);
      if (fbUser) {
        if (this.isImpersonating()) {
            // Skip processing if impersonating, user set by impersonation logic
        } else {
            await this.processFirebaseUser(fbUser);
        }
      } else {
        this.clearAuthData(true);
      }
    }, () => {
      this.clearAuthData(true);
    });

    effect(() => {
      // Effect for logging or reacting to token/user changes if needed in the future.
      // For now, primary logic is in onAuthStateChanged and specific methods.
    });
  }

  private async processFirebaseUser(firebaseUser: FirebaseUser): Promise<void> { // Changed to private
    try {
      const idTokenResult = await getIdTokenResult(firebaseUser, true);
      const claims = idTokenResult.claims;
      const role = claims['role'] as UserRole | undefined;
      const gameIdClaim = claims['game_id'] as string | undefined;
      const isAiClaim = claims['is_ai'] as boolean | undefined;
      const playerNumberClaim = claims['player_number'] as number | undefined;

      const appUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        role: role || null,
        gameId: gameIdClaim,
        playerNumber: playerNumberClaim,
        isAi: isAiClaim,
      };
      this.appUserInternal.set(appUser);
      await this.fetchAndStoreBackendToken(idTokenResult.token);

    } catch (error) {
      await this.logoutOnError();
    }
  }

  private async fetchAndStoreBackendToken(firebaseIdToken: string): Promise<void> { // Changed to private
    if (!firebaseIdToken) {
      this.clearBackendToken();
      return;
    }
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login/id-token`, { idToken: firebaseIdToken })
      );
      if (response && response.access_token) {
        this.storeBackendToken(response.access_token);
        if (response.user_info) {
            const newUser = response.user_info as User;
            this.appUserInternal.set(newUser);
        }
      } else {
        this.clearBackendToken();
      }
    } catch (error) {
      this.clearBackendToken();
    }
  }

  private storeBackendToken(token: string): void { // Changed to private
    if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(BACKEND_JWT_KEY, token);
    }
    this.backendTokenInternal.set(token);
  }
  
  private clearAuthData(isFullLogout: boolean = false): void { // Changed to private
    this.appUserInternal.set(null);
    this.clearBackendToken();
    if (isFullLogout) {
        this.firebaseUserInternal.set(null);
        this.clearOriginalAdminToken();
    }
  }

  private clearBackendToken(): void { // Changed to private
    if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem(BACKEND_JWT_KEY);
    }
    this.backendTokenInternal.set(null);
  }

  private storeOriginalAdminToken(token: string): void { // Changed to private
    if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(ORIGINAL_ADMIN_TOKEN_KEY, token);
    }
    this.originalAdminTokenInternal.set(token);
  }

  private clearOriginalAdminToken(): void { // Changed to private
    if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem(ORIGINAL_ADMIN_TOKEN_KEY);
    }
    this.originalAdminTokenInternal.set(null);
  }

  private async logoutOnError(): Promise<void> { // Changed to private
    if (this.auth) {
        try {
            await signOut(this.auth);
        } catch {
            this.clearAuthData(true);
        }
    }
  }

  public async getCurrentFirebaseIdToken(forceRefresh: boolean = false): Promise<string | null> {
    const user = this.firebaseUserInternal();
    if (!user) return null;
    try {
      return await user.getIdToken(forceRefresh);
    } catch {
      return null;
    }
  }

  adminLogin(email: string, password: string): Observable<User | null> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(async (userCredential) => {
        // processFirebaseUser will be called by onAuthStateChanged
        const appUser = await firstValueFrom(this.currentUser$.pipe(
          filter((user): user is User | null => user !== undefined && user?.uid === userCredential.user.uid && !!this.backendTokenInternal()), // Also ensure backend token is set
          take(1)
        ));
        return appUser;
      }),
      catchError(error => {
        this.clearAuthData(true);
        return throwError(() => error);
      })
    );
  }
  
  playerLoginWithCredentials(gameId: string, playerNumber: number, password: string): Observable<User | null> {
    return this.http.post<{ customToken: string }>(
      `${environment.apiUrl}/auth/login/player-credentials`,
      { gameId: gameId, playerNumber: playerNumber, password: password }
    ).pipe(
      switchMap(response => {
        if (!response || !response.customToken) {
          return throwError(() => new Error('Failed to retrieve custom token from backend.'));
        }
        return from(signInWithCustomToken(this.auth, response.customToken));
      }),
      switchMap(async (userCredential) => {
        const appUser = await firstValueFrom(this.currentUser$.pipe(
          filter((user): user is User | null => user !== undefined && user?.uid === userCredential.user.uid && !!this.backendTokenInternal()),
          take(1)
        ));
        return appUser;
      }),
      catchError(error => {
        this.clearAuthData(true);
        return throwError(() => error);
      })
    );
  }

  adminRegister(payload: unknown): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/auth/register/admin`, payload).pipe(
      tap(() => {
        // Optional: log successful request initiation if needed for higher-level tracking
      })
    );
  }

  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/request-password-reset`, { email }).pipe(
      tap(() => {
        // Optional: log successful request initiation
      })
    );
  }

  async logout(): Promise<void> {
    try {
      if (this.auth) { 
        await signOut(this.auth);
      }
      // onAuthStateChanged will handle clearing data when fbUser becomes null
      if (!this.firebaseUserInternal()) { // If already null, ensure data is cleared
           this.clearAuthData(true);
      }
      if (isPlatformBrowser(this.platformId)) {
        this.router.navigate(['/frontpage/login']); 
      }
    } catch {
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
    const currentAdminToken = this.backendTokenInternal();
    if (!currentAdminToken) {
      throw new Error('Admin not logged in or token unavailable.');
    }
    if (this.isImpersonating()) {
      throw new Error('Already impersonating. Stop current impersonation first.');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/admin/games/${gameId}/impersonate/${playerId}`, {})
      );

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
        this.appUserInternal.set(impersonatedUser); // Manually set app user, onAuthStateChanged is skipped while impersonating

        if (impersonatedUser.gameId) {
            this.router.navigate(['/game', impersonatedUser.gameId, 'dashboard']);
        } else {
            this.router.navigate(['/']);
        }
      } else {
        throw new Error('Impersonation failed: Invalid response from server.');
      }
    } catch (error) {
      // Rethrow or handle more specifically if needed
      throw new Error('Impersonation HTTP request failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  async stopImpersonation(): Promise<void> {
    const originalToken = this.originalAdminTokenInternal();
    if (!originalToken) {
      return;
    }
    this.storeBackendToken(originalToken);
    this.clearOriginalAdminToken(); // This also sets isImpersonating to false

    const adminFirebaseUser = this.firebaseUserInternal();
    if (adminFirebaseUser) {
        // Re-trigger processing for the original admin user.
        // onAuthStateChanged might not re-fire if fbUser object instance is the same.
        // Explicitly call processFirebaseUser.
        await this.processFirebaseUser(adminFirebaseUser);
    } else {
        // This case should ideally not happen if an admin was logged in.
        await this.logout(); 
    }
    this.router.navigate(['/admin/dashboard']);
  }
}

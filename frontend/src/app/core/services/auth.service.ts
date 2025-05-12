// File: frontend/src/app/core/services/auth.service.ts
import { Injectable, inject, signal, WritableSignal, computed, effect, PLATFORM_ID } from '@angular/core'; // Added PLATFORM_ID
import { isPlatformBrowser } from '@angular/common'; // Added isPlatformBrowser
import { toObservable } from '@angular/core/rxjs-interop'; 
import { Router } from '@angular/router';
import { Auth, signInWithCustomToken, signOut, onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, getIdTokenResult } from '@angular/fire/auth';
import { Observable, from, BehaviorSubject, of, throwError, firstValueFrom } from 'rxjs';
import { map, switchMap, catchError, tap, filter, take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import { User, UserRole } from '../models/user.model';
import { AuthResponse } from '../models/auth-response.model';
import { environment } from '../../../environments/environment';

const BACKEND_JWT_KEY = 'soil_game_backend_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private http: HttpClient = inject(HttpClient);
  private router: Router = inject(Router);
  private platformId = inject(PLATFORM_ID); // Inject PLATFORM_ID

  private firebaseUserInternal: WritableSignal<FirebaseUser | null | undefined> = signal(undefined);
  private appUserInternal: WritableSignal<User | null | undefined> = signal(undefined);
  
  // Initialize backendTokenInternal conditionally based on platform
  private backendTokenInternal: WritableSignal<string | null> = signal(null);

  // Use toObservable to convert signals to observables
  public readonly firebaseUser$: Observable<FirebaseUser | null | undefined> = toObservable(this.firebaseUserInternal);
  public readonly currentUser$: Observable<User | null | undefined> = toObservable(this.appUserInternal);

  public firebaseUser = this.firebaseUserInternal.asReadonly();
  public currentUser = this.appUserInternal.asReadonly();
  public backendToken = this.backendTokenInternal.asReadonly();

  public isAuthenticated = computed(() => !!this.firebaseUserInternal() && !!this.appUserInternal());
  public isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);
  public isPlayer = computed(() => this.currentUser()?.role === UserRole.PLAYER);


  constructor() {
    // Read initial token from localStorage only if in browser
    if (isPlatformBrowser(this.platformId)) {
      this.backendTokenInternal.set(localStorage.getItem(BACKEND_JWT_KEY));
    }
    
    // Proceed with onAuthStateChanged, which might update the token later
    onAuthStateChanged(this.auth, async (fbUser) => {
      this.firebaseUserInternal.set(fbUser);
      if (fbUser) {
        console.log('AuthService: Firebase user state changed - Logged In', fbUser.uid);
        await this.processFirebaseUser(fbUser);
      } else {
        console.log('AuthService: Firebase user state changed - Logged Out');
        this.clearAuthData();
      }
    }, (error) => {
      console.error('AuthService: onAuthStateChanged error:', error);
      this.clearAuthData();
    });

    effect(() => {
      console.log('AuthService: App User changed:', this.currentUser());
      // console.log('AuthService: Backend Token changed:', this.backendToken() ? '******' : null); // Keep token logging minimal
    });
  }

  private async processFirebaseUser(firebaseUser: FirebaseUser): Promise<void> {
    try {
      const idTokenResult = await getIdTokenResult(firebaseUser, true); // Force refresh for claims
      const claims = idTokenResult.claims;
      const role = claims['role'] as UserRole | undefined;
      const gameId = claims['game_id'] as string | undefined;
      const isAi = claims['is_ai'] as boolean | undefined;
      const playerNumber = claims['player_number'] as number | undefined; // Assuming backend adds this to custom claims for players

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

  private async fetchAndStoreBackendToken(firebaseIdToken: string): Promise<void> {
    if (!firebaseIdToken) {
      console.warn('AuthService: No Firebase ID token available to fetch backend token.');
      this.clearBackendToken();
      return;
    }
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login/id-token`, { id_token: firebaseIdToken })
      );
      if (response && response.access_token) {
        // Store token in localStorage only if in browser
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(BACKEND_JWT_KEY, response.access_token);
        }
        this.backendTokenInternal.set(response.access_token);
        console.log('AuthService: Backend token fetched and stored.');
        if (response.user_info) {
            // Update appUser with potentially more details from backend, but prioritize existing claims for core auth attributes
            this.appUserInternal.update(current => {
              if (!current) return response.user_info as User;
              return {
                ...current, // Keep existing Firebase UID, email, role from claims
                ...response.user_info as User, // Add/override other fields from backend
                uid: current.uid, // Ensure UID is not overwritten
                email: current.email, // Ensure email is not overwritten
                role: current.role, // Ensure role from claims is not overwritten
                gameId: current.gameId, // Ensure gameId from claims is not overwritten
                playerNumber: current.playerNumber, // Ensure playerNumber from claims is not overwritten
              };
            });
        }
      } else {
        console.warn('AuthService: Backend token not found in response.');
        this.clearBackendToken();
      }
    } catch (error) {
      console.error("AuthService: Error fetching backend token:", error);
      this.clearBackendToken();
    }
  }
  
  private clearAuthData(): void {
    this.appUserInternal.set(null);
    this.clearBackendToken();
  }

  private clearBackendToken(): void {
    // Clear token from localStorage only if in browser
    if (isPlatformBrowser(this.platformId)) {
        localStorage.removeItem(BACKEND_JWT_KEY);
    }
    this.backendTokenInternal.set(null);
  }

  private async logoutOnError(): Promise<void> {
    console.warn("AuthService: Logging out due to an error during auth processing.");
    // Check if auth is available before calling signOut to prevent errors during initial load race conditions
    if (this.auth) {
        try {
            await signOut(this.auth);
        } catch (err) {
            console.error("Error during forced sign out:", err);
        }
    }
    // onAuthStateChanged will handle clearing local state
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
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(async (userCredential) => {
        // processFirebaseUser will be triggered by onAuthStateChanged
        // Wait for appUserInternal to be populated
        const appUser = await firstValueFrom(this.currentUser$.pipe(
          // Filter for the correct user based on UID and ensure it's not undefined/null initially
          filter((user): user is User | null => user !== undefined && user?.uid === userCredential.user.uid),
          take(1)
        ));
        return appUser; // Return the found User or null
      }),
      catchError(error => {
        console.error('Admin login failed:', error);
        this.clearAuthData(); // Ensure state is cleared on failure
        return throwError(() => error); // Propagate the error
      })
    );
  }
  
  // Updated Player Login: Uses backend to get a Firebase Custom Token
  playerLoginWithCredentials(gameId: string, playerNumber: number, password: string): Observable<User | null> {
    return this.http.post<{ customToken: string }>(
      `${environment.apiUrl}/auth/login/player-credentials`, // Ensure this endpoint exists on backend
      { game_id: gameId, player_number: playerNumber, password: password }
    ).pipe(
      switchMap(response => {
        if (!response || !response.customToken) {
          return throwError(() => new Error('Failed to retrieve custom token from backend.'));
        }
        return from(signInWithCustomToken(this.auth, response.customToken));
      }),
      switchMap(async (userCredential) => {
        // processFirebaseUser will be triggered by onAuthStateChanged
        // Wait for appUserInternal to be populated
         const appUser = await firstValueFrom(this.currentUser$.pipe(
          // Filter for the correct user based on UID and ensure it's not undefined/null initially
          filter((user): user is User | null => user !== undefined && user?.uid === userCredential.user.uid),
          take(1)
        ));
        return appUser; // Return the found User or null
      }),
      catchError(error => {
        console.error('Player login with custom token failed:', error);
        this.clearAuthData();
        return throwError(() => error);
      })
    );
  }

  adminRegister(payload: any): Observable<any> {
    // Backend API for admin registration
    return this.http.post(`${environment.apiUrl}/auth/register/admin`, payload).pipe(
      tap(() => console.log('Admin registration request sent to backend.'))
    );
  }

  requestPasswordReset(email: string): Observable<void> {
    // Backend API for password reset request
    return this.http.post<void>(`${environment.apiUrl}/auth/request-password-reset`, { email }).pipe(
      tap(() => console.log(`Password reset request sent for ${email}.`))
    );
  }

  async logout(): Promise<void> {
    try {
      if (this.auth) { // Check if auth is initialized
        await signOut(this.auth);
      }
      // onAuthStateChanged will automatically clear local state (appUser, backendToken)
      console.log('AuthService: Firebase signOut called.');
      // Navigate only if in browser
      if (isPlatformBrowser(this.platformId)) {
          this.router.navigate(['/frontpage/login']);
      }
    } catch (error) {
      console.error('AuthService: Logout failed:', error);
      this.clearAuthData(); // Force clear local state on error too
      // Navigate only if in browser
      if (isPlatformBrowser(this.platformId)) {
          this.router.navigate(['/frontpage/login']);
      }
    }
  }

  public getStoredBackendTokenSnapshot(): string | null {
    // Return token only if in browser and token exists
    if (isPlatformBrowser(this.platformId)) {
        return this.backendTokenInternal();
    }
    return null;
  }
}

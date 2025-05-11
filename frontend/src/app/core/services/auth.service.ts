import { Injectable, inject, signal, WritableSignal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signInWithCustomToken, signOut, onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, getIdTokenResult } from '@angular/fire/auth';
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

  private firebaseUserInternal: WritableSignal<FirebaseUser | null | undefined> = signal(undefined);
  private appUserInternal: WritableSignal<User | null | undefined> = signal(undefined);
  private backendTokenInternal: WritableSignal<string | null> = signal(localStorage.getItem(BACKEND_JWT_KEY));

  public readonly firebaseUser$ = from(this.firebaseUserInternal.asReadonly()); // Expose as observable if needed
  public readonly currentUser$ = from(this.appUserInternal.asReadonly());      // Expose as observable

  // Computed signals for easier access
  public firebaseUser = this.firebaseUserInternal.asReadonly();
  public currentUser = this.appUserInternal.asReadonly();
  public backendToken = this.backendTokenInternal.asReadonly();

  public isAuthenticated = computed(() => !!this.firebaseUserInternal() && !!this.appUserInternal());
  public isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);
  public isPlayer = computed(() => this.currentUser()?.role === UserRole.PLAYER);


  constructor() {
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

    // Effect to log current user changes for debugging
    effect(() => {
      console.log('AuthService: App User changed:', this.currentUser());
      console.log('AuthService: Backend Token changed:', this.backendToken() ? '******' : null);
    });
  }

  private async processFirebaseUser(firebaseUser: FirebaseUser): Promise<void> {
    try {
      const idTokenResult = await getIdTokenResult(firebaseUser, true); // Force refresh for claims
      const claims = idTokenResult.claims;
      const role = claims['role'] as UserRole | undefined;
      const gameId = claims['game_id'] as string | undefined;
      const isAi = claims['is_ai'] as boolean | undefined;

      const appUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        role: role || null,
        gameId: gameId,
        isAi: isAi,
      };
      this.appUserInternal.set(appUser);
      console.log('AuthService: App user processed from Firebase claims:', appUser);

      // Attempt to get/refresh backend token
      await this.fetchAndStoreBackendToken(idTokenResult.token);

    } catch (error) {
      console.error("AuthService: Error processing Firebase user or fetching backend token:", error);
      await this.logoutOnError(); // Clear auth state if processing fails
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
        localStorage.setItem(BACKEND_JWT_KEY, response.access_token);
        this.backendTokenInternal.set(response.access_token);
        console.log('AuthService: Backend token fetched and stored.');
        // Optionally, merge backend user_info with appUser if more detailed
        if (response.user_info) {
          this.appUserInternal.update(current => current ? { ...current, ...response.user_info as User, role: current.role || (response.user_info as User).role, gameId: current.gameId || (response.user_info as User).gameId } : response.user_info as User);
        }
      } else {
        this.clearBackendToken();
      }
    } catch (error) {
      console.error("AuthService: Error fetching backend token:", error);
      this.clearBackendToken();
      // Potentially log out the Firebase user if backend token is critical
      // await this.logoutOnError();
    }
  }
  
  private clearAuthData(): void {
    this.appUserInternal.set(null);
    this.clearBackendToken();
  }

  private clearBackendToken(): void {
    localStorage.removeItem(BACKEND_JWT_KEY);
    this.backendTokenInternal.set(null);
  }

  private async logoutOnError(): Promise<void> {
    console.warn("AuthService: Logging out due to an error during auth processing.");
    await signOut(this.auth).catch(err => console.error("Error during forced sign out:", err));
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
        // onAuthStateChanged will trigger processFirebaseUser, which handles token and appUser
        // We wait for appUser to be set by the observer.
        return firstValueFrom(this.currentUser$.pipe(filter(user => !!user), take(1)));
      }),
      catchError(error => {
        console.error('Admin login failed:', error);
        this.clearAuthData();
        return throwError(() => error);
      })
    );
  }
  
  // Placeholder for Player Login using custom token from backend
  // The backend needs an endpoint like /auth/login/player-credentials
  // that takes { gameId, playerNumber, password }, validates, and returns a Firebase Custom Token.
  async playerLoginWithCredentials(gameId: string, playerNumber: number, password: string): Promise<User | null> {
    try {
      // STEP 1: Call your backend to get a Firebase Custom Token
      const customTokenResponse = await firstValueFrom(
        this.http.post<{ customToken: string }>(`${environment.apiUrl}/auth/login/player-custom-token`, { gameId, playerNumber, password })
      );

      if (!customTokenResponse || !customTokenResponse.customToken) {
        throw new Error('Failed to retrieve custom token from backend.');
      }
      
      // STEP 2: Sign in to Firebase with the Custom Token
      const userCredential = await signInWithCustomToken(this.auth, customTokenResponse.customToken);
      
      // onAuthStateChanged will handle processing this user and fetching backend token
      // Wait for appUser to be set by the observer.
      return firstValueFrom(this.currentUser$.pipe(filter(user => !!user && user.uid === userCredential.user.uid), take(1)));

    } catch (error) {
      console.error('Player login with credentials failed:', error);
      this.clearAuthData();
      return null; // Or throw specific error
    }
  }

  adminRegister(payload: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/register/admin`, payload).pipe(
      tap(() => console.log('Admin registration request sent to backend.'))
      // Backend handles Firebase user creation & email verification trigger.
      // Admin will typically log in after confirming email.
    );
  }

  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/request-password-reset`, { email }).pipe(
      tap(() => console.log(`Password reset request sent for ${email}.`))
    );
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      // onAuthStateChanged will handle clearing local state (appUser, backendToken)
      console.log('AuthService: Firebase signOut successful.');
      this.router.navigate(['/frontpage/login']);
    } catch (error) {
      console.error('AuthService: Logout failed:', error);
      // Still clear local state and navigate
      this.clearAuthData();
      this.router.navigate(['/frontpage/login']);
    }
  }

  // Helper for guards/interceptors to get the current backend token reliably
  // This is synchronous for interceptor convenience.
  public getStoredBackendTokenSnapshot(): string | null {
    return this.backendTokenInternal();
  }
}
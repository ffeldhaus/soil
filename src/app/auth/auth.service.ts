import { inject, Injectable, NgZone } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private functions = inject(Functions);
  private auth = inject(Auth); // Injected instance is native due to app.config
  private ngZone = inject(NgZone);
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  constructor() {
    const isBrowser = typeof localStorage !== 'undefined';
    // Subscribe to real auth state using native SDK
    onAuthStateChanged(this.auth, (u) => {
      this.ngZone.run(() => {
        if (!isBrowser || !localStorage.getItem('soil_test_mode')) {
          this.userSubject.next(u);
        }
      });
    });

    // Check for test mode immediate override
    if (isBrowser && localStorage.getItem('soil_test_mode') === 'true') {
      console.log('AuthService: Running in Test Mode');
      this.userSubject.next(this.getMockUser());
    }
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(this.auth, provider);
  }

  async registerWithEmail(email: string, pass: string) {
    return await createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async loginWithEmail(email: string, pass: string) {
    return await signInWithEmailAndPassword(this.auth, email, pass);
  }

  async registerPlayer(email: string, pass: string) {
    return await createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async loginAsPlayer(gameId: string, pin: string) {
    // Call backend to get custom token for player login
    // Note: Function name is 'playerLogin' in backend
    const playerLoginFn = httpsCallable(this.functions, 'playerLogin');

    try {
      const result = await playerLoginFn({ gameId, password: pin });
      const { customToken } = result.data as { customToken: string };
      return await signInWithCustomToken(this.auth, customToken);
    } catch (error) {
      console.error('Player login failed:', error);
      throw error;
    }
  }

  async logout() {
    if (localStorage.getItem('soil_test_mode')) {
      localStorage.removeItem('soil_test_mode');
      this.userSubject.next(null);
      return Promise.resolve();
    }

    return await signOut(this.auth);
  }

  async updateDisplayName(name: string) {
    if (this.auth.currentUser) {
      await updateProfile(this.auth.currentUser, { displayName: name });
      await this.auth.currentUser.reload();
      // Force emission of new user state if needed
      // onAuthStateChanged should pick up changes or reload might trigger it
      const currentUser = this.auth.currentUser;
      this.ngZone.run(() => this.userSubject.next(currentUser));
    }
  }

  private getMockUser(): User {
    return {
      uid: 'player-test-game-id-1',
      displayName: 'Test User',
      email: 'test@example.com',
      isAnonymous: false,
      emailVerified: true,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {
        /* mock */
      },
      getIdToken: async () => 'mock-token',
      getIdTokenResult: async () => ({
        token: 'mock-token',
        authTime: '',
        issuedAtTime: '',
        expirationTime: '',
        signInProvider: 'google.com',
        signInSecondFactor: null,
        claims: {},
      }),
      reload: async () => {
        /* mock */
      },
      toJSON: () => ({}),
    } as unknown as User;
  }
}

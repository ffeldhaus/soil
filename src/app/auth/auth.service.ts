import { Injectable, inject, NgZone } from '@angular/core';
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
  type User,
  updateProfile,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { BehaviorSubject } from 'rxjs';

import { LanguageService } from '../services/language.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private functions = inject(Functions);
  private auth = inject(Auth); // Injected instance is native due to app.config
  private ngZone = inject(NgZone);
  private languageService = inject(LanguageService);
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  constructor() {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    // Subscribe to real auth state using native SDK
    onAuthStateChanged(this.auth, (u) => {
      this.ngZone.run(() => {
        if (!isBrowser || !window.localStorage.getItem('soil_test_mode')) {
          this.userSubject.next(u);
        }
      });
    });

    // Check for test mode immediate override
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
      this.userSubject.next(this.getMockUser());
    } else if (isBrowser && window.localStorage.getItem('soil_guest_uid')) {
      const guestUid = window.localStorage.getItem('soil_guest_uid')!;
      this.userSubject.next(this.createGuestUser(guestUid));
    }
  }

  private createGuestUser(uid: string): User {
    return {
      uid,
      displayName: 'Guest',
      isAnonymous: true,
      email: null,
      emailVerified: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => 'guest-token',
      getIdTokenResult: async () => ({
        token: 'guest-token',
        authTime: '',
        issuedAtTime: '',
        expirationTime: '',
        signInProvider: 'anonymous',
        signInSecondFactor: null,
        claims: { role: 'guest' },
      }),
      reload: async () => {},
      toJSON: () => ({}),
    } as unknown as User;
  }

  async loginWithGoogle() {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(this.auth, provider);
  }

  async registerWithEmail(email: string, pass: string) {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
    return await createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async sendVerificationEmail() {
    if (this.auth.currentUser) {
      const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
      if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
        if (window.console) console.warn('Mock: Verification email sent');
        return;
      }
      const sendFn = httpsCallable(this.functions, 'sendVerificationEmail');
      await sendFn({
        lang: this.languageService.currentLang,
        origin: window.location.origin,
      });
    }
  }

  async sendPasswordResetEmail(email: string) {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
      if (window.console) console.warn('Mock: Password reset email sent to', email);
      return;
    }
    const sendFn = httpsCallable(this.functions, 'sendPasswordResetEmail');
    await sendFn({
      email,
      lang: this.languageService.currentLang,
      origin: window.location.origin,
    });
  }

  async loginWithEmail(email: string, pass: string) {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
    return await signInWithEmailAndPassword(this.auth, email, pass);
  }

  async registerPlayer(email: string, pass: string) {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
    return await createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async loginAsPlayer(gameId: string, pin: string) {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
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

  async signInAsGuest() {
    const guestUid = `guest-${Math.random().toString(36).substring(2, 15)}`;
    const guestUser = this.createGuestUser(guestUid);

    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser) {
      window.localStorage.setItem('soil_guest_uid', guestUid);
    }

    this.ngZone.run(() => this.userSubject.next(guestUser));
    return { user: guestUser };
  }

  async logout() {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser) {
      if (window.localStorage.getItem('soil_test_mode')) {
        window.localStorage.removeItem('soil_test_mode');
        window.localStorage.removeItem('soil_test_role');
        this.userSubject.next(null);
        return Promise.resolve();
      }
      if (window.localStorage.getItem('soil_guest_uid')) {
        window.localStorage.removeItem('soil_guest_uid');
        this.userSubject.next(null);
        return Promise.resolve();
      }
    }

    return await signOut(this.auth);
  }

  async updateDisplayName(name: string) {
    if (this.auth.currentUser) {
      const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
      if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
        const user = this.getMockUser();
        this.userSubject.next({ ...user, displayName: name } as any);
        return;
      }
      await updateProfile(this.auth.currentUser, { displayName: name });
      await this.auth.currentUser.reload();
      // Force emission of new user state if needed
      // onAuthStateChanged should pick up changes or reload might trigger it
      const currentUser = this.auth.currentUser;
      this.ngZone.run(() => this.userSubject.next(currentUser));
    }
  }

  private getMockUser(): User {
    const fullRole = (typeof window !== 'undefined' && window.localStorage.getItem('soil_test_role')) || 'player';
    const role = fullRole.startsWith('player') ? 'player' : fullRole;
    const uid = role === 'player' ? 'player-test-game-id-1' : `mock-${role}-uid`;
    return {
      uid,
      displayName: `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      email: `mock-${role}@example.com`,
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
        claims: {
          role: role,
          gameId: role === 'player' ? 'test-game-id' : undefined,
          playerNumber: role === 'player' ? 1 : undefined,
        },
      }),
      reload: async () => {
        /* mock */
      },
      toJSON: () => ({}),
    } as unknown as User;
  }
}

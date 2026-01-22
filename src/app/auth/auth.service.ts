import { Injectable, inject, NgZone } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
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
  private functions = inject(Functions, { optional: true });
  private auth = inject(Auth, { optional: true }); // Injected instance is native due to app.config
  private ngZone = inject(NgZone);
  private languageService = inject(LanguageService);
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  get isAnonymous(): boolean {
    return !!this.userSubject.value?.isAnonymous;
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  constructor() {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    // Subscribe to real auth state using native SDK
    if (this.auth) {
      onAuthStateChanged(this.auth, (u) => {
        this.ngZone.run(() => {
          const guestUid = isBrowser ? window.localStorage.getItem('soil_guest_uid') : null;
          const activeLocalGame = isBrowser ? window.localStorage.getItem('soil_active_local_game') : null;

          if (guestUid || activeLocalGame) {
            // Respect the local session, do not overwrite with null/stale Firebase state
            return;
          }

          if (!isBrowser || !window.localStorage.getItem('soil_test_mode')) {
            this.userSubject.next(u);
          }
        });
      });
    }

    // Check for test mode immediate override
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
      this.userSubject.next(this.getMockUser());
    } else if (isBrowser && window.localStorage.getItem('soil_active_local_game')) {
      const gameId = window.localStorage.getItem('soil_active_local_game')!;
      // We don't call this.loginAsPlayer here because it would trigger nested logic,
      // instead we just initialize the user state if needed.
      // For now, let the guest logic below handle it if guest_uid is present.
      if (window.localStorage.getItem('soil_guest_uid')) {
        const guestUid = window.localStorage.getItem('soil_guest_uid')!;
        const guestUser = this.createGuestUser(guestUid);
        const localUser = {
          ...guestUser,
          getIdTokenResult: async () => ({
            claims: {
              role: 'player',
              gameId: gameId,
              playerNumber: 1,
            },
          }),
        };
        this.userSubject.next(localUser as any);
      }
    } else if (isBrowser && window.localStorage.getItem('soil_guest_uid')) {
      const guestUid = window.localStorage.getItem('soil_guest_uid')!;
      this.userSubject.next(this.createGuestUser(guestUid));
    }
  }

  async loginAsPlayer(gameId: string, pin: string) {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

    if (gameId.startsWith('local-')) {
      if (isBrowser) {
        window.localStorage.setItem('soil_active_local_game', gameId);
        window.localStorage.setItem('soil_active_local_pin', pin);
      }

      const currentUser =
        this.userSubject.value ||
        (isBrowser ? this.createGuestUser(window.localStorage.getItem('soil_guest_uid') || 'temp') : null);
      if (currentUser) {
        // Wrap user to include local claims
        const localUser = {
          ...currentUser,
          getIdTokenResult: async () => ({
            claims: {
              role: 'player',
              gameId: gameId,
              playerNumber: 1,
            },
          }),
        };
        this.userSubject.next(localUser as any);
        return { user: localUser };
      }
      return { user: currentUser };
    }

    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
    // Call backend to get custom token for player login
    // Note: Function name is 'playerLogin' in backend
    const playerLoginFn = httpsCallable(this.functions!, 'playerLogin');

    try {
      const result = await playerLoginFn({ gameId, password: pin });
      const { customToken } = result.data as { customToken: string };
      return await signInWithCustomToken(this.auth!, customToken);
    } catch (error) {
      console.error('Player login failed:', error);
      throw error;
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
    return await signInWithPopup(this.auth!, provider);
  }

  async loginWithApple() {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
    const provider = new OAuthProvider('apple.com');
    return await signInWithPopup(this.auth!, provider);
  }

  async registerWithEmail(email: string, pass: string) {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
    return await createUserWithEmailAndPassword(this.auth!, email, pass);
  }

  async sendVerificationEmail() {
    if (this.auth?.currentUser) {
      const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
      if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
        if (window.console) console.warn('Mock: Verification email sent');
        return;
      }
      const sendFn = httpsCallable(this.functions!, 'sendVerificationEmail');
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
    const sendFn = httpsCallable(this.functions!, 'sendPasswordResetEmail');
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
    return await signInWithEmailAndPassword(this.auth!, email, pass);
  }

  async registerPlayer(email: string, pass: string) {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
    return await createUserWithEmailAndPassword(this.auth!, email, pass);
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
      window.localStorage.removeItem('soil_test_mode');
      window.localStorage.removeItem('soil_test_role');
      window.localStorage.removeItem('soil_active_local_game');
      window.localStorage.removeItem('soil_active_local_pin');

      if (window.localStorage.getItem('soil_guest_uid')) {
        window.localStorage.removeItem('soil_guest_uid');
        this.userSubject.next(null);
        return Promise.resolve();
      }

      this.userSubject.next(null);
    }

    if (this.auth) {
      return await signOut(this.auth);
    }
    return Promise.resolve();
  }

  async updateDisplayName(name: string) {
    if (this.auth?.currentUser) {
      const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
      if (isBrowser && window.localStorage.getItem('soil_test_mode') === 'true') {
        const user = this.getMockUser();
        this.userSubject.next({ ...user, displayName: name } as any);
        return;
      }
      await updateProfile(this.auth!.currentUser!, { displayName: name });
      await this.auth!.currentUser!.reload();
      // Force emission of new user state if needed
      // onAuthStateChanged should pick up changes or reload might trigger it
      const currentUser = this.auth!.currentUser!;
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

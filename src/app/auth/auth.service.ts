import { Injectable, inject, isDevMode, NgZone } from '@angular/core';
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
import { FIREBASE_AUTH, FIREBASE_FUNCTIONS } from '../firebase.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private functions = inject(FIREBASE_FUNCTIONS, { optional: true });
  private auth = inject(FIREBASE_AUTH, { optional: true });
  private ngZone = inject(NgZone);
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  // Lazy getters for Firebase Functions to avoid SSR issues with mock objects
  private get playerLoginFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ gameId: string; password: string }, { customToken: string }>(this.functions, 'playerLogin');
  }

  private get sendVerificationEmailFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ origin: string }, void>(this.functions, 'sendVerificationEmail');
  }

  private get sendPasswordResetEmailFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<{ email: string; origin: string }, void>(this.functions, 'sendPasswordResetEmail');
  }

  private get deleteAccountFn() {
    if (!this.functions || typeof window === 'undefined') return null;
    return httpsCallable<void, { success: boolean }>(this.functions, 'deleteAccount');
  }

  get isAnonymous(): boolean {
    return !!this.userSubject.value?.isAnonymous;
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  private isTestMode(): boolean {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return false;
    const isAllowedEnv =
      isDevMode() ||
      window.location?.hostname === 'localhost' ||
      window.location?.hostname === '127.0.0.1' ||
      !!(window as any).Cypress;
    return isAllowedEnv && window.localStorage.getItem('soil_test_mode') === 'true';
  }

  constructor() {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    // Subscribe to real auth state using native SDK
    if (this.auth) {
      onAuthStateChanged(this.auth, (u) => {
        this.ngZone.run(() => {
          if (u) {
            // If we have a real user, clear guest/local state to avoid conflicts
            if (isBrowser) {
              window.localStorage.removeItem('soil_guest_uid');
              window.localStorage.removeItem('soil_active_local_game');
              window.localStorage.removeItem('soil_active_local_pin');
            }
            if (!this.isTestMode()) {
              this.userSubject.next(u);
            }
          } else {
            const guestUid = isBrowser ? window.localStorage.getItem('soil_guest_uid') : null;
            const activeLocalGame = isBrowser ? window.localStorage.getItem('soil_active_local_game') : null;

            if (guestUid || activeLocalGame) {
              // Respect the local session if no Firebase user
              return;
            }

            if (!this.isTestMode()) {
              this.userSubject.next(null);
            }
          }
        });
      });
    }

    // Check for test mode immediate override
    if (this.isTestMode()) {
      this.userSubject.next(this.getMockUser());
    } else if (isBrowser && window.localStorage.getItem('soil_active_local_game')) {
      const gameId = window.localStorage.getItem('soil_active_local_game')!;
      if (window.localStorage.getItem('soil_guest_uid')) {
        const guestUid = window.localStorage.getItem('soil_guest_uid')!;
        const guestName = window.localStorage.getItem('soil_guest_name') || 'Guest';
        const guestUser = this.createGuestUser(guestUid, guestName);
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
      const guestName = window.localStorage.getItem('soil_guest_name') || 'Guest';
      this.userSubject.next(this.createGuestUser(guestUid, guestName));
    }
  }

  async loginAsPlayer(gameId: string, pin: string) {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

    if (isBrowser) {
      window.localStorage.setItem('soil_last_game_id', gameId);
      window.localStorage.setItem('soil_last_game_pin', pin);
    }

    if (gameId.startsWith('local-')) {
      if (isBrowser) {
        window.localStorage.setItem('soil_active_local_game', gameId);
        window.localStorage.setItem('soil_active_local_pin', pin);
      }

      const guestName = (isBrowser && window.localStorage.getItem('soil_guest_name')) || 'Guest';
      const currentUser =
        this.userSubject.value ||
        (isBrowser ? this.createGuestUser(window.localStorage.getItem('soil_guest_uid') || 'temp', guestName) : null);
      if (currentUser) {
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

    if (this.isTestMode()) {
      const pinMatch = pin?.match(/^p(\d+)/i);
      const playerNum = pinMatch ? Number(pinMatch[1]) : 1;
      if (isBrowser) {
        window.localStorage.setItem('soil_test_role', 'player');
        window.localStorage.setItem('soil_test_game_id', gameId);
        window.localStorage.setItem('soil_test_player_number', String(playerNum));
      }
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }

    try {
      const fn = this.playerLoginFn;
      if (!fn) {
        if (typeof window === 'undefined') return { user: null } as any;
        throw new Error('Functions not available');
      }
      const result = await fn({ gameId, password: pin });
      const { customToken } = result.data;
      return await signInWithCustomToken(this.auth!, customToken);
    } catch (error) {
      if (typeof window === 'undefined') return { user: null } as any;
      console.error('Player login failed:', error);
      throw error;
    }
  }

  private createGuestUser(uid: string, displayName = 'Guest'): User {
    return {
      uid,
      displayName,
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
    if (this.isTestMode()) {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(this.auth!, provider);
  }

  async loginWithApple() {
    if (this.isTestMode()) {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
    const provider = new OAuthProvider('apple.com');
    return await signInWithPopup(this.auth!, provider);
  }

  async registerWithEmail(email: string, pass: string) {
    if (this.isTestMode()) {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
    return await createUserWithEmailAndPassword(this.auth!, email, pass);
  }

  async sendVerificationEmail() {
    if (this.auth?.currentUser) {
      if (this.isTestMode()) {
        if (window.console) console.warn('Mock: Verification email sent');
        return;
      }
      const fn = this.sendVerificationEmailFn;
      if (!fn) {
        if (typeof window === 'undefined') return;
        throw new Error('Functions not available');
      }
      await fn({
        origin: window.location.origin,
      });
    }
  }

  async sendPasswordResetEmail(email: string) {
    if (this.isTestMode()) {
      if (window.console) console.warn('Mock: Password reset email sent to', email);
      return;
    }
    const fn = this.sendPasswordResetEmailFn;
    if (!fn) {
      if (typeof window === 'undefined') return;
      throw new Error('Functions not available');
    }
    await fn({
      email,
      origin: window.location.origin,
    });
  }

  async loginWithEmail(email: string, pass: string) {
    if (this.isTestMode()) {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
    return await signInWithEmailAndPassword(this.auth!, email, pass);
  }

  async registerPlayer(email: string, pass: string) {
    if (this.isTestMode()) {
      const user = this.getMockUser();
      this.userSubject.next(user);
      return { user };
    }
    return await createUserWithEmailAndPassword(this.auth!, email, pass);
  }

  async signInAsGuest() {
    const guestUid = `guest-${Math.random().toString(36).substring(2, 15)}`;
    const guestName = 'Guest';
    const guestUser = this.createGuestUser(guestUid, guestName);

    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser) {
      window.localStorage.setItem('soil_guest_uid', guestUid);
      window.localStorage.setItem('soil_guest_name', guestName);
    }

    this.ngZone.run(() => this.userSubject.next(guestUser));
    return { user: guestUser };
  }

  async logout() {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (isBrowser) {
      window.localStorage.removeItem('soil_test_mode');
      window.localStorage.removeItem('soil_test_role');
      window.localStorage.removeItem('soil_test_game_id');
      window.localStorage.removeItem('soil_test_player_number');
      window.localStorage.removeItem('soil_active_local_game');
      window.localStorage.removeItem('soil_active_local_pin');

      if (window.localStorage.getItem('soil_guest_uid')) {
        window.localStorage.removeItem('soil_guest_uid');
        window.localStorage.removeItem('soil_guest_name');
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

  async deleteAccount() {
    const fn = this.deleteAccountFn;
    if (!fn) throw new Error('Functions not available');
    const result = await fn();
    if (result.data.success) {
      await this.logout();
    }
    return result.data;
  }

  async updateDisplayName(name: string) {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

    // Handle Guest update
    if (isBrowser && window.localStorage.getItem('soil_guest_uid')) {
      const currentUser = this.userSubject.value;
      if (currentUser) {
        window.localStorage.setItem('soil_guest_name', name);
        const updatedUser = { ...currentUser, displayName: name };
        this.ngZone.run(() => this.userSubject.next(updatedUser as any));
      }
      return;
    }

    if (this.auth?.currentUser) {
      if (this.isTestMode()) {
        const user = this.getMockUser();
        this.userSubject.next({ ...user, displayName: name } as any);
        return;
      }
      await updateProfile(this.auth!.currentUser!, { displayName: name });
      await this.auth!.currentUser!.reload();
      const currentUser = this.auth!.currentUser!;
      this.ngZone.run(() => this.userSubject.next(currentUser));
    }
  }

  private getMockUser(): User {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    const fullRole = (isBrowser && window.localStorage.getItem('soil_test_role')) || 'player';
    const role = fullRole.startsWith('player') ? 'player' : fullRole;
    const gameId = (isBrowser && window.localStorage.getItem('soil_test_game_id')) || 'test-game-id';
    const playerNumber = Number((isBrowser && window.localStorage.getItem('soil_test_player_number')) || 1);
    const uid = role === 'player' ? `player-${gameId}-${playerNumber}` : `mock-${role}-uid`;
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
          gameId: role === 'player' ? gameId : undefined,
          playerNumber: role === 'player' ? playerNumber : undefined,
        },
      }),
      reload: async () => {
        /* mock */
      },
      toJSON: () => ({}),
    } as unknown as User;
  }
}

import { Observable } from 'rxjs';
import { User as AppUser } from '../models/user.model'; // Renamed User to AppUser to avoid clash, removed UserRole
import { User as FirebaseUser } from '@angular/fire/auth'; // Correct type is User
import { Signal } from '@angular/core';

export interface IAuthService {
  // Signals as readonly properties (or methods returning Signals)
  firebaseUser: Signal<FirebaseUser | null | undefined>;
  currentUser: Signal<AppUser | null | undefined>; // Use AppUser
  backendToken: Signal<string | null>;
  isAuthenticated: Signal<boolean>;
  isAdmin: Signal<boolean>;
  isPlayer: Signal<boolean>;
  isImpersonating: Signal<boolean>; // Added for impersonation

  // Observables (if preferred over signals for some consumers)
  readonly firebaseUser$: Observable<FirebaseUser | null | undefined>;
  readonly currentUser$: Observable<AppUser | null | undefined>; // Use AppUser

  // Methods
  getCurrentFirebaseIdToken(forceRefresh?: boolean): Promise<string | null>;
  adminLogin(email: string, password: string): Observable<AppUser | null>; // Use AppUser
  playerLoginWithCredentials(gameId: string, playerNumber: number, password: string): Observable<AppUser | null>; // Use AppUser
  adminRegister(payload: unknown): Observable<unknown>; // Define payload type more strictly if possible
  requestPasswordReset(email: string): Observable<void>;
  logout(): Promise<void>;
  getStoredBackendTokenSnapshot(): string | null;

  // Impersonation methods
  impersonatePlayer(gameId: string, playerId: string): Promise<void>; // Added
  stopImpersonation(): Promise<void>; // Added
}

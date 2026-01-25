import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';

// Mock the firebase/auth module
vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    onAuthStateChanged: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    signInWithCustomToken: vi.fn(() => Promise.resolve()),
    signInWithEmailAndPassword: vi.fn(() => Promise.resolve()),
    createUserWithEmailAndPassword: vi.fn(() => Promise.resolve()),
    signInWithPopup: vi.fn(() => Promise.resolve()),
    updateProfile: vi.fn(() => Promise.resolve()),
  };
});

// Mock the firebase/functions module
vi.mock('firebase/functions', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
  };
});

import { signInWithCustomToken, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

describe('AuthService', () => {
  let service: AuthService;
  let authSpy: any;
  let functionsSpy: any;
  let mockLocalStorage: any;

  beforeEach(() => {
    mockLocalStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => mockLocalStorage[key] || null),
      setItem: vi.fn((key, value) => (mockLocalStorage[key] = value)),
      removeItem: vi.fn((key) => delete mockLocalStorage[key]),
      clear: vi.fn(() => (mockLocalStorage = {})),
    });

    authSpy = {
      currentUser: null,
    };

    functionsSpy = {
      httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: authSpy },
        { provide: Functions, useValue: functionsSpy },
        { provide: NgZone, useValue: { run: (fn: () => void) => fn() } },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should return the current user', () => {
    // In actual app, userSubject is updated via onAuthStateChanged
    // We can trigger it by mocking the behavior if needed, but since it's a private field,
    // we mostly rely on it being initialized to null.
    expect(service.currentUser).toBeNull();
  });

  it('should handle logout when in test mode', async () => {
    mockLocalStorage.soil_test_mode = 'true';

    await service.logout();

    expect(localStorage.removeItem).toHaveBeenCalledWith('soil_test_mode');
    expect(signOut).toHaveBeenCalled();
  });

  it('should sign in as guest', async () => {
    const result = await service.signInAsGuest();
    expect(result.user.isAnonymous).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('soil_guest_uid', expect.any(String));
  });

  it('should login with Google', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    await service.loginWithGoogle();
    expect(signInWithPopup).toHaveBeenCalled();
  });

  it('should register with email', async () => {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    await service.registerWithEmail('test@example.com', 'pass123');
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(authSpy, 'test@example.com', 'pass123');
  });

  it('should update display name', async () => {
    const { updateProfile } = await import('firebase/auth');
    const mockUser = { reload: vi.fn().mockResolvedValue(undefined) };
    authSpy.currentUser = mockUser;

    await service.updateDisplayName('New Name');

    expect(updateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'New Name' });
    expect(mockUser.reload).toHaveBeenCalled();
  });

  it('should handle local session in constructor', () => {
    mockLocalStorage.soil_guest_uid = 'guest-123';

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: authSpy },
        { provide: Functions, useValue: functionsSpy },
        { provide: NgZone, useValue: { run: (fn: () => void) => fn() } },
      ],
    });
    const freshService = TestBed.inject(AuthService);
    expect(freshService.isAnonymous).toBe(true);
  });

  it('should handle active local game in constructor', () => {
    mockLocalStorage.soil_active_local_game = 'local-123';
    mockLocalStorage.soil_guest_uid = 'guest-123';

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: authSpy },
        { provide: Functions, useValue: functionsSpy },
        { provide: NgZone, useValue: { run: (fn: () => void) => fn() } },
      ],
    });
    const freshService = TestBed.inject(AuthService);
    expect(freshService.isAnonymous).toBe(true);
  });

  it('should call auth signOut when not in test mode', async () => {
    await service.logout();
    expect(signOut).toHaveBeenCalled();
  });

  it('should call playerLogin and signInWithCustomToken', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: { customToken: 'mock-token' } }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

    await service.loginAsPlayer('game123', '1234');

    expect(httpsCallable).toHaveBeenCalledWith(functionsSpy, 'playerLogin');
    expect(mockCallable).toHaveBeenCalledWith({ gameId: 'game123', password: '1234' });
    expect(signInWithCustomToken).toHaveBeenCalledWith(authSpy, 'mock-token');
  });

  it('should call signInWithEmailAndPassword', async () => {
    // Mock firebase/auth methods
    const { signInWithEmailAndPassword: signInEmailMock } = await import('firebase/auth');

    await service.loginWithEmail('test@example.com', 'password');

    expect(signInEmailMock).toHaveBeenCalledWith(authSpy, 'test@example.com', 'password');
  });

  it('should call sendVerificationEmail callable', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: {} }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);
    authSpy.currentUser = { email: 'test@example.com' };
    await service.sendVerificationEmail();

    expect(httpsCallable).toHaveBeenCalledWith(functionsSpy, 'sendVerificationEmail');
    expect(mockCallable).toHaveBeenCalledWith({ origin: expect.stringContaining('http://localhost') });
  });

  it('should call sendPasswordResetEmail callable', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: {} }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);
    await service.sendPasswordResetEmail('test@example.com');

    expect(httpsCallable).toHaveBeenCalledWith(functionsSpy, 'sendPasswordResetEmail');
    expect(mockCallable).toHaveBeenCalledWith({
      email: 'test@example.com',
      origin: expect.stringContaining('http://localhost'),
    });
  });
});

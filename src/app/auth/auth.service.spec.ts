import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LanguageService } from '../services/language.service';
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

    const languageServiceMock = { currentLang: 'de' };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: authSpy },
        { provide: Functions, useValue: functionsSpy },
        { provide: NgZone, useValue: { run: (fn: () => void) => fn() } },
        { provide: LanguageService, useValue: languageServiceMock },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should handle logout when in test mode', async () => {
    mockLocalStorage.soil_test_mode = 'true';

    await service.logout();

    expect(localStorage.removeItem).toHaveBeenCalledWith('soil_test_mode');
    expect(signOut).not.toHaveBeenCalled();
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
    expect(mockCallable).toHaveBeenCalledWith({ lang: 'de', origin: expect.stringContaining('http://localhost') });
  });

  it('should call sendPasswordResetEmail callable', async () => {
    const mockCallable = vi.fn(() => Promise.resolve({ data: {} }));
    vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);
    await service.sendPasswordResetEmail('test@example.com');

    expect(httpsCallable).toHaveBeenCalledWith(functionsSpy, 'sendPasswordResetEmail');
    expect(mockCallable).toHaveBeenCalledWith({
      email: 'test@example.com',
      lang: 'de',
      origin: expect.stringContaining('http://localhost'),
    });
  });
});

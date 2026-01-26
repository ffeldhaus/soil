import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import { signInWithCustomToken, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

const mockCallables: Record<string, any> = {};

// Mock @angular/fire/functions
vi.mock('@angular/fire/functions', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    httpsCallable: vi.fn((_functions: any, name: string) => {
      if (!mockCallables[name]) {
        mockCallables[name] = vi.fn(() => Promise.resolve({ data: {} }));
      }
      return mockCallables[name];
    }),
  };
});

// Mock firebase/auth
vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    onAuthStateChanged: vi.fn((_auth, cb) => {
      cb(null);
      return () => {};
    }),
    signInWithCustomToken: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    signInWithPopup: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    updateProfile: vi.fn(),
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let authSpy: any;
  let mockLocalStorage: any;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Clear mock callables between tests
    const callableNames = ['playerLogin', 'sendVerificationEmail', 'sendPasswordResetEmail'];
    for (const name of callableNames) {
      if (!mockCallables[name]) {
        mockCallables[name] = vi.fn(() => Promise.resolve({ data: {} }));
      }
      mockCallables[name].mockReset();
      mockCallables[name].mockResolvedValue({ data: {} });
    }

    mockLocalStorage = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => mockLocalStorage[key] || null,
        setItem: (key: string, val: string) => {
          mockLocalStorage[key] = val;
        },
        removeItem: (key: string) => {
          delete mockLocalStorage[key];
        },
        clear: () => {
          mockLocalStorage = {};
        },
      },
      writable: true,
      configurable: true,
    });

    authSpy = { currentUser: null };

    TestBed.configureTestingModule({
      providers: [AuthService, { provide: Auth, useValue: authSpy }, { provide: Functions, useValue: {} }],
    });
    service = TestBed.inject(AuthService);
  });

  it('should return the current user', () => {
    const mockUser = { uid: '123' };
    (service as any).userSubject.next(mockUser);
    expect(service.currentUser).toEqual(mockUser);
  });

  it('should handle logout when in test mode', async () => {
    mockLocalStorage.soil_test_mode = 'true';
    await service.logout();
    expect(service.currentUser).toBeNull();
    expect(mockLocalStorage.soil_test_mode).toBeUndefined();
  });

  it('should sign in as guest', async () => {
    const result = await service.signInAsGuest();
    expect(result.user.isAnonymous).toBe(true);
    expect(service.currentUser?.isAnonymous).toBe(true);
  });

  it('should login with Google', async () => {
    mockLocalStorage.soil_test_mode = 'true';
    const result = await service.loginWithGoogle();
    expect(result.user.displayName).toBeDefined();
  });

  it('should register with email', async () => {
    mockLocalStorage.soil_test_mode = 'true';
    const result = await service.registerWithEmail('test@example.com', 'pass');
    expect(result.user.email).toBe('mock-player@example.com');
  });

  it('should update display name', async () => {
    mockLocalStorage.soil_test_mode = 'true';
    const mockUser = { uid: '123', displayName: 'Old Name', reload: vi.fn() };
    authSpy.currentUser = mockUser;

    // updateProfile should update the mock user
    vi.mocked(updateProfile).mockImplementation(async (user: any, profile: any) => {
      user.displayName = profile.displayName;
    });

    await service.updateDisplayName('New Name');
    expect(service.currentUser?.displayName).toBe('New Name');
  });

  it('should handle local session in constructor', () => {
    mockLocalStorage.soil_guest_uid = 'guest123';
    // Re-inject to trigger constructor with local storage
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: Auth, useValue: authSpy }, { provide: Functions, useValue: {} }],
    });
    const newService = TestBed.inject(AuthService);
    expect(newService.currentUser?.uid).toBe('guest123');
  });

  it('should handle active local game in constructor', () => {
    mockLocalStorage.soil_guest_uid = 'guest123';
    mockLocalStorage.soil_active_local_game = 'local-123';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: Auth, useValue: authSpy }, { provide: Functions, useValue: {} }],
    });
    const newService = TestBed.inject(AuthService);
    expect(newService.currentUser?.uid).toBe('guest123');
  });

  it('should call auth signOut when not in test mode', async () => {
    await service.logout();
    expect(signOut).toHaveBeenCalled();
  });

  it('should call playerLogin and signInWithCustomToken', async () => {
    const playerLoginMock = mockCallables.playerLogin;
    playerLoginMock.mockResolvedValue({ data: { customToken: 'mock-token' } });

    await service.loginAsPlayer('cloud-game', '1234');

    expect(playerLoginMock).toHaveBeenCalledWith({ gameId: 'cloud-game', password: '1234' });
    expect(signInWithCustomToken).toHaveBeenCalled();
  });

  it('should call signInWithEmailAndPassword', async () => {
    await service.loginWithEmail('test@example.com', 'password');
    expect(signInWithEmailAndPassword).toHaveBeenCalled();
  });

  it('should call sendVerificationEmail callable', async () => {
    authSpy.currentUser = { uid: '123' };
    const sendVerificationEmailMock = mockCallables.sendVerificationEmail;

    await service.sendVerificationEmail();
    expect(sendVerificationEmailMock).toHaveBeenCalled();
  });

  it('should call sendPasswordResetEmail callable', async () => {
    const sendPasswordResetEmailMock = mockCallables.sendPasswordResetEmail;

    await service.sendPasswordResetEmail('test@example.com');
    expect(sendPasswordResetEmailMock).toHaveBeenCalled();
  });
});

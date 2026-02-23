import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FIREBASE_AUTH, FIREBASE_FUNCTIONS } from '../firebase.config';
import { AuthService } from './auth.service';

describe('AuthService Email Auth', () => {
  let service: AuthService;
  let authSpy: any;
  let functionsSpy: any;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    authSpy = {
      currentUser: { email: 'test@example.com', reload: vi.fn() },
      onAuthStateChanged: vi.fn(),
    };
    functionsSpy = {};

    // Set test mode in localStorage
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('soil_test_mode', 'true');
      window.localStorage.setItem('soil_test_role', 'admin');
    }

    TestBed.configureTestingModule({
      providers: [AuthService, { provide: FIREBASE_AUTH, useValue: authSpy }, { provide: FIREBASE_FUNCTIONS, useValue: functionsSpy }],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('soil_test_mode');
      window.localStorage.removeItem('soil_test_role');
    }
  });

  it('should register with email and password in test mode', async () => {
    const result = await service.registerWithEmail('test@example.com', 'password123');
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('mock-admin@example.com');
  });

  it('should login with email and password in test mode', async () => {
    const result = await service.loginWithEmail('test@example.com', 'password123');
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('mock-admin@example.com');
  });

  it('should mock send verification email in test mode', async () => {
    // Should not throw and might log a warning
    await service.sendVerificationEmail();
  });
});

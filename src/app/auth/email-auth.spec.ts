import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService Email Auth', () => {
  let service: AuthService;
  let authSpy: any;
  let functionsSpy: any;
  let languageServiceSpy: any;

  beforeEach(() => {
    authSpy = {
      currentUser: { email: 'test@example.com', reload: vi.fn() },
      onAuthStateChanged: vi.fn(),
    };
    functionsSpy = {};
    languageServiceSpy = { currentLang: 'en' };

    // Set test mode in localStorage
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('soil_test_mode', 'true');
      window.localStorage.setItem('soil_test_role', 'admin');
    }

    TestBed.configureTestingModule({
      providers: [AuthService, { provide: Auth, useValue: authSpy }, { provide: Functions, useValue: functionsSpy }],
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

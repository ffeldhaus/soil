import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import { LanguageService } from '../services/language.service';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';

describe('AuthService Multi-Provider', () => {
  let service: AuthService;
  let authSpy: any;
  let functionsSpy: any;
  let languageServiceSpy: any;

  beforeEach(() => {
    authSpy = {
      currentUser: null,
      onAuthStateChanged: vi.fn(),
    };
    functionsSpy = {};
    languageServiceSpy = { currentLang: 'en' };

    // Set test mode in localStorage
    if (typeof window !== 'undefined') {
        window.localStorage.setItem('soil_test_mode', 'true');
        window.localStorage.setItem('soil_test_role', 'player');
    }

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: authSpy },
        { provide: Functions, useValue: functionsSpy },
        { provide: LanguageService, useValue: languageServiceSpy }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem('soil_test_mode');
        window.localStorage.removeItem('soil_test_role');
    }
  });

  it('should sign in with Google in test mode', async () => {
    const result = await service.loginWithGoogle();
    expect(result.user).toBeDefined();
    expect(result.user.displayName).toContain('Mock');
  });

  it('should sign in with Apple in test mode', async () => {
    const result = await service.loginWithApple();
    expect(result.user).toBeDefined();
    expect(result.user.displayName).toContain('Mock');
  });
});

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
  };
});

import { onAuthStateChanged, signOut } from 'firebase/auth';

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

  it('should handle logout when in test mode', async () => {
    mockLocalStorage['soil_test_mode'] = 'true';

    await service.logout();

    expect(localStorage.removeItem).toHaveBeenCalledWith('soil_test_mode');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('should call auth signOut when not in test mode', async () => {
    await service.logout();
    expect(signOut).toHaveBeenCalled();
  });

  it('should clear impersonation flags on logout', async () => {
    mockLocalStorage['soil_admin_impersonating'] = 'true';
    await service.logout();
    expect(localStorage.removeItem).toHaveBeenCalledWith('soil_admin_impersonating');
  });
});

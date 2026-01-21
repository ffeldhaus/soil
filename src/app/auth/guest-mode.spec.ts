import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import { filter, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { LanguageService } from '../services/language.service';
import { AuthService } from './auth.service';

describe('AuthService Guest Mode', () => {
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

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Auth, useValue: authSpy },
        { provide: Functions, useValue: functionsSpy },
        { provide: LanguageService, useValue: languageServiceSpy },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should sign in as guest and return a guest user', async () => {
    const result = await service.signInAsGuest();
    expect(result.user).toBeDefined();
    expect(result.user.isAnonymous).toBe(true);
    expect(result.user.uid).toContain('guest-');
  });

  it('should emit guest user on user$ when signed in as guest', async () => {
    const guestUserPromise = firstValueFrom(service.user$.pipe(filter((user) => !!user && user.isAnonymous)));

    await service.signInAsGuest();
    const user = await guestUserPromise;

    expect(user?.uid).toContain('guest-');
    expect(user?.isAnonymous).toBe(true);
  });
});

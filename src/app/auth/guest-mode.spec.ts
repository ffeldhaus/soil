import { TestBed } from '@angular/core/testing';
import { filter, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { FIREBASE_AUTH, FIREBASE_FUNCTIONS } from '../firebase.config';
import { AuthService } from './auth.service';

describe('AuthService Guest Mode', () => {
  let service: AuthService;
  let authSpy: any;
  let functionsSpy: any;

  beforeEach(() => {
    authSpy = {
      currentUser: null,
      onAuthStateChanged: vi.fn(),
    };
    functionsSpy = {};

    TestBed.configureTestingModule({
      providers: [AuthService, { provide: FIREBASE_AUTH, useValue: authSpy }, { provide: FIREBASE_FUNCTIONS, useValue: functionsSpy }],
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

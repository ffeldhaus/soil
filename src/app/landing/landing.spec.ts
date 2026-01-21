import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { LanguageService } from '../services/language.service';
import { Landing } from './landing';

describe('Landing', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;
  let languageServiceMock: any;
  let authMock: any;
  let functionsMock: any;
  let authServiceMock: any;

  beforeEach(async () => {
    languageServiceMock = { currentLang: 'de' };
    authMock = { onAuthStateChanged: vi.fn() };
    functionsMock = {};
    authServiceMock = {
      signInAsGuest: vi.fn().mockResolvedValue({ user: { uid: 'guest-123' } }),
      user$: { subscribe: vi.fn() },
    };

    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([]),
        { provide: LanguageService, useValue: languageServiceMock },
        { provide: Auth, useValue: authMock },
        { provide: Functions, useValue: functionsMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

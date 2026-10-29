import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { FIREBASE_AUTH, FIREBASE_FUNCTIONS } from '../firebase.config';
import { GameService } from '../game/game.service';
import { Landing } from './landing';

describe('Landing', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;
  let authMock: any;
  let functionsMock: any;
  let authServiceMock: any;
  let gameServiceMock: any;

  beforeEach(async () => {
    authServiceMock = {
      signInAsGuest: vi.fn().mockResolvedValue(undefined),
      loginAsPlayer: vi.fn().mockResolvedValue({ user: { uid: 'player-local-1' } }),
    };
    gameServiceMock = {
      createGame: vi.fn().mockResolvedValue({ gameId: 'local-123', password: 'PIN' }),
    };

    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([]),
        provideClientHydration(withIncrementalHydration()),
        { provide: FIREBASE_AUTH, useValue: authMock },
        { provide: FIREBASE_FUNCTIONS, useValue: functionsMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: GameService, useValue: gameServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start a quick local game and navigate to /game', async () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await component.startQuickGame();

    expect(gameServiceMock.createGame).toHaveBeenCalledWith(
      expect.stringContaining('Hof '),
      expect.objectContaining({
        numPlayers: 4,
        numRounds: 10,
        numAi: 3,
        difficulty: 'normal',
      }),
    );
    expect(authServiceMock.loginAsPlayer).toHaveBeenCalledWith('local-123', 'PIN');
    expect(navSpy).toHaveBeenCalledWith(['/game']);
  });
});

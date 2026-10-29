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

  it('should pass challenge seed, difficulty, rounds, and target score when starting a challenge game', async () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const challengeFixture = TestBed.createComponent(Landing);
    const challengeComp = challengeFixture.componentInstance;
    challengeComp.challengeSeed = 'SEED99';
    challengeComp.challengeDifficulty = 'hard';
    challengeComp.challengeRounds = 12;
    challengeComp.challengeTargetScore = 1320;
    challengeComp.challengeTargetName = 'Gut Grün';
    challengeFixture.detectChanges();

    const bannerEl = challengeFixture.nativeElement.querySelector('[data-testid="challenge-banner"]');
    expect(bannerEl).toBeTruthy();
    expect(bannerEl.textContent).toContain('Seed #SEED99');
    expect(bannerEl.textContent).toContain('Gut Grün');

    await challengeComp.startQuickGame();

    expect(gameServiceMock.createGame).toHaveBeenCalledWith(
      expect.stringContaining('Hof '),
      expect.objectContaining({
        numRounds: 12,
        difficulty: 'hard',
        seed: 'SEED99',
        challengeTargetScore: 1320,
        challengeTargetName: 'Gut Grün',
      }),
    );
    expect(navSpy).toHaveBeenCalledWith(['/game']);
  });
});

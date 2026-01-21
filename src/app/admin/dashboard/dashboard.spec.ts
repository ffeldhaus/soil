import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../auth/auth.service';
import { GameService } from '../../game/game.service';
import { Dashboard } from './dashboard';

describe('Dashboard Component', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let authServiceMock: any;
  let gameServiceMock: any;

  beforeEach(async () => {
    authServiceMock = {
      user$: of({ uid: 'admin', displayName: 'Admin' }),
      logout: vi.fn().mockResolvedValue(undefined),
      loginWithGoogle: vi.fn(),
      loginAsPlayer: vi.fn().mockResolvedValue({ user: { uid: 'player-uid' } }),
      signInAsGuest: vi.fn().mockResolvedValue({ user: { uid: 'guest-uid', isAnonymous: true } }),
    };
    gameServiceMock = {
      getAdminGames: vi.fn().mockResolvedValue({ games: [], total: 0 }),
      getUserStatus: vi.fn().mockResolvedValue({ role: 'admin', status: 'active' }),
      createGame: vi.fn().mockResolvedValue({ gameId: 'new-game', password: 'pass' }),
      deleteGames: vi.fn().mockResolvedValue(undefined),
      undeleteGames: vi.fn().mockResolvedValue(undefined),
      updatePlayerType: vi.fn().mockResolvedValue(undefined),
      updateRoundDeadline: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: GameService, useValue: gameServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            params: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load games on init if user is admin', async () => {
    // Mock test mode to skip Firestore onSnapshot complexity in unit test
    localStorage.setItem('soil_test_mode', 'true');
    await component.ngOnInit();
    expect(gameServiceMock.getAdminGames).toHaveBeenCalled();
    localStorage.removeItem('soil_test_mode');
  });

  it('should call createGame', async () => {
    component.newGameConfig = {
      name: 'Test Game',
      numPlayers: 5,
      numRounds: 10,
      numAi: 1,
      playerLabel: 'Team',
      aiLevel: 'middle',
    };
    await component.createNewGame();
    expect(gameServiceMock.createGame).toHaveBeenCalledWith('Test Game', {
      numPlayers: 5,
      numRounds: 10,
      numAi: 1,
      playerLabel: 'Team',
    });
  });

  it('should toggle trash view', async () => {
    component.showTrash = false;
    await component.toggleTrashView();
    expect(component.showTrash).toBe(true);
    expect(gameServiceMock.getAdminGames).toHaveBeenCalledWith(1, 10, true);
  });

  it('should delete a game', async () => {
    const mockGame = { id: 'g1' };
    component.gameToDelete = mockGame;
    component.showTrash = false;
    await component.confirmDelete();
    expect(gameServiceMock.deleteGames).toHaveBeenCalledWith(['g1'], false);
  });
});

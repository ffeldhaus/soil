import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
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
  let routerMock: any;

  beforeEach(async () => {
    authServiceMock = {
      user$: of({ uid: 'admin', displayName: 'Admin', isAnonymous: false }),
      isAnonymous: false,
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
      submitFeedback: vi.fn().mockResolvedValue({ success: true }),
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
    routerMock = TestBed.inject(Router);
    vi.spyOn(routerMock, 'navigate');
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
      advancedPricingEnabled: false,
      analyticsEnabled: true,
    };
    await component.createNewGame();
    expect(gameServiceMock.createGame).toHaveBeenCalledWith('Test Game', {
      numPlayers: 5,
      numRounds: 10,
      numAi: 1,
      aiLevel: 'middle',
      playerLabel: 'Team',
      advancedPricingEnabled: false,
      analyticsEnabled: true,
    });
  });

  it('should toggle trash view', async () => {
    component.showTrash = false;
    await component.toggleTrashView();
    expect(component.showTrash).toBe(true);
    expect(gameServiceMock.getAdminGames).toHaveBeenCalledWith(1, 10, true);
  });

  it('should delete a game', async () => {
    gameServiceMock.getAdminGames.mockResolvedValue({
      games: [
        { id: '1', name: 'Game 1', config: { advancedPricingEnabled: false, numPlayers: 1, numAi: 0, numRounds: 20 } },
      ],
      total: 1,
    });
    await component.loadGames();
    fixture.detectChanges();

    component.deleteGame({ id: '1', name: 'Game 1' } as any);
    expect(component.gameToDelete).toBeDefined();

    await component.confirmDelete('DELETE');
    expect(gameServiceMock.deleteGames).toHaveBeenCalledWith(['1'], false);
  });

  it('should handle pagination', async () => {
    gameServiceMock.getAdminGames.mockResolvedValue({
      games: [{ id: '1', config: { advancedPricingEnabled: false } }],
      total: 25,
    });
    await component.loadGames();

    expect(component.totalPages).toBe(3);

    component.nextPage();
    expect(component.currentPage).toBe(2);
    expect(gameServiceMock.getAdminGames).toHaveBeenCalledWith(2, 10, false);

    component.prevPage();
    expect(component.currentPage).toBe(1);
  });

  it('should toggle trash view', async () => {
    component.toggleTrashView();
    expect(component.showTrash).toBe(true);
    expect(gameServiceMock.getAdminGames).toHaveBeenCalledWith(1, 10, true);
  });

  it('should handle game expansion', () => {
    component.toggleExpand('game1');
    expect(component.expandedGameId).toBe('game1');
    component.toggleExpand('game1');
    expect(component.expandedGameId).toBeNull();
  });

  it('should handle player conversion', async () => {
    await component.convertPlayer({ id: 'g1' } as any, { number: 1, isAi: false });
    expect(gameServiceMock.updatePlayerType).toHaveBeenCalledWith('g1', 1, 'ai', 'elementary');
  });

  it('should handle game selection', () => {
    component.toggleSelection('g1');
    expect(component.selectedGameIds.has('g1')).toBe(true);
    component.toggleSelection('g1');
    expect(component.selectedGameIds.has('g1')).toBe(false);
  });

  it('should handle select all', () => {
    component.games = [{ id: '1' }, { id: '2' }] as any;
    component.toggleSelectAll({ target: { checked: true } } as any);
    expect(component.selectedGameIds.size).toBe(2);
    component.toggleSelectAll({ target: { checked: false } } as any);
    expect(component.selectedGameIds.size).toBe(0);
  });

  it('should close error modal', () => {
    component.errorMessage = 'Some Error';
    component.closeError();
    expect(component.errorMessage).toBeNull();
  });

  it('should handle join game', async () => {
    await component.onJoinGame({ gameId: 'g1', pin: '123' });
    expect(authServiceMock.loginAsPlayer).toHaveBeenCalledWith('g1', '123');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/game']);
  });

  it('should handle logout', async () => {
    await component.logout();
    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should handle google login', () => {
    component.login();
    expect(authServiceMock.loginWithGoogle).toHaveBeenCalled();
  });

  it('should handle feedback submission', async () => {
    const feedback = { category: 'other' as any, rating: 5, comment: 'Test' };
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    await component.onFeedbackSubmit(feedback);

    expect(gameServiceMock.submitFeedback).toHaveBeenCalledWith(feedback);
    expect(component.showFeedbackModal).toBe(false);
    expect(alertSpy).toHaveBeenCalled();
  });

  it('should print all QR codes', async () => {
    // Mock window.print
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    vi.useFakeTimers();

    await component.printAllQrCodes({ id: 'g1', config: { numPlayers: 5 } } as any);

    vi.advanceTimersByTime(500);
    expect(printSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

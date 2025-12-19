import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';
import { AuthService } from '../../auth/auth.service';
import { GameService } from '../../game/game.service';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let authServiceMock: any;
  let gameServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    authServiceMock = {
      user$: of({ uid: 'test-uid', displayName: 'Test User' }),
      loginWithGoogle: jasmine.createSpy('loginWithGoogle'),
      logout: jasmine.createSpy('logout'),
      impersonate: jasmine.createSpy('impersonate').and.returnValue(Promise.resolve())
    };

    gameServiceMock = {
      getUserStatus: jasmine.createSpy('getUserStatus').and.returnValue(Promise.resolve({ role: 'admin', status: 'active', quota: 5 })),
      getAdminGames: jasmine.createSpy('getAdminGames').and.returnValue(Promise.resolve({ games: [], total: 0 })),
      deleteGames: jasmine.createSpy('deleteGames').and.returnValue(Promise.resolve()),
      createGame: jasmine.createSpy('createGame').and.returnValue(Promise.resolve({ gameId: 'g1' })),
      undeleteGames: jasmine.createSpy('undeleteGames').and.returnValue(Promise.resolve())
    };

    routerMock = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard, FormsModule, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: GameService, useValue: gameServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should check user status on init', async () => {
    await component.ngOnInit();
    expect(gameServiceMock.getUserStatus).toHaveBeenCalled();
  });

  it('should redirect if new user', async () => {
    gameServiceMock.getUserStatus.and.returnValue(Promise.resolve({ role: 'new' }));
    component.ngOnInit(); // Re-trigger
    // Wait for async
    await fixture.whenStable();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/register']);
  });

  it('should show pending view if pending', async () => {
    gameServiceMock.getUserStatus.and.returnValue(Promise.resolve({ role: 'pending' }));
    await component.ngOnInit();
    expect(component.isPendingApproval).toBeTrue();
  });

  describe('Delete Logic', () => {
    it('should set gameToDelete', () => {
      const game = { id: 'g1', name: 'G1' };
      component.deleteGame(game);
      expect(component.gameToDelete).toBe(game);
    });

    it('should require DELETE input if showTrash is true', async () => {
      component.showTrash = true;
      component.gameToDelete = { id: 'g1' };
      component.deleteConfirmInput = 'NO';

      await component.confirmDelete();
      expect(gameServiceMock.deleteGames).not.toHaveBeenCalled();
    });

    it('should delete if input is valid', async () => {
      component.showTrash = true;
      component.gameToDelete = { id: 'g1' };
      component.deleteConfirmInput = 'DELETE';

      await component.confirmDelete();
      expect(gameServiceMock.deleteGames).toHaveBeenCalledWith(['g1'], true);
    });
  });
});

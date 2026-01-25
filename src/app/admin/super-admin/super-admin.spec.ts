import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../auth/auth.service';
import { GameService } from '../../game/game.service';
import { SuperAdminComponent } from './super-admin';

describe('SuperAdminComponent', () => {
  let component: SuperAdminComponent;
  let fixture: ComponentFixture<SuperAdminComponent>;
  let authServiceMock: { user$: any; logout: any };
  let gameServiceMock: {
    getAllAdmins: any;
    getSystemStats: any;
    getAllFeedback: any;
    manageAdmin?: any;
    deleteGames?: any;
    getAdminGames?: any;
    manageFeedback?: any;
  };

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    authServiceMock = {
      user$: of({ uid: 'admin', displayName: 'Admin' }),
      logout: vi.fn().mockResolvedValue(undefined),
    };
    gameServiceMock = {
      getAllAdmins: vi.fn().mockResolvedValue([]),
      getSystemStats: vi.fn().mockResolvedValue({ games: { total: 0, deleted: 0 }, users: { total: 0, admins: 0 } }),
      getAllFeedback: vi.fn().mockResolvedValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [SuperAdminComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: GameService, useValue: gameServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load data on init', async () => {
    await component.ngOnInit();
    expect(gameServiceMock.getAllAdmins).toHaveBeenCalled();
    expect(gameServiceMock.getSystemStats).toHaveBeenCalled();
  });

  it('should call deleteGames when confirming delete', async () => {
    const mockGame = { id: 'game123', status: 'active' };
    gameServiceMock.deleteGames = vi.fn().mockResolvedValue({});
    component.selectedAdmin = { uid: 'admin123' };
    gameServiceMock.getAdminGames = vi.fn().mockResolvedValue({ games: [], total: 0 });

    await component.deleteGame(mockGame);
    await component.confirmDelete();

    expect(gameServiceMock.deleteGames).toHaveBeenCalledWith(['game123'], false);
  });

  it('should handle feedback management', async () => {
    gameServiceMock.manageFeedback = vi.fn().mockResolvedValue({});
    const mockFeedback = { id: 'fb1' };
    component.initiateFeedbackAction(mockFeedback as any, 'resolve');
    await component.confirmFeedbackAction();
    expect(gameServiceMock.manageFeedback).toHaveBeenCalledWith('fb1', 'resolve', { externalReference: '' });
  });

  it('should handle quota update', async () => {
    gameServiceMock.manageAdmin = vi.fn().mockResolvedValue({});
    const mockUser = { uid: 'a1', email: 'a@ex.com', quota: 10 };

    component.setQuota(mockUser as any);
    component.newQuotaValue = 50;

    await component.saveQuota();

    expect(gameServiceMock.manageAdmin).toHaveBeenCalledWith('a1', 'setQuota', 50);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../auth/auth.service';
import { GameService } from '../../game/game.service';
import { LanguageService } from '../../services/language.service';
import { provideTranslocoTest } from '../../transloco-testing.module';
import { SuperAdminComponent } from './super-admin';

describe('SuperAdminComponent', () => {
  let component: SuperAdminComponent;
  let fixture: ComponentFixture<SuperAdminComponent>;
  let authServiceMock: any;
  let gameServiceMock: any;

  beforeEach(async () => {
    authServiceMock = {
      user$: of({ uid: 'admin', displayName: 'Admin' }),
      logout: vi.fn().mockResolvedValue(undefined),
    };
    gameServiceMock = {
      getPendingUsers: vi.fn().mockResolvedValue([]),
      getAllAdmins: vi.fn().mockResolvedValue([]),
      getSystemStats: vi
        .fn()
        .mockResolvedValue({ games: { total: 0, deleted: 0 }, users: { total: 0, admins: 0, pending: 0 } }),
    };
    const languageServiceMock = { currentLang: 'de' };

    await TestBed.configureTestingModule({
      imports: [SuperAdminComponent],
      providers: [
        provideTranslocoTest(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: GameService, useValue: gameServiceMock },
        { provide: LanguageService, useValue: languageServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

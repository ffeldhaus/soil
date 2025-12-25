import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminRegisterComponent } from './admin-register';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth.service';
import { GameService } from '../../game/game.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('AdminRegisterComponent', () => {
  let component: AdminRegisterComponent;
  let fixture: ComponentFixture<AdminRegisterComponent>;
  let authServiceMock: any;
  let gameServiceMock: any;

  beforeEach(async () => {
    authServiceMock = {
      user$: of(null),
      registerAdmin: vi.fn().mockResolvedValue(undefined)
    };
    gameServiceMock = {
      submitOnboarding: vi.fn().mockResolvedValue({ success: true })
    };

    await TestBed.configureTestingModule({
      imports: [AdminRegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: GameService, useValue: gameServiceMock }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AdminRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

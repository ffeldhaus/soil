import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { GameService } from '../../game/game.service';
import { AuthService } from '../auth.service';
import { AdminRegisterComponent } from './admin-register';

describe('AdminRegisterComponent', () => {
  let component: AdminRegisterComponent;
  let fixture: ComponentFixture<AdminRegisterComponent>;
  let authServiceMock: any;
  let gameServiceMock: any;
  let languageServiceMock: any;

  beforeEach(async () => {
    authServiceMock = {
      user$: of(null),
      registerWithEmail: vi.fn().mockResolvedValue(undefined),
      sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    };
    gameServiceMock = {
      submitOnboarding: vi.fn().mockResolvedValue({ success: true }),
    };
    languageServiceMock = {
      currentLang: 'de',
    };

    await TestBed.configureTestingModule({
      imports: [AdminRegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: GameService, useValue: gameServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call register, send verification and submit onboarding on submit', async () => {
    component.registerForm.setValue({
      email: 'test@test.com',
      password: 'password123',
      firstName: 'Max',
      lastName: 'Mustermann',
    });

    await component.onSubmit();

    expect(authServiceMock.registerWithEmail).toHaveBeenCalledWith('test@test.com', 'password123');
    expect(authServiceMock.sendVerificationEmail).toHaveBeenCalled();
    expect(gameServiceMock.submitOnboarding).toHaveBeenCalled();
    expect(component.successMessage).toBeTruthy();
  });

  it('should show error modal on registration failure', async () => {
    authServiceMock.registerWithEmail.mockRejectedValue(new Error('Registration Failed'));
    component.registerForm.setValue({
      email: 'test@test.com',
      password: 'password123',
      firstName: 'Max',
      lastName: 'Mustermann',
    });

    await component.onSubmit();
    fixture.detectChanges();

    expect(component.showErrorModal).toBe(true);
    expect(component.errorMessage).toContain('Registration Failed');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { provideTranslocoTest } from '../../transloco-testing.module';
import { AuthService } from '../auth.service';
import { AdminLoginComponent } from './admin-login';

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;
  let authServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    authServiceMock = {
      loginWithEmail: vi.fn().mockResolvedValue(undefined),
      loginWithGoogle: vi.fn().mockResolvedValue(undefined),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent, ReactiveFormsModule],
      providers: [provideTranslocoTest(), provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    routerMock = TestBed.inject(Router);
    vi.spyOn(routerMock, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate on successful login', async () => {
    component.loginForm.setValue({ email: 'test@test.com', password: 'password' });
    await component.onSubmit();
    expect(authServiceMock.loginWithEmail).toHaveBeenCalledWith('test@test.com', 'password');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('should show error modal on failure', async () => {
    authServiceMock.loginWithEmail.mockRejectedValue(new Error('Auth Failed'));
    component.loginForm.setValue({ email: 'test@test.com', password: 'password' });

    await component.onSubmit();
    fixture.detectChanges();

    expect(component.showErrorModal).toBe(true);
    expect(component.errorMessage).toContain('Login failed');
  });
});

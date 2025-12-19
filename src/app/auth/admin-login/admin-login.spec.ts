import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminLoginComponent } from './admin-login';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;
  let authServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    authServiceMock = {
      loginWithEmail: jasmine.createSpy('loginWithEmail').and.returnValue(Promise.resolve()),
      loginWithGoogle: jasmine.createSpy('loginWithGoogle').and.returnValue(Promise.resolve())
    };

    routerMock = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
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
    authServiceMock.loginWithEmail.and.returnValue(Promise.reject(new Error('Auth Failed')));
    component.loginForm.setValue({ email: 'test@test.com', password: 'password' });

    await component.onSubmit();
    fixture.detectChanges();

    expect(component.showErrorModal).toBeTrue();
    expect(component.errorMessage).toContain('Login failed');
  });
});

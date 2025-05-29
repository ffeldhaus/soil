import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { AdminRegisterComponent } from './admin-register.component';
import { AUTH_SERVICE_TOKEN, IAuthService } from '../../../core/services/auth/auth.service.interface';
import { NotificationService } from '../../../core/services/notification.service';
import { AdminRegisterPayload } from '../../../core/models/user.model';

describe('AdminRegisterComponent Integration Tests', () => {
  let component: AdminRegisterComponent;
  let fixture: ComponentFixture<AdminRegisterComponent>;
  let mockAuthService: jasmine.SpyObj<IAuthService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let router: Router;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('IAuthService', ['adminRegister']);
    mockNotificationService = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);

    await TestBed.configureTestingModule({
      declarations: [AdminRegisterComponent],
      imports: [
        RouterTestingModule.withRoutes([]),
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: AUTH_SERVICE_TOKEN, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges(); // Initial binding
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('1. Render', () => {
    it('should render all form fields and the register button', () => {
      expect(fixture.debugElement.query(By.css('input[formControlName="firstName"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('input[formControlName="lastName"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('input[formControlName="institution"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('input[formControlName="email"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('input[formControlName="password"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('input[formControlName="confirmPassword"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('button[type="submit"]'))).toBeTruthy();
    });
  });

  describe('2. Form Validation', () => {
    it('Required Fields: should not call adminRegister and show error on empty form submission', () => {
      const registerButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
      registerButton.click();
      fixture.detectChanges();

      expect(mockAuthService.adminRegister).not.toHaveBeenCalled();
      expect(mockNotificationService.showError).toHaveBeenCalledWith('Please fill in all required fields.'); // Or specific message from component
    });

    it('Email Format: should show error for invalid email', () => {
      component.registerForm.patchValue({ email: 'invalid-email' });
      fixture.detectChanges();
      // Check for mat-error element or specific class if applicable
      // For simplicity, we check form validity and assume UI reflects it
      expect(component.registerForm.get('email')?.hasError('email')).toBeTrue();
    });

    it('Password MinLength: should show error for short password', () => {
      component.registerForm.patchValue({ password: '123' });
      fixture.detectChanges();
      expect(component.registerForm.get('password')?.hasError('minlength')).toBeTrue();
    });

    it('Password Mismatch: should show error if passwords do not match', () => {
      component.registerForm.patchValue({ password: 'password123', confirmPassword: 'password456' });
      fixture.detectChanges();
      // The custom validator 'passwordMatchValidator' adds error to 'confirmPassword' or the form group
      expect(component.registerForm.hasError('passwordMismatch') || component.registerForm.get('confirmPassword')?.hasError('passwordMismatch')).toBeTrue();
      
      const registerButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
      registerButton.click();
      fixture.detectChanges();
      expect(mockAuthService.adminRegister).not.toHaveBeenCalled();
    });
    
    it('Password Match: should clear mismatch error if passwords match', () => {
        component.registerForm.patchValue({ password: 'password123', confirmPassword: 'password456' });
        fixture.detectChanges();
        expect(component.registerForm.hasError('passwordMismatch') || component.registerForm.get('confirmPassword')?.hasError('passwordMismatch')).toBeTrue();
        
        component.registerForm.patchValue({ confirmPassword: 'password123' });
        fixture.detectChanges();
        expect(component.registerForm.hasError('passwordMismatch') || component.registerForm.get('confirmPassword')?.hasError('passwordMismatch')).toBeFalse();
      });
  });

  describe('3. Successful Registration', () => {
    it('should register admin, show success, and navigate to login with email', fakeAsync(() => {
      spyOn(router, 'navigate').and.stub();
      mockAuthService.adminRegister.and.returnValue(of(undefined)); // of(void) basically

      const testData: AdminRegisterPayload = {
        firstName: 'Test',
        lastName: 'Admin',
        institution: 'Test Uni',
        email: 'test@example.com',
        password: 'Password123!'
      };

      component.registerForm.patchValue({...testData, confirmPassword: testData.password });
      fixture.detectChanges();
      expect(component.registerForm.valid).toBeTrue();

      const registerButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
      registerButton.click();
      tick(); // For of(undefined) to resolve
      fixture.detectChanges();

      const { confirmPassword, ...expectedPayload } = component.registerForm.value; // Exclude confirmPassword
      expect(mockAuthService.adminRegister).toHaveBeenCalledWith(expectedPayload as AdminRegisterPayload);
      expect(mockNotificationService.showSuccess).toHaveBeenCalledWith('Registration successful! Please check your email to verify your account.');
      expect(router.navigate).toHaveBeenCalledWith(['/frontpage/login'], { queryParams: { email: testData.email } });
    }));
  });

  describe('4. Failed Registration', () => {
    it('should show error and not navigate on failed registration', fakeAsync(() => {
      spyOn(router, 'navigate').and.stub();
      const errorMessage = 'Email already exists';
      mockAuthService.adminRegister.and.returnValue(throwError(() => new Error(errorMessage)));

      const testData: AdminRegisterPayload = {
        firstName: 'Test',
        lastName: 'Admin',
        institution: 'Test Uni',
        email: 'existing@example.com',
        password: 'Password123!'
      };
      component.registerForm.patchValue({...testData, confirmPassword: testData.password });
      fixture.detectChanges();
      expect(component.registerForm.valid).toBeTrue();
      
      const registerButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
      registerButton.click();
      tick(); // For throwError to propagate
      fixture.detectChanges();

      const { confirmPassword, ...expectedPayload } = component.registerForm.value;
      expect(mockAuthService.adminRegister).toHaveBeenCalledWith(expectedPayload as AdminRegisterPayload);
      expect(mockNotificationService.showError).toHaveBeenCalledWith(errorMessage);
      expect(router.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('5. Password Visibility Toggles', () => {
    function testPasswordVisibility(fieldControlName: string, fieldId: string) {
      const passwordInput = fixture.debugElement.query(By.css(`input[formControlName="${fieldControlName}"]`)).nativeElement;
      // The toggle button is usually a sibling or child of the mat-form-field, often identifiable by its matSuffix directive or icon.
      // This selector assumes the button is within the same mat-form-field as the input.
      const toggleButton = fixture.debugElement.query(By.css(`#${fieldId} ~ button[matSuffix]`)).nativeElement;


      expect(passwordInput.type).toBe('password');
      
      toggleButton.click();
      fixture.detectChanges();
      expect(passwordInput.type).toBe('text');

      toggleButton.click();
      fixture.detectChanges();
      expect(passwordInput.type).toBe('password');
    }

    it('should toggle visibility for password field', () => {
      testPasswordVisibility('password', 'password-field'); // Assuming 'password-field' is id for password input
    });

    it('should toggle visibility for confirmPassword field', () => {
      testPasswordVisibility('confirmPassword', 'confirm-password-field'); // Assuming 'confirm-password-field' is id for confirmPassword input
    });
  });
});

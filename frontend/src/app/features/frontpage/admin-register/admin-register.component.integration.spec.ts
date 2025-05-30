import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
// Removed duplicate import: import { of, throwError } from 'rxjs'; The consolidated one below will be kept.

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs'; // This is the consolidated one to keep

import { AdminRegisterComponent } from './admin-register.component';
import { AuthService } from '../../../core/services/auth.service'; // Imported AuthService class
import { AUTH_SERVICE_TOKEN, IAuthService } from '../../../core/services/auth.service.interface';
import { NotificationService } from '../../../core/services/notification.service';
// AdminRegisterPayload already imported via barrel in the SEARCH block's line for User as AppUser
import { AdminRegisterPayload, User as AppUser, UserRole } from '../../../core/models';
import { User as FirebaseUser } from '@angular/fire/auth';

describe('AdminRegisterComponent Integration Tests', () => {
  let component: AdminRegisterComponent;
  let fixture: ComponentFixture<AdminRegisterComponent>;
  let mockAuthService: jest.Mocked<IAuthService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let router: Router;

  beforeEach(async () => {
    // Jest equivalent for spy objects
    mockAuthService = {
      // Methods
      adminLogin: jest.fn(),
      playerLoginWithCredentials: jest.fn(),
      logout: jest.fn().mockResolvedValue(undefined),
      impersonatePlayer: jest.fn().mockResolvedValue(undefined),
      stopImpersonation: jest.fn().mockResolvedValue(undefined),
      adminRegister: jest.fn(), // Used by the component
      requestPasswordReset: jest.fn().mockReturnValue(of(undefined)),
      getCurrentFirebaseIdToken: jest.fn().mockResolvedValue(null),
      getStoredBackendTokenSnapshot: jest.fn().mockReturnValue(null),
      // Signal properties
      firebaseUser: signal(null as FirebaseUser | null | undefined),
      currentUser: signal(null as AppUser | null | undefined),
      backendToken: signal(null as string | null),
      isAuthenticated: signal(false),
      isAdmin: signal(false),
      isPlayer: signal(false),
      isImpersonating: signal(false),
      // Observable properties
      firebaseUser$: of(null as FirebaseUser | null | undefined),
      currentUser$: of(null as AppUser | null | undefined),
    } as unknown as jest.Mocked<IAuthService>; // Changed cast

    mockNotificationService = {
      showSuccess: jest.fn(),
      showError: jest.fn(),
      showMessage: jest.fn(),
      showInfo: jest.fn(),
      snackBar: {} as any, // Added missing property
      defaultConfig: {} as any, // Added missing property
    } as unknown as jest.Mocked<NotificationService>;

    await TestBed.configureTestingModule({
      imports: [ // AdminRegisterComponent moved to imports
        AdminRegisterComponent,
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
        { provide: AuthService, useValue: mockAuthService }, // Changed token to concrete class
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
      expect(mockNotificationService.showError).toHaveBeenCalledWith('Please correct the errors in the form.'); // Corrected message
    });

    it('Email Format: should show error for invalid email', () => {
      component.registerForm.patchValue({ email: 'invalid-email' });
      fixture.detectChanges();
      expect(component.registerForm.get('email')?.hasError('email')).toBe(true); // Changed to toBe(true)
    });

    it('Password MinLength: should show error for short password', () => {
      component.registerForm.patchValue({ password: '123' });
      fixture.detectChanges();
      expect(component.registerForm.get('password')?.hasError('minlength')).toBe(true); // Changed to toBe(true)
    });

    it('Password Mismatch: should show error if passwords do not match', () => {
      component.registerForm.patchValue({ password: 'password123', confirmPassword: 'password456' });
      fixture.detectChanges();
      expect(component.registerForm.hasError('passwordMismatch') || component.registerForm.get('confirmPassword')?.hasError('passwordMismatch')).toBe(true); // Changed to toBe(true)
      
      const registerButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
      registerButton.click();
      fixture.detectChanges();
      expect(mockAuthService.adminRegister).not.toHaveBeenCalled();
    });
    
    it('Password Match: should clear mismatch error if passwords match', () => {
        component.registerForm.patchValue({ password: 'password123', confirmPassword: 'password456' });
        fixture.detectChanges();
        expect(component.registerForm.hasError('passwordMismatch') || component.registerForm.get('confirmPassword')?.hasError('passwordMismatch')).toBe(true); // Changed to toBe(true)
        
        component.registerForm.patchValue({ confirmPassword: 'password123' });
        fixture.detectChanges();
        expect(component.registerForm.hasError('passwordMismatch') || component.registerForm.get('confirmPassword')?.hasError('passwordMismatch')).toBe(false); // Changed to toBe(false)
      });
  });

  describe('3. Successful Registration', () => {
    it('should register admin, show success, and navigate to login with email', fakeAsync(() => {
      jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true)); // Corrected spy syntax
      mockAuthService.adminRegister.mockReturnValue(of(undefined)); // Corrected spy syntax

      const testData: AdminRegisterPayload = {
        firstName: 'Test',
        lastName: 'Admin',
        institution: 'Test Uni',
        email: 'test@example.com',
        password: 'Password123!'
      };

      component.registerForm.patchValue({...testData, confirmPassword: testData.password });
      fixture.detectChanges();
      expect(component.registerForm.valid).toBe(true); // Changed to toBe(true)

      const registerButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
      registerButton.click();
      tick(); // For of(undefined) to resolve
      fixture.detectChanges();

      const { confirmPassword, ...expectedPayload } = component.registerForm.value;
      expect(mockAuthService.adminRegister).toHaveBeenCalledWith(expectedPayload as AdminRegisterPayload);
      expect(mockNotificationService.showSuccess).toHaveBeenCalledWith('Registration successful! Please check your email to confirm your account.'); // Corrected message
      expect(router.navigate).toHaveBeenCalledWith(['/frontpage/login'], { queryParams: { email: testData.email } });
    }));
  });

  describe('4. Failed Registration', () => {
    it('should show error and not navigate on failed registration', fakeAsync(() => {
      jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true)); // Corrected spy syntax
      const errorMessage = 'Email already exists';
      mockAuthService.adminRegister.mockReturnValue(throwError(() => new Error(errorMessage))); // Corrected spy syntax

      const testData: AdminRegisterPayload = {
        firstName: 'Test',
        lastName: 'Admin',
        institution: 'Test Uni',
        email: 'existing@example.com',
        password: 'Password123!'
      };
      component.registerForm.patchValue({...testData, confirmPassword: testData.password });
      fixture.detectChanges();
      expect(component.registerForm.valid).toBe(true); // Changed to toBe(true)
      
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
    function testPasswordVisibility(fieldControlName: string, _fieldId: string) { // fieldId no longer used for this selector but kept for context if needed elsewhere
      const passwordInput = fixture.debugElement.query(By.css(`input[formControlName="${fieldControlName}"]`)).nativeElement;
      // Updated selector to use data-testid
      const toggleButton = fixture.debugElement.query(By.css(`button[data-testid="toggle-${fieldControlName}-visibility"]`)).nativeElement;


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

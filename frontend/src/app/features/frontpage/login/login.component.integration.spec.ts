import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { By } from '@angular/platform-browser';
// Line 7 (original duplicate import of {of, throwError}) should be removed or ensured it's commented.
// The diff block below will handle the active rxjs import on line 16.

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs'; // Ensuring this is the only rxjs import for of/throwError
import { User as FirebaseUser } from '@angular/fire/auth';

import { LoginComponent } from './login.component';
import { IAuthService } from '../../../core/services/auth.service.interface'; // Keep for type
import { AUTH_SERVICE_TOKEN } from '../../../core/services/injection-tokens'; // Import actual token
import { NotificationService } from '../../../core/services/notification.service';
import { UserRole, User } from '../../../core/models';

describe('LoginComponent Integration Tests', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jest.Mocked<IAuthService>; // Changed from jasmine.SpyObj to jest.Mocked
  let mockNotificationService: jest.Mocked<NotificationService>; // Changed from jasmine.SpyObj to jest.Mocked
  let mockActivatedRoute: Partial<ActivatedRoute>;
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
      adminRegister: jest.fn().mockReturnValue(of({})),
      requestPasswordReset: jest.fn().mockReturnValue(of(undefined)),
      getCurrentFirebaseIdToken: jest.fn().mockResolvedValue(null),
      getStoredBackendTokenSnapshot: jest.fn().mockReturnValue(null),
      // Signal properties
      firebaseUser: signal(null as FirebaseUser | null | undefined),
      currentUser: signal(null as User | null | undefined),
      backendToken: signal(null as string | null),
      isAuthenticated: signal(false),
      isAdmin: signal(false),
      isPlayer: signal(false),
      isImpersonating: signal(false),
      // Observable properties
      firebaseUser$: of(null as FirebaseUser | null | undefined),
      currentUser$: of(null as User | null | undefined),
    } as unknown as jest.Mocked<IAuthService>; // Use unknown cast

    mockNotificationService = {
      showSuccess: jest.fn(),
      showError: jest.fn(),
      showMessage: jest.fn(),
      showInfo: jest.fn(), // Added showInfo
      snackBar: {} as any, // Added missing property
      defaultConfig: {} as any, // Added missing property
    } as unknown as jest.Mocked<NotificationService>; // Use unknown cast

    mockActivatedRoute = {
      snapshot: {
        queryParamMap: convertToParamMap({}) // Default to no query params
      } as any // Using 'as any' to simplify ActivatedRouteSnapshot mocking
    };

    await TestBed.configureTestingModule({
      imports: [ // LoginComponent moved to imports
        LoginComponent,
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
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges(); // Initial binding
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('A. Admin Login Mode', () => {
    beforeEach(() => {
      // Ensure no query params for admin mode
      (mockActivatedRoute.snapshot as any).queryParamMap = convertToParamMap({});
      component.ngOnInit(); // Re-initialize based on new route params
      fixture.detectChanges();
    });

    it('1. should render email, password fields and login button', () => {
      expect(fixture.debugElement.query(By.css('input[formControlName="email"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('input[formControlName="password"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('button[type="submit"]'))).toBeTruthy();
    });

    it('2. should not call adminLogin and show error on invalid form submission', () => {
      component.loginForm.patchValue({ email: '', password: '' });
      fixture.detectChanges();
      
      const loginButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
      loginButton.click();
      fixture.detectChanges();

      expect(mockAuthService.adminLogin).not.toHaveBeenCalled();
      expect(mockNotificationService.showError).toHaveBeenCalled();
    });

    it('3. should successfully login admin and navigate to /admin', fakeAsync(() => {
      jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true)); // Corrected spy
      mockAuthService.adminLogin.mockReturnValue(of({ uid: 'admin1', email: 'admin@test.com', role: UserRole.ADMIN } as User)); // Corrected spy
      
      component.loginForm.patchValue({ email: 'admin@test.com', password: 'password' });
      fixture.detectChanges();
      
      const loginButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
      loginButton.click();
      tick(); // For observable to resolve
      fixture.detectChanges();

      expect(mockAuthService.adminLogin).toHaveBeenCalledWith('admin@test.com', 'password');
      expect(mockNotificationService.showSuccess).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    }));

    it('4. should successfully login admin (who is player with gameId) and navigate to game area', fakeAsync(() => {
        jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true)); // Corrected spy
        mockAuthService.adminLogin.mockReturnValue(of({ uid: 'player1', email: 'player@test.com', role: UserRole.PLAYER, gameId: 'gameXYZ' } as User)); // Corrected spy
        
        component.loginForm.patchValue({ email: 'player@test.com', password: 'password' });
        fixture.detectChanges();
        
        const loginButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
        loginButton.click();
        tick();
        fixture.detectChanges();
  
        expect(mockAuthService.adminLogin).toHaveBeenCalledWith('player@test.com', 'password');
        expect(mockNotificationService.showSuccess).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/game', 'gameXYZ']);
      }));

    it('5. should show error and not navigate on failed admin login', fakeAsync(() => {
      jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true)); // Corrected spy
      mockAuthService.adminLogin.mockReturnValue(throwError(() => new Error('Invalid credentials'))); // Corrected spy

      component.loginForm.patchValue({ email: 'admin@test.com', password: 'wrongpassword' });
      fixture.detectChanges();

      const loginButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
      loginButton.click();
      tick();
      fixture.detectChanges();

      expect(mockAuthService.adminLogin).toHaveBeenCalledWith('admin@test.com', 'wrongpassword');
      expect(mockNotificationService.showError).toHaveBeenCalledWith('Invalid credentials');
      expect(router.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('B. Player Login Mode', () => {
    beforeEach(() => {
      (mockActivatedRoute.snapshot as any).queryParamMap = convertToParamMap({ gameId: 'g123', player: '1' });
      component.ngOnInit(); // Re-initialize with player mode params
      fixture.detectChanges();
    });

    it('1. should render password field and login button, email field should not be present or relevant', () => {
      expect(fixture.debugElement.query(By.css('input[formControlName="email"]'))).toBeFalsy();
      expect(fixture.debugElement.query(By.css('input[formControlName="password"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('button[type="submit"]'))).toBeTruthy();
      expect(component.isPlayerLoginMode()).toBe(true); // Changed to isPlayerLoginMode() and toBe(true)
    });

    it('2. should not call playerLogin and show error on invalid (empty password) form submission', () => {
      component.loginForm.patchValue({ password: '' }); // Email is not part of player login form
      fixture.detectChanges();

      const loginButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
      loginButton.click();
      fixture.detectChanges();
      
      expect(mockAuthService.playerLoginWithCredentials).not.toHaveBeenCalled();
      expect(mockNotificationService.showError).toHaveBeenCalled();
    });

    it('3. should successfully login player and navigate to game area', fakeAsync(() => {
      jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true)); // Corrected spy
      mockAuthService.playerLoginWithCredentials.mockReturnValue(of({ uid: 'player1', email: 'player@test.com', role: UserRole.PLAYER, gameId: 'g123', playerNumber: 1 } as User)); // Corrected spy
      
      component.loginForm.patchValue({ password: 'playerpass' });
      fixture.detectChanges();

      const loginButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
      loginButton.click();
      tick();
      fixture.detectChanges();

      expect(mockAuthService.playerLoginWithCredentials).toHaveBeenCalledWith('g123', 1, 'playerpass');
      expect(mockNotificationService.showSuccess).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/game', 'g123']);
    }));

    it('4. should show error and not navigate on failed player login', fakeAsync(() => {
      jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true)); // Corrected spy
      mockAuthService.playerLoginWithCredentials.mockReturnValue(throwError(() => new Error('Player login failed'))); // Corrected spy

      component.loginForm.patchValue({ password: 'wrongpass' });
      fixture.detectChanges();

      const loginButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
      loginButton.click();
      tick();
      fixture.detectChanges();

      expect(mockAuthService.playerLoginWithCredentials).toHaveBeenCalledWith('g123', 1, 'wrongpass');
      expect(mockNotificationService.showError).toHaveBeenCalledWith('Player login failed');
      expect(router.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('C. Password Visibility Toggle', () => {
    it('should toggle password input type on button click', () => {
      // Ensure admin mode for simplicity, as password field is always there
      (mockActivatedRoute.snapshot as any).queryParamMap = convertToParamMap({});
      component.ngOnInit();
      fixture.detectChanges();

      const passwordInput = fixture.debugElement.query(By.css('input[formControlName="password"]')).nativeElement;
      // Use data-testid for the toggle button
      const toggleButton = fixture.debugElement.query(By.css('button[data-testid="toggle-password-visibility"]')).nativeElement;

      expect(passwordInput.type).toBe('password');
      
      toggleButton.click();
      fixture.detectChanges();
      expect(passwordInput.type).toBe('text');

      // Click again to toggle back
      toggleButton.click(); // Re-use the same toggleButton variable as its data-testid won't change
      fixture.detectChanges();
      expect(passwordInput.type).toBe('password');
    });
  });
});

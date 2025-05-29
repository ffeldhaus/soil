import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { LoginComponent } from './login.component';
import { AUTH_SERVICE_TOKEN, IAuthService } from '../../../core/services/auth/auth.service.interface';
import { NotificationService } from '../../../core/services/notification.service';
import { UserRole, User } from '../../../core/models/user.model';

describe('LoginComponent Integration Tests', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jasmine.SpyObj<IAuthService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockActivatedRoute: Partial<ActivatedRoute>;
  let router: Router;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('IAuthService', ['adminLogin', 'playerLoginWithCredentials']);
    mockNotificationService = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);
    mockActivatedRoute = {
      snapshot: {
        queryParamMap: convertToParamMap({}) // Default to no query params
      }
    };

    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
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
      spyOn(router, 'navigate').and.stub();
      mockAuthService.adminLogin.and.returnValue(of({ uid: 'admin1', email: 'admin@test.com', role: UserRole.ADMIN } as User));
      
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
        spyOn(router, 'navigate').and.stub();
        mockAuthService.adminLogin.and.returnValue(of({ uid: 'player1', email: 'player@test.com', role: UserRole.PLAYER, gameId: 'gameXYZ' } as User));
        
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
      spyOn(router, 'navigate').and.stub();
      mockAuthService.adminLogin.and.returnValue(throwError(() => new Error('Invalid credentials')));

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
      expect(fixture.debugElement.query(By.css('input[formControlName="email"]'))).toBeFalsy(); // Email field removed or hidden
      expect(fixture.debugElement.query(By.css('input[formControlName="password"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('button[type="submit"]'))).toBeTruthy();
      expect(component.isPlayerLogin).toBeTrue();
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
      spyOn(router, 'navigate').and.stub();
      mockAuthService.playerLoginWithCredentials.and.returnValue(of({ uid: 'player1', email: 'player@test.com', role: UserRole.PLAYER, gameId: 'g123', playerNumber: 1 } as User));
      
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
      spyOn(router, 'navigate').and.stub();
      mockAuthService.playerLoginWithCredentials.and.returnValue(throwError(() => new Error('Player login failed')));

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
      const toggleButton = fixture.debugElement.query(By.css('button[aria-label="Hide password"]')).nativeElement; // Initial state often "Hide"

      expect(passwordInput.type).toBe('password');
      
      toggleButton.click();
      fixture.detectChanges();
      expect(passwordInput.type).toBe('text');
      // The aria-label or icon might change too, e.g. to "Show password"
      // const toggleButtonAfterFirstClick = fixture.debugElement.query(By.css('button[aria-label="Show password"]')).nativeElement;


      // Click again to toggle back
      // Need to re-query the button if its properties (like aria-label) changed affecting the selector
      const toggleButtonAgain = fixture.debugElement.query(By.css('button[matSuffix]')).nativeElement; // More generic selector for the icon button
      toggleButtonAgain.click();
      fixture.detectChanges();
      expect(passwordInput.type).toBe('password');
    });
  });
});

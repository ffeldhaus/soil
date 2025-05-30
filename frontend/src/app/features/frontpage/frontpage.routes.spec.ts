import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { FRONTPAGE_ROUTES } from './frontpage.routes';
import { Component, signal } from '@angular/core'; // Added signal
import { FrontpageLayoutComponent } from './frontpage-layout.component';
import { OverviewComponent } from './overview/overview.component';
import { BackgroundComponent } from './background/background.component';
import { LoginComponent } from './login/login.component';
import { AdminRegisterComponent } from './admin-register/admin-register.component';
import { ImprintComponent } from './imprint/imprint.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { IAuthService } from '../../core/services/auth.service.interface'; // For mock
import { AUTH_SERVICE_TOKEN } from '../../core/services/injection-tokens'; // For mock
import { NotificationService } from '../../core/services/notification.service'; // For mock
import { User, UserRole } from '../../core/models'; // For mock
import { of } from 'rxjs'; // For mock
import { User as FirebaseUser } from '@angular/fire/auth'; // For mock

// No need for mock components if actual standalone components are imported

describe('Frontpage Routes', () => {
  let router: Router;
  let mockAuthService: jest.Mocked<IAuthService>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    mockAuthService = {
      adminLogin: jest.fn(), playerLoginWithCredentials: jest.fn(), logout: jest.fn().mockResolvedValue(undefined),
      impersonatePlayer: jest.fn().mockResolvedValue(undefined), stopImpersonation: jest.fn().mockResolvedValue(undefined),
      adminRegister: jest.fn().mockReturnValue(of({})), requestPasswordReset: jest.fn().mockReturnValue(of(undefined)),
      getCurrentFirebaseIdToken: jest.fn().mockResolvedValue(null), getStoredBackendTokenSnapshot: jest.fn().mockReturnValue(null),
      firebaseUser: signal(null as FirebaseUser | null | undefined), currentUser: signal(null as User | null | undefined),
      backendToken: signal(null as string | null), isAuthenticated: signal(false), isAdmin: signal(false),
      isPlayer: signal(false), isImpersonating: signal(false),
      firebaseUser$: of(null as FirebaseUser | null | undefined), currentUser$: of(null as User | null | undefined),
    } as unknown as jest.Mocked<IAuthService>;

    mockNotificationService = {
      showSuccess: jest.fn(), showError: jest.fn(), showMessage: jest.fn(), showInfo: jest.fn(),
      snackBar: {} as any, defaultConfig: {} as any,
    } as unknown as jest.Mocked<NotificationService>;

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes(FRONTPAGE_ROUTES),
        // Import actual standalone components used in routes
        FrontpageLayoutComponent,
        OverviewComponent,
        BackgroundComponent,
        LoginComponent,
        AdminRegisterComponent,
        ImprintComponent,
        PrivacyComponent
      ],
      providers: [
        { provide: AUTH_SERVICE_TOKEN, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    // Initial navigation to trigger the router
    router.initialNavigation();
  });

  it('should navigate to overview by default', async () => {
    await router.navigate(['']);
    expect(router.url).toBe('/overview');
  });

  it('should navigate to overview', async () => {
    await router.navigate(['/overview']);
    expect(router.url).toBe('/overview');
  });

  it('should navigate to background', async () => {
    await router.navigate(['/background']);
    expect(router.url).toBe('/background');
  });

  it('should navigate to login', async () => {
    await router.navigate(['/login']);
    expect(router.url).toBe('/login');
  });

  it('should navigate to register', async () => {
    await router.navigate(['/register']);
    expect(router.url).toBe('/register');
  });

  it('should navigate to imprint', async () => {
    await router.navigate(['/imprint']);
    expect(router.url).toBe('/imprint');
  });

  it('should navigate to privacy', async () => {
    await router.navigate(['/privacy']);
    expect(router.url).toBe('/privacy');
  });
});
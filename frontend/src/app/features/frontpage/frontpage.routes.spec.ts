import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { FRONTPAGE_ROUTES } from './frontpage.routes';
// Removed unused component imports as they are mocked below for testing purposes
// import { FrontpageLayoutComponent } from './frontpage-layout.component';
// import { OverviewComponent } from './overview/overview.component';
// import { BackgroundComponent } from './background/background.component';
// import { LoginComponent } from './login/login.component';
// import { AdminRegisterComponent } from './admin-register/admin-register.component';
// import { ImprintComponent } from './imprint/imprint.component';
// import { PrivacyComponent } from './privacy/privacy.component';
import { Component } from '@angular/core';

// Create stub components for those not directly tested here, if needed for routing setup
// Although for simple route reachability, declaring them might be enough.
@Component({ template: '' })
class MockFrontpageLayoutComponent {}

@Component({ template: '' })
class MockOverviewComponent {}

@Component({ template: '' })
class MockBackgroundComponent {}

@Component({ template: '' })
class MockLoginComponent {}

@Component({ template: '' })
class MockAdminRegisterComponent {}

@Component({ template: '' })
class MockImprintComponent {}

@Component({ template: '' })
class MockPrivacyComponent {}

describe('Frontpage Routes', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes(FRONTPAGE_ROUTES)],
      declarations: [
        MockFrontpageLayoutComponent,
        MockOverviewComponent,
        MockBackgroundComponent,
        MockLoginComponent,
        MockAdminRegisterComponent,
        MockImprintComponent,
        MockPrivacyComponent
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
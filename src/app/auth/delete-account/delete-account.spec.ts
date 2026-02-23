import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../auth.service';
import { DeleteAccountComponent } from './delete-account';

describe('DeleteAccountComponent', () => {
  let component: DeleteAccountComponent;
  let fixture: ComponentFixture<DeleteAccountComponent>;
  let authServiceMock: any;
  let router: Router;

  beforeEach(async () => {
    authServiceMock = {
      user$: of(null),
      currentUser: null,
      logout: vi.fn().mockResolvedValue(undefined),
      deleteAccount: vi.fn().mockResolvedValue({ success: true }),
    };

    await TestBed.configureTestingModule({
      imports: [DeleteAccountComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(DeleteAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should detect guest user when user is null', () => {
    expect(component.isGuest()).toBe(true);
  });

  it('should detect guest user when user is anonymous', () => {
    authServiceMock.currentUser = { isAnonymous: true };
    // Trigger signal update if needed - in this case constructor subscribes to user$
    // But since it's a mock value, we need to ensure the signal reflects it
    // The component constructor does: this.authService.user$.subscribe(user => this.currentUser.set(user));
    // So we should emit from user$
    authServiceMock.user$ = of({ isAnonymous: true });

    // Re-create or manually trigger
    (component as any).authService.user$.subscribe((u: any) => component.currentUser.set(u));

    expect(component.isGuest()).toBe(true);
  });

  it('should detect authenticated user', () => {
    authServiceMock.user$ = of({ isAnonymous: false, uid: '123' });
    // Manually update for test
    component.currentUser.set({ isAnonymous: false, uid: '123' } as any);

    expect(component.isGuest()).toBe(false);
  });

  it('should clear localStorage and logout for guest', async () => {
    localStorage.setItem('soil_test', 'value');
    localStorage.setItem('firebase:test', 'value');
    localStorage.setItem('other', 'keep');

    component.currentUser.set(null); // Ensure guest

    await component.deleteAccount();

    expect(localStorage.getItem('soil_test')).toBeNull();
    expect(localStorage.getItem('firebase:test')).toBeNull();
    expect(localStorage.getItem('other')).toBe('keep');
    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should call deleteAccount for authenticated user', async () => {
    component.currentUser.set({ isAnonymous: false, uid: '123' } as any);

    await component.deleteAccount();

    expect(authServiceMock.deleteAccount).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should show error on failure', async () => {
    authServiceMock.deleteAccount.mockRejectedValue(new Error('Delete Failed'));
    component.currentUser.set({ isAnonymous: false, uid: '123' } as any);

    await component.deleteAccount();

    expect(component.error()).toBe('Delete Failed');
    expect(component.loading()).toBe(false);
  });
});

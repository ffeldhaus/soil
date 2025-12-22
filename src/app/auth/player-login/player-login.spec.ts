import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { PlayerLoginComponent } from './player-login';
import { AuthService } from '../auth.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

describe('PlayerLoginComponent', () => {
    let component: PlayerLoginComponent;
    let fixture: ComponentFixture<PlayerLoginComponent>;
    let authServiceMock: any;

    beforeEach(async () => {
        authServiceMock = {
            loginAsPlayer: vi.fn().mockResolvedValue(undefined),
            user$: of(null)
        };

        await TestBed.configureTestingModule({
            imports: [PlayerLoginComponent, RouterTestingModule, ReactiveFormsModule],
            providers: [
                { provide: AuthService, useValue: authServiceMock }
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(PlayerLoginComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call loginAsPlayer on valid submit', async () => {
        component.loginForm.patchValue({
            gameId: 'TestGameId12345678901234567890',
            password: 'PIN123'
        });

        await component.onSubmit();
        expect(authServiceMock.loginAsPlayer).toHaveBeenCalledWith('TestGameId12345678901234567890', 'PIN123');
    });

    it('should show error modal on login failure', async () => {
        authServiceMock.loginAsPlayer.mockRejectedValue(new Error('Invalid PIN'));

        component.loginForm.patchValue({
            gameId: 'TestGameId12345678901234567890',
            password: 'PIN123'
        });

        await component.onSubmit();
        fixture.detectChanges();

        expect(component.showErrorModal).toBe(true);
        expect(component.errorMessage).toBe('Invalid PIN');
    });
});

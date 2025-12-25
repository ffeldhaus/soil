import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { PlayerLoginComponent } from './player-login';
import { AuthService } from '../auth.service';
import { LanguageService } from '../../services/language.service';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
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
        const languageServiceMock = { currentLang: 'en' };

        await TestBed.configureTestingModule({
            imports: [PlayerLoginComponent, ReactiveFormsModule],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: authServiceMock },
                { provide: LanguageService, useValue: languageServiceMock }
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

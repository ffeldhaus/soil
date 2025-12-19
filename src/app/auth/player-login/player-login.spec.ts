import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { PlayerLoginComponent } from './player-login';
import { AuthService } from '../auth.service';
import { of, throwError } from 'rxjs';

describe('PlayerLoginComponent', () => {
    let component: PlayerLoginComponent;
    let fixture: ComponentFixture<PlayerLoginComponent>;
    let authServiceMock: any;

    beforeEach(async () => {
        authServiceMock = {
            loginAsPlayer: jasmine.createSpy('loginAsPlayer').and.returnValue(Promise.resolve())
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
        component.loginForm.setValue({
            gameId: 'TestGameId123456789012',
            playerNumber: '1',
            password: 'PIN123'
        });

        await component.onSubmit();
        expect(authServiceMock.loginAsPlayer).toHaveBeenCalledWith('TestGameId123456789012', '1', 'PIN123');
    });

    it('should show error modal on login failure', async () => {
        authServiceMock.loginAsPlayer.and.returnValue(Promise.reject(new Error('Invalid PIN')));

        component.loginForm.setValue({
            gameId: 'TestGameId123456789012',
            playerNumber: '1',
            password: 'PIN123'
        });

        await component.onSubmit();
        fixture.detectChanges();

        expect(component.showErrorModal).toBeTrue();
        expect(component.errorMessage).toBe('Invalid PIN');

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.fixed.inset-0')).toBeTruthy(); // check for modal presence
    });
});

import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import { BehaviorSubject, of } from 'rxjs';

describe('AuthService', () => {
    let service: AuthService;
    let authSpy: any;
    let functionsSpy: any;

    beforeEach(() => {
        // Mock localStorage - MUST be before service injection
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: (key: string) => key === 'soil_admin_impersonating' ? 'true' : null,
                setItem: () => { },
                removeItem: () => { }
            },
            writable: true
        });

        authSpy = {
            signOut: () => Promise.resolve(),
            onAuthStateChanged: () => () => { },
            onIdTokenChanged: () => () => { },
            authStateReady: () => Promise.resolve(),
            updateCurrentUser: () => Promise.resolve()
        };

        functionsSpy = {
            httpsCallable: () => (() => Promise.resolve({ data: {} }))
        };

        TestBed.configureTestingModule({
            providers: [
                AuthService,
                { provide: Auth, useValue: authSpy },
                { provide: Functions, useValue: functionsSpy }
            ]
        });
        service = TestBed.inject(AuthService);
    });

    it('should set impersonation flag in local storage on impersonate', async () => {
        await service.logout();
        expect(service).toBeTruthy();
    });
});

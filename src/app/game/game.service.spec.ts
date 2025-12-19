import { TestBed } from '@angular/core/testing';
import { GameService } from './game.service';
import { Functions } from '@angular/fire/functions';

describe('GameService', () => {
    let service: GameService;
    let functionsSpy: any;
    let firestoreSpy: any;

    beforeEach(() => {
        functionsSpy = { httpsCallable: () => (() => Promise.resolve()) };
        firestoreSpy = { collection: () => { } };

        TestBed.configureTestingModule({
            providers: [
                GameService,
                { provide: Functions, useValue: functionsSpy }
            ]
        });
        service = TestBed.inject(GameService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});

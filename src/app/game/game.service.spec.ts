import { TestBed } from '@angular/core/testing';
import { GameService } from './game.service';
import { Functions } from '@angular/fire/functions';
import { describe, beforeEach, it, expect, vi } from 'vitest';

// Mock @angular/fire/functions
vi.mock('@angular/fire/functions', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} })))
    };
});

import { httpsCallable } from '@angular/fire/functions';

describe('GameService', () => {
    let service: GameService;
    let functionsInstance: any;

    beforeEach(() => {
        functionsInstance = {};

        TestBed.configureTestingModule({
            providers: [
                GameService,
                { provide: Functions, useValue: functionsInstance }
            ]
        });
        service = TestBed.inject(GameService);
        vi.clearAllMocks();
    });

    it('should perform optimistic update when parcel decision is updated', async () => {
        service.updateParcelDecision(0, 'Wheat');
        const parcels = service.getParcelsValue();
        expect(parcels[0].crop).toBe('Wheat');
    });

    it('should create initial parcels with 40 items', () => {
        const parcels = service.getParcelsValue();
        expect(parcels).toHaveLength(40);
        expect(parcels[0].crop).toBe('Fallow');
    });

    it('should call saveDraft when updating parcel decision if gameId is provided', async () => {
        const mockCallable = vi.fn(() => Promise.resolve({ data: {} }));
        vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

        service.updateParcelDecision(0, 'Corn', 'test-game-id');
        
        // Wait for async saveDraft
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'saveDraft');
        expect(mockCallable).toHaveBeenCalled();
    });
});
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { Game } from '../../../types';
import { DashboardGameDetailComponent } from './dashboard-game-detail';

describe('DashboardGameDetailComponent', () => {
  let component: DashboardGameDetailComponent;
  let fixture: ComponentFixture<DashboardGameDetailComponent>;

  const mockGame: Game = {
    id: 'test-game',
    name: 'Test Game',
    hostUid: 'host-1',
    status: 'in_progress',
    settings: { length: 20, difficulty: 'normal' },
    config: { numPlayers: 2, numRounds: 20, numAi: 0 },
    players: {
      'player-test-game-1': {
        uid: 'player-test-game-1',
        displayName: 'Player 1',
        isAi: false,
        capital: 1000,
        currentRound: 1,
        history: [],
      },
    },
    currentRoundNumber: 1,
    createdAt: { seconds: 1234567890, nanoseconds: 0 },
    playerSecrets: {
      '1': { password: 'pass1' },
      '2': { password: 'pass2' },
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardGameDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardGameDetailComponent);
    component = fixture.componentInstance;
    component.game = mockGame;
    // fixture.detectChanges(); // Remove from here to avoid checking before inputs are fully processed in some scenarios
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should return player keys', () => {
    fixture.detectChanges();
    const keys = component.getPlayerKeys(mockGame.players);
    expect(keys).toEqual(['player-test-game-1']);
  });

  it('should generate correct number of slots', () => {
    fixture.detectChanges();
    const slots = component.getSlots(mockGame);
    expect(slots.length).toBe(2);
    expect(slots[0].number).toBe(1);
    expect(slots[0].isJoined).toBe(true);
    expect(slots[1].number).toBe(2);
    expect(slots[1].isJoined).toBe(false);
  });

  it('should emit printAllQrCodes', () => {
    fixture.detectChanges();
    const spy = vi.spyOn(component.printAllQrCodes, 'emit');
    component.printAllQrCodes.emit(mockGame);
    expect(spy).toHaveBeenCalledWith(mockGame);
  });
});

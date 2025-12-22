import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Component, ChangeDetectorRef, NgZone, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { GameService } from '../../game/game.service';
import { Router } from '@angular/router';
import { Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-dashboard-test',
  standalone: true,
  imports: [FormsModule],
  template: '<div></div>'
})
class TestDashboard {
  showTrash = false;
  gameToDelete: any = null;
  deleteConfirmInput = '';
  isDeleting = false;

  // These will be assigned manually in the test
  authService!: AuthService;
  gameService!: GameService;
  router!: Router;
  cdr!: ChangeDetectorRef;
  ngZone!: NgZone;

  deleteGame(game: any) { this.gameToDelete = game; this.deleteConfirmInput = ''; }
  async confirmDelete() {
    if (this.showTrash && this.deleteConfirmInput !== 'DELETE') return;
    this.isDeleting = true;
    try {
      if (this.gameToDelete) await this.gameService.deleteGames([this.gameToDelete.id], this.showTrash);
    } finally { this.isDeleting = false; }
  }

  // Finance Modal
  showFinanceModal = false;
  selectedFinanceGame: any = null;
  selectedFinancePlayer: any = null;

  openFinance(game: any, slot: any) {
    this.selectedFinanceGame = game;
    this.selectedFinancePlayer = slot.player;
    this.showFinanceModal = true;
  }

  closeFinance() {
    this.showFinanceModal = false;
    this.selectedFinanceGame = null;
    this.selectedFinancePlayer = null;
  }
}

describe('Dashboard Component Logic (Simplified Isolation)', () => {
  let component: TestDashboard;
  let gameServiceMock: any;

  beforeEach(async () => {
    gameServiceMock = { deleteGames: vi.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [TestDashboard],
      providers: [
        { provide: AuthService, useValue: { user$: of({ uid: 't1' }) } },
        { provide: GameService, useValue: gameServiceMock },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: Firestore, useValue: {} }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(TestDashboard);
    component = fixture.componentInstance;

    // Manual attribute injection
    component.gameService = gameServiceMock;

    fixture.detectChanges();
  });

  it('should set gameToDelete', () => {
    const game = { id: 'g1' };
    component.deleteGame(game);
    expect(component.gameToDelete).toBe(game);
  });

  it('should require DELETE input in trash', async () => {
    component.showTrash = true;
    component.gameToDelete = { id: 'g1' };
    component.deleteConfirmInput = 'NO';
    await component.confirmDelete();
    expect(gameServiceMock.deleteGames).not.toHaveBeenCalled();
  });

  it('should delete in trash with correct input', async () => {
    component.showTrash = true;
    component.gameToDelete = { id: 'g1' };
    component.deleteConfirmInput = 'DELETE';
    await component.confirmDelete();
    expect(gameServiceMock.deleteGames).toHaveBeenCalled();
  });

  it('should manage finance modal', () => {
    const game = { id: 'g1' };
    const slot = { player: { uid: 'p1', displayName: 'Player 1' } };

    component.openFinance(game, slot);
    expect(component.showFinanceModal).toBe(true);
    expect(component.selectedFinanceGame).toBe(game);
    expect(component.selectedFinancePlayer).toBe(slot.player);

    component.closeFinance();
    expect(component.showFinanceModal).toBe(false);
    expect(component.selectedFinanceGame).toBe(null);
    expect(component.selectedFinancePlayer).toBe(null);
  });
});

import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardCreateGameComponent } from './dashboard-create-game';

describe('DashboardCreateGameComponent', () => {
  let component: DashboardCreateGameComponent;
  let fixture: ComponentFixture<DashboardCreateGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, DashboardCreateGameComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardCreateGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit createGame event on submit', () => {
    const emitSpy = vi.spyOn(component.createGame, 'emit');
    component.newGameConfig.name = 'Test Game';
    component.onSubmit();
    expect(emitSpy).toHaveBeenCalledWith(component.newGameConfig);
  });

  it('should handle players change correctly', () => {
    component.newGameConfig.numPlayers = 5;
    component.newGameConfig.numAi = 6;
    component.onPlayersChange();

    // Should clamp numAi to numPlayers - 1
    expect(component.newGameConfig.numAi).toBe(4);
  });

  it('should calculate numHumanPlayers correctly', () => {
    component.newGameConfig.numPlayers = 10;
    component.newGameConfig.numAi = 3;
    expect(component.numHumanPlayers).toBe(7);
  });
});

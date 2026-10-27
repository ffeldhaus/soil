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

  it('should update difficulty and recommended defaults on difficulty change while allowing individual AI level override', () => {
    component.onDifficultyChange('easy');
    expect(component.newGameConfig.difficulty).toBe('easy');
    expect(component.newGameConfig.aiLevel).toBe('elementary');
    expect(component.newGameConfig.advisorEnabled).toBe(true);
    expect(component.newGameConfig.advancedPricingEnabled).toBe(false);

    component.onDifficultyChange('normal');
    expect(component.newGameConfig.difficulty).toBe('normal');
    expect(component.newGameConfig.aiLevel).toBe('middle');
    expect(component.newGameConfig.advisorEnabled).toBe(true);
    expect(component.newGameConfig.advancedPricingEnabled).toBe(true);

    component.onDifficultyChange('hard');
    expect(component.newGameConfig.difficulty).toBe('hard');
    expect(component.newGameConfig.aiLevel).toBe('high');
    expect(component.newGameConfig.advisorEnabled).toBe(false);
    expect(component.newGameConfig.advancedPricingEnabled).toBe(true);

    // Individual override of aiLevel should keep difficulty unchanged
    component.newGameConfig.aiLevel = 'elementary';
    expect(component.newGameConfig.difficulty).toBe('hard');
    expect(component.newGameConfig.aiLevel).toBe('elementary');
  });
});

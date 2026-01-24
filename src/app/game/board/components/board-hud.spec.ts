import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Functions } from '@angular/fire/functions';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';
import { vi } from 'vitest';
import { GameService } from '../../game.service';
import { BoardHudComponent } from './board-hud';

describe('BoardHudComponent', () => {
  let component: BoardHudComponent;
  let fixture: ComponentFixture<BoardHudComponent>;
  const mockGameService = {
    exportFullGameState: vi.fn().mockResolvedValue({ id: 'test-game' }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardHudComponent],
      providers: [
        provideClientHydration(withIncrementalHydration()),
        { provide: GameService, useValue: mockGameService },
        { provide: Functions, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BoardHudComponent);
    component = fixture.componentInstance;
    component.user = { displayName: 'Test User' } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start editing name', () => {
    component.startEditName();
    expect(component.isEditingName).toBe(true);
    expect(component.tempName).toBe('Test User');
  });

  it('should emit updateName and stop editing', () => {
    const spy = vi.spyOn(component.updateName, 'emit');
    component.tempName = 'New Name';
    component.saveName();
    expect(spy).toHaveBeenCalledWith('New Name');
    expect(component.isEditingName).toBe(false);
  });

  it('should return translation key if not found', () => {
    expect(component.t('non.existent')).toBe('non.existent');
  });

  it('should copy game state to clipboard', async () => {
    // Mock navigator.clipboard
    const clipboardSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardSpy,
      },
    });
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    component.gameState = { game: { id: 'test-game' } as any, playerState: null };
    await component.copyGameState();

    expect(mockGameService.exportFullGameState).toHaveBeenCalledWith('test-game');
    expect(clipboardSpy).toHaveBeenCalledWith(JSON.stringify({ id: 'test-game' }, null, 2));
    expect(alertSpy).toHaveBeenCalled();
  });
});

import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { FIREBASE_FUNCTIONS } from '../../../firebase.config';
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
        provideRouter([]),
        provideClientHydration(withIncrementalHydration()),
        { provide: GameService, useValue: mockGameService },
        { provide: FIREBASE_FUNCTIONS, useValue: {} },
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

  it('should emit openTeamModal and display medal count in team button', () => {
    const f = TestBed.createComponent(BoardHudComponent);
    const comp = f.componentInstance;
    comp.user = { displayName: 'Hof Alpha' } as any;
    comp.collectedStickersCount = 3;
    comp.totalStickersCount = 8;
    f.detectChanges();

    const btn = f.nativeElement.querySelector('[data-testid="team-modal-btn"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('HOF ALPHA');
    expect(btn.textContent).toContain('3/8');

    const spy = vi.spyOn(comp.openTeamModal, 'emit');
    btn.click();
    expect(spy).toHaveBeenCalled();
  });

  it('should disable overlay buttons when showFinance is true', () => {
    const f = TestBed.createComponent(BoardHudComponent);
    const comp = f.componentInstance;
    comp.user = { displayName: 'Hof Alpha' } as any;
    comp.showFinance = true;
    f.detectChanges();

    const namesBtn = f.nativeElement.querySelector('button[aria-label="Toggle field names"]') as HTMLButtonElement;
    const nutritionBtn = f.nativeElement.querySelector(
      'button[aria-label="Toggle nutrition overlay"]',
    ) as HTMLButtonElement;
    const harvestBtn = f.nativeElement.querySelector(
      'button[aria-label="Toggle harvest overlay"]',
    ) as HTMLButtonElement;
    const soilBtn = f.nativeElement.querySelector(
      'button[aria-label="Toggle soil quality overlay"]',
    ) as HTMLButtonElement;

    expect(namesBtn.disabled).toBe(true);
    expect(nutritionBtn.disabled).toBe(true);
    expect(harvestBtn.disabled).toBe(true);
    expect(soilBtn.disabled).toBe(true);
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

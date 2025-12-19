import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Board } from './board';
import { AuthService } from '../../auth/auth.service';
import { GameService } from '../game.service';
import { Functions } from '@angular/fire/functions';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('Board', () => {
  let component: Board;
  let fixture: ComponentFixture<Board>;

  beforeEach(async () => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => { },
        removeItem: () => { }
      }
    });

    const authSpy = {
      user$: of({
        uid: 'test-user',
        displayName: 'Test User',
        getIdTokenResult: () => Promise.resolve({ claims: { role: 'player' } })
      }),
      logout: () => Promise.resolve(),
      updateDisplayName: vi.fn().mockResolvedValue(undefined)
    };
    const gameSpy = {
      state$: of({ currentRound: 0 }),
      getParcels: () => of(Array(40).fill(null).map((_, i) => ({
        index: i,
        crop: 'Fallow',
        soil: 80,
        nutrition: 80,
        yield: 0
      }))),
      updateParcelDecision: () => { },
      submitRound: (gameId: string) => Promise.resolve(),
      loadGame: (gameId: string) => Promise.resolve({ success: true })
    };
    const functionsSpy = { httpsCallable: () => (() => Promise.resolve({ data: {} })) };
    const routerSpy = { navigate: () => Promise.resolve(true) };

    await TestBed.configureTestingModule({
      imports: [Board],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: GameService, useValue: gameSpy },
        { provide: Functions, useValue: functionsSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(Board);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should identify player correctly', async () => {
    // Audit: ngOnInit is async. Wait for promise resolution.
    // combineLatest emits -> subscribe callback is async -> awaits getIdTokenResult -> sets isPlayer
    fixture.detectChanges();
    await sleep(50); // wait for async subscribe callback
    expect(component.isPlayer).toBe(true);
  });

  it('should open settings and populate name', async () => {
    await component.openSettings();
    expect(component.showSettings).toBe(true);
    expect(component.newName).toBe('Test User');
  });

  it('should save settings and close modal', async () => {
    component.showSettings = true;
    component.newName = 'New Name';
    await component.saveSettings();
    expect(TestBed.inject(AuthService).updateDisplayName).toHaveBeenCalledWith('New Name');
    expect(component.showSettings).toBe(false);
  });

  it('should open planting modal on selection', async () => {
    component.isReadOnly = false;

    // Simulate selection
    const mockEvent = new MouseEvent('mousedown');
    component.onMouseDown(0, mockEvent); // Select index 0
    component.onMouseUp(); // Trigger mouseup logic

    expect(component.selectedIndices.size).toBeGreaterThan(0);
    expect(component.showPlantingModal).toBe(true);
  });

  it('should open round settings on nextRound (confirmation flow)', async () => {
    component.showRoundSettingsModal = false;
    await component.nextRound();
    expect(component.showRoundSettingsModal).toBe(true);
  });
});

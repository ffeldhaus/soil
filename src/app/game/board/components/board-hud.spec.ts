import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { BoardHudComponent } from './board-hud';

describe('BoardHudComponent', () => {
  let component: BoardHudComponent;
  let fixture: ComponentFixture<BoardHudComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardHudComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BoardHudComponent);
    component = fixture.componentInstance;
    component.user = { displayName: 'Test User' };
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
});

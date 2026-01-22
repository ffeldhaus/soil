import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { RoundSettingsModal } from './round-settings-modal';

describe('RoundSettingsModal', () => {
  let component: RoundSettingsModal;
  let fixture: ComponentFixture<RoundSettingsModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoundSettingsModal],
    }).compileComponents();

    fixture = TestBed.createComponent(RoundSettingsModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit save event on submit', () => {
    const { vi } = import.meta.vitest;
    const emitSpy = vi.spyOn(component.save, 'emit');
    component.submit();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should handle price fixing toggle', () => {
    component.togglePriceFixing('Wheat');
    expect(component.isPriceFixed('Wheat')).toBe(true);
    component.togglePriceFixing('Wheat');
    expect(component.isPriceFixed('Wheat')).toBe(false);
  });

  it('should get correct crop name', () => {
    expect(component.getCropName('Wheat')).toBe('Weizen');
    expect(component.getCropName('Unknown')).toBe('Unknown');
  });

  it('should render translations', () => {
    expect(component.t('settings.title')).toBe('Rundeneinstellungen');
  });
});

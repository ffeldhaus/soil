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
    const spy = vi.spyOn(component.save, 'emit');
    component.settings = {
      machines: 2,
      organic: true,
      fertilizer: false,
      pesticide: false,
      organisms: true,
    };
    component.submit();
    expect(spy).toHaveBeenCalledWith({
      machines: 2,
      organic: true,
      fertilizer: false,
      pesticide: false,
      organisms: true,
    });
  });

  it('should render translations', () => {
    expect(component.t('settings.title')).toBe('Rundeneinstellungen');
  });
});

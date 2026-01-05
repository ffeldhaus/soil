import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideTranslocoTest } from '../../transloco-testing.module';
import { PlantingModal } from './planting-modal';

describe('PlantingModal', () => {
  let component: PlantingModal;
  let fixture: ComponentFixture<PlantingModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlantingModal],
      providers: [provideTranslocoTest()],
    }).compileComponents();

    fixture = TestBed.createComponent(PlantingModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map Grass to Animals and tiere.jpg', () => {
    const config = component.getConfig('Grass');
    expect(config.label).toBe('Animals');
    expect(config.image).toBe('tiere.jpg');
  });

  it('should map Wheat to Wheat and weizen.jpg', () => {
    const config = component.getConfig('Wheat');
    expect(config.label).toBe('Wheat');
    expect(config.image).toBe('weizen.jpg');
  });

  it('should fallback to default for unknown crop', () => {
    const config = component.getConfig('Unknown' as any);
    expect(config.label).toBe('Unknown');
    expect(config.image).toBe('placeholder.jpg');
  });
});

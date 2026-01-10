import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { PlantingModal } from './planting-modal';

describe('PlantingModal', () => {
  let component: PlantingModal;
  let fixture: ComponentFixture<PlantingModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlantingModal],
      providers: [],
    }).compileComponents();

    fixture = TestBed.createComponent(PlantingModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map Grass to Animals and hausschwein.webp', () => {
    const config = component.getConfig('Grass');
    expect(config.label).toBe('crop.animals');
    expect(config.image).toBe('hausschwein.webp');
  });

  it('should map Wheat to Wheat and weizen.webp', () => {
    const config = component.getConfig('Wheat');
    expect(config.label).toBe('crop.wheat');
    expect(config.image).toBe('weizen.webp');
  });

  it('should fallback to default for unknown crop', () => {
    const config = component.getConfig('Unknown' as any);
    expect(config.label).toBe('Unknown');
    expect(config.image).toBe('placeholder.jpg');
  });
});

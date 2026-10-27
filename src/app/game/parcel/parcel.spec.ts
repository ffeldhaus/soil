import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { Parcel } from './parcel';

describe('Parcel', () => {
  let component: Parcel;
  let fixture: ComponentFixture<Parcel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Parcel],
      providers: [],
    }).compileComponents();

    fixture = TestBed.createComponent(Parcel);
    component = fixture.componentInstance;
    component.parcel = {
      index: 0,
      crop: 'Grass',
      soil: 100,
      nutrition: 100,
    };
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

  it('should display harvest badge when showHarvest is true even if yield is 0', () => {
    fixture.componentRef.setInput('parcel', {
      index: 0,
      crop: 'Wheat',
      soil: 100,
      nutrition: 100,
      yield: 0,
    });
    fixture.componentRef.setInput('showHarvest', true);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('[data-testid="parcel-harvest-badge"]');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('0 dt (0%)');
  });

  it('should display "Fruchtfolge ▼" hint only when current crop has bad rotation with previousCrop', () => {
    fixture.componentRef.setInput('parcel', {
      index: 0,
      crop: 'Wheat',
      soil: 100,
      nutrition: 100,
    });
    fixture.componentRef.setInput('previousCrop', 'Corn');
    fixture.detectChanges();

    const badBadge = fixture.nativeElement.querySelector('[data-testid="parcel-bad-rotation-badge"]');
    expect(badBadge).toBeTruthy();
    expect(badBadge.textContent.replace(/\s+/g, ' ').trim()).toBe('Fruchtfolge ▼');

    fixture.componentRef.setInput('previousCrop', 'Fieldbean');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="parcel-bad-rotation-badge"]')).toBeNull();
  });
});

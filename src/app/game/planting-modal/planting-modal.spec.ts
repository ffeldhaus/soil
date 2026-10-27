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

  it('should emit select event', () => {
    const { vi } = import.meta.vitest;
    const emitSpy = vi.spyOn(component.cropSelected, 'emit');
    component.select('Wheat');
    expect(emitSpy).toHaveBeenCalledWith('Wheat');
  });

  it('should emit cancel event', () => {
    const { vi } = import.meta.vitest;
    const emitSpy = vi.spyOn(component.plantingCancelled, 'emit');
    component.plantingCancelled.emit();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should fallback to default for unknown crop', () => {
    const config = component.getConfig('Unknown' as any);
    expect(config.label).toBe('Unknown');
    expect(config.image).toBe('acker.webp');
  });

  it('should compute accessible crop impact preview for rotation, soil, and nutrition with 5-step color scale', () => {
    component.selectedParcels = [
      { index: 0, crop: 'Fieldbean', soil: 100, nutrition: 100 },
      { index: 1, crop: 'Fieldbean', soil: 100, nutrition: 100 },
    ];

    const wheatAfterBean = component.getCropPreview('Wheat');
    expect(wheatAfterBean.rotationClass).toBe('strong-positive');
    expect(wheatAfterBean.rotationIcon).toBe('▲');
    expect(wheatAfterBean.rotationDetail).toBe('Fruchtfolge +10%');
    expect(wheatAfterBean.soilClass).toBe('slight-negative');
    expect(wheatAfterBean.nutritionClass).toBe('strong-negative');

    const beanMonoculture = component.getCropPreview('Fieldbean');
    expect(beanMonoculture.rotationClass).toBe('strong-negative');
    expect(beanMonoculture.rotationIcon).toBe('▼');
    expect(beanMonoculture.soilClass).toBe('strong-positive');
    expect(beanMonoculture.nutritionClass).toBe('strong-positive');

    const oatAfterBean = component.getCropPreview('Oat');
    expect(oatAfterBean.soilClass).toBe('slight-positive');
    expect(oatAfterBean.nutritionClass).toBe('slight-negative');

    const fallowPreview = component.getCropPreview('Fallow');
    expect(fallowPreview.rotationClass).toBe('neutral');
    expect(fallowPreview.rotationIcon).toBe('━');
    expect(fallowPreview.nutritionClass).toBe('slight-positive');

    const strongPosClasses = component.getImpactBadgeClasses('strong-positive');
    const slightPosClasses = component.getImpactBadgeClasses('slight-positive');
    expect(strongPosClasses).toContain('impact-badge-strong-positive');
    expect(slightPosClasses).toContain('impact-badge-slight-positive');
    expect(strongPosClasses).not.toBe(slightPosClasses);
  });

  it('should format selection summary and toggle Fruchtfolge badge in DOM for uniform vs mixed previous crops', () => {
    fixture.componentRef.setInput('crops', ['Wheat', 'Potato', 'Fieldbean']);
    fixture.componentRef.setInput('selectedParcels', [
      { index: 0, crop: 'Wheat', soil: 100, nutrition: 100 },
      { index: 1, crop: 'Wheat', soil: 100, nutrition: 100 },
    ]);
    fixture.detectChanges();
    expect(component.getSelectionSummary()).toBe('Auswahl: 2 Parzellen (Vorfrucht: Weizen)');
    expect(component.hasUniformPreviousCrop()).toBe(true);
    const uniformBadges = fixture.nativeElement.querySelectorAll('[data-testid="crop-rotation-badge"]');
    expect(uniformBadges.length).toBe(3);
    expect(uniformBadges[0].textContent).toContain('Fruchtfolge');

    fixture.componentRef.setInput('selectedParcels', [
      { index: 0, crop: 'Wheat', soil: 100, nutrition: 100 },
      { index: 1, crop: 'Potato', soil: 100, nutrition: 100 },
    ]);
    fixture.detectChanges();
    expect(component.getSelectionSummary()).toBe('Auswahl: 2 Parzellen (Gemischte Vorfrucht)');
    expect(component.hasUniformPreviousCrop()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="crop-rotation-badge"]').length).toBe(0);
  });
});

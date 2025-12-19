import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Parcel } from './parcel';

describe('Parcel', () => {
  let component: Parcel;
  let fixture: ComponentFixture<Parcel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Parcel]
    })
      .compileComponents();

    fixture = TestBed.createComponent(Parcel);
    component = fixture.componentInstance;
    component.parcel = {
      index: 0,
      crop: 'Grass',
      soil: 100,
      nutrition: 100
    };
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
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperAdmin } from './super-admin';

describe('SuperAdmin', () => {
  let component: SuperAdmin;
  let fixture: ComponentFixture<SuperAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperAdmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuperAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

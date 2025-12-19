import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRegister } from './admin-register';

describe('AdminRegister', () => {
  let component: AdminRegister;
  let fixture: ComponentFixture<AdminRegister>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRegister]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminRegister);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

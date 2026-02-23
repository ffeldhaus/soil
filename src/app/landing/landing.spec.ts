import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { FIREBASE_AUTH, FIREBASE_FUNCTIONS } from '../firebase.config';
import { Landing } from './landing';

describe('Landing', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;
  let authMock: any;
  let functionsMock: any;
  let authServiceMock: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([]),
        provideClientHydration(withIncrementalHydration()),
        { provide: FIREBASE_AUTH, useValue: authMock },
        { provide: FIREBASE_FUNCTIONS, useValue: functionsMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

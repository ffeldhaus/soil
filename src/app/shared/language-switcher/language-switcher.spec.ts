import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageSwitcherComponent } from './language-switcher';
import { LanguageService } from '../../services/language.service';

describe('LanguageSwitcherComponent', () => {
  let component: LanguageSwitcherComponent;
  let fixture: ComponentFixture<LanguageSwitcherComponent>;
  let languageServiceMock: any;

  beforeEach(async () => {
    languageServiceMock = {
      currentLang: 'de',
      setLanguage: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LanguageSwitcherComponent],
      providers: [{ provide: LanguageService, useValue: languageServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle isOpen signal when toggle() is called', () => {
    expect(component.isOpen()).toBe(false);
    component.toggle();
    expect(component.isOpen()).toBe(true);
    component.toggle();
    expect(component.isOpen()).toBe(false);
  });

  it('should call setLanguage and close menu when setLang is called', () => {
    component.isOpen.set(true);
    component.setLang('en');
    expect(languageServiceMock.setLanguage).toHaveBeenCalledWith('en');
    expect(component.isOpen()).toBe(false);
  });

  it('should close menu on document click outside', () => {
    component.isOpen.set(true);
    document.dispatchEvent(new MouseEvent('click'));
    expect(component.isOpen()).toBe(false);
  });
});

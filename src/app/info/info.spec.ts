import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { INFO_FAQ_ITEMS } from '../app.routes';
import { InfoComponent } from './info';

describe('InfoComponent', () => {
  let component: InfoComponent;
  let fixture: ComponentFixture<InfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('uses INFO_FAQ_ITEMS from app.routes.ts as single source of truth and renders all FAQ items', () => {
    expect(component.faqItems).toBe(INFO_FAQ_ITEMS);

    const detailsElements = Array.from(fixture.nativeElement.querySelectorAll('#faq details')) as HTMLDetailsElement[];
    expect(detailsElements).toHaveLength(INFO_FAQ_ITEMS.length);
    expect(detailsElements[0]?.open).toBe(true);

    for (let i = 0; i < INFO_FAQ_ITEMS.length; i++) {
      expect(detailsElements[i]?.textContent).toContain(INFO_FAQ_ITEMS[i].question);
      expect(detailsElements[i]?.textContent).toContain(INFO_FAQ_ITEMS[i].answer);
    }
  });

  it('renders all 16 Bundesländer with hidden="until-found" on unstyled outer wrappers and syncs state on beforematch', () => {
    const wrappers = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="curriculum-state-wrapper"]'),
    ) as HTMLElement[];
    expect(wrappers).toHaveLength(16);

    const activeWrappers = wrappers.filter((el) => el.getAttribute('hidden') === null);
    const untilFoundWrappers = wrappers.filter((el) => el.getAttribute('hidden') === 'until-found');
    expect(activeWrappers).toHaveLength(1);
    expect(activeWrappers[0]?.getAttribute('data-state-id')).toBe('nordrhein-westfalen');
    expect(untilFoundWrappers).toHaveLength(15);

    for (const wrapper of wrappers) {
      expect(wrapper.classList.contains('hidden')).toBe(false);
      expect(wrapper.className).toBe('');
      const styledInner = wrapper.firstElementChild as HTMLElement | null;
      expect(styledInner?.className).toContain('bg-gray-950');
      expect(styledInner?.className).toContain('border');
    }

    const bayernWrapper = wrappers.find((el) => el.getAttribute('data-state-id') === 'bayern');
    expect(bayernWrapper).toBeTruthy();
    bayernWrapper?.dispatchEvent(new Event('beforematch'));
    fixture.detectChanges();

    expect(component.selectedState()).toBe('bayern');
    expect(bayernWrapper?.getAttribute('hidden')).toBeNull();

    const selectEl = fixture.nativeElement.querySelector(
      '[data-testid="curriculum-state-select"]',
    ) as HTMLSelectElement;
    expect(selectEl.value).toBe('bayern');
  });
});

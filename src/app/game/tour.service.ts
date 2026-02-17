import { Injectable, inject } from '@angular/core';
import { ShepherdService } from 'angular-shepherd';

@Injectable({
  providedIn: 'root',
})
export class TourService {
  private shepherdService = inject(ShepherdService);
  private tourKey = 'soil_tour_seen';
  private tourDisabledKey = 'soil_tour_disabled';

  private defaultStepOptions: any = {
    classes: 'shepherd-theme-custom',
    scrollTo: { behavior: 'smooth', block: 'center' },
    cancelIcon: {
      enabled: true,
    },
  };

  private steps: any[] = [
    {
      id: 'welcome',
      title: 'Willkommen bei SOIL!',
      text: 'Lass uns dir kurz zeigen, wie alles funktioniert, damit du erfolgreich wirtschaften kannst.',
      buttons: [
        {
          classes: 'shepherd-button-secondary',
          text: 'Überspringen',
          type: 'cancel',
        },
        {
          classes: 'shepherd-button-primary',
          text: 'Weiter',
          type: 'next',
        },
      ],
    },
    {
      id: 'stats',
      title: 'Dein Kapital',
      text: 'Hier siehst du dein aktuelles Kapital. Wirtschafte klug, um am Ende als Sieger hervorzugehen!',
      attachTo: {
        element: '[data-tour="hud-stats"]',
        on: 'bottom',
      },
      buttons: [
        {
          classes: 'shepherd-button-primary',
          text: 'Weiter',
          type: 'next',
        },
      ],
    },
    {
      id: 'grid',
      title: 'Dein Acker',
      text: 'Das ist dein Spielfeld. Jedes Quadrat ist ein Teilstück deines Ackers.',
      attachTo: {
        element: '[data-tour="game-grid"]',
        on: 'top',
      },
      buttons: [
        {
          classes: 'shepherd-button-primary',
          text: 'Weiter',
          type: 'next',
        },
      ],
    },
    {
      id: 'planting',
      title: 'Anbau',
      text: 'Klicke oder ziehe über Teilstücke, um sie auszuwählen und eine Fruchtfolge festzulegen.',
      attachTo: {
        element: '[data-tour="game-grid"]',
        on: 'top',
      },
      buttons: [
        {
          classes: 'shepherd-button-primary',
          text: 'Weiter',
          type: 'next',
        },
      ],
    },
    {
      id: 'overlays',
      title: 'Informationen',
      text: 'Nutze diese Buttons, um Informationen über Nährstoffe, Ertrag oder Bodenqualität einzublenden.',
      attachTo: {
        element: () => {
          const desktop = document.querySelector('[data-tour="desktop-overlays"]');
          if (desktop && window.getComputedStyle(desktop).display !== 'none') {
            return desktop;
          }
          return document.querySelector('[data-tour="mobile-overlays"]');
        },
        on: 'bottom',
      },
      buttons: [
        {
          classes: 'shepherd-button-primary',
          text: 'Weiter',
          type: 'next',
        },
      ],
    },
    {
      id: 'history',
      title: 'Historie',
      text: 'Mit dem Rundenwähler kannst du dir vergangene Runden ansehen.',
      attachTo: {
        element: '[data-tour="round-selector"]',
        on: 'bottom',
      },
      buttons: [
        {
          classes: 'shepherd-button-primary',
          text: 'Weiter',
          type: 'next',
        },
      ],
    },
    {
      id: 'weather',
      title: 'Umwelt',
      text: 'Achte auf Wetterereignisse und Schädlingsbefall, die deine Ernte beeinflussen können.',
      attachTo: {
        element: () => {
          const el = document.querySelector('[data-tour="weather-pests"]');
          if (el && window.getComputedStyle(el).display !== 'none') {
            return el;
          }
          return null; // Skip if hidden
        },
        on: 'bottom',
      },
      beforeShowPromise: () => {
        return new Promise<void>((resolve) => {
          const el = document.querySelector('[data-tour="weather-pests"]');
          if (!el || window.getComputedStyle(el).display === 'none') {
            // If hidden, just skip this step by going to next or previous
          }
          resolve();
        });
      },
      buttons: [
        {
          classes: 'shepherd-button-primary',
          text: 'Weiter',
          type: 'next',
        },
      ],
    },
    {
      id: 'next-round',
      title: 'Runde beenden',
      text: 'Wenn du alle Entscheidungen getroffen hast, klicke hier, um die Runde abzuschließen.',
      attachTo: {
        element: () => {
          const all = document.querySelectorAll('[data-tour="next-round"]');
          for (let i = 0; i < all.length; i++) {
            if (window.getComputedStyle(all[i]).display !== 'none') {
              return all[i];
            }
          }
          return all[0];
        },
        on: 'bottom',
      },
      buttons: [
        {
          classes: 'shepherd-button-primary',
          text: 'Fertig!',
          type: 'next',
        },
      ],
    },
  ];

  startTour() {
    if (this.isTourDisabled()) {
      return;
    }

    this.shepherdService.defaultStepOptions = this.defaultStepOptions;
    this.shepherdService.modal = true;
    this.shepherdService.confirmCancel = false;
    this.shepherdService.addSteps(this.steps);
    this.shepherdService.start();

    this.shepherdService.tourObject?.on('complete', () => {
      this.markTourAsSeen();
    });

    this.shepherdService.tourObject?.on('cancel', () => {
      this.markTourAsSeen();
    });
  }

  isTourSeen(): boolean {
    return localStorage.getItem(this.tourKey) === 'true';
  }

  markTourAsSeen() {
    localStorage.setItem(this.tourKey, 'true');
  }

  isTourDisabled(): boolean {
    return localStorage.getItem(this.tourDisabledKey) === 'true';
  }

  setTourDisabled(disabled: boolean) {
    if (disabled) {
      localStorage.setItem(this.tourDisabledKey, 'true');
    } else {
      localStorage.removeItem(this.tourDisabledKey);
    }
  }

  resetTour() {
    localStorage.removeItem(this.tourKey);
  }
}

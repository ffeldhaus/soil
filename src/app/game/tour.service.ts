import { Injectable, inject } from '@angular/core';
import { ShepherdService } from 'angular-shepherd';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TourService {
  private shepherdService = inject(ShepherdService);
  private tourKey = 'soil_tour_seen';
  private tourDisabledKey = 'soil_tour_disabled';

  public stepShow$ = new Subject<string>();

  private defaultStepOptions: any = {
    classes: 'shepherd-theme-custom',
    scrollTo: { behavior: 'auto', block: 'center' },
    cancelIcon: {
      enabled: true,
    },
    canClickTarget: false,
  };

  private steps: any[] = [
    {
      id: 'welcome',
      title: 'Willkommen bei SOIL!',
      text: 'Lass uns dir kurz zeigen, wie alles funktioniert, damit du erfolgreich wirtschaften und mehr über nachhaltige Bodenbewirtschaftung lernen kannst.',
      buttons: [
        {
          classes: 'shepherd-button-secondary',
          text: 'Nicht mehr anzeigen',
          action: () => {
            this.setTourDisabled(true);
            this.shepherdService.cancel();
          },
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
      text: 'Hier siehst du dein Kapital. Wirtschafte klug und achte auf die Gesundheit deines Bodens, um langfristig erfolgreich zu sein.',
      attachTo: {
        element: '[data-tour="hud-stats"]',
        on: 'bottom',
      },
      buttons: [
        {
          classes: 'shepherd-button-secondary',
          text: 'Nicht mehr anzeigen',
          action: () => {
            this.setTourDisabled(true);
            this.shepherdService.cancel();
          },
        },
        {
          classes: 'shepherd-button-secondary',
          text: 'Zurück',
          type: 'back',
        },
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
      text: 'Das ist dein Spielfeld. Jedes Quadrat ist ein Teilstück deines Ackers mit individueller Bodenqualität und Nährstoffgehalt.',
      attachTo: {
        element: '[data-tour="game-grid"]',
        on: 'top',
      },
      buttons: [
        {
          classes: 'shepherd-button-secondary',
          text: 'Nicht mehr anzeigen',
          action: () => {
            this.setTourDisabled(true);
            this.shepherdService.cancel();
          },
        },
        {
          classes: 'shepherd-button-secondary',
          text: 'Zurück',
          type: 'back',
        },
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
      text: 'Wähle Teilstücke aus, um eine Fruchtfolge festzulegen. Eine gute Planung schützt den Boden und sichert deine Erträge.',
      attachTo: {
        element: '[data-tour="game-grid"]',
        on: 'top',
      },
      buttons: [
        {
          classes: 'shepherd-button-secondary',
          text: 'Nicht mehr anzeigen',
          action: () => {
            this.setTourDisabled(true);
            this.shepherdService.cancel();
          },
        },
        {
          classes: 'shepherd-button-secondary',
          text: 'Zurück',
          type: 'back',
        },
        {
          classes: 'shepherd-button-primary',
          text: 'Weiter',
          type: 'next',
        },
      ],
    },
    {
      id: 'select-parcel',
      title: 'Teilstück auswählen',
      text: 'Klicke auf ein Teilstück deines Ackers (oder ziehe über mehrere), um es für den Anbau auszuwählen.',
      attachTo: {
        element: '[data-tour="first-parcel"]',
        on: 'bottom',
      },
      buttons: [
        {
          classes: 'shepherd-button-secondary',
          text: 'Nicht mehr anzeigen',
          action: () => {
            this.setTourDisabled(true);
            this.shepherdService.cancel();
          },
        },
        {
          classes: 'shepherd-button-secondary',
          text: 'Zurück',
          type: 'back',
        },
        {
          classes: 'shepherd-button-primary',
          text: 'Weiter',
          type: 'next',
        },
      ],
    },
    {
      id: 'planting-modal',
      title: 'Frucht wählen',
      text: 'Sobald du Teilstücke ausgewählt hast, öffnet sich dieses Fenster. Hier kannst du entscheiden, was du als nächstes anbauen möchtest.',
      attachTo: {
        element: '[data-tour="planting-modal-title"]',
        on: 'bottom',
      },
      beforeShowPromise: () => {
        return new Promise<void>((resolve) => {
          // We can't easily force open the modal here without potentially breaking state,
          // but we can at least try to find it. If it's not there, the tour will just point to the middle of the screen or skip.
          resolve();
        });
      },
      buttons: [
        {
          classes: 'shepherd-button-secondary',
          text: 'Nicht mehr anzeigen',
          action: () => {
            this.setTourDisabled(true);
            this.shepherdService.cancel();
          },
        },
        {
          classes: 'shepherd-button-secondary',
          text: 'Zurück',
          type: 'back',
        },
        {
          classes: 'shepherd-button-primary',
          text: 'Weiter',
          type: 'next',
        },
      ],
    },
    {
      id: 'planting-modal-crop',
      title: 'Anbau festlegen',
      text: 'Wähle eine Kultur aus. Jede Pflanze hat unterschiedliche Auswirkungen auf Bodenqualität und Nährstoffe.',
      attachTo: {
        element: '[data-tour="planting-modal-first-crop"]',
        on: 'bottom',
      },
      buttons: [
        {
          classes: 'shepherd-button-secondary',
          text: 'Nicht mehr anzeigen',
          action: () => {
            this.setTourDisabled(true);
            this.shepherdService.cancel();
          },
        },
        {
          classes: 'shepherd-button-secondary',
          text: 'Zurück',
          type: 'back',
        },
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
      text: 'Nutze diese Ansichten, um die Bodengesundheit und Nährstoffe im Blick zu behalten – die Grundlage deines Erfolgs.',
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
          classes: 'shepherd-button-secondary',
          text: 'Nicht mehr anzeigen',
          action: () => {
            this.setTourDisabled(true);
            this.shepherdService.cancel();
          },
        },
        {
          classes: 'shepherd-button-secondary',
          text: 'Zurück',
          type: 'back',
        },
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
          classes: 'shepherd-button-secondary',
          text: 'Nicht mehr anzeigen',
          action: () => {
            this.setTourDisabled(true);
            this.shepherdService.cancel();
          },
        },
        {
          classes: 'shepherd-button-secondary',
          text: 'Zurück',
          type: 'back',
        },
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
          classes: 'shepherd-button-secondary',
          text: 'Nicht mehr anzeigen',
          action: () => {
            this.setTourDisabled(true);
            this.shepherdService.cancel();
          },
        },
        {
          classes: 'shepherd-button-secondary',
          text: 'Zurück',
          type: 'back',
        },
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
          classes: 'shepherd-button-secondary',
          text: 'Nicht mehr anzeigen',
          action: () => {
            this.setTourDisabled(true);
            this.shepherdService.cancel();
          },
        },
        {
          classes: 'shepherd-button-secondary',
          text: 'Zurück',
          type: 'back',
        },
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
      this.stepShow$.next('tour-finished');
    });

    this.shepherdService.tourObject?.on('cancel', () => {
      this.markTourAsSeen();
      this.stepShow$.next('tour-cancelled');
    });

    this.shepherdService.tourObject?.on('show', (event: any) => {
      if (event?.step?.id) {
        this.stepShow$.next(event.step.id);
      }
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

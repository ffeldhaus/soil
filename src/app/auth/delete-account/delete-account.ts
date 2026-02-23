import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-delete-account',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="h-full overflow-y-auto custom-scrollbar relative font-sans text-gray-100">
      <!-- Background Image -->
      <div class="fixed inset-0 h-screen w-screen -z-10 pointer-events-none">
        <picture>
          <source srcset="assets/images/bauernhof-portrait-dunkel.webp" media="(orientation: portrait)" />
          <img
            src="assets/images/bauernhof-landscape-dunkel.webp"
            alt=""
            fetchpriority="high"
            class="w-full h-full object-cover portrait:object-center landscape:object-center"
          />
        </picture>
      </div>

      <!-- Navigation Bar -->
      <nav
        class="bg-gray-900/95 border-b border-gray-700 backdrop-blur shadow-lg px-6 py-1 fixed top-0 left-0 right-0 z-[101] flex items-center justify-between shrink-0 h-10 print:hidden"
      >
        <div class="flex items-center gap-4">
          <h1 class="text-xl font-bold font-sans text-emerald-500 tracking-wider">SOIL</h1>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/"
            class="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition w-10 h-10 flex items-center justify-center"
            title="Zur Startseite"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </a>
        </div>
      </nav>

      <div class="relative z-10 max-w-2xl mx-auto pt-[100px] pb-12 px-4 space-y-8 animate-fade-in">
        <div class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-6">
          <h1 class="text-3xl font-bold text-red-500">
            {{ isGuest() ? 'Lokale Daten löschen' : 'Konto löschen' }}
          </h1>
          
          <p class="text-white leading-relaxed">
            Wir bedauern, dass Sie uns verlassen möchten. Bitte beachten Sie, dass die Löschung 
            {{ isGuest() ? 'Ihrer lokalen Spieldaten' : 'Ihres Kontos' }} endgültig ist.
          </p>

          <div class="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 space-y-4">
            <h2 class="text-lg font-bold text-red-400 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Was passiert bei der Löschung?
            </h2>
            <ul class="list-disc list-inside text-gray-200 space-y-2 text-sm ml-2">
              @if (isGuest()) {
                <li>Alle lokal in Ihrem Browser gespeicherten Spieldaten (z.B. lokale Spiele) werden unwiderruflich gelöscht.</li>
                <li>Ihre anonyme Gast-Sitzung wird beendet.</li>
              } @else {
                <li>Alle Ihre persönlichen Daten (Name, E-Mail) werden unwiderruflich gelöscht.</li>
                <li>Sämtliche von Ihnen erstellten Cloud-Spiele und deren Spielstände werden vollständig entfernt.</li>
                <li>Lokal gespeicherte Entwürfe und Einstellungen werden ebenfalls gelöscht.</li>
              }
              <li>Anonymisierte Forschungsdaten und anonymes Feedback bleiben erhalten, können aber nicht mehr mit Ihnen in Verbindung gebracht werden.</li>
              <li>Dieser Vorgang kann nicht rückgängig gemacht werden.</li>
            </ul>
          </div>

          @if (error()) {
            <div class="bg-red-900/40 border border-red-500 text-red-200 px-4 py-3 rounded-xl text-sm">
              {{ error() }}
            </div>
          }

          <div class="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              (click)="confirmDeletion()"
              [disabled]="loading()"
              class="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              @if (loading()) {
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Wird gelöscht...
              } @else {
                {{ isGuest() ? 'Lokale Daten jetzt unwiderruflich löschen' : 'Konto und Daten jetzt unwiderruflich löschen' }}
              }
            </button>
            
            <a
              routerLink="/"
              [class.pointer-events-none]="loading()"
              class="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all border border-gray-600 flex items-center justify-center text-center"
            >
              Abbrechen
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal for final confirmation -->
    @if (showConfirmModal()) {
      <div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" (click)="showConfirmModal.set(false)"></div>
        <div class="bg-gray-900 border border-gray-700 p-8 rounded-3xl shadow-2xl relative z-10 max-w-md w-full space-y-6">
          <h3 class="text-2xl font-bold text-white">Sind Sie absolut sicher?</h3>
          <p class="text-white">
            Diese Aktion löscht {{ isGuest() ? 'alle Ihre lokalen Spieldaten' : 'alle Ihre Daten und Ihr Konto' }} dauerhaft. Eine Wiederherstellung ist nicht möglich.
          </p>
          <div class="flex gap-4">
            <button
              (click)="deleteAccount()"
              class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              Ja, endgültig löschen
            </button>
            <button
              (click)="showConfirmModal.set(false)"
              class="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all border border-gray-600"
            >
              Nein
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class DeleteAccountComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  showConfirmModal = signal(false);

  currentUser = signal(this.authService.currentUser);
  isGuest = computed(() => !this.currentUser() || this.currentUser()?.isAnonymous);

  constructor() {
    this.authService.user$.subscribe((user) => {
      this.currentUser.set(user);
    });
  }

  confirmDeletion() {
    this.showConfirmModal.set(true);
  }

  async deleteAccount() {
    this.showConfirmModal.set(false);
    this.loading.set(true);
    this.error.set(null);

    try {
      if (this.isGuest()) {
        // Clear all local data related to the game
        const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
        if (isBrowser) {
          // Find all keys starting with 'soil-' or other relevant prefixes
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('soil') || key.startsWith('firebase:'))) {
              keysToRemove.push(key);
            }
          }
          for (const key of keysToRemove) {
            localStorage.removeItem(key);
          }
        }
        await this.authService.logout();
      } else {
        // Clear local storage too for authenticated users
        const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
        if (isBrowser) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('soil') || key.startsWith('firebase:'))) {
              keysToRemove.push(key);
            }
          }
          for (const key of keysToRemove) {
            localStorage.removeItem(key);
          }
        }
        await this.authService.deleteAccount();
      }

      // After successful deletion, navigate to landing page
      this.router.navigate(['/']);
    } catch (err: any) {
      this.error.set(err.message || 'Fehler beim Löschen. Bitte versuchen Sie es später erneut.');
      this.loading.set(false);
    }
  }
}

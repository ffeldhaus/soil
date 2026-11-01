import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { BackButtonComponent } from '../../shared/back-button/back-button';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-delete-account',
  standalone: true,
  imports: [RouterLink, BackButtonComponent],
  templateUrl: './delete-account.html',
})
export class DeleteAccountComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  loading = signal(false);
  error = signal<string | null>(null);
  showConfirmModal = signal(false);

  currentUser = signal(this.authService.currentUser);
  isGuest = computed(() => !this.currentUser() || this.currentUser()?.isAnonymous);

  constructor() {
    this.authService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.currentUser.set(user);
    });
  }

  confirmDeletion() {
    this.showConfirmModal.set(true);
  }

  private clearSoilLocalStorage(): void {
    const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (!isBrowser) return;

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

  async deleteAccount() {
    this.showConfirmModal.set(false);
    this.loading.set(true);
    this.error.set(null);

    try {
      this.clearSoilLocalStorage();
      if (this.isGuest()) {
        await this.authService.logout();
      } else {
        await this.authService.deleteAccount();
      }
      this.router.navigate(['/']);
    } catch (err: any) {
      this.error.set(err.message || 'Fehler beim Löschen. Bitte versuche es später erneut.');
      this.loading.set(false);
    }
  }
}

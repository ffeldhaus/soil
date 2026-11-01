import { ChangeDetectorRef, Component, inject, NgZone, type OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';

import { BackButtonComponent } from '../../shared/back-button/back-button';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-player-login',
  standalone: true,
  imports: [ReactiveFormsModule, BackButtonComponent],
  templateUrl: './player-login.html',
})
export class PlayerLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  t(key: string): string {
    const translations: Record<string, string> = {
      'playerLogin.placeholder.gameId': 'Game ID',
      'playerLogin.placeholder.pin': 'Unique Player PIN',
      'playerLogin.enteringGame': 'Betrete Spiel...',
      'playerLogin.backToHome': 'Zurück zur Startseite',
      'playerLogin.error.title': 'Anmeldung fehlgeschlagen',
      'playerLogin.error.retry': 'Erneut versuchen',
    };
    return translations[key] || key;
  }

  loginForm = this.fb.group({
    gameId: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(3)]],
  });

  private autoSubmitted = false;
  isLoading = false;
  showErrorModal = false;
  showPassword = false;
  errorMessage = '';
  private isSubmitting = false;

  async ngOnInit() {
    this.authService.user$.pipe(first()).subscribe((user) => {
      if (user?.uid.startsWith('player-')) {
        this.router.navigate(['/game'], { replaceUrl: true });
        return;
      }

      this.route.queryParams.pipe(first()).subscribe(async (params) => {
        const { gameId, pin } = params;
        if (gameId && pin) {
          this.loginForm.patchValue({ gameId, password: pin });
          const gId = this.loginForm.get('gameId');
          const pass = this.loginForm.get('password');
          gId?.markAsTouched();
          gId?.markAsDirty();
          pass?.markAsTouched();
          pass?.markAsDirty();
          this.cdr.detectChanges();

          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              if (this.autoSubmitted) return;
              this.ngZone.run(() => {
                if (!this.showErrorModal) {
                  this.autoSubmitted = true;
                  this.onSubmit();
                }
              });
            }, 1000);
          });
        }
      });
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.isSubmitting) return;
    if (this.loginForm.invalid) {
      console.warn('Form invalid, skipping submission:', this.loginForm.errors);
      return;
    }

    this.isSubmitting = true;
    this.isLoading = true;
    this.errorMessage = '';
    this.showErrorModal = false;
    this.cdr.detectChanges();

    const { gameId, password } = this.loginForm.value;
    if (!gameId || !password) return;

    try {
      await this.authService.loginAsPlayer(gameId, password);
      await this.router.navigate(['/game'], { replaceUrl: true });
    } catch (err: unknown) {
      console.error('Login failed:', err);
      this.errorMessage = (err as Error).message || 'playerLogin.error.msg';
      this.showErrorModal = true;
    } finally {
      this.isLoading = false;
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  closeModal() {
    this.showErrorModal = false;
  }
}

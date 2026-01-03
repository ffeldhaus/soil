import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher';

@Component({
  selector: 'app-player-login',
  standalone: true,
  imports: [TranslocoPipe, CommonModule, ReactiveFormsModule, RouterLink, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen relative flex items-center justify-center bg-gray-900 text-gray-100 font-sans p-6 overflow-hidden">
      <!-- Language Switcher -->
      <div class="absolute top-6 right-6 z-[100]">
        <app-language-switcher></app-language-switcher>
      </div>
      
      <!-- Background Image with Overlay -->
      <div class="absolute inset-0 z-0">
        <img src="assets/bauernhof.jpg" alt="Farm Background" class="w-full h-full object-cover object-center opacity-30">
        <div class="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90 backdrop-blur-[2px]"></div>
      </div>

      <div class="relative z-10 w-full max-w-md bg-gray-800/80 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-gray-700">
        <h2 class="text-3xl font-bold text-center mb-8 text-emerald-400" >{{ 'playerLogin.title' | transloco }}</h2>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit($event)" class="space-y-6">
          
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2" >{{ 'playerLogin.gameId' | transloco }}</label>
            <input formControlName="gameId" type="text" data-testid="player-login-gameid" class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white uppercase" placeholder="Game ID" [placeholder]="'playerLogin.placeholder.gameId' | transloco">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2" >{{ 'playerLogin.pin' | transloco }}</label>
            <input formControlName="password" type="password" data-testid="player-login-pin" class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-white uppercase" placeholder="Unique Player PIN" [placeholder]="'playerLogin.placeholder.pin' | transloco">
          </div>

          <button type="submit" [disabled]="loginForm.invalid || isLoading" data-testid="player-login-submit" class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition transform active:scale-95 shadow-lg">
            <ng-container *ngIf="isLoading" >{{ 'playerLogin.enteringGame' | transloco }}</ng-container>
            <ng-container *ngIf="!isLoading" >{{ 'playerLogin.startGame' | transloco }}</ng-container>
          </button>
        </form>

        <div class="mt-8 pt-6 border-t border-gray-700 text-center space-y-4">
            <a routerLink="/" class="text-gray-400 hover:text-white text-sm transition" >{{ 'playerLogin.backToHome' | transloco }}</a>
        </div>
      </div>

      <!-- Error Modal -->
      <div *ngIf="showErrorModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" (click)="closeModal()">
        <div class="bg-gray-800 border border-red-500/50 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative" (click)="$event.stopPropagation()">
            <div class="flex flex-col items-center text-center gap-4">
                <div class="p-3 bg-red-900/30 rounded-full text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-white mb-2">{{ 'playerLogin.error.title' | transloco }}</h3>
                    <p class="text-gray-300">{{ errorMessage }}</p>
                </div>
                <button (click)="closeModal()" class="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition">
                    {{ 'playerLogin.error.retry' | transloco }}
                </button>
            </div>
        </div>
      </div>
    </div>
  `
})
export class PlayerLoginComponent implements OnInit {
  private transloco = inject(TranslocoService);

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  loginForm = this.fb.group({
    gameId: ['', [Validators.required, Validators.minLength(20)]], // Game IDs are long Firestore IDs
    password: ['', [Validators.required, Validators.minLength(4)]] // PINs usually 6
  });

  private autoSubmitted = false;

  async ngOnInit() {
    console.log('PlayerLoginComponent initialized');

    // 1. Check if user is already logged in as a player
    this.authService.user$.pipe(first()).subscribe(user => {
      if (user && user.uid.startsWith('player-')) {
        console.log('User already logged in as player, navigating to /game...');
        this.router.navigate(['/game'], { replaceUrl: true });
        return;
      }

      // 2. Only if not logged in, handle auto-login params
      this.route.queryParams.pipe(first()).subscribe(async params => {
        const { gameId, player, pin } = params;
        if (gameId && pin) { // player param no longer strictly required if we use pin for lookup
          console.log('Detected auto-login params:', { gameId, pin });
          // Auto-fill form
          this.loginForm.patchValue({ gameId, password: pin });

          // Mark as touched and dirty to help browsers recognize interaction
          const gId = this.loginForm.get('gameId');
          const pass = this.loginForm.get('password');
          gId?.markAsTouched();
          gId?.markAsDirty();
          pass?.markAsTouched();
          pass?.markAsDirty();

          this.cdr.detectChanges();

          // Use NgZone to ensure the timeout runs within Angular's tracking
          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              if (this.autoSubmitted) return;
              this.ngZone.run(() => {
                console.log('Triggering auto-submission...');
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

  isLoading = false;
  showErrorModal = false;
  errorMessage = '';

  private isSubmitting = false;

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
    console.log('Submitting login for gameId:', gameId);

    try {
      await this.authService.loginAsPlayer(gameId!, password!);
      console.log('Login successful. Attempting navigation to /game...');
      const success = await this.router.navigate(['/game'], { replaceUrl: true });
      console.log('Navigation resolved. Success:', success);
    } catch (err: any) {
      console.error('Login failed:', err);
      this.errorMessage = err.message || this.transloco.translate('playerLogin.error.msg');
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

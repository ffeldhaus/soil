// File: frontend/src/app/features/frontpage/login/login.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../../environments/environment'; // For playerEmailDomain fallback (if keeping)

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    NgIf
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  loginForm!: FormGroup;
  isSubmitting = signal(false);
  showPassword = signal(false);

  isPlayerLoginMode = signal(false);
  gameIdQueryParam: string | null = null;
  playerNumberQueryParam: number | null = null;


  ngOnInit(): void {
    this.gameIdQueryParam = this.route.snapshot.queryParamMap.get('gameId');
    const playerNumStr = this.route.snapshot.queryParamMap.get('player');
    if (playerNumStr) {
      this.playerNumberQueryParam = parseInt(playerNumStr, 10);
    }

    if (this.gameIdQueryParam && this.playerNumberQueryParam && !isNaN(this.playerNumberQueryParam)) {
      this.isPlayerLoginMode.set(true);
      this.loginForm = this.fb.group({
        password: ['', [Validators.required]]
      });
      // Pre-fill if needed or handle display logic in template
    } else {
      this.isPlayerLoginMode.set(false);
      const prefillEmail = this.route.snapshot.queryParamMap.get('uid') || this.route.snapshot.queryParamMap.get('email') || '';
      this.loginForm = this.fb.group({
        email: [prefillEmail, [Validators.required, Validators.email]],
        password: ['', [Validators.required]]
      });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  async onSubmit(): Promise<void> { // Changed to async for potential await if needed elsewhere
    if (this.loginForm.invalid) {
      this.notificationService.showError('Please fill in all required fields correctly.');
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);

    if (this.isPlayerLoginMode() && this.gameIdQueryParam && this.playerNumberQueryParam) {
      // Player Login using backend custom token flow
      const password = this.loginForm.value.password;
      this.authService.playerLoginWithCredentials(this.gameIdQueryParam, this.playerNumberQueryParam, password).subscribe({
        next: (user) => {
          if (user) {
            this.notificationService.showSuccess('Player login successful!');
            // The AuthService's onAuthStateChanged and processFirebaseUser should handle gameId and role from claims
            this.router.navigate(['/game', user.gameId || this.gameIdQueryParam]);
          } else {
            this.notificationService.showError('Player login failed. Please check your credentials.');
          }
        },
        error: (err) => {
          console.error('Player login error:', err);
          this.notificationService.showError(err.message || 'Player login failed. Invalid credentials or game/player details.');
          this.isSubmitting.set(false);
        },
        complete: () => this.isSubmitting.set(false)
      });
    } else {
      // Admin Login (or general email/password login)
      const { email, password } = this.loginForm.value;
      this.authService.adminLogin(email, password).subscribe({
        next: (user) => {
          if (user) {
            this.notificationService.showSuccess('Login successful!');
            // Navigate based on role (AuthService's currentUser will be updated)
            if (user.role === 'admin') {
              this.router.navigate(['/admin']);
            } else if (user.role === 'player' && user.gameId) {
              this.router.navigate(['/game', user.gameId]);
            } else {
              this.router.navigate(['/frontpage/overview']); // Fallback
            }
          }
          // No 'else' needed here, error will be caught in 'error' block
        },
        error: (err) => {
          console.error('Login error:', err);
          this.notificationService.showError(err.message || 'Login failed. Invalid email or password.');
          this.isSubmitting.set(false);
        },
        complete: () => this.isSubmitting.set(false)
      });
    }
  }
}
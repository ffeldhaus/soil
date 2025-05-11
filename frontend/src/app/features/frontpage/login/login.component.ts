import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; // For password visibility toggle
import { NgIf } from '@angular/common';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

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

  // For player login from URL params (original Rails app feature)
  isPlayerLoginMode = signal(false);
  gameIdQueryParam: string | null = null;
  playerNumberQueryParam: number | null = null;


  ngOnInit(): void {
    this.gameIdQueryParam = this.route.snapshot.queryParamMap.get('gameId');
    const playerNumStr = this.route.snapshot.queryParamMap.get('player');
    if (playerNumStr) {
      this.playerNumberQueryParam = parseInt(playerNumStr, 10);
    }

    if (this.gameIdQueryParam && this.playerNumberQueryParam) {
      this.isPlayerLoginMode.set(true);
      this.loginForm = this.fb.group({
        // Email field hidden/disabled for player login mode
        password: ['', [Validators.required]]
      });
    } else {
      this.isPlayerLoginMode.set(false);
      this.loginForm = this.fb.group({
        email: [this.route.snapshot.queryParamMap.get('uid') || '', [Validators.required, Validators.email]],
        password: ['', [Validators.required]]
      });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.notificationService.showError('Please fill in all required fields correctly.');
      return;
    }
    this.isSubmitting.set(true);

    try {
      if (this.isPlayerLoginMode()) {
        // Player Login
        const password = this.loginForm.value.password;
        if (this.gameIdQueryParam && this.playerNumberQueryParam) {
          // This requires a backend endpoint that accepts gameId, playerNumber, password
          // and returns a Firebase custom token.
          // For now, we'll simulate a call or use a placeholder.
          console.log(`Attempting player login for game ${this.gameIdQueryParam}, player ${this.playerNumberQueryParam}`);
          // const user = await this.authService.playerLoginWithCredentials(this.gameIdQueryParam, this.playerNumberQueryParam, password);
          
          // TEMP: Assuming player email is derivable for direct Firebase email/pass login
          // This aligns with original Ruby `login: 'player' + this.player + '@game' + this.gameId + '.soil.app'`
          // And backend creates Firebase users with these emails.
          const playerEmail = `player${this.playerNumberQueryParam}.game${this.gameIdQueryParam.substring(0,6)}@${environment.playerEmailDomain || 'soil.game'}`;
          
          this.authService.adminLogin(playerEmail, password).subscribe({
            next: (user) => {
              if (user) {
                this.notificationService.showSuccess('Player login successful!');
                this.router.navigate(['/game', user.gameId]); // Navigate to player's game
              } else {
                this.notificationService.showError('Player login failed. Please check your credentials.');
              }
            },
            error: (err) => {
              console.error('Player login error:', err);
              this.notificationService.showError(err.message || 'Player login failed. Invalid credentials.');
              this.isSubmitting.set(false);
            },
            complete: () => this.isSubmitting.set(false)
          });
        } else {
            this.notificationService.showError('Player login parameters missing.');
            this.isSubmitting.set(false);
        }
      } else {
        // Admin Login
        const { email, password } = this.loginForm.value;
        this.authService.adminLogin(email, password).subscribe({
          next: (user) => {
            if (user) {
              this.notificationService.showSuccess('Admin login successful!');
              this.router.navigate(['/admin']); // Navigate to admin dashboard
            } else {
              // Should not happen if error is caught, but as a fallback
              this.notificationService.showError('Admin login failed. Please check your credentials.');
            }
          },
          error: (err) => {
            console.error('Admin login error:', err);
            this.notificationService.showError(err.message || 'Admin login failed. Invalid email or password.');
            this.isSubmitting.set(false);
          },
          complete: () => this.isSubmitting.set(false)
        });
      }
    } catch (error: any) {
      console.error('Login submission error:', error);
      this.notificationService.showError(error.message || 'An unexpected error occurred during login.');
      this.isSubmitting.set(false);
    }
  }
}
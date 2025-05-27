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
import { TranslateModule } from '@ngx-translate/core';

import { IAuthService } from '../../../core/services/auth.service.interface';
import { AUTH_SERVICE_TOKEN } from '../../../core/services/injection-tokens';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../../environments/environment';
import { User } from '../../../core/models/user.model';

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
    NgIf,
    TranslateModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  // Explicitly type the injected service
  private authService: IAuthService = inject(AUTH_SERVICE_TOKEN);
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
    } else {
      this.isPlayerLoginMode.set(false);
      let defaultEmail = '';
      let defaultPassword = '';

      if (!environment.production && environment.devDefaults) {
        defaultEmail = environment.devDefaults.adminEmail || '';
        defaultPassword = environment.devDefaults.adminPassword || '';
        console.log('LoginComponent: Using dev defaults for admin login');
      } else {
         defaultEmail = this.route.snapshot.queryParamMap.get('uid') || this.route.snapshot.queryParamMap.get('email') || '';
      }

      this.loginForm = this.fb.group({
        email: [defaultEmail, [Validators.required, Validators.email]],
        password: [defaultPassword, [Validators.required]]
      });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit(): void { 
    if (this.loginForm.invalid) {
      this.notificationService.showError('Please fill in all required fields correctly.');
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);

    if (this.isPlayerLoginMode() && this.gameIdQueryParam && this.playerNumberQueryParam) {
      const password = this.loginForm.value.password;
      this.authService.playerLoginWithCredentials(this.gameIdQueryParam, this.playerNumberQueryParam, password).subscribe({
        next: (user: User | null) => {
          if (user) {
            this.notificationService.showSuccess('Player login successful!');
            this.router.navigate(['/game', user.gameId || this.gameIdQueryParam]);
          } else {
             this.notificationService.showError('Player login failed. Please check your credentials.');
             this.isSubmitting.set(false);
          }
        },
        error: (err: Error) => {
          console.error('Player login error:', err);
          this.notificationService.showError(err.message || 'Player login failed. Invalid credentials or game/player details.');
          this.isSubmitting.set(false);
        },
        complete: () => this.isSubmitting.set(false)
      });
    } else {
      const { email, password } = this.loginForm.value;
      this.authService.adminLogin(email, password).subscribe({
        next: (user: User | null) => {
          if (user) {
            this.notificationService.showSuccess('Login successful!');
            if (user.role === 'admin') {
              this.router.navigate(['/admin']);
            } else if (user.role === 'player' && user.gameId) {
              this.router.navigate(['/game', user.gameId]);
            } else {
              this.router.navigate(['/frontpage/overview']);
            }
          }
        },
        error: (err: Error) => {
          console.error('Login error:', err);
          this.notificationService.showError(err.message || 'Login failed. Invalid email or password.');
          this.isSubmitting.set(false);
        },
        complete: () => this.isSubmitting.set(false)
      });
    }
  }
}

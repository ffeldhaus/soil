import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

// Custom validator for password matching
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  } else {
    // Clear the error if they match (or if confirmPassword hasn't been touched yet)
    if (confirmPassword && confirmPassword.hasError('passwordMismatch')) {
      confirmPassword.setErrors(null);
    }
    return null;
  }
}

@Component({
  selector: 'app-admin-register',
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
  templateUrl: './admin-register.component.html',
  styleUrls: ['./admin-register.component.scss']
})
export class AdminRegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  registerForm!: FormGroup;
  isSubmitting = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  constructor() {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(128)]],
      lastName: ['', [Validators.required, Validators.maxLength(128)]],
      institution: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(128)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(128)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.notificationService.showError('Please correct the errors in the form.');
      // Mark all fields as touched to display errors
      this.registerForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);

    const adminData = {
      firstName: this.registerForm.value.firstName,
      lastName: this.registerForm.value.lastName,
      institution: this.registerForm.value.institution,
      email: this.registerForm.value.email,
      password: this.registerForm.value.password,
      // confirmPassword is not sent to backend, used for local validation only
      // user_type is set by backend
    };

    this.authService.adminRegister(adminData).subscribe({
      next: () => { // Removed unused 'response' parameter
        this.notificationService.showSuccess('Registration successful! Please check your email to confirm your account.');
        this.router.navigate(['/frontpage/login'], { queryParams: { email: adminData.email } });
      },
      error: (error) => {
        // console.error('Admin registration error:', error);
        this.notificationService.showError(error.message || 'Registration failed. Please try again.');
        this.isSubmitting.set(false);
      },
      complete: () => {
        this.isSubmitting.set(false);
      }
    });
  }
}
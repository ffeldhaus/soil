import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private snackBar: MatSnackBar = inject(MatSnackBar);

  private defaultConfig: MatSnackBarConfig = {
    duration: 4000, // Default duration in ms
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
  };

  showSuccess(message: string, action: string = 'Dismiss', config?: MatSnackBarConfig): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass: ['snackbar-success'],
      ...config,
    });
  }

  showError(message: string, action: string = 'Dismiss', config?: MatSnackBarConfig): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass: ['snackbar-error'],
      duration: 5000, // Errors might stay longer
      ...config,
    });
  }

  showInfo(message: string, action: string = 'Dismiss', config?: MatSnackBarConfig): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass: ['snackbar-info'],
      ...config,
    });
  }
}
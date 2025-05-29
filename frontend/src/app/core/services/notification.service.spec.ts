import { TestBed } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let matSnackBarMock: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    });
    service = TestBed.inject(NotificationService);
    matSnackBarMock = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('showSuccess', () => {
    it('should call MatSnackBar.open with default success config', () => {
      service.showSuccess('Test Success', 'OK');
      const expectedConfig: MatSnackBarConfig = {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snackbar-success']
      };
      expect(matSnackBarMock.open).toHaveBeenCalledWith('Test Success', 'OK', expectedConfig);
    });

    it('should call MatSnackBar.open with custom success config merged with defaults', () => {
      service.showSuccess('Custom Success', 'Undo', { duration: 1000, horizontalPosition: 'left' });
      const expectedConfig: MatSnackBarConfig = {
        duration: 1000,
        horizontalPosition: 'left',
        verticalPosition: 'bottom', // Default
        panelClass: ['snackbar-success'] // Default
      };
      expect(matSnackBarMock.open).toHaveBeenCalledWith('Custom Success', 'Undo', expectedConfig);
    });
  });

  describe('showError', () => {
    it('should call MatSnackBar.open with default error config', () => {
      service.showError('Test Error', 'Dismiss');
      const expectedConfig: MatSnackBarConfig = {
        duration: 5000, // Error default
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snackbar-error'] // Error default
      };
      expect(matSnackBarMock.open).toHaveBeenCalledWith('Test Error', 'Dismiss', expectedConfig);
    });

    it('should call MatSnackBar.open with custom error config merged with defaults', () => {
      service.showError('Custom Error', 'Close', { verticalPosition: 'top' });
      const expectedConfig: MatSnackBarConfig = {
        duration: 5000, // Error default
        horizontalPosition: 'center', // Default
        verticalPosition: 'top', // Custom
        panelClass: ['snackbar-error'] // Error default
      };
      expect(matSnackBarMock.open).toHaveBeenCalledWith('Custom Error', 'Close', expectedConfig);
    });
  });

  describe('showInfo', () => {
    it('should call MatSnackBar.open with default info config', () => {
      service.showInfo('Test Info', 'Got it');
      const expectedConfig: MatSnackBarConfig = {
        duration: 4000, // Info default (same as general default)
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snackbar-info'] // Info default
      };
      expect(matSnackBarMock.open).toHaveBeenCalledWith('Test Info', 'Got it', expectedConfig);
    });

    it('should call MatSnackBar.open with custom info config merged with defaults, allowing panelClass override', () => {
      service.showInfo('Custom Info', 'Later', { panelClass: ['custom-info-class'] });
      const expectedConfig: MatSnackBarConfig = {
        duration: 4000, // Info default
        horizontalPosition: 'center', // Default
        verticalPosition: 'bottom', // Default
        panelClass: ['custom-info-class'] // Custom
      };
      expect(matSnackBarMock.open).toHaveBeenCalledWith('Custom Info', 'Later', expectedConfig);
    });
  });
});

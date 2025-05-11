import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const notificationService = inject(NotificationService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unknown error occurred!';

      if (error.error instanceof ErrorEvent) {
        // Client-side or network error occurred. Handle it accordingly.
        errorMessage = `Client-side error: ${error.error.message}`;
      } else {
        // The backend returned an unsuccessful response code.
        // The response body may contain clues as to what went wrong.
        errorMessage = `Server error: ${error.status} - ${error.message || ''}`;
        if (error.error && error.error.detail) {
          errorMessage = typeof error.error.detail === 'string' ? error.error.detail : JSON.stringify(error.error.detail);
        } else if (error.error && typeof error.error === 'string') {
           errorMessage = error.error;
        }


        switch (error.status) {
          case 401: // Unauthorized
            notificationService.showError('Your session has expired or you are not authorized. Please log in again.');
            // Perform logout and redirect.
            // Ensure logout doesn't cause an infinite loop if it also makes HTTP calls that fail.
            authService.logout().then(() => {
                // Navigation is handled within logout or can be done here
                // router.navigate(['/frontpage/login']);
            }).catch(logoutErr => console.error("Error during logout after 401:", logoutErr));
            break;
          case 403: // Forbidden
            notificationService.showError('You do not have permission to access this resource or perform this action.');
            // Optionally redirect to an 'access-denied' page or home
            // router.navigate(['/frontpage/overview']);
            break;
          case 400: // Bad Request
            // Often contains validation errors from the backend
            notificationService.showError(`Request error: ${errorMessage}`);
            break;
          case 404: // Not Found
             notificationService.showError(`Resource not found: ${errorMessage}`);
             break;
          case 500: // Internal Server Error
          case 503: // Service Unavailable
            notificationService.showError('A server error occurred. Please try again later.');
            break;
          default:
            if (error.status === 0) { // Network error or CORS issue
                errorMessage = 'Could not connect to the server. Please check your network connection.';
                notificationService.showError(errorMessage);
            } else {
                notificationService.showError(`Error ${error.status}: ${errorMessage}`);
            }
        }
      }
      
      console.error("Global HTTP Error Interceptor caught:", error, "Processed message:", errorMessage);
      return throwError(() => new Error(errorMessage)); // Propagate a user-friendly error message
    })
  );
};
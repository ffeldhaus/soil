import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core'; // Import PLATFORM_ID
import { isPlatformBrowser } from '@angular/common'; // Import isPlatformBrowser
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
  const platformId = inject(PLATFORM_ID); // Inject PLATFORM_ID

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unknown error occurred!';

      // Check if running in a browser environment before using ErrorEvent
      if (isPlatformBrowser(platformId) && error.error instanceof ErrorEvent) {
        // Client-side or network error occurred. Handle it accordingly.
        errorMessage = `Client-side error: ${error.error.message}`;
        notificationService.showError(errorMessage); // Moved notification here for client errors
      } else {
        // Server-side error or non-browser environment.
        // The backend returned an unsuccessful response code or it's an SSR error.
        errorMessage = `Server error: ${error.status} - ${error.message || ''}`;
        if (error.error && error.error.detail) {
          errorMessage = typeof error.error.detail === 'string' ? error.error.detail : JSON.stringify(error.error.detail);
        } else if (error.error && typeof error.error === 'string') {
           errorMessage = error.error;
        }

        switch (error.status) {
          case 401: // Unauthorized
            notificationService.showError('Your session has expired or you are not authorized. Please log in again.');
            authService.logout().then(() => {
                // Navigation is handled within logout or can be done here
            }).catch(logoutErr => console.error("Error during logout after 401:", logoutErr));
            break;
          case 403: // Forbidden
            notificationService.showError('You do not have permission to access this resource or perform this action.');
            break;
          case 400: // Bad Request
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
            // For status 0, only show network error if in browser. SSR can't have network issues in the same way.
            if (error.status === 0 && isPlatformBrowser(platformId)) { 
                errorMessage = 'Could not connect to the server. Please check your network connection.';
                notificationService.showError(errorMessage);
            } else if (error.status !== 0) { // Avoid duplicate messages for status 0 if not browser
                notificationService.showError(`Error ${error.status}: ${errorMessage}`);
            }
        }
      }
      
      console.error("Global HTTP Error Interceptor caught:", error, "Processed message:", errorMessage);
      return throwError(() => new Error(errorMessage)); 
    })
  );
};
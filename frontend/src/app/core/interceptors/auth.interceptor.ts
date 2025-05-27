import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { IAuthService } from '../services/auth.service.interface';
import { AUTH_SERVICE_TOKEN } from '../services/injection-tokens'; 
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Explicitly type the injected service
  const authService: IAuthService = inject(AUTH_SERVICE_TOKEN); 
  const backendApiUrl = environment.apiUrl;

  if (!req.url.startsWith(backendApiUrl)) {
    return next(req);
  }

  const token = authService.getStoredBackendTokenSnapshot(); 

  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(cloned);
  } else {
    return next(req);
  }
};
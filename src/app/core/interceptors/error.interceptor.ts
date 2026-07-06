import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * HTTP interceptor that centralizes handling of authentication/authorization
 * errors returned by the API. Triggers whenever any HttpClient request
 * fails with an HTTP error response, for any endpoint.
 *
 * Behavior:
 * - On HTTP 401 (Unauthorized): logs the user out via AuthService.logout(),
 *   clearing the stored session (token becomes invalid/expired).
 * - On HTTP 403 (Forbidden): redirects the user to the home route ('/'),
 *   since they are authenticated but lack permission for the resource.
 * - In all cases, re-throws the original error so calling code (e.g.
 *   component-level error handling) can still react to it.
 *
 * @param req The outgoing HttpRequest.
 * @param next The next handler in the interceptor chain.
 * @returns An Observable of the HttpEvent stream, or an error observable
 * after performing the side effects above.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError(err => {
      if (err.status === 401) auth.logout();
      if (err.status === 403) router.navigate(['/']);
      return throwError(() => err);
    })
  );
};

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * HTTP interceptor that attaches authentication data to outgoing requests.
 * Triggers on every HttpClient request made by the app.
 *
 * Behavior:
 * - Only touches requests targeting our own API (`environment.apiUrl`).
 *   Requests to third parties (e.g. Nominatim in LocationsService) are
 *   passed through unchanged: adding `withCredentials` to a third-party
 *   request would require that third party to respond with
 *   Access-Control-Allow-Credentials, which it doesn't, and would break
 *   the call.
 * - For requests to our API, clones the request to:
 *   - Set `withCredentials: true`, so the browser sends the httpOnly
 *     session cookie.
 *   - Add an `Authorization: Bearer <token>` header when a token is present
 *     in AuthService (kept for compatibility with the token stored in
 *     localStorage, which is also used by the chat socket connection).
 *
 * @param req The outgoing HttpRequest.
 * @param next The next handler in the interceptor chain.
 * @returns An Observable of the HttpEvent stream for this request.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const token = inject(AuthService).getToken();

  req = req.clone({
    withCredentials: true,
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return next(req);
};

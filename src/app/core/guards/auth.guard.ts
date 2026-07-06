import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard that restricts access to authenticated users only.
 * Applied via `canActivate` on routes/route groups that require a logged-in
 * session (e.g. /user, /chat, /notifications, /moderator, /admin).
 *
 * Behavior:
 * - During SSR (server platform), the guard always allows navigation to
 *   proceed, because the auth token is stored in localStorage, which is
 *   unavailable on the server. Blocking here would incorrectly redirect
 *   any direct/refreshed access to a protected route to /auth/login even
 *   for logged-in users. The real check is deferred to the client, which
 *   has access to localStorage after hydration.
 * - On the client, it checks AuthService.isLoggedIn(): if true, navigation
 *   proceeds; otherwise it redirects to /auth/login via a UrlTree.
 *
 * @returns `true` to allow activation, or a UrlTree redirecting to /auth/login.
 */
export const authGuard: CanActivateFn = () => {
  if (isPlatformServer(inject(PLATFORM_ID))) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/auth/login']);
};

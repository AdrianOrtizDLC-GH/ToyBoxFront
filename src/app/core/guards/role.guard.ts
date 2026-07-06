import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard that restricts access based on the current user's role.
 * Applied together with authGuard on role-restricted routes (e.g.
 * /moderator, /admin), which declare the allowed roles via the route's
 * static `data.roles` array (e.g. ['moderator', 'administrator']).
 *
 * Behavior:
 * - During SSR (server platform), always allows navigation to proceed,
 *   same rationale as authGuard: localStorage (and therefore
 *   AuthService.currentUser()) is unavailable on the server, so the real
 *   role check happens on the client after hydration.
 * - On the client, reads the allowed roles from the matched route's data,
 *   and compares them against the current user's role. If the user exists
 *   and their role is in the allowed list, navigation proceeds; otherwise
 *   it redirects to the home route ('/').
 *
 * @param route The activated route snapshot, used to read `data['roles']`.
 * @returns `true` to allow activation, or a UrlTree redirecting to '/'.
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  if (isPlatformServer(inject(PLATFORM_ID))) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles: string[] = route.data['roles'] ?? [];
  const user = auth.currentUser();
  if (user && allowedRoles.includes(user.role)) return true;
  return router.createUrlTree(['/']);
};

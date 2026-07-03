import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  // Igual que en authGuard: en servidor no hay localStorage, así que
  // currentUser() siempre es null. Dejamos pasar el render en servidor y
  // comprobamos el rol real en el cliente tras la hidratación.
  if (isPlatformServer(inject(PLATFORM_ID))) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles: string[] = route.data['roles'] ?? [];
  const user = auth.currentUser();
  if (user && allowedRoles.includes(user.role)) return true;
  return router.createUrlTree(['/']);
};

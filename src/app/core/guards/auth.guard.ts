import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  // El token solo vive en localStorage, que no existe durante el renderizado
  // en servidor (SSR). Si bloqueamos aquí, cualquier acceso directo a una
  // ruta protegida (recarga o URL escrita a mano) se redirige siempre a
  // /auth/login, aunque el usuario tenga sesión iniciada. Dejamos pasar el
  // render en servidor y delegamos la comprobación real al cliente, que sí
  // tiene acceso a localStorage tras la hidratación.
  if (isPlatformServer(inject(PLATFORM_ID))) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/auth/login']);
};

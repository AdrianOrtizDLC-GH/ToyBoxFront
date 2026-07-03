import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo tocamos peticiones a nuestra propia API. Si añadiéramos
  // withCredentials a peticiones a terceros (p. ej. Nominatim en
  // LocationsService), el navegador exige que ese tercero responda con
  // Access-Control-Allow-Credentials, y como no lo hace, rompería esas
  // llamadas. Así que las dejamos pasar tal cual.
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const token = inject(AuthService).getToken();

  req = req.clone({
    // Necesario para que el navegador mande la cookie httpOnly de sesión.
    // El header Authorization se mantiene igual que antes (compat con el
    // token en localStorage que usa el socket de chat).
    withCredentials: true,
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return next(req);
};

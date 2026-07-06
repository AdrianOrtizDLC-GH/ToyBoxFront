import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

/**
 * Client-side application configuration (standalone Angular app, no NgModules).
 * Registers:
 * - Zoneless change detection (no Zone.js dependency).
 * - The router, configured with the app routes and automatic binding of
 *   route params/data to component inputs.
 * - HttpClient, using the fetch-based backend and the auth/error
 *   interceptors (auth attaches the token/credentials, error handles
 *   401/403 globally).
 * This config is merged with server-only providers in app.config.server.ts for SSR.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor])),
  ],
};

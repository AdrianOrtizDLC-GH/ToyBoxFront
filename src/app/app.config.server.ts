import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

/**
 * Server-only providers, used exclusively when rendering on the server (SSR).
 * Registers the server rendering engine along with the per-route render
 * mode configuration defined in app.routes.server.ts (e.g. which routes
 * are rendered on-demand on the server vs. prerendered/client-rendered).
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes))
  ]
};

// Final application config used by the server entry point (main.server.ts):
// combines the shared client config with the server-specific providers above.
export const config = mergeApplicationConfig(appConfig, serverConfig);

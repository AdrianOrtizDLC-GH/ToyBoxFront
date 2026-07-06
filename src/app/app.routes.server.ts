import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Per-route render mode configuration used by Angular SSR (app.config.server.ts).
 * Routes with dynamic params that need up-to-date, per-request data
 * (product/user/chat/report detail pages) are rendered on the Server per
 * request. The wildcard fallback also renders on the server so that any
 * unmatched route still gets a proper SSR response.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'product/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'user/profile/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'product/edit/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'chat/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'moderator/report/:id',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];

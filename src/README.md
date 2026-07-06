# ToyBox Frontend — Technical README

This document describes the architecture and internal conventions of the ToyBox Angular frontend, located under `src/`.

## 1. High-Level Architecture

- **Framework**: Angular, using the modern **standalone component** model (no `NgModule`s). Every component, guard, and interceptor is a plain standalone unit wired together through `app.config.ts`.
- **Change detection**: Zoneless, enabled via `provideZonelessChangeDetection()` in `app.config.ts` — the app does not depend on `zone.js` for change detection.
- **Routing**: Configured with `provideRouter(routes, withComponentInputBinding())`. `withComponentInputBinding()` automatically binds route params/data to matching `@Input()`s on routed components. All feature pages are **lazy-loaded** via dynamic `import()` in `app.routes.ts`.
- **HTTP**: `provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor]))` — uses the Fetch-based HTTP backend and registers two functional interceptors (see section 3).
- **Server-Side Rendering (SSR)**: The app supports SSR via Angular's `@angular/ssr` package.
  - `app.config.ts` holds the **client** configuration (shared by browser and server).
  - `app.config.server.ts` merges the client config with server-only providers (`provideServerRendering(withRoutes(serverRoutes))`).
  - `app.routes.server.ts` defines the **per-route render mode** for SSR (`RenderMode.Server`) — currently applied to routes with dynamic params that need fresh, per-request data (`product/:id`, `user/profile/:id`, `product/edit/:id`, `chat/:id`, `moderator/report/:id`) plus the wildcard fallback.
  - Entry points: `src/main.ts` (browser bootstrap) and `src/main.server.ts` (server bootstrap), with `src/server.ts` as the Node/Express server used to serve SSR responses.

## 2. Folder Structure

```
src/
├── app/
│   ├── app.ts                  Root standalone component (navbar + router-outlet + footer)
│   ├── app.config.ts           Client application providers (router, HTTP, zoneless CD)
│   ├── app.config.server.ts    Server-only providers, merged with app.config.ts for SSR
│   ├── app.routes.ts           Route table (lazy-loaded feature pages, guards)
│   ├── app.routes.server.ts    Per-route SSR render mode configuration
│   │
│   ├── core/                   App-wide singletons, not tied to any specific page
│   │   ├── guards/             Route guards (auth.guard.ts, role.guard.ts)
│   │   ├── interceptors/       HTTP interceptors (auth.interceptor.ts, error.interceptor.ts)
│   │   └── services/           Injectable services wrapping HttpClient/WebSocket calls
│   │
│   ├── pages/                  Feature/routed components (one folder per route/page),
│   │                           e.g. home, catalog, auth/login, chat/chat-list, admin/*, moderator/*
│   │
│   └── shared/                 Reusable building blocks used across pages
│       ├── components/         Presentational, reusable standalone components
│       │                       (navbar, footer, pagination, toast, modal-confirm, etc.)
│       ├── enums/               TypeScript enums modeling fixed value sets
│       │                       (UserRole, ItemStatus, ConservationStatus, etc.)
│       └── interfaces/          TypeScript interfaces modeling API entities/DTOs
│                                (User, Item, Chat, Report, Review, Reservation, etc.)
│
└── environments/                Per-environment configuration (see section 5)
```

**Design intent**:
- `core/` holds cross-cutting, singleton concerns (auth, HTTP behavior, data access) — things every page may depend on but that don't belong to any single page.
- `pages/` holds route-level, feature-specific components. Each page is lazily loaded and typically composes several `shared/components`.
- `shared/` holds framework-agnostic contracts (`enums`, `interfaces`) and dumb/presentational UI pieces (`components`) with no page-specific business logic.

## 3. Authentication & Authorization Flow

Three pieces cooperate to enforce authentication/authorization: **AuthService**, **guards**, and **interceptors**.

### AuthService (`core/services/auth.service.ts`)
- Holds the session state in a signal (`currentUser`), backed by `localStorage` (`token`, `user` keys) on the browser.
- `login()` / `register()` call the backend (`POST /auth/login`, `POST /auth/register`), then persist the token/user and update the signal.
- `logout()` best-effort calls `POST /auth/logout` (to clear the backend's httpOnly session cookie), clears local storage, resets the signal, and redirects to `/auth/login`.
- `getToken()`, `isLoggedIn()`, `hasRole(role)` are the read APIs used elsewhere (guards, interceptors, templates).
- On the server (SSR), `localStorage` doesn't exist, so `isBrowser` is `false` and all these reads safely return "no session".

### Guards (`core/guards/`)
- **`auth.guard.ts`** (`authGuard`): applied to `canActivate` on routes requiring a logged-in session (`/user/*`, `/notifications`, `/chat/*`, `/moderator/*`, `/admin/*`, `/product/create`, `/product/edit/:id`). During SSR it always allows navigation (no `localStorage` available yet); on the client it checks `AuthService.isLoggedIn()` and redirects to `/auth/login` otherwise.
- **`role.guard.ts`** (`roleGuard`): applied alongside `authGuard` on role-restricted routes (`/moderator/*`, `/admin/*`), which declare allowed roles via route `data.roles`. On the client, compares `AuthService.currentUser()?.role` against the allowed list and redirects to `/` if the user lacks permission. Same SSR pass-through behavior as `authGuard`.

Both guards defer the *real* check to the client after hydration — this avoids incorrectly redirecting a logged-in user away from a protected route on a server-rendered page load.

### Interceptors (`core/interceptors/`)
- **`auth.interceptor.ts`** (`authInterceptor`): for requests targeting our own API (`environment.apiUrl`), clones the request to set `withCredentials: true` (so the httpOnly session cookie is sent) and adds an `Authorization: Bearer <token>` header when a token exists. Requests to third parties (e.g. Nominatim in `LocationsService`) are passed through unchanged.
- **`error.interceptor.ts`** (`errorInterceptor`): centrally reacts to HTTP errors — on `401` it calls `AuthService.logout()`; on `403` it redirects to `/`. The original error is always re-thrown so callers can still handle it locally if needed.

**Flow summary**: guard checks happen *before* navigation (client-side route protection); the interceptor pair handles *every* HTTP call — attaching credentials on the way out, reacting to auth failures on the way back.

## 4. Real-Time Chat (SocketService + ChatService)

Chat has two complementary layers:

- **`ChatService`** (`core/services/chat.service.ts`) — REST-based persistence/history: list the current user's chats (`GET /chats`), fetch a chat (`GET /chats/:id`), start a new chat (`POST /chats`), fetch message history (`GET /chats/:id/messages`), send a message (`POST /chats/:id/messages`), and mark a chat as read (`PATCH /chats/:id/read`). This is what loads the initial state when a chat page is opened.
- **`SocketService`** (`core/services/socket.service.ts`) — real-time layer built on `socket.io-client`:
  - `connect()` opens a WebSocket connection to `environment.apiUrl`, authenticating with the JWT from `AuthService.getToken()`. No-ops if already connected or no token is available.
  - `disconnect()` tears down the socket (called on logout, and automatically via `ngOnDestroy` since the service is `providedIn: 'root'`).
  - `joinConversation(id)` / `leaveConversation(id)` join/leave a server-side room scoped to a single conversation, so the client only receives events relevant to the currently open chat.
  - `onNewMessage<T>()` returns an `Observable` that emits every new message pushed by the server for the joined room.
  - `onEvent<T>(event)` is a generic helper for subscribing to any other named socket event.

**Typical usage pattern** (as implied by the services; page components are not modified by this document): a chat page loads history via `ChatService.getMessages()`, calls `SocketService.connect()` + `joinConversation(chatId)`, subscribes to `onNewMessage()` to append incoming messages live, and calls `leaveConversation(chatId)` when navigating away.

## 5. Service Conventions

All `core/services/*.ts` follow a consistent pattern:

- **Injectable, root-provided**: `@Injectable({ providedIn: 'root' })` — a single app-wide instance, no need to add to any providers array.
- **HttpClient injection**: either via constructor injection (`constructor(private http: HttpClient) {}`) or the `inject()` function (`private http = inject(HttpClient)`), depending on the file — both are equivalent standalone-DI patterns used interchangeably across the codebase.
- **Base URL from environment**: every service builds its endpoint base URL by concatenating `environment.apiUrl` with a resource-specific path segment, e.g.:
  ```ts
  private readonly API = `${environment.apiUrl}/products`;
  ```
- **Typed Observables**: public methods return `Observable<T>` typed against the interfaces in `shared/interfaces/`, keeping HTTP response shapes explicit at the call site.
- **Thin wrappers**: most methods are one-line HTTP calls (`get`/`post`/`put`/`patch`/`delete`); `ProductsService.getAll()` is a notable exception, mapping the raw paginated API response into `ItemCard`/`PaginatedItems` view models via `rxjs`'s `map`.
- **Environment config** (`src/environments/`):
  - `environment.ts` — development config (`production: false`, `apiUrl: 'http://localhost:3000'`).
  - `environment.prod.ts` — production config (`production: true`, `apiUrl` pointing to the deployed backend).
  - Angular's file-replacement mechanism (configured in `angular.json`, not covered here) swaps these at build time; application code always imports from `../../../environments/environment` and never branches on the environment manually.
- **Auth-aware by construction**: because `authInterceptor`/`errorInterceptor` are registered globally, individual services do not need to manually attach tokens or handle 401/403 — they simply call `this.http.*` and rely on the interceptor chain.

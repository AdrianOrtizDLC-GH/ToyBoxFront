# ToyBox Frontend – Angular 21

A modern web application for the ToyBox platform, a second-hand toy marketplace. Full-featured interface for browsing catalog, buying, selling, real-time chat, ratings, and user profile management with role-based access control.

## Features

* Angular 21.2 with standalone components
* TypeScript 5.9 with strict typing
* Bootstrap 5.3 responsive design
* RxJS + Signals for reactive state management
* Real-time chat with Socket.io
* Authentication guards and role-based access
* HTTP interceptors for JWT and error handling
* 40+ reusable components
* Server-side rendering (SSR) compatible
* Modern control-flow syntax (@if, @for)
* CORS enabled

## Getting Started

### Prerequisites

Ensure you have the following installed:
- Node.js 22+
- npm 10+
- Angular CLI 21+
- ToyBox Backend running on `http://localhost:3000`

You can download Node.js from the [Node.js official website](https://nodejs.org/).

### Installation

1. Clone the repository:

```bash
git clone <repository-url> toybox-frontend
cd toybox-frontend
```

2. Navigate to the project directory and install dependencies:

```bash
npm install
```

## Environment Configuration

The frontend is configured in `src/environments/environment.ts`. The default configuration points to `http://localhost:3000` for the backend.

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  socketUrl: 'http://localhost:3000'
};
```

For production, update `src/environments/environment.prod.ts` with your production URLs.

## Running the Application

### Start the development server

```bash
ng serve
```

The application will automatically open at `http://localhost:4200`.

**Note:** Ensure the backend is running on `http://localhost:3000` before starting the frontend.

### Development mode with auto-reload

```bash
ng serve -o
```

This opens the browser automatically and enables hot reloading on file changes.

### Build for production

```bash
ng build --configuration production
```

The compiled files will be generated in the `dist/` directory.

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/                # Guards, interceptors, services (18)
│   │   ├── pages/               # Page components (20+)
│   │   ├── shared/              # Reusable components (20+)
│   │   │   ├── components/
│   │   │   ├── enums/           # 9 enumerations
│   │   │   └── interfaces/      # 11 interfaces
│   │   ├── app.routes.ts        # Route definitions
│   │   ├── app.config.ts        # Angular configuration
│   │   └── environments/        # Environment configs
│   ├── styles.css               # Global styles
│   └── main.ts                  # Bootstrap
├── angular.json
├── tsconfig.json
└── package.json
```

## Documentation

- **GUIA_INSTALACION.md** - Complete installation guide (backend + frontend)
- **USUARIOS_PRUEBA.md** - Test user credentials
- **ARQUITECTURA.md** - System architecture and design
- **docs/DOCUMENTACION_API.md** - API endpoints reference (40+)
- **docs/GUIA_ROLES_Y_PERMISOS.md** - Role-based access control
- **docs/GUIA_DESARROLLO.md** - Development guidelines
- **docs/GUIA_DEPLOYMENT.md** - Production deployment

## Authentication

The application uses JWT-based authentication. Guards protect routes based on:
- Authentication status (`authGuard`)
- User roles (`roleGuard`)

Protected routes:
- `/user/*` - Requires authentication
- `/moderator/*` - Requires moderator or admin role
- `/admin/*` - Requires admin role

## Main Pages

- **Login / Register** - User authentication
- **Catalog** - Product list with filters
- **Product Detail** - Gallery, reviews, chat
- **My Profile** - Edit profile and avatar
- **My Products** - Manage sales
- **My Purchases** - Purchase history
- **Favorites** - Saved products
- **Chat** - Private messaging
- **Notifications** - Notification center
- **Admin Dashboard** - User and category management (admin only)
- **Moderation Panel** - Report review (moderator only)


## Authors

This project was developed by:

- Adrian Ortiz
- Heimer Martinez
- Jaime Colás
- Jesus Maria Trillo-Figueroa
- Julian Diaz
- Luna Lopez de la Fuente

Master  Full Stack  - UNIR (2026)
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { NotificationsComponent } from './pages/notifications/notifications';

export const routes: Routes = [
  // Public
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.Home),
  },
  {
    path: 'catalog',
    loadComponent: () => import('./pages/catalog/catalog').then(m => m.CatalogComponent),
  },

  {
    path: 'terms',
    loadComponent: () => import('./pages/terms/terms').then(m => m.TermsComponent),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy/privacy').then(m => m.PrivacyComponent),
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact').then(m => m.ContactComponent),
  },
  // Product management (auth required) — debe ir ANTES de product/:id para que /product/create no sea capturado como id
  {
    path: 'product',
    canActivate: [authGuard],
    children: [
      { path: 'create', loadComponent: () => import('./pages/product/create-product/create-product').then(m => m.CreateProductComponent) },
      { path: 'edit/:id', loadComponent: () => import('./pages/product/edit-product/edit-product').then(m => m.EditProductComponent) },
    ],
  },

  {
    path: 'product/:id',
    loadComponent: () => import('./pages/product-detail/product-detail').then(m => m.ProductDetailComponent),
  },

  // Auth
  {
    path: 'auth',
    children: [
      { path: 'login', loadComponent: () => import('./pages/auth/login/login').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./pages/auth/register/register').then(m => m.RegisterComponent) },
      { path: 'forgot-password', loadComponent: () => import('./pages/auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // User (auth required)
  {
    path: 'user',
    canActivate: [authGuard],
    children: [
      { path: 'profile', loadComponent: () => import('./pages/user/profile/profile').then(m => m.ProfileComponent) },
      { path: 'profile/:id', loadComponent: () => import('./pages/user/profile/profile').then(m => m.ProfileComponent) },
      { path: 'edit-profile', loadComponent: () => import('./pages/user/edit-profile/edit-profile').then(m => m.EditProfileComponent) },
      { path: 'my-products', loadComponent: () => import('./pages/user/my-products/my-products').then(m => m.MyProductsComponent) },
      { path: 'my-purchases', loadComponent: () => import('./pages/user/my-purchases/my-purchases').then(m => m.MyPurchasesComponent) },
      { path: 'favorites', loadComponent: () => import('./pages/user/favorites/favorites').then(m => m.FavoritesComponent) },
    ],
  },

  // Notifications
  {
    path: 'notifications',
    canActivate: [authGuard],
    component: NotificationsComponent,
  },


  // Chat (auth required)
  {
    path: 'chat',
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/chat/chat-list/chat-list').then(m => m.ChatList) },
      { path: ':id', loadComponent: () => import('./pages/chat/chat-detail/chat-detail').then(m => m.ChatDetail) },
    ],
  },

  // Moderator (role required)
  {
    path: 'moderator',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['moderator', 'administrator'] },
    children: [
      { path: 'reports', loadComponent: () => import('./pages/moderator/reports-list/reports-list').then(m => m.ReportsListComponent) },
      { path: 'report/:id', loadComponent: () => import('./pages/moderator/report-detail/report-detail').then(m => m.ReportDetailComponent) },
      { path: '', redirectTo: 'reports', pathMatch: 'full' },
    ],
  },

  // Admin (role required)
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrator'] },
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/admin/dashboard/dashboard').then(m => m.AdminDashboardComponent) },
      { path: 'users', loadComponent: () => import('./pages/admin/users-management/users-management').then(m => m.UsersManagementComponent) },
      { path: 'categories', loadComponent: () => import('./pages/admin/categories-management/categories-management').then(m => m.CategoriesManagementComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // 404
  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFoundComponent) },
];

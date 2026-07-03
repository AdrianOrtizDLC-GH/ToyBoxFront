import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

export interface BreadcrumbItem {
  label: string;
  route?: string | string[];
  icon?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css'
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  @Input() items: BreadcrumbItem[] = [];
  @Input() autoGenerate: boolean = true;

  private destroy$ = new Subject<void>();

  private routeLabels: { [key: string]: { label: string; icon?: string } } = {
  'catalog': { label: 'Catálogo', icon: 'shopping_bag' },
  'product': { label: 'Detalles del Producto', icon: 'info' },

  'profile': { label: 'Perfil', icon: 'person' },
  'edit-profile': { label: 'Editar Perfil', icon: 'edit' },
  'my-products': { label: 'Mis Productos', icon: 'store' },
  'my-purchases': { label: 'Mis Compras', icon: 'shopping_cart' },
  'favorites': { label: 'Favoritos', icon: 'favorite' },
  'notifications': { label: 'Notificaciones', icon: 'notifications' },

  'create': { label: 'Crear Producto', icon: 'add_circle' },
  'edit': { label: 'Editar Producto', icon: 'edit' },

  'chat': { label: 'Mensajes', icon: 'mail' },

  'reports': { label: 'Reportes', icon: 'report' },
  'report': { label: 'Detalle del Reporte', icon: 'report_problem' },

  'dashboard': { label: 'Dashboard', icon: 'dashboard' },
  'users': { label: 'Gestión de Usuarios', icon: 'people' },
  'categories': { label: 'Gestión de Categorías', icon: 'category' }
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (this.autoGenerate) {
      this.generateBreadcrumbs();

      this.router.events
        .pipe(
          filter(event => event instanceof NavigationEnd),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.generateBreadcrumbs();
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private generateBreadcrumbs(): void {
    const breadcrumbs: BreadcrumbItem[] = [];

    // ← AGREGAR ESTO:
    const isLoggedIn = this.authService.isLoggedIn();
    const homeRoute = isLoggedIn ? '/catalog' : '/home';

    breadcrumbs.push({
      label: 'Inicio',
      route: homeRoute,  // ← Dinámico según login
      icon: 'home'
    });

    const urlSegments: string[] = [];
    let route = this.activatedRoute.root;

    while (route) {
      const children = route.children;

      if (children.length === 0) {
        break;
      }

      const child = children[0];
      const routeSegments = child.snapshot.url.map(segment => segment.path);

      if (routeSegments.length > 0) {
        routeSegments.forEach(segment => {
          if (!segment.startsWith(':')) {
            urlSegments.push(segment);
          }
        });
      }

      route = child;
    }

    let currentPath = '';
    for (let i = 0; i < urlSegments.length; i++) {
      const segment = urlSegments[i];
      currentPath += `/${segment}`;

      const config = this.routeLabels[segment];
      if (config) {
        breadcrumbs.push({
          label: config.label,
          route: currentPath,
          icon: config.icon
        });
      }
    }

    if (this.items.length === 0) {
      this.items = breadcrumbs;
    }
  }
}

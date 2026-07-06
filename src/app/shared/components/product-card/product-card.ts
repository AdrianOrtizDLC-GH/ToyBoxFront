import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { FavoritesService } from '../../../core/services/favorites.service';
import { AuthService } from '../../../core/services/auth.service';

interface DemoProduct {
  id?: number;
  id_items?: number;
  title: string;
  category: string;
  price: number;
  location: string;
  status?: string | null;
  product_condition?: string | null;
  conservation_status?: string | null;
  image: string;
  badge: string;
}

/**
 * Reusable product card component used to display a summarized product preview
 * (image, category, title, status, price, location) across listing views such as
 * the catalog and the home page. Handles navigation to the product detail page
 * and toggling the favorite state for the current user.
 */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css'
})
export class ProductCardComponent {
  private favoritesService = inject(FavoritesService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Emits the product id whenever the favorite state has been successfully toggled
  @Output() toggleFavorite = new EventEmitter<number>();

  // Whether the current product is marked as a favorite by the logged-in user
  @Input() isFavorite = false;
  // Whether interacting with this card (e.g. viewing detail) requires the user to be authenticated
  @Input() requiresAuth = false;
  // Origin view of the card, used to build the "from" query param when navigating to detail
  @Input() source: 'catalog' | 'home' = 'catalog';

  // Product data to render in the card; defaults to a placeholder demo product
  @Input() product: DemoProduct = {
    id: 0,
    title: 'Juguete Toybox',
    category: 'Categoría',
    price: 0,
    location: 'Sin ubicación',
    status: null,
    product_condition: null,
    image: '/assets/images/Iconos%20categorias/icono_educativo.svg',
    badge: 'published'
  };

  isUpdatingFavorite = false;

  private readonly manualConditionByProductId: Record<number, string> = {
    89: 'Bueno',
    90: 'Bueno',
    91: 'Muy bueno',
    92: 'Bueno'
  };

  private readonly fallbackConditions = [
    'Bueno',
    'Muy bueno',
    'Excelente',
    'Aceptable'
  ];

  get displayStatus(): string {
    return this.getProductConditionLabel();
  }

  /** Human-readable, translated version of the product's publication status badge. */
  get displayBadge(): string {
    return this.translatePublicationStatus(this.product.badge);
  }

  private get productId(): number {
    return Number(this.product?.id ?? this.product?.id_items ?? 0);
  }

  onViewDetail(event: MouseEvent): void {
    event.preventDefault();

    if (this.requiresAuth && !this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.router.navigate(['/product', this.productId], {
      queryParams: {
        from: this.source
      }
    });
  }

  /**
   * Handles the favorite toggle button click. Requires authentication (redirects
   * to login otherwise), optimistically updates the local favorite state, and
   * calls the favorites service to persist the change. Reverts the state and
   * logs an error if the request fails. Emits `toggleFavorite` and dispatches a
   * global DOM event on success so other parts of the app can react.
   * @param event Mouse click event, prevented and stopped from propagating.
   */
  onToggleFavorite(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    if (!this.productId || this.isUpdatingFavorite) return;

    const previousValue = this.isFavorite;

    this.isUpdatingFavorite = true;
    this.isFavorite = !this.isFavorite;

    const request$: Observable<unknown> = this.isFavorite
      ? this.favoritesService.add(this.productId)
      : this.favoritesService.remove(this.productId);

    request$.subscribe({
      next: () => {
        this.isUpdatingFavorite = false;
        this.toggleFavorite.emit(this.productId);

        window.dispatchEvent(new CustomEvent('toybox:favorites-updated', {
          detail: {
            productId: this.productId,
            isFavorite: this.isFavorite,
            delta: previousValue ? -1 : 1
          }
        }));
      },
      error: (err: HttpErrorResponse) => {
        this.isFavorite = previousValue;
        this.isUpdatingFavorite = false;
        console.error('Error actualizando favorito:', err);
      }
    });
  }

  private getProductConditionLabel(): string {
    const rawCondition =
      this.product?.product_condition ??
      this.product?.status ??
      this.product?.conservation_status ??
      '';

    const translatedCondition = this.translateProductCondition(rawCondition);

    if (translatedCondition) {
      return translatedCondition;
    }

    if (this.productId && this.manualConditionByProductId[this.productId]) {
      return this.manualConditionByProductId[this.productId];
    }

    if (!this.productId) {
      return 'Bueno';
    }

    return this.fallbackConditions[this.productId % this.fallbackConditions.length];
  }

  private translateProductCondition(value: string | null | undefined): string {
    const status = String(value ?? '').toLowerCase().trim();

    const labels: Record<string, string> = {
      excellent: 'Excelente',
      very_good: 'Muy bueno',
      good: 'Bueno',
      fair: 'Aceptable',

      excelente: 'Excelente',
      'muy bueno': 'Muy bueno',
      bueno: 'Bueno',
      aceptable: 'Aceptable',

      'como nuevo': 'Excelente',
      'muy buen estado': 'Muy bueno',
      'buen estado': 'Bueno',
      usado: 'Aceptable'
    };

    return labels[status] ?? '';
  }

  private translatePublicationStatus(value: string): string {
    const status = String(value ?? '').toLowerCase().trim();

    const labels: Record<string, string> = {
      available: 'Disponible',
      published: 'Disponible',
      sold: 'Vendido',
      paused: 'Pausado',
      deleted: 'Eliminado',
      draft: 'Borrador',
      under_review: 'En revisión',
      removed: 'Retirado'
    };

    return labels[status] ?? 'Disponible';
  }
}
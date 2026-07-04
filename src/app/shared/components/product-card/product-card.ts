import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { FavoritesService } from '../../../core/services/favorites.service';
import { AuthService } from '../../../core/services/auth.service';

interface DemoProduct {
  id: number;
  title: string;
  category: string;
  price: number;
  location: string;
  status: string;
  image: string;
  badge: string;
}

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

  @Output() toggleFavorite = new EventEmitter<number>();

  @Input() isFavorite = false;
  @Input() requiresAuth = false;
  @Input() source: 'catalog' | 'home' = 'catalog';

  @Input() product: DemoProduct = {
    id: 0,
    title: 'Juguete Toybox',
    category: 'Categoría',
    price: 0,
    location: 'Sin ubicación',
    status: 'good',
    image: '/assets/images/Iconos%20categorias/icono_educativo.svg',
    badge: 'published'
  };

  isUpdatingFavorite = false;

  get displayStatus(): string {
    return this.translateConservationStatus(this.product.status);
  }

  get displayBadge(): string {
    return this.translatePublicationStatus(this.product.badge);
  }

  onViewDetail(event: MouseEvent): void {
    event.preventDefault();

    if (this.requiresAuth && !this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.router.navigate(['/product', this.product.id], {
      queryParams: {
        from: this.source
      }
    });
  }

  onToggleFavorite(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    if (!this.product?.id || this.isUpdatingFavorite) return;

    const previousValue = this.isFavorite;

    this.isUpdatingFavorite = true;
    this.isFavorite = !this.isFavorite;

    const request$: Observable<unknown> = this.isFavorite
      ? this.favoritesService.add(this.product.id)
      : this.favoritesService.remove(this.product.id);

    request$.subscribe({
      next: () => {
        this.isUpdatingFavorite = false;
        this.toggleFavorite.emit(this.product.id);

        window.dispatchEvent(new CustomEvent('toybox:favorites-updated', {
          detail: {
            productId: this.product.id,
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

  private translateConservationStatus(value: string): string {
    const status = String(value ?? '').toLowerCase().trim();

    const labels: Record<string, string> = {
      excellent: 'Como nuevo',
      very_good: 'Muy buen estado',
      good: 'Buen estado',
      fair: 'Usado',
      'como nuevo': 'Como nuevo',
      'muy buen estado': 'Muy buen estado',
      'buen estado': 'Buen estado',
      usado: 'Usado'
    };

    return labels[status] ?? 'Sin estado';
  }

  private translatePublicationStatus(value: string): string {
    const status = String(value ?? '').toLowerCase().trim();

    const labels: Record<string, string> = {
      available: 'Disponible',
      published: 'Publicado',
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

import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FavoritesService } from '../../../core/services/favorites.service';
import { AuthService } from '../../../core/services/auth.service';
import { Observable } from 'rxjs';

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

  @Input() product: DemoProduct = {
    id: 0,
    title: 'Juguete Toybox',
    category: 'Categoría',
    price: 0,
    location: 'Sin ubicación',
    status: 'Buen estado',
    image: '/assets/images/Iconos%20categorias/icono_educativo.svg',
    badge: 'Publicado'
  };

  isUpdatingFavorite = false;

  onViewDetail(event: MouseEvent): void {
    event.preventDefault();
    if (this.requiresAuth && !this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.router.navigate(['/product', this.product.id]);
  }

  onToggleFavorite(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.requiresAuth && !this.authService.isLoggedIn()) {
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
      },
      error: (err: HttpErrorResponse) => {
        this.isFavorite = previousValue;
        this.isUpdatingFavorite = false;
        console.error('Error actualizando favorito:', err);
      }
    });
  }
}
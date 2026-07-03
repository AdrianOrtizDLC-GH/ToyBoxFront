import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FavoritesService } from '../../../core/services/favorites.service';
import { Observable } from 'rxjs';

// DEMO - use interface ItemCard
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

  @Output() toggleFavorite = new EventEmitter<number>();

  @Input() isFavorite = false;

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

  onToggleFavorite(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

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

        if (err.status === 401) {
          alert('Debes iniciar sesión para añadir productos a favoritos.');
          return;
        }

        console.error('Error actualizando favorito:', err);
        alert('No se ha podido actualizar el favorito. Inténtalo de nuevo.');
      }
    });
  }
}
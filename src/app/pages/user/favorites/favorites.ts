import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { FavoritesService } from '../../../core/services/favorites.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { ModalConfirmComponent } from '../../../shared/components/modal-confirm/modal-confirm';
import { ToastComponent } from '../../../shared/components/toast/toast';
import { Item } from '../../../shared/interfaces/item.interface';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule,RouterModule,ProductCardComponent,PaginationComponent, BreadcrumbComponent, LoadingSpinnerComponent, EmptyStateComponent, ModalConfirmComponent, ToastComponent],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export class FavoritesComponent implements OnInit {
  private favoritesService = inject(FavoritesService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService); 

  favorites: Item[] = []; 
  currentPage = 1;
  pageSize = 8;
  totalPages = 1;
  breadcrumbItems: any[] = []; 
  modalConfirmOpen = false;

  productToDeleteId: number | null = null;

  isLoading = false;
  toastVisible = false;
  toastType: 'success' | 'error' | 'warning' | 'info' = 'success';
  toastTitle = '';
  toastMessage = '';


  ngOnInit(): void {
    this.initializeBreadcrumbs();
    this.loadFavorites();
  }

  private initializeBreadcrumbs(): void {
    const isLoggedIn = this.authService.isLoggedIn();
    const homeRoute = isLoggedIn ? '/catalog' : '/home';

    this.breadcrumbItems = [
      { label: 'Inicio', route: homeRoute, icon: 'home' },
      { label: 'Mis Favoritos', icon: 'favorite' }
    ];
  }

  loadFavorites(): void {
    this.isLoading = true;

    this.favoritesService.getMyFavorites().subscribe({
      next: (response: any) => {

        this.favorites = response.map((item: any) => ({
          id_items: item.id_items,
          title: item.title,
          price: item.price,
          location: item.location || 'Sin especificar',
          conservation_status: item.conservation_status || 'published',
          publication_date: item.added_at || new Date().toISOString(),
          
          images: item.images || [],
          
          description: null,
          item_status: 'available',
          fk_seller_id: 0,
          fk_categories_id: 0,
          item_update: null
        } as Item));

        this.updatePagination();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.handleError(err, 'Error al cargar favoritos');
        console.error('Error cargando favoritos:', err);
        this.cdr.markForCheck();
      }
    });
  }

  public getStatusText(conservationStatus: string): string {

    const statusMap: { [key: string]: string } = {
      'draft':        'Borrador',
      'published':    'Publicado',
      'under_review': 'En revisión',
      'removed':      'Retirado',
      'sold':         'Vendido',
      'reserved':     'Reservado'
    };
    return statusMap[conservationStatus] || conservationStatus || 'Publicado';
  }

  private handleError(err: HttpErrorResponse, defaultMessage: string): void {
    if (err.status === 401) {
      this.showToast('error', 'Error', 'Debes iniciar sesión para ver tus favoritos');
    } else if (err.status === 0) {
      this.showToast('error', 'Error', 'Error de conexión. Verifica que el servidor esté corriendo');
    } else {
      this.showToast('error', 'Error', err.error?.error || defaultMessage);
    }
  }

  private showToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    this.toastType = type;
    this.toastTitle = title;
    this.toastMessage = message;
    this.toastVisible = true;

    setTimeout(() => {
      this.toastVisible = false;
    }, 3000);
  }

  get totalFavorites(): number {
    return this.favorites.length;
  }

  get paginatedFavorites(): Item[] { 
    const start = (this.currentPage - 1) * this.pageSize;
    return this.favorites.slice(start, start + this.pageSize);
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.favorites.length / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }

    requestRemoveFavorite(productId: number): void {
    this.productToDeleteId = productId;
    this.modalConfirmOpen = true;
  }

  cancelRemove(): void {
    this.modalConfirmOpen = false;
    this.productToDeleteId = null;
  }

  confirmRemove(): void {
    if (!this.productToDeleteId) return;

    this.favoritesService.remove(this.productToDeleteId).subscribe({
      next: () => {
        this.favorites = this.favorites.filter(f => f.id_items !== this.productToDeleteId);
        this.updatePagination();
        this.showToast('success', 'Eliminado', 'Juguete eliminado de favoritos');

        this.modalConfirmOpen = false;
        this.productToDeleteId = null;
      },
      error: (err: HttpErrorResponse) => {
        this.handleError(err, 'Error al eliminar de favoritos');
        console.error('Error eliminando favorito:', err);
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }
  
  onToastDismissed(): void {
    this.toastVisible = false;
  }
}

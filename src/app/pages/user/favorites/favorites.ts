import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core'; 
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
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConservationStatus } from '../../../shared/enums/conservation-status.enum';


/**
 * Component for viewing and managing the user's saved favorite products.
 * Displays a paginated grid of favorites and allows removing items with
 * a confirmation modal.
 */
@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule,RouterModule,ProductCardComponent,PaginationComponent, BreadcrumbComponent, LoadingSpinnerComponent, EmptyStateComponent, ModalConfirmComponent, ToastComponent],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export class FavoritesComponent implements OnInit, OnDestroy {
  private favoritesService = inject(FavoritesService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  // Emits on component destruction to unsubscribe all pending observables.
  private destroy$ = new Subject<void>();

  favorites: Item[] = [];
  currentPage = 1;
  pageSize = 8;
  totalPages = 1;
  breadcrumbItems: any[] = [];
  modalConfirmOpen = false;

  // Id of the product pending removal confirmation, if any.
  productToDeleteId: number | null = null;

  isLoading = false;
  toastVisible = false;
  toastType: 'success' | 'error' | 'warning' | 'info' = 'success';
  toastTitle = '';
  toastMessage = '';


  /** Angular lifecycle hook. Sets up breadcrumbs and loads the user's favorites. */
  ngOnInit(): void {
    this.initializeBreadcrumbs();
    this.loadFavorites();
  }

  /** Angular lifecycle hook. Completes the destroy subject to unsubscribe observables. */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeBreadcrumbs(): void {
    const isLoggedIn = this.authService.isLoggedIn();
    const homeRoute = isLoggedIn ? '/catalog' : '/home';

    this.breadcrumbItems = [
      { label: 'Inicio', route: homeRoute, icon: 'home' },
      { label: 'Mis Favoritos', icon: 'favorite' }
    ];
  }

  /** Fetches the current user's favorite items and maps them into the Item shape used by the UI. */
  loadFavorites(): void {
    this.isLoading = true;

    this.favoritesService.getMyFavorites()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {

          const mappedItems = response.map((item: any) => ({
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

          this.favorites = mappedItems.filter((item: Item) => item.conservation_status === ConservationStatus.Published);

          this.updatePagination();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading = false;
          this.handleError(err, 'Error al cargar favoritos');
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Translates a conservation status code into a human-readable Spanish label.
   * @param conservationStatus - Raw status value (e.g. 'draft', 'published').
   */
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

  /** Maps common HTTP error statuses to user-facing toast messages. */
  private handleError(err: HttpErrorResponse, defaultMessage: string): void {
    if (err.status === 401) {
      this.showToast('error', 'Error', 'Debes iniciar sesión para ver tus favoritos');
    } else if (err.status === 0) {
      this.showToast('error', 'Error', 'Error de conexión. Verifica que el servidor esté corriendo');
    } else {
      this.showToast('error', 'Error', err.error?.error || defaultMessage);
    }
  }

  /** Displays a toast notification and auto-hides it after 3 seconds. */
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

  /** Recalculates total pages from the favorites count and clamps the current page. */
  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.favorites.length / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }

  /** Opens the confirmation modal for removing a product from favorites. */
  requestRemoveFavorite(productId: number): void {
    this.productToDeleteId = productId;
    this.modalConfirmOpen = true;
  }

  /** Cancels the pending favorite removal and closes the confirmation modal. */
  cancelRemove(): void {
    this.modalConfirmOpen = false;
    this.productToDeleteId = null;
  }

  /** Confirms removal of the selected product from favorites and updates local state/pagination. */
  confirmRemove(): void {
    if (!this.productToDeleteId) return;

    this.favoritesService.remove(this.productToDeleteId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.favorites = this.favorites.filter(f => f.id_items !== this.productToDeleteId);
          this.updatePagination();
          this.showToast('success', 'Eliminado', 'Juguete eliminado de favoritos');

          this.modalConfirmOpen = false;
          this.productToDeleteId = null;
        },
        error: (err: HttpErrorResponse) => {
          this.handleError(err, 'Error al eliminar de favoritos');
        }
      });
  }

  /** Handles pagination component page-change events. */
  onPageChange(page: number): void {
    this.currentPage = page;
  }

  /** Hides the toast when dismissed by the user or its timer. */
  onToastDismissed(): void {
    this.toastVisible = false;
  }
}
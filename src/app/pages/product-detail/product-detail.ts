import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ImageGalleryComponent } from '../../shared/components/image-gallery/image-gallery';
import { ProductCardComponent } from '../../shared/components/product-card/product-card';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb';

import { ProductsService } from '../../core/services/products.service';
import { ReportsService } from '../../core/services/reports.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { ChatService } from '../../core/services/chat.service';
import { ReviewsService } from '../../core/services/reviews.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ProductCondition,
  PRODUCT_CONDITION_LABELS
} from '../../shared/enums/product-condition.enum';

// Fallback labels for product condition values not covered by PRODUCT_CONDITION_LABELS.
const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Como nuevo',
  very_good: 'Muy buen estado',
  good: 'Buen estado',
  fair: 'Usado',
};

// Maps raw item/publication status codes to their user-facing badge text.
const BADGE_LABELS: Record<string, string> = {
  available: 'Disponible',
  sold: 'Vendido',
  paused: 'Pausado',
  deleted: 'Eliminado',
  draft: 'Borrador',
  published: 'Publicado',
  under_review: 'En revisión',
  removed: 'Retirado',
};

// Shape of the product data rendered on the detail page, including seller info and reviews.
interface DetailProduct {
  id: number;
  id_items: number;
  title: string;
  description: string | null;
  price: number;
  location: string;
  status: string;
  product_condition?: ProductCondition | string | null;
  badge: string;
  image: string;
  category: string;
  seller: {
    id_users?: number;
    name: string;
    username?: string;
    profile_picture?: string | null;
    rating: number;
    reviews: number;
    city: string;
  };
  totalViews?: number;
  averageRating?: number;
  reviews?: any[];
}

// Lightweight product shape used for the "related products" carousel/grid.
interface RelatedProduct {
  id: number;
  title: string;
  category: string;
  price: number;
  location: string;
  status: string;
  product_condition?: ProductCondition | string | null;
  image: string;
  badge: string;
}

/**
 * Product detail page component.
 * Displays full information about a single product (images, price, seller, reviews),
 * and allows the logged-in user to add it to favorites, contact the seller via chat,
 * report the listing, and browse related products from the same category.
 */
@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [BreadcrumbComponent, ImageGalleryComponent, ProductCardComponent],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  galleryImages: string[] = [];
  product: DetailProduct = this.emptyProduct();
  relatedProducts: RelatedProduct[] = [];

  isLoading = true;
  error = '';

  // Favorite toggle state and user feedback messages.
  isFavorite = false;
  isUpdatingFavorite = false;
  favoriteMessage = '';
  favoriteError = '';

  // State for starting a chat with the seller.
  isStartingChat = false;
  chatError = '';

  // Selectable reasons shown in the report modal.
  reportReasons: string[] = [
    'Producto inapropiado',
    'Información falsa o engañosa',
    'Producto duplicado',
    'Posible fraude',
    'Producto prohibido',
    'Otro motivo'
  ];

  // Report modal visibility and form state.
  showReportModal = false;
  selectedReportReason = '';
  customReportReason = '';
  isSendingReport = false;
  reportSuccess = '';
  reportError = '';

  // Emits on component destruction to unsubscribe all active observables via takeUntil.
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productsService: ProductsService,
    private reportsService: ReportsService,
    private favoritesService: FavoritesService,
    private chatService: ChatService,
    private reviewsService: ReviewsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Lifecycle hook: subscribes to route parameter changes and loads the
   * corresponding product whenever the `id` route param changes.
   */
  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = Number(params['id']);

        if (id) {
          this.loadProduct(id);
        }
      });
  }

  /**
   * Fetches a product by id, maps it to the view model, resolves its gallery
   * images, and triggers loading of seller reviews and related products.
   * @param id Product identifier (id_items).
   */
  loadProduct(id: number): void {
    this.isLoading = true;
    this.error = '';
    this.favoriteMessage = '';
    this.favoriteError = '';
    this.chatError = '';
    this.reportSuccess = '';
    this.reportError = '';
    this.isFavorite = false;

    this.productsService.getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (raw: any) => {
          this.product = this.mapProduct(raw);

          this.galleryImages = (raw.photos ?? [])
            .map((p: any) => p.photo_url)
            .filter(Boolean);

          if (!this.galleryImages.length && raw.main_photo) {
            this.galleryImages = [raw.main_photo];
          }

          this.isLoading = false;
          this.cdr.markForCheck();

          /*
            Importante:
            No llamamos automáticamente a favoritos porque si el usuario no está logueado
            o el token falla, el interceptor puede mandarnos al login.
          */

          this.loadSellerReviewsSafely(this.product.seller.id_users);
          this.loadRelated(raw.fk_categories_id, id);
        },
        error: (err: any) => {
          this.error = err.status === 404
            ? 'Producto no encontrado.'
            : 'Error al cargar el producto.';

          this.isLoading = false;
          console.error('Error cargando producto:', err);
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Loads up to 4 other products from the same category (excluding the current one)
   * to populate the "related products" section.
   * @param categoryId Category id to filter by.
   * @param excludeId Current product id to exclude from the results.
   */
  private loadRelated(categoryId: number, excludeId: number): void {
    if (!categoryId) {
      this.relatedProducts = [];
      this.cdr.markForCheck();
      return;
    }

    const filters = {
      fk_categories_id: categoryId,
      categoryId,
      category_id: categoryId,
      limit: 8
    } as any;

    this.productsService.getAll(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.relatedProducts = res.items
            .filter(item => item.id_items !== excludeId)
            .filter(item => Number(item.category?.id_categories) === Number(categoryId))
            .slice(0, 4)
            .map(item => ({
              id: item.id_items,
              title: item.title,
              category: item.category?.name ?? 'Sin categoría',
              price: item.price,
              location: item.location,
              product_condition: (item as any).product_condition ?? null,
              status: this.getProductConditionLabel({ product_condition: (item as any).product_condition }),
              image: item.image || '/assets/images/Iconos%20categorias/icono_educativo.svg',
              badge: BADGE_LABELS[item.item_status] ?? item.item_status,
            }));

          this.cdr.markForCheck();
        },
        error: (err: any) => {
          console.error('Error cargando relacionados:', err);
          this.relatedProducts = [];
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Adds or removes the current product from the user's favorites.
   * Requires authentication; dispatches a global `toybox:favorites-updated`
   * event so other parts of the app (e.g. favorites counter) can react.
   */
  onToggleFavorite(): void {
    if (!this.isUserLoggedIn()) {
      this.favoriteError = 'Debes iniciar sesión para añadir favoritos.';
      this.favoriteMessage = '';
      this.cdr.markForCheck();
      return;
    }

    if (!this.product.id_items || this.isUpdatingFavorite) return;

    this.isUpdatingFavorite = true;
    this.favoriteMessage = '';
    this.favoriteError = '';

    const request$: Observable<unknown> = this.isFavorite
      ? this.favoritesService.remove(this.product.id_items)
      : this.favoritesService.add(this.product.id_items);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const wasFavorite = this.isFavorite;

          this.isFavorite = !this.isFavorite;
          this.isUpdatingFavorite = false;

          this.favoriteMessage = this.isFavorite
            ? 'Producto añadido a favoritos.'
            : 'Producto eliminado de favoritos.';

          window.dispatchEvent(new CustomEvent('toybox:favorites-updated', {
            detail: {
              productId: this.product.id_items,
              isFavorite: this.isFavorite,
              delta: wasFavorite ? -1 : 1
            }
          }));

          setTimeout(() => {
            this.favoriteMessage = '';
            this.cdr.markForCheck();
          }, 2500);

          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.isUpdatingFavorite = false;

          if (err.status === 401) {
            this.favoriteError = 'Debes iniciar sesión para añadir favoritos.';
          } else {
            this.favoriteError = 'No se ha podido actualizar favoritos.';
          }

          console.error('Error actualizando favorito:', err);
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Starts (or resumes) a chat conversation with the product's seller and
   * navigates to the chat page. Requires authentication.
   */
  contactSeller(): void {
    if (!this.isUserLoggedIn()) {
      this.chatError = 'Debes iniciar sesión para contactar con el vendedor.';
      this.cdr.markForCheck();
      return;
    }

    if (!this.product.id_items || this.isStartingChat) return;

    this.isStartingChat = true;
    this.chatError = '';

    this.chatService.startChat(this.product.id_items)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chat: any) => {
          this.isStartingChat = false;

          const chatId =
            chat.id_conversations ??
            chat.conversation?.id_conversations ??
            chat.chat?.id_conversations ??
            chat.id_chats ??
            chat.id_chat ??
            chat.id ??
            chat.chat?.id_chats ??
            chat.chat?.id;

          if (chatId) {
            this.router.navigate(['/chat', chatId], {
              queryParams: {
                productId: this.product.id_items,
                product: this.product.title,
                seller: this.product.seller.username || this.product.seller.name
              }
            });
          } else {
            this.router.navigate(['/chat'], {
              queryParams: {
                productId: this.product.id_items,
                product: this.product.title,
                seller: this.product.seller.username || this.product.seller.name
              }
            });
          }

          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.isStartingChat = false;

          if (err.status === 401) {
            this.chatError = 'Debes iniciar sesión para contactar con el vendedor.';
          } else {
            this.chatError = 'No se ha podido abrir el chat con el vendedor.';
          }

          console.error('Error iniciando chat:', err);
          this.cdr.markForCheck();
        }
      });
  }

  /** Navigates to the seller's public profile page. */
  goToSellerProfile(): void {
    if (!this.product.seller.id_users) return;

    this.router.navigate(['/user/profile', this.product.seller.id_users]);
  }

  /**
   * Loads the seller's reviews and computes their average rating.
   * Wrapped in its own error handling so a missing reviews endpoint
   * doesn't break the rest of the product detail page.
   * @param sellerId Seller's user id.
   */
  private loadSellerReviewsSafely(sellerId?: number): void {
    if (!sellerId) return;

    /*
      Esta llamada se deja protegida.
      Si el Back no tiene /reviews/seller/:id, no debe romper la página.
    */

    this.reviewsService.getBySeller(sellerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reviews: any[]) => {
          const totalReviews = reviews.length;

          const totalRating = reviews.reduce((sum, review) => {
            return sum + Number(review.rating ?? review.score ?? 0);
          }, 0);

          const averageRating = totalReviews
            ? Number((totalRating / totalReviews).toFixed(1))
            : 0;

          this.product = {
            ...this.product,
            seller: {
              ...this.product.seller,
              rating: averageRating,
              reviews: totalReviews
            },
            averageRating,
            reviews
          };

          this.cdr.markForCheck();
        },
        error: (err) => {
          console.warn('No se han podido cargar las valoraciones del vendedor:', err);

          this.product = {
            ...this.product,
            seller: {
              ...this.product.seller,
              rating: 0,
              reviews: 0
            },
            averageRating: 0,
            reviews: []
          };

          this.cdr.markForCheck();
        }
      });
  }

  /** Opens the report modal and resets its form state. */
  openReportModal(): void {
    this.reportError = '';
    this.reportSuccess = '';
    this.selectedReportReason = '';
    this.customReportReason = '';
    this.showReportModal = true;
  }

  /** Closes the report modal, unless a report submission is in progress. */
  closeReportModal(): void {
    if (this.isSendingReport) return;

    this.showReportModal = false;
    this.selectedReportReason = '';
    this.customReportReason = '';
    this.reportError = '';
  }

  /**
   * Submits a moderation report for the current product with the selected
   * (or custom) reason. Requires authentication and a non-empty reason.
   */
  submitReport(): void {
    if (!this.isUserLoggedIn()) {
      this.reportError = 'Debes iniciar sesión para reportar un producto.';
      this.cdr.markForCheck();
      return;
    }

    const reason = this.selectedReportReason === 'Otro motivo'
      ? this.customReportReason.trim()
      : this.selectedReportReason;

    if (!reason) {
      this.reportError = 'Selecciona un motivo para enviar el reporte.';
      return;
    }

    if (!this.product?.id_items || this.isSendingReport) return;

    this.isSendingReport = true;
    this.reportError = '';

    this.reportsService.create(this.product.id_items, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSendingReport = false;
          this.showReportModal = false;
          this.reportSuccess = 'Reporte enviado correctamente. Nuestro equipo de moderación lo revisará.';
          this.selectedReportReason = '';
          this.customReportReason = '';

          setTimeout(() => {
            this.reportSuccess = '';
            this.cdr.markForCheck();
          }, 3500);

          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.isSendingReport = false;

          if (err.status === 401) {
            this.reportError = 'Debes iniciar sesión para reportar un producto.';
          } else {
            this.reportError = err.error?.error || 'No se ha podido enviar el reporte. Inténtalo de nuevo.';
          }

          console.error('Error enviando reporte:', err);
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Resolves a human-readable label for a product's condition value,
   * falling back to the local CONDITION_LABELS map or a default string.
   * @param product Object containing a `product_condition` field.
   * @returns Localized condition label.
   */
  getProductConditionLabel(product: Partial<DetailProduct> | any): string {
    const condition = product?.product_condition as ProductCondition | string | null | undefined;

    if (!condition) return 'Sin estado';

    return PRODUCT_CONDITION_LABELS[condition as ProductCondition]
      ?? CONDITION_LABELS[String(condition)]
      ?? 'Sin estado';
  }

  /** Maps a raw API product payload into the DetailProduct view model. */
  private mapProduct(raw: any): DetailProduct {
    return {
      id: raw.id_items,
      id_items: raw.id_items,
      title: raw.title,
      description: raw.description ?? null,
      price: Number(raw.price),
      location: raw.location ?? 'Sin ubicación',
      product_condition: raw.product_condition ?? null,
      status: this.getProductConditionLabel({ product_condition: raw.product_condition }),
      badge: BADGE_LABELS[raw.item_status] ?? raw.item_status ?? '',
      image: raw.main_photo ?? '',
      category: raw.category_name ?? raw.category?.name ?? '',
      seller: {
        id_users: raw.fk_seller_id ?? raw.seller?.id_users ?? raw.seller?.id,
        name: `${raw.first_name ?? ''} ${raw.last_name ?? ''}`.trim() || raw.username || 'Usuario Toybox',
        username: raw.username,
        profile_picture: raw.profile_picture ?? null,
        rating: 0,
        reviews: 0,
        city: raw.seller_city ?? '',
      },
      totalViews: 0,
      averageRating: 0,
      reviews: [],
    };
  }

  /** Convenience wrapper around AuthService to check authentication status. */
  private isUserLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  /** Returns a default/empty DetailProduct used before data has loaded. */
  private emptyProduct(): DetailProduct {
    return {
      id: 0,
      id_items: 0,
      title: '',
      description: null,
      price: 0,
      location: '',
      status: 'Sin estado',
      product_condition: null,
      badge: '',
      image: '',
      category: '',
      seller: {
        name: '',
        rating: 0,
        reviews: 0,
        city: ''
      },
    };
  }

  /** Lifecycle hook: completes the destroy$ subject to unsubscribe all active streams. */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
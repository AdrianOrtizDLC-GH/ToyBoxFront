import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ImageGalleryComponent } from '../../shared/components/image-gallery/image-gallery';
import { ProductsService } from '../../core/services/products.service';
import { ReportsService } from '../../core/services/reports.service';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  under_review: 'En revisión',
  removed: 'Retirado',
  sold: 'Vendido',
};

const BADGE_LABELS: Record<string, string> = {
  available: 'Disponible',
  sold: 'Vendido',
  paused: 'Pausado',
  deleted: 'Eliminado',
};

interface DetailProduct {
  id: number;
  id_items: number;
  title: string;
  description: string | null;
  price: number;
  location: string;
  status: string;
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

interface RelatedProduct {
  id: number;
  title: string;
  category: string;
  price: number;
  location: string;
  image: string;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [ImageGalleryComponent],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  galleryImages: string[] = [];
  product: DetailProduct = this.emptyProduct();
  relatedProducts: RelatedProduct[] = [];

  isLoading = true;
  error = '';

  reportReasons: string[] = [
    'Producto inapropiado',
    'Información falsa o engañosa',
    'Producto duplicado',
    'Posible fraude',
    'Producto prohibido',
    'Otro motivo'
  ];

  showReportModal = false;
  selectedReportReason = '';
  customReportReason = '';
  isSendingReport = false;
  reportSuccess = '';
  reportError = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private productsService: ProductsService,
    private reportsService: ReportsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = Number(params['id']);
        if (id) this.loadProduct(id);
      });
  }

  loadProduct(id: number): void {
    this.isLoading = true;
    this.error = '';

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

  private loadRelated(categoryId: number, excludeId: number): void {
    this.productsService.getAll({ categoryId, limit: 6 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.relatedProducts = res.items
            .filter(item => item.id_items !== excludeId)
            .slice(0, 4)
            .map(item => ({
              id: item.id_items,
              title: item.title,
              category: item.category?.name ?? 'Sin categoría',
              price: item.price,
              location: item.location,
              image: item.image || '/assets/images/Iconos%20categorias/icono_educativo.svg',
            }));

          this.cdr.markForCheck();
        },
        error: (err: any) => {
          console.error('Error cargando relacionados:', err);
        },
      });
  }

  openReportModal(): void {
    this.reportError = '';
    this.reportSuccess = '';
    this.selectedReportReason = '';
    this.customReportReason = '';
    this.showReportModal = true;
  }

  closeReportModal(): void {
    if (this.isSendingReport) return;

    this.showReportModal = false;
    this.selectedReportReason = '';
    this.customReportReason = '';
    this.reportError = '';
  }

  submitReport(): void {
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

  private mapProduct(raw: any): DetailProduct {
    return {
      id: raw.id_items,
      id_items: raw.id_items,
      title: raw.title,
      description: raw.description ?? null,
      price: Number(raw.price),
      location: raw.location ?? 'Sin ubicación',
      status: STATUS_LABELS[raw.conservation_status] ?? raw.conservation_status ?? '',
      badge: BADGE_LABELS[raw.item_status] ?? raw.item_status ?? '',
      image: raw.main_photo ?? '',
      category: raw.category_name ?? raw.category?.name ?? '',
      seller: {
        id_users: raw.fk_seller_id,
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

  private emptyProduct(): DetailProduct {
    return {
      id: 0,
      id_items: 0,
      title: '',
      description: null,
      price: 0,
      location: '',
      status: '',
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
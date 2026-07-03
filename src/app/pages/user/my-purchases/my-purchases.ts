import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';

import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb';

import { AuthService } from '../../../core/services/auth.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { Review } from '../../../shared/interfaces/review.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-my-purchases',
  standalone: true,
  imports: [ CommonModule, RouterModule, PaginationComponent, StarRatingComponent, LoadingSpinnerComponent,EmptyStateComponent,BreadcrumbComponent],
  templateUrl: './my-purchases.html',
  styleUrl: './my-purchases.css',
})
export class MyPurchasesComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly cdr = inject(ChangeDetectorRef);


  breadcrumbItems: any[] = [];

  activeTab: 'purchases' | 'sales' = 'purchases';

  myPurchaseReviews: Review[] = [];
  mySalesReviews: Review[] = [];   

  isLoading = false;
  errorMessage = '';

  currentPage = 1;
  pageSize = 8; 

  ngOnInit(): void {
    this.initializeBreadcrumbs();
    this.loadReviews();
  }

  private initializeBreadcrumbs(): void {
    const isLoggedIn = this.authService.isLoggedIn();
    const homeRoute = isLoggedIn ? '/catalog' : '/home';
    
    this.breadcrumbItems = [
      { label: 'Inicio', route: homeRoute, icon: 'home' },
      { label: 'Mis Compras', icon: 'shopping_cart' }
    ];
  }

  private loadReviews(): void {
    const currentUser = this.authService.currentUser();

    if (!currentUser) {
      this.errorMessage = 'Debes estar autenticado para ver tus reseñas';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      purchases: this.reviewsService.getByReviewer(currentUser.id_users),
      sales: this.reviewsService.getBySeller(currentUser.id_users)
    }).subscribe({
      next: (result) => {
        this.myPurchaseReviews = result.purchases;
        this.mySalesReviews = result.sales;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error cargando reseñas:', err);
        this.handleError(err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private handleError(err: HttpErrorResponse): void {
    if (err.status === 0) {
      this.errorMessage = 'No hay conexión con el servidor';
    } else if (err.status === 401) {
      this.errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente';
    } else if (err.status === 403) {
      this.errorMessage = 'No tienes permiso para ver estas reseñas';
    } else if (err.status === 404) {
      this.errorMessage = 'No se encontraron reseñas';
    } else {
      this.errorMessage = err.error?.message || 'Error al cargar las reseñas. Intenta de nuevo.';
    }
  }

  switchTab(tab: 'purchases' | 'sales'): void {
    this.activeTab = tab;
    this.currentPage = 1;
  }

  get paginatedReviews(): Review[] {
    const list = this.activeTab === 'purchases'
      ? this.myPurchaseReviews
      : this.mySalesReviews;

    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    const list = this.activeTab === 'purchases'
      ? this.myPurchaseReviews
      : this.mySalesReviews;

    return Math.ceil(list.length / this.pageSize);
  }

  get emptyStateTitle(): string {
    return this.activeTab === 'purchases'
      ? 'Aún no has hecho reseñas'
      : 'Aún no tienes reseñas de tus productos';
  }

  get emptyStateMessage(): string {
    return this.activeTab === 'purchases'
      ? 'Compra productos y déjanos tu opinión'
      : 'Cuando otros usuarios compren tus productos, recibirás reseñas aquí';
  }

  getTotalReviewsForUser(userId: number): number {
    if (this.activeTab === 'purchases') {
      return this.myPurchaseReviews.filter(r => r.fk_reviewed_id === userId).length;
    } else {
      return this.mySalesReviews.filter(r => r.fk_reviewer_id === userId).length;
    }
  }

  getProductImage(review: Review): string | null {
    return review.item?.images?.[0]?.photo_url || null;
  }

  getReviewerName(review: Review): string {
    if (this.activeTab === 'purchases') {
      return `${review.reviewed?.first_name || ''} ${review.reviewed?.last_name || ''}`.trim();
    } else {
      return `${review.reviewer?.first_name || ''} ${review.reviewer?.last_name || ''}`.trim();
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }
}
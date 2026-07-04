import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb';
import { ToastComponent } from '../../../shared/components/toast/toast';

import { AuthService } from '../../../core/services/auth.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { ChatService } from '../../../core/services/chat.service';

import { Chat } from '../../../shared/interfaces/chat.interface';
import { Review } from '../../../shared/interfaces/review.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-my-purchases',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PaginationComponent,
    StarRatingComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    BreadcrumbComponent,
    ToastComponent
  ],
  templateUrl: './my-purchases.html',
  styleUrl: './my-purchases.css',
})
export class MyPurchasesComponent implements OnInit, OnDestroy {

  private readonly authService = inject(AuthService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly chatService = inject(ChatService);

  // ✅ NUEVO: Subject para cleanup
  private destroy$ = new Subject<void>();

  // ✅ Signals
  activeTab = signal<'purchases' | 'sales'>('purchases');
  currentPage = signal(1);
  pageSize = 8;

  // ✅ Conversaciones
  myPurchasesConversations = signal<Chat[]>([]);
  mySalesConversations = signal<Chat[]>([]);

  // ✅ Map de reseñas para verificar si existen
  // Formato: "buyer_id_item_id" → Review | null
  reviewsMap = signal<Map<string, Review | null>>(new Map());

  isLoading = signal(false);
  errorMessage = signal('');

  // ✅ Para modal de reseña
  showReviewModal = signal(false);
  selectedConversation: Chat | null = null;
  reviewerRole: 'seller' | 'buyer' = 'seller';
  newRating = signal(0);
  newComment = signal('');

  // Toast
  toastVisible = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('success');
  toastTitle = signal('');
  toastMessage = signal('');

  currentUserId: number | undefined;

  constructor() {
    effect(() => {
      const tab = this.activeTab();
      this.currentPage.set(1);
    });
  }

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  // ✅ NUEVO: OnDestroy para limpiar
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.currentUserId = user.id_users;
      this.loadAllData();
    } else {
      this.errorMessage.set('No hay usuario autenticado');
    }
  }

  /**
   * ✅ CAMBIO: Cargar conversaciones + verificar reseñas
   * Ahora filtra "Mis ventas" usando conservation_status del backend
   */
  private loadAllData(): void {
    if (!this.currentUserId) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    // ✅ CAMBIO: Agregar takeUntil para limpiar subscripción
    this.chatService.getMyChats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chats) => {
          // ✅ MIS COMPRAS: Conversaciones donde soy COMPRADOR
          const purchasesChats = chats.filter(chat =>
            chat.fk_buyer_id === this.currentUserId
          );

          // ✅ MIS VENTAS: SOLO conversaciones donde:
          // 1. Soy el VENDEDOR (fk_seller_id === currentUserId)
          // 2. El producto ESTÁ MARCADO como VENDIDO (conservation_status === 'sold')
          // ✅ CAMBIO CRÍTICO: Ahora usa conservation_status que viene del backend
          const salesChats = chats.filter(chat => {
            const amSeller = chat.fk_seller_id === this.currentUserId;
            // ✅ CAMBIO: Acceder a conservation_status como CAMPO PLANO (no anidado)
            const isSold = chat.conservation_status === 'sold' || chat.item_status === 'sold';

            return amSeller && isSold;
          });

          this.myPurchasesConversations.set(purchasesChats);
          this.mySalesConversations.set(salesChats);

          // ✅ Cargar reseñas para cada conversación
          this.loadReviewsForConversations(purchasesChats);
          this.loadReviewsForConversations(salesChats);

          this.isLoading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.handleError(err);
          this.isLoading.set(false);
        }
      });
  }

  /**
   * ✅ NUEVO: Cargar reseñas para cada conversación
   * Verifica si existe reseña del comprador en cada producto
   * ✅ CAMBIO: Agregar takeUntil para limpiar todas las subscripciones
   */
  private loadReviewsForConversations(chats: Chat[]): void {
    if (!this.currentUserId) return;

    chats.forEach(chat => {
      // ✅ Para cada conversación, verificar si YA EXISTE reseña
      // ✅ CAMBIO: Agregar takeUntil para evitar memory leak
      this.reviewsService.getByProduct(chat.fk_items_id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (reviews) => {
            // Buscar si hay reseña del comprador hacia el vendedor
            const buyerReview = reviews.find(r =>
              r.fk_reviewer_id === chat.fk_buyer_id &&
              r.fk_reviewed_id === chat.fk_seller_id
            ) || null;

            // Guardar en el map: "buyerId_itemId" → review o null
            const key = `${chat.fk_buyer_id}_${chat.fk_items_id}`;
            const newMap = new Map(this.reviewsMap());
            newMap.set(key, buyerReview);
            this.reviewsMap.set(newMap);
          },
          error: () => {
            // Si error, asumir que no existe reseña
            const key = `${chat.fk_buyer_id}_${chat.fk_items_id}`;
            const newMap = new Map(this.reviewsMap());
            newMap.set(key, null);
            this.reviewsMap.set(newMap);
          }
        });
    });
  }

  private handleError(err: HttpErrorResponse): void {
    if (err.status === 0) {
      this.errorMessage.set('No hay conexión con el servidor');
    } else if (err.status === 401) {
      this.errorMessage.set('Tu sesión ha expirado');
    } else {
      this.errorMessage.set(err.error?.message || 'Error al cargar los datos');
    }
  }

  switchTab(tab: 'purchases' | 'sales'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  get paginatedPurchases(): Chat[] {
    const list = this.myPurchasesConversations();
    const start = (this.currentPage() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get paginatedSales(): Chat[] {
    const list = this.mySalesConversations();
    const start = (this.currentPage() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    const list = this.activeTab() === 'purchases'
      ? this.myPurchasesConversations()
      : this.mySalesConversations();
    return Math.ceil(list.length / this.pageSize);
  }

  /**
   * ✅ NUEVO: Obtener reseña para una conversación
   * Retorna Review si existe, null si no existe
   */
  getReviewForConversation(chat: Chat): Review | null {
    const key = `${chat.fk_buyer_id}_${chat.fk_items_id}`;
    return this.reviewsMap().get(key) || null;
  }

  /**
   * ✅ NUEVO: Verificar si ya existe reseña
   */
  hasReview(chat: Chat): boolean {
    return this.getReviewForConversation(chat) !== null;
  }

  /**
   * ✅ CAMBIO: Acceder a estructura PLANA (NO anidada)
   * Antes: chat.item.title
   * Ahora: chat.item_title
   */
  getProductTitle(chat: Chat): string {
    return (chat as any).item_title || 'Producto sin título';
  }

  getProductPrice(chat: Chat): number {
    return (chat as any).item_price || 0;
  }

  getProductPhoto(chat: Chat): string | null {
    return (chat as any).item_photo || null;
  }

  /**
   * ✅ CAMBIO: Acceder a estructura PLANA para seller
   * Antes: chat.seller.username
   * Ahora: chat.seller_username
   */
  getSellerUsername(chat: Chat): string {
    return (chat as any).seller_username || 'Vendedor';
  }

  /**
   * ✅ CAMBIO: Acceder a estructura PLANA para buyer
   * Antes: chat.buyer.username
   * Ahora: chat.buyer_username
   */
  getBuyerUsername(chat: Chat): string {
    return (chat as any).buyer_username || 'Comprador';
  }

  /**
   * ✅ MÉTODO HELPER: Obtener nombre del vendedor
   */
  getSellerUsernameForReview(): string {
    if (!this.selectedConversation) return 'Vendedor';
    return (this.selectedConversation as any).seller_username || 'Vendedor';
  }

  /**
   * ✅ MÉTODO HELPER: Obtener nombre del comprador
   */
  getBuyerUsernameForReview(): string {
    if (!this.selectedConversation) return 'Comprador';
    return (this.selectedConversation as any).buyer_username || 'Comprador';
  }

  /**
   * ✅ NUEVO: Abrir modal de reseña
   */
  openReviewModal(conversation: Chat, role: 'seller' | 'buyer'): void {
    this.selectedConversation = conversation;
    this.reviewerRole = role;
    this.newRating.set(0);
    this.newComment.set('');
    this.showReviewModal.set(true);
  }

  /**
   * ✅ Validar reseña
   */
  isReviewValid(): boolean {
    const rating = this.newRating();
    const comment = this.newComment().trim();
    return rating >= 1 && rating <= 5 && comment.length >= 10;
  }

  /**
   * ✅✅✅ ENVIAR RESEÑA - LÓGICA CORREGIDA ✅✅✅
   * ANTES (INCORRECTO):
   *   fk_reviewed_id: this.reviewerRole === 'seller'
   *     ? this.selectedConversation.fk_seller_id      // ❌ Se reseña a sí mismo
   *     : this.selectedConversation.fk_buyer_id       // ❌ Se reseña a sí mismo
   *
   * AHORA (CORRECTO):
   *   fk_reviewed_id: this.reviewerRole === 'seller'
   *     ? this.selectedConversation.fk_buyer_id       // ✅ Vendedor reseña al COMPRADOR
   *     : this.selectedConversation.fk_seller_id      // ✅ Comprador reseña al VENDEDOR
   */
  submitReview(): void {
    if (!this.isReviewValid() || !this.selectedConversation || !this.currentUserId) return;

    // ✅ CAMBIO CRÍTICO CORREGIDO: Enviar fk_reviewed_id CORRECTO
    const reviewData = {
      rating: this.newRating(),
      comment: this.newComment().trim(),
      fk_items_id: this.selectedConversation.fk_items_id,
      fk_reviewed_id: this.reviewerRole === 'seller'
        ? this.selectedConversation.fk_buyer_id        // ✅ Si soy vendedor, reseño al COMPRADOR
        : this.selectedConversation.fk_seller_id       // ✅ Si soy comprador, reseño al VENDEDOR
    };

    // ✅ CAMBIO: Agregar takeUntil para limpiar
    this.reviewsService.create(reviewData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showToast('success', 'Éxito', 'Reseña enviada correctamente');
          this.showReviewModal.set(false);
          this.loadAllData(); // ✅ Recargar todo
        },
        error: (err) => {
          console.error('Error al guardar reseña:', err);
          this.showToast('error', 'Error', err.error?.error || 'No se pudo guardar la reseña');
        }
      });
  }

  /**
   * ✅ Cancelar reseña
   */
  cancelReview(): void {
    this.showReviewModal.set(false);
    this.newRating.set(0);
    this.newComment.set('');
    this.selectedConversation = null;
  }

  private showToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    this.toastType.set(type);
    this.toastTitle.set(title);
    this.toastMessage.set(message);
    this.toastVisible.set(true);
    setTimeout(() => this.toastVisible.set(false), 3000);
  }

  onToastDismissed(): void {
    this.toastVisible.set(false);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }
}
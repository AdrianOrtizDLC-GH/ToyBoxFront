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

/**
 * Component that lists the user's completed transactions as both a buyer
 * ("purchases") and a seller ("sales"), based on sold chat conversations,
 * and lets the user leave/view reviews for the other party in each deal.
 */
@Component({
  selector: 'app-my-purchases',
  standalone: true,
  imports: [CommonModule,RouterModule,FormsModule,PaginationComponent,StarRatingComponent,LoadingSpinnerComponent,EmptyStateComponent,BreadcrumbComponent,ToastComponent],
  templateUrl: './my-purchases.html',
  styleUrl: './my-purchases.css',
})
export class MyPurchasesComponent implements OnInit, OnDestroy {

  private readonly authService = inject(AuthService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly chatService = inject(ChatService);

  // Emits on component destruction to unsubscribe all pending observables.
  private destroy$ = new Subject<void>();

  // Currently selected tab: purchases (as buyer) vs sales (as seller).
  activeTab = signal<'purchases' | 'sales'>('purchases');
  currentPage = signal(1);
  pageSize = 8;

  myPurchasesConversations = signal<Chat[]>([]);
  mySalesConversations = signal<Chat[]>([]);

  // Cache of reviews keyed by "<buyerId>_<itemId>" to quickly check if a review already exists.
  reviewsMap = signal<Map<string, Review | null>>(new Map());

  isLoading = signal(false);
  errorMessage = signal('');

  // State for the "leave a review" modal flow.
  showReviewModal = signal(false);
  selectedConversation: Chat | null = null;
  reviewerRole: 'seller' | 'buyer' = 'seller';
  newRating = signal(0);
  newComment = signal('');

  toastVisible = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('success');
  toastTitle = signal('');
  toastMessage = signal('');

  currentUserId: number | undefined;

  constructor() {
    // Reset to the first page whenever the active tab changes.
    effect(() => {
      const tab = this.activeTab();
      this.currentPage.set(1);
    });
  }

  /** Angular lifecycle hook. Loads the current user and their transaction data. */
  ngOnInit(): void {
    this.loadCurrentUser();
  }

  /** Angular lifecycle hook. Completes the destroy subject to unsubscribe observables. */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Retrieves the authenticated user and triggers loading their transaction data. */
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
   * Fetches all of the user's chats and splits them into completed purchases
   * (as buyer) and completed sales (as seller), then loads related reviews.
   */
  private loadAllData(): void {
    if (!this.currentUserId) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.chatService.getMyChats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chats) => {
          const purchasesChats = chats.filter(chat => {
            const amBuyer = chat.fk_buyer_id === this.currentUserId;
            const isSold = chat.conservation_status === 'sold' || chat.item_status === 'sold';
            const wasSoldInThisConversation = (chat as any).is_sold_in_this_conversation === 1;
            
            return amBuyer && isSold && wasSoldInThisConversation;
          });

          const salesChats = chats.filter(chat => {
            const amSeller = chat.fk_seller_id === this.currentUserId;
            const isSold = chat.conservation_status === 'sold' || chat.item_status === 'sold';
            const wasSoldInThisConversation = (chat as any).is_sold_in_this_conversation === 1;

            return amSeller && isSold && wasSoldInThisConversation;
          });

          this.myPurchasesConversations.set(purchasesChats);
          this.mySalesConversations.set(salesChats);

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

  /** Loads and caches the buyer's review (if any) for each conversation's product. */
  private loadReviewsForConversations(chats: Chat[]): void {
    if (!this.currentUserId) return;

    chats.forEach(chat => {
      this.reviewsService.getByProduct(chat.fk_items_id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (reviews) => {
            const buyerReview = reviews.find(r =>
              r.fk_reviewer_id === chat.fk_buyer_id &&
              r.fk_reviewed_id === chat.fk_seller_id
            ) || null;

            const key = `${chat.fk_buyer_id}_${chat.fk_items_id}`;
            const newMap = new Map(this.reviewsMap());
            newMap.set(key, buyerReview);
            this.reviewsMap.set(newMap);
          },
          error: () => {
            const key = `${chat.fk_buyer_id}_${chat.fk_items_id}`;
            const newMap = new Map(this.reviewsMap());
            newMap.set(key, null);
            this.reviewsMap.set(newMap);
          }
        });
    });
  }

  /** Maps common HTTP error statuses to user-facing Spanish error messages. */
  private handleError(err: HttpErrorResponse): void {
    if (err.status === 0) {
      this.errorMessage.set('No hay conexión con el servidor');
    } else if (err.status === 401) {
      this.errorMessage.set('Tu sesión ha expirado');
    } else {
      this.errorMessage.set(err.error?.message || 'Error al cargar los datos');
    }
  }

  /** Switches between the "purchases" and "sales" tabs, resetting pagination. */
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

  /** Returns the cached review for a conversation's buyer/item pair, if one exists. */
  getReviewForConversation(chat: Chat): Review | null {
    const key = `${chat.fk_buyer_id}_${chat.fk_items_id}`;
    return this.reviewsMap().get(key) || null;
  }

  hasReview(chat: Chat): boolean {
    return this.getReviewForConversation(chat) !== null;
  }

  getProductTitle(chat: Chat): string {
    return (chat as any).item_title || 'Producto sin título';
  }

  getProductPrice(chat: Chat): number {
    return (chat as any).item_price || 0;
  }

  getProductPhoto(chat: Chat): string | null {
    return (chat as any).item_photo || null;
  }

  getSellerUsername(chat: Chat): string {
    return (chat as any).seller_username || 'Vendedor';
  }

  getBuyerUsername(chat: Chat): string {
    return (chat as any).buyer_username || 'Comprador';
  }

  getSellerUsernameForReview(): string {
    if (!this.selectedConversation) return 'Vendedor';
    return (this.selectedConversation as any).seller_username || 'Vendedor';
  }

  getBuyerUsernameForReview(): string {
    if (!this.selectedConversation) return 'Comprador';
    return (this.selectedConversation as any).buyer_username || 'Comprador';
  }

  /**
   * Opens the review modal for a given conversation.
   * @param conversation - The chat/transaction being reviewed.
   * @param role - Role of the current user in this transaction ('seller' or 'buyer').
   */
  openReviewModal(conversation: Chat, role: 'seller' | 'buyer'): void {
    this.selectedConversation = conversation;
    this.reviewerRole = role;
    this.newRating.set(0);
    this.newComment.set('');
    this.showReviewModal.set(true);
  }

  /** Validates the review form: rating must be 1-5 and comment at least 10 characters. */
  isReviewValid(): boolean {
    const rating = this.newRating();
    const comment = this.newComment().trim();
    return rating >= 1 && rating <= 5 && comment.length >= 10;
  }

  /** Form submit handler: creates the review for the selected conversation and refreshes data. */
  submitReview(): void {
    if (!this.isReviewValid() || !this.selectedConversation || !this.currentUserId) return;

    const reviewData = {
      rating: this.newRating(),
      comment: this.newComment().trim(),
      fk_items_id: this.selectedConversation.fk_items_id,
      fk_reviewed_id: this.reviewerRole === 'seller'
        ? this.selectedConversation.fk_buyer_id       
        : this.selectedConversation.fk_seller_id       
    };

    this.reviewsService.create(reviewData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showToast('success', 'Éxito', 'Reseña enviada correctamente');
          this.showReviewModal.set(false);
          this.loadAllData(); 
        },
        error: (err) => {
          console.error('Error al guardar reseña:', err);
          this.showToast('error', 'Error', err.error?.error || 'No se pudo guardar la reseña');
        }
      });
  }

  /** Closes the review modal and resets its form state. */
  cancelReview(): void {
    this.showReviewModal.set(false);
    this.newRating.set(0);
    this.newComment.set('');
    this.selectedConversation = null;
  }

  /** Displays a toast notification and auto-hides it after 3 seconds. */
  private showToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    this.toastType.set(type);
    this.toastTitle.set(title);
    this.toastMessage.set(message);
    this.toastVisible.set(true);
    setTimeout(() => this.toastVisible.set(false), 3000);
  }

  /** Hides the toast when dismissed by the user or its timer. */
  onToastDismissed(): void {
    this.toastVisible.set(false);
  }

  /** Handles pagination component page-change events. */
  onPageChange(page: number): void {
    this.currentPage.set(page);
  }
}
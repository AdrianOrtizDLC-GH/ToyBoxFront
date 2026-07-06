import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';  
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs'; 
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { ModalConfirmComponent } from '../../../shared/components/modal-confirm/modal-confirm';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb';
import { ToastComponent } from '../../../shared/components/toast/toast';

import { ProductsService } from '../../../core/services/products.service';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';

import { Item } from '../../../shared/interfaces/item.interface';
import { Chat } from '../../../shared/interfaces/chat.interface';
import { ItemStatus } from '../../../shared/enums/item-status.enum';
import { ConservationStatus } from '../../../shared/enums/conservation-status.enum';

/**
 * Component for managing the seller's own products: lists published items
 * and drafts, and supports publishing drafts, editing, deleting, and
 * marking items as sold (linking a sale to a chat conversation/buyer).
 */
@Component({
  selector: 'app-my-products',
  standalone: true,
  imports: [CommonModule,RouterModule, FormsModule, PaginationComponent,LoadingSpinnerComponent, StatusBadgeComponent,
    ModalConfirmComponent,EmptyStateComponent,BreadcrumbComponent,ToastComponent],
  templateUrl: './my-products.html',
  styleUrl: './my-products.css',
})
export class MyProductsComponent implements OnInit, OnDestroy {
  private readonly productsService = inject(ProductsService);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // Emits on component destruction to unsubscribe all pending observables.
  private destroy$ = new Subject<void>();

  // Currently selected tab: published products vs draft products.
  activeTab = signal<'published' | 'drafts'>('published');
  // Combined list of the seller's published items and drafts.
  allMyItems = signal<Item[]>([]);
  isLoadingProducts = signal(false);
  productsError = signal('');
  currentPage = signal(1);
  totalPages = signal(1);

  // Chat conversations relevant to the product currently being marked as sold.
  conversations = signal<Chat[]>([]);
  isLoadingConversations = signal(false);
  showSaleModal = signal(false);

  toastVisible = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('success');
  toastTitle = signal('');
  toastMessage = signal('');

  // State for the "mark as sold" modal flow.
  productToSell: Item | null = null;
  selectedConversation: Chat | null = null;
  newPrice: number | null = null;
  productToDelete: Item | null = null;
  showDeleteModal = signal(false);

  currentUserId: number | undefined;

  constructor() {
    // Reset to the first page whenever the active tab changes.
    effect(() => {
      const tab = this.activeTab();
      this.currentPage.set(1);
    });
  }

  /** Angular lifecycle hook. Loads the current user and their products. */
  ngOnInit(): void {
    this.loadCurrentUser();
  }

  /** Angular lifecycle hook. Completes the destroy subject to unsubscribe observables. */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Retrieves the authenticated user and triggers loading their product data. */
  private loadCurrentUser(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.currentUserId = user.id_users;
      this.loadAllData();
    } else {
      this.productsError.set('No hay usuario autenticado');
    }
  }

  private loadAllData(): void {
    this.loadAllMyItems();
  }

  /**
   * Fetches both published and draft items for the seller in parallel,
   * merges them into a deduplicated list, and updates pagination.
   */
  private loadAllMyItems(): void {
    this.isLoadingProducts.set(true);
    this.productsError.set('');

    if (!this.currentUserId) {
      this.isLoadingProducts.set(false);
      return;
    }

    forkJoin({
      published: this.productsService.getAll({
        sellerId: this.currentUserId,
        conservation_status: 'published' as any  
      }),
      reserved: this.productsService.getAll({
        sellerId: this.currentUserId,
        conservation_status: 'reserved' as any
      }),
      drafts: this.productsService.getAll({
        sellerId: this.currentUserId,
        conservation_status: 'draft' as any
      })
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          const publishedItems = (results.published.items || []).map((card: any) =>
            this.mapItemCard(card)
          );
          const reservedItems = (results.reserved.items || []).map((card: any) =>
            this.mapItemCard(card)
          );
          const draftItems = (results.drafts.items || []).map((card: any) =>
            this.mapItemCard(card)
          );
          const allItems = [...publishedItems, ...reservedItems, ...draftItems];

          const uniqueItems = Array.from(new Map(
            allItems.map(item => [item.id_items, item])
          ).values());

          this.allMyItems.set(uniqueItems);
          this.totalPages.set(results.published.totalPages || 1);
          this.isLoadingProducts.set(false);
        },
        error: (err) => {
          this.productsError.set('Error al cargar los productos. Intenta de nuevo.');
          this.isLoadingProducts.set(false);
        }
      });
  }

  get publishedProducts(): Item[] {
    return this.allMyItems().filter(item => item.conservation_status === ConservationStatus.Published || item.conservation_status === ConservationStatus.Reserved);
  }

  get draftProducts(): Item[] {
    return this.allMyItems().filter(item => item.conservation_status === 'draft');
  }

  /** Normalizes a raw API product card into the Item shape used by the UI. */
  private mapItemCard(card: any): Item {
    return {
      id_items: card.id_items,
      title: card.title,
      description: card.description || null,
      price: card.price,
      conservation_status: card.conservation_status,
      item_status: card.item_status,
      location: card.location,
      publication_date: card.publication_date,
      fk_seller_id: this.currentUserId ?? 0,
      fk_categories_id: card.category?.id_categories || card.fk_categories_id || 0,
      item_update: null,
      images: card.image
        ? [{ id_photos: 0, photo_url: card.image, order: 0, fk_items_id: card.id_items }]
        : [],
      category: card.category
        ? card.category
        : { id_categories: 0, name: 'Sin especificar', description: null }
    } as Item;
  }

  /** Translates a conservation status code into a human-readable Spanish label. */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'draft': 'Borrador',
      'published': 'Publicado',
      'reserved': 'Reservado',
      'under_review': 'En revisión',
      'sold': 'Vendido',
      'removed': 'Retirado'
    };
    return labels[status] || status;
  }

  /** Navigates to the public product detail page. */
  viewProduct(id: number): void {
    this.router.navigate(['/product', id]);
  }

  /** Navigates to the product edit page. */
  editProduct(id: number): void {
    this.router.navigate(['/product/edit', id]);
  }

  /**
   * Publishes a draft product, optimistically updates its status locally,
   * then re-fetches the full list shortly after to sync with the server.
   */
  publishDraft(product: Item): void {
    if (!product) return;

    this.isLoadingProducts.set(true);
    this.productsService.publish(product.id_items)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showToast('success', 'Publicado', 'El producto ha sido publicado correctamente.');
          
          const updatedItems = this.allMyItems().map(p =>
            p.id_items === product.id_items
              ? {
                  ...p,
                  conservation_status: ConservationStatus.Published, 
                  publication_date: new Date().toISOString()
                }
              : p
          );
          this.allMyItems.set(updatedItems);

          setTimeout(() => {
            this.loadAllMyItems();
          }, 500);
        },
        error: (err) => {
          this.isLoadingProducts.set(false);
          this.showToast('error', 'Error', 'No se pudo publicar el producto. Intenta de nuevo.');
          console.error('Error publishing draft:', err);
        },
        complete: () => {
          this.isLoadingProducts.set(false);
        }
      });
  }

  /**
   * Toggles a product's reserved state and refreshes its status in the
   * local list to reflect the change.
   */
  toggleReserved(product: Item): void {
    if (!product || product.item_status === 'sold') return;

    this.productsService.toggleReserved(product.id_items)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProduct) => {
          const updatedItems = this.allMyItems().map(p =>
            p.id_items === product.id_items
              ? { ...p, conservation_status: updatedProduct.conservation_status }
              : p
          );
          this.allMyItems.set(updatedItems);

          if (updatedProduct.conservation_status === ConservationStatus.Reserved) {
            this.showToast('success', 'Reservado', 'Producto marcado como reservado. Ahora puedes marcar como vendido.');
          } else {
            this.showToast('info', 'Actualizado', 'Estado del producto actualizado.');
          }
        },
        error: (err) => {
          this.showToast('error', 'Error', 'No se pudo actualizar el estado del producto.');
          console.error('Error toggling reserved:', err);
        }
      });
  }

  /**
   * Opens the "mark as sold" modal for a product and loads the chat
   * conversations relevant to it so the seller can pick the buyer.
   */
  markAsSold(product: Item): void {
    if (product.item_status === 'sold') {
      this.showToast('warning', 'Aviso', 'Este producto ya está marcado como vendido');
      return;
    }

    if (product.conservation_status !== ConservationStatus.Reserved) {
      this.showToast('warning', 'Aviso', 'Primero debes reservar el producto');
      return;
    }

    this.productToSell = product;
    this.selectedConversation = null;
    this.newPrice = product.price;

    this.isLoadingConversations.set(true);
    this.chatService.getMyChats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chats) => {
          const relevantChats = chats.filter(chat =>
            chat.fk_seller_id === this.currentUserId &&
            chat.fk_items_id === product.id_items
          );

          this.conversations.set(relevantChats);
          this.isLoadingConversations.set(false);
          this.showSaleModal.set(true);
        },
        error: (err) => {
          this.showToast('error', 'Error', 'No se pudieron cargar las conversaciones');
          this.isLoadingConversations.set(false);
        }
      });
  }

  /**
   * Validates the selected conversation and price, then submits the sale,
   * updating the product's status/price locally and refreshing the list.
   */
  confirmSale(): void {
    if (!this.productToSell || !this.selectedConversation || !this.newPrice) {
      this.showToast('warning', 'Advertencia', 'Debes seleccionar una conversación y precio');
      return;
    }

    if (this.newPrice <= 0) {
      this.showToast('warning', 'Advertencia', 'El precio debe ser mayor a 0');
      return;
    }
    this.productsService.markAsSold(this.productToSell.id_items, this.selectedConversation.fk_buyer_id, this.newPrice ?? undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const updatedItems = this.allMyItems().map(p =>
            p.id_items === this.productToSell!.id_items
              ? {
                  ...p,
                  item_status: ItemStatus.Sold,
                  price: this.newPrice!,
                  conservation_status: ConservationStatus.Sold
                }
              : p
          );
          this.allMyItems.set(updatedItems);

          this.showToast('success', 'Éxito', 'Producto marcado como vendido');
          this.showSaleModal.set(false);
          this.cancelSale();
          this.loadAllMyItems(); 
        },
        error: (err) => {
          this.showToast('error', 'Error', 'No se pudo marcar el producto como vendido');
        }
      });
  }

  /** Closes the "mark as sold" modal and resets its associated state. */
  cancelSale(): void {
    this.showSaleModal.set(false);
    this.productToSell = null;
    this.selectedConversation = null;
    this.newPrice = null;
  }

  /** Switches between the "published" and "drafts" tabs, resetting pagination. */
  switchTab(tab: 'published' | 'drafts'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  /** Opens the delete confirmation modal for a product. */
  confirmDelete(product: Item): void {
    this.productToDelete = product;
    this.showDeleteModal.set(true);
  }

  /** Cancels the pending delete and closes the confirmation modal. */
  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.productToDelete = null;
  }

  /** Deletes the product pending confirmation and removes it from the local list. */
  deleteProductConfirmed(): void {
    if (!this.productToDelete) return;

    this.productsService.delete(this.productToDelete.id_items)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.allMyItems.set(this.allMyItems().filter(
            p => p.id_items !== this.productToDelete!.id_items
          ));

          this.showToast('success', 'Eliminado', 'Producto eliminado correctamente');
          this.showDeleteModal.set(false);
          this.productToDelete = null;
        },
        error: (err) => {
          this.showToast('error', 'Error', 'No se pudo eliminar el producto');
        }
      });
  }

  /** Displays a toast notification and auto-hides it after 3 seconds. */
  private showToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    this.toastType.set(type);
    this.toastTitle.set(title);
    this.toastMessage.set(message);
    this.toastVisible.set(true);

    setTimeout(() => {
      this.toastVisible.set(false);
    }, 3000);
  }

  /** Returns the buyer's username for a chat, falling back to a default label. */
  getBuyerUsername(chat: Chat): string {
    return (chat as any).buyer_username || 'Comprador desconocido';
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
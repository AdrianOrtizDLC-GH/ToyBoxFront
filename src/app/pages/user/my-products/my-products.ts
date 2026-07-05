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

@Component({
  selector: 'app-my-products',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PaginationComponent,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    ModalConfirmComponent,
    EmptyStateComponent,
    BreadcrumbComponent,
    ToastComponent
  ],
  templateUrl: './my-products.html',
  styleUrl: './my-products.css',
})
export class MyProductsComponent implements OnInit, OnDestroy {  
  private readonly productsService = inject(ProductsService);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private destroy$ = new Subject<void>();

  activeTab = signal<'published' | 'drafts'>('published');
  allMyItems = signal<Item[]>([]);
  isLoadingProducts = signal(false);
  productsError = signal('');
  currentPage = signal(1);
  totalPages = signal(1);

  conversations = signal<Chat[]>([]);
  isLoadingConversations = signal(false); 
  showSaleModal = signal(false);

  toastVisible = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('success');
  toastTitle = signal('');
  toastMessage = signal('');

  productToSell: Item | null = null;
  selectedConversation: Chat | null = null;
  newPrice: number | null = null;
  productToDelete: Item | null = null;
  showDeleteModal = signal(false);

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
      this.productsError.set('No hay usuario autenticado');
    }
  }

  private loadAllData(): void {
    this.loadAllMyItems();
  }

  private loadAllMyItems(): void {
    this.isLoadingProducts.set(true);
    this.productsError.set('');

    if (!this.currentUserId) {
      this.isLoadingProducts.set(false);
      return;
    }

    forkJoin({
      published: this.productsService.getAll({
        sellerId: this.currentUserId
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
          const draftItems = (results.drafts.items || []).map((card: any) =>
            this.mapItemCard(card)
          );

          const allItems = [...publishedItems, ...draftItems];

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
    return this.allMyItems().filter(item => item.conservation_status === 'published');
  }

  get draftProducts(): Item[] {
    return this.allMyItems().filter(item => item.conservation_status === 'draft');
  }

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

  viewProduct(id: number): void {
    this.router.navigate(['/product', id]);
  }

  editProduct(id: number): void {
    this.router.navigate(['/product/edit', id]);
  }

  markAsSold(product: Item): void {
    if (product.item_status === 'sold') {
      this.showToast('warning', 'Aviso', 'Este producto ya está marcado como vendido');
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

  confirmSale(): void {
    if (!this.productToSell || !this.selectedConversation || !this.newPrice) {
      this.showToast('warning', 'Advertencia', 'Debes seleccionar una conversación y precio');
      return;
    }

    if (this.newPrice <= 0) {
      this.showToast('warning', 'Advertencia', 'El precio debe ser mayor a 0');
      return;
    }
    this.productsService.markAsSold(this.productToSell.id_items, this.selectedConversation.fk_buyer_id)
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

  cancelSale(): void {
    this.showSaleModal.set(false);
    this.productToSell = null;
    this.selectedConversation = null;
    this.newPrice = null;
  }

  switchTab(tab: 'published' | 'drafts'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  confirmDelete(product: Item): void {
    this.productToDelete = product;
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.productToDelete = null;
  }

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

  private showToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    this.toastType.set(type);
    this.toastTitle.set(title);
    this.toastMessage.set(message);
    this.toastVisible.set(true);

    setTimeout(() => {
      this.toastVisible.set(false);
    }, 3000);
  }

  getBuyerUsername(chat: Chat): string {
    return (chat as any).buyer_username || 'Comprador desconocido';
  }

  onToastDismissed(): void {
    this.toastVisible.set(false);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }
}
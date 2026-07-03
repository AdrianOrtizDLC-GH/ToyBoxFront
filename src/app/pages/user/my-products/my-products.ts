import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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

@Component({
  selector: 'app-my-products',
  standalone: true,
  imports: [CommonModule,RouterModule,FormsModule,PaginationComponent,LoadingSpinnerComponent,StatusBadgeComponent,ModalConfirmComponent, EmptyStateComponent,BreadcrumbComponent,ToastComponent],
  templateUrl: './my-products.html',
  styleUrl: './my-products.css',
})
export class MyProductsComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  breadcrumbItems: any[] = [];
  products: Item[] = [];
  isLoadingProducts = true;
  productsError = '';
  currentPage = 1;
  totalPages = 1;

  conversations: Chat[] = [];
  isLoadingConversations = false;
  showSaleModal = false;
  productToSell: Item | null = null;
  selectedConversation: Chat | null = null;
  newPrice: number | null = null;

  productToDelete: Item | null = null;
  showDeleteModal = false;

  toastVisible = false;
  toastType: 'success' | 'error' | 'warning' | 'info' = 'success';
  toastTitle = '';
  toastMessage = '';

  currentUserId: number | undefined;

  ngOnInit(): void {
    this.initializeBreadcrumbs();
    this.loadCurrentUser();
  }

  private initializeBreadcrumbs(): void {
    const isLoggedIn = this.authService.isLoggedIn();
    const homeRoute = isLoggedIn ? '/catalog' : '/home';
    
    this.breadcrumbItems = [
      { label: 'Inicio', route: homeRoute, icon: 'home' },
      { label: 'Mis Productos', icon: 'inventory_2' }
    ];
  }

  private loadCurrentUser(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.currentUserId = user.id_users;
      this.loadAllData();
    } else {
      this.productsError = 'No hay usuario autenticado';
    }
  }

  private loadAllData(): void {
    this.loadMyProducts();
  }

  private loadMyProducts(): void {
    this.isLoadingProducts = true;
    this.productsError = '';

    if (!this.currentUserId) return;

    this.productsService.getAll({ sellerId: this.currentUserId }).subscribe({
      next: (response) => {
        this.totalPages = response.totalPages || 1;
        this.products = (response.items || []).map((card: any) => 
          this.mapItemCard(card)
        );
        this.isLoadingProducts = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
        this.productsError = 'Error al cargar los productos. Intenta de nuevo.';
        this.isLoadingProducts = false;
        this.cdr.markForCheck();
      }
    });
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
      fk_categories_id: card.category?.id_categories || 0,
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
    
    this.isLoadingConversations = true;
    this.chatService.getMyChats().subscribe({
      next: (chats) => {
        this.conversations = chats.filter(chat => chat.fk_seller_id === this.currentUserId);
        this.isLoadingConversations = false;
        this.showSaleModal = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando conversaciones:', err);
        this.showToast('error', 'Error', 'No se pudieron cargar las conversaciones');
        this.isLoadingConversations = false;
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

    this.productsService.markAsSold(this.productToSell.id_items).subscribe({
      next: () => {
        this.products = this.products.map(p =>
          p.id_items === this.productToSell!.id_items 
            ? { ...p, item_status: ItemStatus.Sold, price: this.newPrice! }
            : p
        );

        this.showToast(
          'success', 
          '¡Vendido!', 
          `Producto marcado como vendido a €${this.newPrice?.toFixed(2)} con ${this.selectedConversation?.buyer?.first_name}`
        );
        
        this.showSaleModal = false;
        this.productToSell = null;
        this.selectedConversation = null;
        this.newPrice = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error marcando producto como vendido:', err);
        this.showToast('error', 'Error', 'No se pudo marcar el producto como vendido');
      }
    });
  }

  cancelSale(): void {
    this.showSaleModal = false;
    this.productToSell = null;
    this.selectedConversation = null;
    this.newPrice = null;
  }

  confirmDelete(product: Item): void {
    this.productToDelete = product;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  deleteProductConfirmed(): void {
    if (!this.productToDelete) return;

    this.productsService.delete(this.productToDelete.id_items).subscribe({
      next: () => {
        this.products = this.products.filter(
          p => p.id_items !== this.productToDelete!.id_items
        );
        this.showToast('success', 'Eliminado', 'Producto eliminado correctamente');
        this.showDeleteModal = false;
        this.productToDelete = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error eliminando producto:', err);
        this.showToast('error', 'Error', 'No se pudo eliminar el producto');
      }
    });
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

  onToastDismissed(): void {
    this.toastVisible = false;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.productsService.getAll({ sellerId: this.currentUserId, page }).subscribe({
      next: (response) => {
        this.totalPages = response.totalPages || 1;
        this.products = (response.items || []).map((card: any) => 
          this.mapItemCard(card)
        );
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
        this.showToast('error', 'Error', 'Error al cargar productos');
      }
    });
  }
}
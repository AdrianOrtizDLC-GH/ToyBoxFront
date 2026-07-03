import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb';
import { PaginationComponent } from '../../shared/components/pagination/pagination';
import { NotificationsService } from '../../core/services/notifications.service';

interface NotificationItem {
  id_notifications: number;
  message: string;
  read: boolean;
  created_at: string;
  fk_users_id: number;

  // campos calculados para la vista
  title: string;
  type: string;
  date: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbComponent,
    PaginationComponent
  ],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class NotificationsComponent implements OnInit {
  private notificationsService = inject(NotificationsService);
  private cdr = inject(ChangeDetectorRef);

  notifications: NotificationItem[] = [];

  unreadCount = 0;
  isLoading = false;
  backendError = '';

  currentPage = 1;
  pageSize = 6;
  totalPages = 1;

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.backendError = '';

    this.notificationsService.getMyNotifications().subscribe({
      next: (data) => {
        this.notifications = data.map((notification: any) => ({
          id_notifications: notification.id_notifications,
          message: notification.message,
          read: !!notification.read,
          created_at: notification.created_at,
          fk_users_id: notification.fk_users_id,

          // campos adaptados al HTML actual
          title: this.extractTitle(notification.message),
          type: this.detectType(notification.message),
          date: this.formatDate(notification.created_at),
        }));

        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.notificationsService.unreadCount.set(this.unreadCount);
        this.updatePagination();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.handleError(err, 'Error al cargar las notificaciones');
        console.error('Error cargando notificaciones:', err);
        this.cdr.markForCheck();
      }
    });
  }

  markAsRead(notification: NotificationItem): void {
    if (notification.read) return;

    this.notificationsService.markAsRead(notification.id_notifications).subscribe({
      next: () => {
        notification.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.notificationsService.unreadCount.set(this.unreadCount);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error marcando notificación como leída:', err);
      }
    });
  }

  get paginatedNotifications(): NotificationItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.notifications.slice(start, start + this.pageSize);
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.notifications.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  getIcon(type: string): string {
    switch (type) {
      case 'sale':
        return 'sell';
      case 'message':
        return 'mail';
      case 'favorite':
        return 'favorite';
      case 'system':
        return 'info';
      default:
        return 'notifications';
    }
  }

  private detectType(message: string): string {
    const text = message.toLowerCase();

    if (text.includes('vendido') || text.includes('ha sido vendido')) {
      return 'sale';
    }

    if (text.includes('mensaje')) {
      return 'message';
    }

    if (text.includes('favorito')) {
      return 'favorite';
    }

    return 'system';
  }

  private extractTitle(message: string): string {
    const type = this.detectType(message);

    switch (type) {
      case 'sale':
        return 'Producto vendido';
      case 'message':
        return 'Nuevo mensaje';
      case 'favorite':
        return 'Favoritos';
      default:
        return 'Notificación';
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);

    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private handleError(err: HttpErrorResponse, defaultMessage: string): void {
    if (err.status === 401) {
      this.backendError = 'Debes iniciar sesión para ver tus notificaciones';
    } else if (err.status === 404) {
      this.backendError = 'No se encontró el endpoint de notificaciones';
    } else if (err.status === 0) {
      this.backendError = 'Error de conexión con el servidor';
    } else {
      this.backendError = err.error?.error || defaultMessage;
    }
  }

  markAllAsRead(): void {
  const unreadNotifications = this.notifications.filter(n => !n.read);

  if (unreadNotifications.length === 0) return;

  this.notificationsService.markAllAsRead().subscribe({
    next: () => {
      this.notifications = this.notifications.map(notification => ({
        ...notification,
        read: true
      }));

      this.unreadCount = 0;
      this.notificationsService.unreadCount.set(this.unreadCount);
      this.cdr.markForCheck();
    },
    error: (err) => {
      console.error('Error marcando todas las notificaciones como leídas:', err);
    }
  });
  }
}
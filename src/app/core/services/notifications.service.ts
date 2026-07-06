import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Shape of a notification record returned by the API.
export interface NotificationResponse {
  id_notifications: number;
  message: string;
  read: boolean;
  created_at: string;
  fk_users_id: number; // Owning user's id.
}

/**
 * Service handling user notifications: listing, unread count tracking,
 * and marking notifications as read (single or all). Exposes a
 * `unreadCount` signal consumed by the navbar badge.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private http = inject(HttpClient);
  // Base URL for notification endpoints.
  private apiUrl = `${environment.apiUrl}/notifications`;

  // Signal used by the navbar to display the unread notifications badge.
  unreadCount = signal(0);

  /**
   * Fetches all notifications for the current user.
   * HTTP: GET {apiUrl}/notifications
   * @returns Observable emitting the list of NotificationResponse.
   */
  getMyNotifications(): Observable<NotificationResponse[]> {
    return this.http.get<NotificationResponse[]>(this.apiUrl);
  }

  /**
   * Fetches the current unread notifications count from the backend.
   * HTTP: GET {apiUrl}/notifications/unread-count
   * @returns Observable emitting `{ unreadCount }`.
   */
  getUnreadCount(): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>(`${this.apiUrl}/unread-count`);
  }

  /**
   * Fetches the unread count and updates the `unreadCount` signal
   * accordingly. On error, logs it and resets the signal to 0.
   */
  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadCount.set(response.unreadCount ?? 0);
      },
      error: (err) => {
        console.error('Error cargando contador de notificaciones:', err);
        this.unreadCount.set(0);
      }
    });
  }

  /**
   * Marks a single notification as read.
   * HTTP: PATCH {apiUrl}/notifications/{id}/read
   * @param id Notification identifier.
   * @returns Observable emitting `{ updated }` (number of rows updated).
   */
  markAsRead(id: number): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${this.apiUrl}/${id}/read`, {});
  }

  /**
   * Marks all of the current user's notifications as read.
   * HTTP: PATCH {apiUrl}/notifications/read-all
   * @returns Observable emitting `{ updated }` (number of rows updated).
   */
  markAllAsRead(): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${this.apiUrl}/read-all`, {});
  }
}
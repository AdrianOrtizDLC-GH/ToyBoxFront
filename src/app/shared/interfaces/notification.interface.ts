import { DateString } from './user.interface';
import { NotificationType } from '../enums/notification-type.enum';

/**
 * Models a user notification record, as returned by NotificationsService.
 * Optional fields link the notification to the entity/action it relates to.
 */
export interface Notification {
  id_notifications: number;
  notification_type: NotificationType;
  content: string;
  read: boolean;
  notification_date: DateString;
  fk_users_id: number;

  // Optional linkage/navigation data.
  relatedItemId?: number;
  relatedUserId?: number;
  actionUrl?: string; // Client-side route/URL to navigate to when the notification is clicked.
}

/**
 * Flattened view model of a Notification for list rendering
 * (e.g. notifications page), with a display title/preview instead of raw content.
 */
export interface NotificationItem {
  id_notifications: number;
  type: NotificationType;
  title: string;
  preview: string;
  read: boolean;
  notification_date: DateString;
  actionUrl?: string;
}

// Payload used to create a new notification.
export interface NotificationFormData {
  notification_type: NotificationType;
  content: string;
  fk_users_id: number;
  relatedItemId?: number;
  relatedUserId?: number;
}
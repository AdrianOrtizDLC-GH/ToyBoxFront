/**
 * Category of a user notification, used to determine icon/routing/copy
 * when rendering the notifications list.
 */
export enum NotificationType {
  Message = 'message',        // New chat message received.
  Report = 'report',          // Related to a report filed on the user's item.
  Moderation = 'moderation',  // Result of a moderator decision.
  System = 'system'           // Generic/system-generated notice.
}
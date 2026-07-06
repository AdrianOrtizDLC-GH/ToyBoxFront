import { DateString } from './user.interface';

/**
 * Models a single chat message within a conversation, as used by
 * ChatService (REST history) and SocketService (real-time delivery
 * of new messages).
 */
export interface ChatMessage {
  id_messages: number;
  content: string;
  sent_date: DateString;
  read: boolean;
  fk_users_id_sent: number;
  fk_users_id_received: number;
  fk_conversations_id: number;
}

/**
 * A ChatMessage enriched with sender display data, used for rendering
 * message bubbles (e.g. chat-detail page) without extra lookups.
 */
export interface ChatMessageWithSender extends ChatMessage {
  senderName: string;
  senderAvatar: string | null;
  senderRole?: 'user' | 'moderator' | 'administrator';
}

// Payload used to create/send a new chat message.
export interface CreateMessageDTO {
  content: string;
  fk_conversations_id: number;
}

// Note: duplicate declaration of CreateMessageDTO kept as-is (no logic change).
export interface CreateMessageDTO {
  content: string;
  fk_conversations_id: number;
}

// Payload used to update a message's read status.
export interface UpdateMessageReadDTO {
  read: boolean;
}
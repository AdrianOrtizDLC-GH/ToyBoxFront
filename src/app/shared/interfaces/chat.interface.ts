import { DateString, UserSummary } from './user.interface';

/**
 * Models a chat conversation between a product's buyer and seller,
 * as returned by the backend (ChatService). Combines core relational
 * fields with optional denormalized/computed data used for display.
 */
export interface Chat {
  id_conversations: number;
  started_date: DateString;
  fk_items_id: number;
  fk_seller_id: number;
  fk_buyer_id: number;

  conservation_status?: string; // e.g. 'draft', 'published', 'sold', 'reserved'.
  item_status?: string; // e.g. 'available', 'sold'.
  is_sold_in_this_conversation?: number; // Flags whether this conversation was the one that led to the sale.

    // Optional fields, populated depending on the endpoint/join used.
  item?: {
    id_items: number;
    title: string;
    image?: string;
    price: number;
  };
  seller?: UserSummary;
  buyer?: UserSummary;

  // Computed/derived data for UI convenience.
  otherUser?: UserSummary; // The other participant relative to the current user.
  lastMessage?: string;
  lastMessageAt?: DateString;
  unreadCount?: number;
}

/**
 * Flattened view model of a chat used for list rendering (e.g. chat-list page),
 * exposing only the fields needed to render a conversation row.
 */
export interface ChatItem {
  id_conversations: number;
  otherUserName: string;
  otherUserImage?: string;
  itemTitle: string;
  itemImage?: string;
  lastMessage?: string;
  lastMessageAt?: DateString;
  unreadCount: number;
}

// Payload used to create a new chat/conversation.
export interface ChatFormData {
  fk_items_id: number;
  fk_buyer_id: number;
  fk_seller_id: number;
}
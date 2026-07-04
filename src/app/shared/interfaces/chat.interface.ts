import { DateString, UserSummary } from './user.interface';

export interface Chat {
  id_conversations: number;
  started_date: DateString;
  fk_items_id: number;
  fk_seller_id: number;
  fk_buyer_id: number;

  conservation_status?: string; // 'draft', 'published', 'sold', 'reserved', etc.
  item_status?: string; // 'available', 'sold', etc.

    // optionals
  item?: {
    id_items: number;
    title: string;
    image?: string;
    price: number;
  };
  seller?: UserSummary;
  buyer?: UserSummary;

  // Datos calculados
  otherUser?: UserSummary; // El otro participante
  lastMessage?: string;
  lastMessageAt?: DateString;
  unreadCount?: number;
}

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

export interface ChatFormData {
  fk_items_id: number;
  fk_buyer_id: number;
  fk_seller_id: number;
}
import { DateString, UserSummary } from './user.interface';
import { TradeStatus } from '../enums/trade-status.enum';
import { Item } from './item.interface';

/**
 * Models a completed (or in-progress) trade transaction record for an
 * item, backing OrdersService. Represents the base entity from which
 * the more specific Purchase/Sale view models are derived.
 */
export interface ItemHistory {
  id_item_history: number;
  final_price: number;
  trade_status: TradeStatus;
  trade_date: DateString;
  fk_items_id: number;
  fk_buyer_id: number;
  fk_seller_id: number;

  // Optional relations, populated depending on the endpoint/join used.
  item?: Item;
  buyer?: UserSummary;
  seller?: UserSummary;
}

/**
 * A trade record viewed from the buyer's perspective (my-purchases page).
 * Requires the seller and item relations to be populated.
 */
export interface Purchase extends ItemHistory {
  seller: UserSummary;
  item: Item;
}

/**
 * A trade record viewed from the seller's perspective.
 * Requires the buyer and item relations to be populated.
 */
export interface Sale extends ItemHistory {
  buyer: UserSummary;
  item: Item;
}

// Payload used to record a new completed trade/order.
export interface PurchaseFormData {
  fk_items_id: number;
  fk_buyer_id: number;
  final_price: number;
}
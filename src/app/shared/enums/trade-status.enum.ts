/**
 * Status of a trade/transaction record (ItemHistory) between a buyer and seller.
 */
export enum TradeStatus {
  Pending = 'pending',     // Transaction initiated but not finalized.
  Done = 'done',           // Transaction completed successfully.
  Cancelled = 'cancelled'  // Transaction was cancelled before completion.
}
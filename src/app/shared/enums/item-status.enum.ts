/**
 * Availability status of a product listing for buyers (distinct from
 * `ConservationStatus`, which tracks the moderation/publication lifecycle).
 */
export enum ItemStatus {
  Available = 'available', // Can be bought/reserved.
  Sold = 'sold',           // Transaction completed, no longer purchasable.
  Paused = 'paused',       // Temporarily hidden by the seller.
  Deleted = 'deleted'      // Removed by the seller or moderation.
}
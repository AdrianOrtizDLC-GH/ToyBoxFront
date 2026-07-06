/**
 * Publication/lifecycle status of a product listing within the platform's
 * moderation and catalog workflow (distinct from `ItemStatus`, which
 * tracks availability for sale).
 */
export enum ConservationStatus {
  Draft = 'draft',               // Created but not yet published.
  Published = 'published',       // Live and visible in the catalog.
  UnderReview = 'under_review',  // Flagged/reported, pending moderator decision.
  Reserved = 'reserved',         // Reserved by a buyer, pending completion.
  Removed = 'removed',           // Taken down by moderation.
  Sold = 'sold'                  // Transaction completed.
}

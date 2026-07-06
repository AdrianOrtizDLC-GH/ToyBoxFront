/**
 * Resolution status of a report filed against a product listing.
 */
export enum ReportStatus {
  Pending = 'pending',   // Awaiting moderator review.
  Resolved = 'resolved'  // A moderation decision has been made.
}
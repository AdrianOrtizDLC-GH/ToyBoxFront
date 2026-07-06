/**
 * Outcome of a moderator's decision when resolving a report against a
 * product listing.
 */
export enum ModerationDecision {
  Reactivated = 'reactivated', // Report dismissed; the item is restored/kept active.
  Removed = 'removed'          // Report upheld; the item is taken down.
}
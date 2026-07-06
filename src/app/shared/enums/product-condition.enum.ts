/**
 * Physical condition of a second-hand product listing, set by the seller
 * when creating/editing a product (distinct from `ConservationStatus`
 * and `ItemStatus`, which describe the listing's lifecycle rather than
 * its physical state).
 */
export enum ProductCondition {
  Excellent = 'excellent',
  VeryGood = 'very_good',
  Good = 'good',
  Fair = 'fair'
}

// Display labels (Spanish, user-facing UI copy) for each ProductCondition value.
export const PRODUCT_CONDITION_LABELS: Record<ProductCondition, string> = {
  [ProductCondition.Excellent]: 'Excelente',
  [ProductCondition.VeryGood]: 'Muy bueno',
  [ProductCondition.Good]: 'Bueno',
  [ProductCondition.Fair]: 'Aceptable'
};